import json
import os
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from .config import (
    BASE_DIR,
    load_config,
    load_state,
    normalize_extensions,
    save_config,
)
from .engine import Engine
from .ftp import FtpClient

app = FastAPI(title="autoftp")
engine = Engine()

STATIC_DIR = Path(__file__).resolve().parent / "static"


def _client_from_config(cfg=None):
    cfg = cfg or load_config()
    ftp_cfg = cfg.get("ftp", {})
    return FtpClient(
        host=ftp_cfg.get("host", ""),
        port=ftp_cfg.get("port", 21),
        username=ftp_cfg.get("username", ""),
        password=ftp_cfg.get("password", ""),
    )


@app.on_event("startup")
def _startup():
    engine.start()


@app.on_event("shutdown")
def _shutdown():
    engine.stop()


@app.get("/")
def index():
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/api/config")
def get_config():
    return load_config()


@app.post("/api/config")
async def set_config(request: Request):
    body = await request.json()
    save_config(body)
    return {"ok": True, "config": load_config()}


@app.post("/api/ftp/connect")
async def ftp_connect(request: Request):
    body = await request.json()
    client = FtpClient(
        host=body.get("host", ""),
        port=body.get("port", 21),
        username=body.get("username", ""),
        password=body.get("password", ""),
    )
    try:
        client.connect()
        pwd = client.pwd()
        entries = client.list_dir(pwd)
        client.disconnect()
        return {"ok": True, "pwd": pwd, "entries": entries}
    except Exception as exc:
        return JSONResponse(status_code=400, content={"ok": False, "error": str(exc)})


@app.post("/api/ftp/list")
async def ftp_list(request: Request):
    body = await request.json()
    cfg = load_config()
    client = _client_from_config(cfg)
    path = body.get("path") or cfg["ftp"].get("remote_dir", "/") or "/"
    try:
        client.connect()
        entries = client.list_dir(path)
        pwd = path
        return {"ok": True, "pwd": pwd, "entries": entries}
    except Exception as exc:
        return JSONResponse(status_code=400, content={"ok": False, "error": str(exc)})
    finally:
        client.disconnect()


@app.post("/api/ftp/mkdir")
async def ftp_mkdir(request: Request):
    body = await request.json()
    client = _client_from_config()
    try:
        client.connect()
        client.mkdirs(body.get("path", "/"))
        return {"ok": True}
    except Exception as exc:
        return JSONResponse(status_code=400, content={"ok": False, "error": str(exc)})
    finally:
        client.disconnect()


@app.post("/api/local/list")
async def local_list(request: Request):
    body = await request.json()
    folder = body.get("folder") or ""
    exts = normalize_extensions(body.get("extensions") or [".zip"])
    if not os.path.isdir(folder):
        return {"ok": False, "error": f"La carpeta no existe: {folder}", "files": []}
    files = []
    for name in os.listdir(folder):
        path = os.path.join(folder, name)
        if os.path.isfile(path) and any(name.lower().endswith(e) for e in exts):
            st = os.stat(path)
            files.append({
                "name": name,
                "size": st.st_size,
                "mtime": st.st_mtime,
            })
    files.sort(key=lambda f: f["mtime"], reverse=True)
    return {"ok": True, "folder": folder, "extensions": exts, "files": files}


@app.get("/api/downloads")
def downloads():
    from .config import default_downloads_folder

    return {"path": default_downloads_folder()}


@app.post("/api/upload")
async def upload(request: Request):
    body = await request.json()
    local_path = body.get("local_path") or ""
    remote_dir = body.get("remote_dir") or "/"
    remote_name = body.get("remote_name") or None
    overwrite = body.get("overwrite", True)

    if not local_path or not os.path.isfile(local_path):
        return JSONResponse(status_code=400, content={
            "ok": False,
            "error": f"El archivo local no existe: {local_path}",
        })

    client = _client_from_config()
    try:
        client.connect()
        name, size = client.upload_file(
            local_path, remote_dir, remote_name=remote_name, overwrite=overwrite
        )
        engine.add_log("ok", f"Subido manualmente: {name} ({size} bytes) -> {remote_dir}")
        return {"ok": True, "name": name, "size": size}
    except Exception as exc:
        engine.add_log("error", f"Fallo subida manual: {exc}")
        return JSONResponse(status_code=400, content={"ok": False, "error": str(exc)})
    finally:
        client.disconnect()


@app.post("/api/scan")
async def scan(request: Request):
    body = await request.json()
    force = bool(body.get("force", False))
    start_idx = len(engine.logs)
    results = engine.scan_and_upload(force=force)
    has_errors = any(
        log["level"] == "error" and "Fallo subiendo" in log["message"]
        for log in engine.logs[start_idx:]
    )
    status = "error" if has_errors else ("ok" if results else "idle")
    return {"ok": True, "status": status, "results": results}


@app.get("/api/status")
def status():
    state = load_state()
    cfg = load_config()
    return {
        "running": engine.is_running(),
        "logs": engine.logs[-200:],
        "recent": state.get("seen", {}),
    }


@app.get("/api/state")
def state():
    return load_state()


app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")