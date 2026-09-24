import json
import os
import tempfile
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
CONFIG_PATH = BASE_DIR / "config.json"
STATE_PATH = BASE_DIR / "state.json"

DEFAULT_CONFIG = {
    "ftp": {
        "host": "192.168.1.100",
        "port": 21,
        "username": "anonymous",
        "password": "",
        "remote_dir": "/",
    },
    "auto_upload": {
        "enabled": True,
        "extension": ".zip",
        "folder": "",
        "interval_seconds": 10,
    },
    "schedule": {
        "enabled": False,
        "time": "20:00",
    },
    "searched_files": [],
}


def default_downloads_folder():
    home = Path.home()
    candidates = [
        home / "Downloads",
        home / "Descargas",
        Path(os.environ.get("USERPROFILE", str(home))) / "Downloads",
        Path(os.environ.get("USERPROFILE", str(home))) / "Descargas",
    ]
    for c in candidates:
        if c.is_dir():
            return str(c)
    return str(home / "Downloads")


def load_config() -> dict:
    if CONFIG_PATH.exists():
        data = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
        merged = json.loads(json.dumps(DEFAULT_CONFIG))
        merged.update(data)
        return merged
    cfg = json.loads(json.dumps(DEFAULT_CONFIG))
    cfg["auto_upload"]["folder"] = default_downloads_folder()
    save_config(cfg)
    return cfg


def save_config(cfg: dict) -> None:
    CONFIG_PATH.write_text(json.dumps(cfg, indent=2, ensure_ascii=False), encoding="utf-8")


def load_state() -> dict:
    if STATE_PATH.exists():
        try:
            return json.loads(STATE_PATH.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            return {}
    return {}


def save_state(state: dict) -> None:
    STATE_PATH.write_text(json.dumps(state, indent=2, ensure_ascii=False), encoding="utf-8")


def normalize_extension(ext: str) -> str:
    ext = ext.strip().lower()
    if not ext.startswith("."):
        ext = "." + ext
    return ext