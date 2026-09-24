#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

if ! command -v python3 >/dev/null 2>&1; then
    echo "[ERROR] Python 3 no esta instalado."
    exit 1
fi

if [ ! -x ".venv/bin/python" ]; then
    echo "[1/3] Creando entorno virtual..."
    python3 -m venv .venv
fi

echo "[2/3] Instalando dependencias..."
.venv/bin/pip install --quiet --upgrade pip
.venv/bin/pip install --quiet -r requirements.txt

echo "[3/3] Abriendo http://localhost:8123 y arrancando servidor..."
(xdg-open http://localhost:8123 >/dev/null 2>&1 || true)
exec .venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8123