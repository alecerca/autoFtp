# autoftp

Herramienta de escritorio (interfaz web local) para **Windows** que vigila una carpeta local (por defecto *Descargas*), detecta archivos con una extensión que tú elijas (`.zip`, `.exe`, …) y los sube por **FTP** a una IP que tú configures y en la carpeta remota que elijas navegando por el servidor. Esencialmente, un "WinSCP automático".

## Cómo funciona

1. Eliges una **IP / servidor FTP** destino, usuario y contraseña.
2. Navegas por el árbol de directorios del servidor y pulsas "Usar esta carpeta como destino".
3. Configuras la **carpeta local** y las **extensiones** a vigilar (`.zip`, `.exe`, las que quieras; puedes añadir varias con el botón `+`).
4. Activas:
   - **Subida automática**: en cuanto aparezca un archivo con alguna de esas extensiones, se sube solo.
   - **Subida programada**: a una hora fija se envían todos los archivos con esas extensiones.

> **Consejo**: usa una carpeta dedicada (ej. `Descargas\autoftp`) y mete ahí solo lo que quieras enviar. Así no se cuelan descargas que no planeaste.

Este es un "WinSCP automático": eliges el archivo, indicas la hora/regla y la IP+ruta destino, y se copia solo.

## Requisitos

- Windows 10/11 con Python 3.10+ instalado (marca *"Add Python to PATH"* durante la instalación).
  - Descarga: https://www.python.org/downloads/
- Un **servidor FTP** corriendo en la IP destino (FileZilla Server, vsftpd, IIS…) con un usuario con permisos de escritura.
- Puerto FTP de la IP (normalmente **21**) alcanzable desde tu red.

## Instalación y uso

1. Doble clic en `start.bat`.
   La primera vez crea un entorno virtual, instala dependencias y abre la web en `http://localhost:8123`.
2. En la web: configura el FTP, explora el destino, define la extensión y activa la automatización.
3. Para que quede ejecutándose sin abrir la consola, crea una tarea en el *Programador de tareas de Windows* apuntando a `start.bat` (o a `run_headless.bat` si lo añades).

## Extra

- **Idiomas**: español e inglés, con botón de cambio en la cabecera (se recuerda tu elección).
- **Tema claro/oscuro**: botón en la cabecera; por defecto sigue al sistema.

## Estructura

```
autoftp/
├── app/
│   ├── main.py      # API web (FastAPI) + endpoints
│   ├── engine.py    # watcher (extensión) + scheduler (hora)
│   ├── ftp.py       # cliente FTP (lista, navega, sube)
│   ├── config.py    # configuración y estado en JSON
│   └── static/      # interfaz web (HTML/CSS/JS)
├── start.bat        # lanzador Windows
├── requirements.txt
└── config.json      # se genera al primer arranque
```

## Desarrollo

Para arrancar en modo dev:

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8123
```