import os
import threading
import time
from datetime import datetime, timedelta

from .config import load_config, load_state, normalize_extension, save_config, save_state
from .ftp import FtpClient


def build_client(cfg):
    ftp = cfg.get("ftp", {})
    return FtpClient(
        host=ftp.get("host", ""),
        port=ftp.get("port", 21),
        username=ftp.get("username", "anonymous"),
        password=ftp.get("password", ""),
    )


class Engine:
    def __init__(self):
        self._stop = threading.Event()
        self._lock = threading.Lock()
        self._threads = []
        self.logs = []
        self.log_cb = None
        self._client = None

    def start(self):
        if self._threads:
            return
        self._stop.clear()
        for fn in (self._watch_loop, self._schedule_loop):
            t = threading.Thread(target=fn, daemon=True)
            t.start()
            self._threads.append(t)

    def stop(self):
        self._stop.set()

    def is_running(self):
        return bool(self._threads) and not self._stop.is_set()

    def add_log(self, level, message):
        entry = {
            "time": datetime.now().strftime("%H:%M:%S"),
            "level": level,
            "message": message,
        }
        self.logs.append(entry)
        if len(self.logs) > 300:
            self.logs = self.logs[-300:]
        if self.log_cb:
            try:
                self.log_cb(entry)
            except Exception:
                pass
        return entry

    def get_client(self, reconnect=False):
        cfg = load_config()
        with self._lock:
            if self._client is None or reconnect:
                self._client = build_client(cfg)
            return self._client

    def _refresh_config_loop(self):
        pass

    def _each_matching(self, folder, ext):
        ext = normalize_extension(ext)
        if not folder or not os.path.isdir(folder):
            return []
        matches = []
        for name in os.listdir(folder):
            if name.lower().endswith(ext):
                path = os.path.join(folder, name)
                if os.path.isfile(path):
                    matches.append(path)
        return matches

    def scan_and_upload(self, force=False):
        cfg = load_config()
        auto = cfg.get("auto_upload", {})
        folder = auto.get("folder") or ""
        ext = auto.get("extension", ".zip")
        ftp_cfg = cfg.get("ftp", {})
        remote_dir = ftp_cfg.get("remote_dir", "/")

        if not folder or not os.path.isdir(folder):
            self.add_log("warn", f"Carpeta local no existe o no es accesible: {folder}")
            return []

        state = load_state()
        seen = state.setdefault("seen", {})

        matches = self._each_matching(folder, ext)
        if not matches:
            self.add_log("info", "No hay archivos con la extensión seleccionada.")
            return []

        results = []
        for path in matches:
            name = os.path.basename(path)
            mtime = os.path.getmtime(path)
            size = os.path.getsize(path)
            key = f"{name}|{size}|{mtime}"
            if not force and key in seen:
                continue
            try:
                client = self.get_client()
                uploaded_name, uploaded_size = client.upload_file(
                    path, remote_dir, progress_cb=self._upload_progress
                )
                seen[key] = {
                    "file": name,
                    "remote": remote_dir,
                    "at": datetime.now().isoformat(),
                }
                save_state(state)
                self.add_log("ok", f"Subido: {uploaded_name} ({uploaded_size} bytes) -> {remote_dir}")
                results.append((name, uploaded_size))
            except Exception as exc:
                self.add_log("error", f"Fallo subiendo {name}: {exc}")
                self.get_client(reconnect=True)
                raise
        return results

    def _upload_progress(self, sent, total):
        pct = round(sent / total * 100) if total else 0
        if not hasattr(self, "_last_pct") or pct - getattr(self, "_last_pct", 0) >= 10 or pct == 100:
            self._last_pct = pct
            self.add_log("progress", f"{pct}% subido ({sent} / {total} bytes)")

    def _watch_loop(self):
        while not self._stop.wait(5):
            try:
                cfg = load_config()
                auto = cfg.get("auto_upload", {})
                if not auto.get("enabled", False):
                    continue
                interval = auto.get("interval_seconds", 10)
                if interval <= 0:
                    interval = 1
                self.scan_and_upload()
            except Exception as exc:
                self.add_log("error", f"Auto-subida: {exc}")

    def _schedule_loop(self):
        last_run_date = None
        while not self._stop.wait(20):
            try:
                cfg = load_config()
                sched = cfg.get("schedule", {})
                if not sched.get("enabled", False):
                    continue
                now = datetime.now()
                target = sched.get("time", "20:00")
                hm = target.strip().split(":")
                if len(hm) != 2:
                    continue
                try:
                    hh, mm = int(hm[0]), int(hm[1])
                except ValueError:
                    continue
                if now.hour != hh or now.minute != mm:
                    continue
                today = now.strftime("%Y-%m-%d")
                if last_run_date == today:
                    continue
                last_run_date = today
                self.add_log("info", f"Ejecución programada de las {target}")
                self.scan_and_upload(force=True)
            except Exception as exc:
                self.add_log("error", f"Programación: {exc}")