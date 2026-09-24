import io
import os
import stat
import threading
import time
from ftplib import FTP, error_perm

STATUS_PREFIX = "ftp:"

# LIST parsing: tries MLSD first, falls back to parsing LIST output
# (handles both unix and DOS/Windows server formats).


def _parse_unix_list(line):
    parts = line.split(None, 8)
    if len(parts) < 9:
        return None
    perm = parts[0]
    if not perm.startswith("-") and not perm.startswith("d") and not perm.startswith("l"):
        return None
    is_dir = perm.startswith("d")
    is_link = perm.startswith("l")
    try:
        size = int(parts[4])
    except ValueError:
        size = 0
    name = parts[8]
    return {"name": name, "is_dir": is_dir or is_link, "size": size}


def _parse_dos_list(line):
    parts = line.split()
    if len(parts) < 4:
        return None
    date, time_ = parts[0], parts[1]
    if "<DIR>" in parts:
        idx = parts.index("<DIR>")
        name = " ".join(parts[idx + 1:])
        return {"name": name, "is_dir": True, "size": 0}
    try:
        size = int(parts[2])
    except ValueError:
        return None
    name = " ".join(parts[3:])
    return {"name": name, "is_dir": False, "size": size}


class FtpClient:
    def __init__(self, host, port, username, password, timeout=15):
        self.host = host
        self.port = int(port) or 21
        self.username = username
        self.password = password
        self.timeout = timeout
        self._ftp = None
        self._lock = threading.Lock()

    def connect(self):
        self.disconnect()
        ftp = FTP()
        ftp.connect(self.host, self.port, timeout=self.timeout)
        ftp.login(self.username, self.password)
        ftp.set_pasv(True)
        self._ftp = ftp
        return ftp

    @property
    def ftp(self):
        if self._ftp is None:
            self.connect()
        return self._ftp

    def disconnect(self):
        if self._ftp is not None:
            try:
                self._ftp.quit()
            except Exception:
                try:
                    self._ftp.close()
                except Exception:
                    pass
            self._ftp = None

    def _lines(self, path):
        ftp = self.ftp
        collected = []
        ftp.retrlines("LIST " + _safe_path(path), collected.append)
        return collected

    def list_dir(self, path):
        with self._lock:
            try:
                entries = []
                for name, facts in self.ftp.mlsd(path):
                    if name in (".", ".."):
                        continue
                    kind = facts.get("type", "")
                    entries.append({
                        "name": name,
                        "is_dir": kind == "dir",
                        "size": int(facts.get("size", 0) or 0),
                    })
                return entries
            except (error_perm, OSError, Exception):
                pass

            entries = []
            for line in self._lines(path):
                entry = _parse_unix_list(line) or _parse_dos_list(line)
                if entry:
                    entries.append(entry)
            entries.sort(key=lambda e: (not e["is_dir"], e["name"].lower()))
            return entries

    def pwd(self):
        with self._lock:
            return self.ftp.pwd()

    def download_size(self, remote_path):
        return self.ftp.size(remote_path)

    def upload_file(self, local_path, remote_dir, remote_name=None, progress_cb=None,
                    overwrite=True):
        with self._lock:
            ftp = self.ftp
            if not overwrite:
                existing = [e["name"] for e in self.list_dir(remote_dir)]
                target_base = remote_name or os.path.basename(local_path)
                if target_base in existing:
                    raise error_perm(f"El archivo '{target_base}' ya existe en el destino.")

            ftp.cwd(remote_dir)
            name = remote_name or os.path.basename(local_path)
            total = os.path.getsize(local_path)
            sent = [0]

            def cb(data):
                sent[0] += len(data)
                if progress_cb:
                    progress_cb(sent[0], total)

            with open(local_path, "rb") as f:
                ftp.storbinary(f"STOR {name}", f, blocksize=8192, callback=cb)
            return name, total

    def make_dir(self, parent, name):
        with self._lock:
            try:
                self.ftp.mkd(_join(parent, name))
            except error_perm:
                return False
            return True

    def mkdirs(self, path):
        current = "/"
        for part in [p for p in path.split("/") if p]:
            current = _join(current, part)
            try:
                self.ftp.cwd(current)
            except error_perm:
                try:
                    self.ftp.mkd(current)
                except error_perm:
                    pass


def _safe_path(path):
    path = (path or "/").replace("\\", "/")
    if not path.startswith("/"):
        path = "/" + path
    return path


def _join(a, b):
    a = (a or "/").rstrip("/")
    b = (b or "").lstrip("/")
    if not a:
        return "/" + b
    if not b:
        return a + "/"
    return a + "/" + b