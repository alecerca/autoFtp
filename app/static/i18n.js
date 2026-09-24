/* i18n: sistema de traducciones ES/EN */
const I18N = {
  es: {
    "tagline": "Envía tus archivos por FTP sin esfuerzo",
    "header.connecting": "conectando…",
    "header.lang": "Idioma",

    "panel.ftp.title": "¿A dónde enviamos?",
    "panel.ftp.hint": "Los datos del servidor FTP de destino.",
    "label.host": "IP del servidor",
    "placeholder.host": "ej. 192.168.1.100",
    "label.port": "Puerto",
    "label.user": "Usuario",
    "placeholder.user": "tu usuario",
    "label.password": "Contraseña",
    "btn.testConnection": "Probar conexión",
    "btn.save": "Guardar",

    "panel.browse.title": "Carpeta de destino en el servidor",
    "panel.browse.hint": "Navega y elige dónde se guardarán los archivos subidos.",
    "table.name": "Nombre",
    "table.size": "Tamaño",
    "btn.createFolder": "Crear carpeta",
    "btn.useFolder": "Usar esta carpeta",

    "panel.local.title": "Qué archivos enviamos",
    "panel.local.hint": "La carpeta que vigilamos y los tipos de archivo. Tip: usa una carpeta propia (ej. <b>C:\\Users\\...\\Downloads\\autoftp</b>) y mete ahí solo lo que quieras enviar, así no se cuelan cosas.",
    "label.localFolder": "Carpeta local",
    "label.extensions": "Extensiones de archivo",
    "btn.useDownloads": "Usar carpeta de Descargas",
    "btn.viewFiles": "Ver archivos",
    "table.file": "Archivo",
    "table.uploaded": "Subido",

    "panel.auto.title": "¿Cuándo se envía?",
    "switch.auto": "Enviar al aparecer el archivo",
    "label.checkEvery": "Revisar cada (seg)",
    "switch.sched": "Enviar a una hora fija",
    "label.time": "Hora",
    "btn.sendNow": "Enviar ahora",

    "panel.logs.title": "Actividad",
    "panel.logs.hint": "Qué se ha enviado y cuándo.",

    "footer.suffix": "servidor local en",

    "ext.add": "Añadir otra extensión",
    "ext.remove": "Quitar extensión",

    "status.saved": "configuración guardada",
    "status.saveShort": "guardado",
    "status.connecting": "conectando…",
    "status.connectedTo": "conectado a ",
    "status.disconnected": "sin conexión",
    "status.connected": "conectado",
    "status.destSet": "destino fijado en ",
    "status.uploading": "subiendo…",
    "status.uploadError": "error en la subida",
    "status.uploadedCount": "subidos {n} archivo(s)",
    "status.nothingNew": "nada nuevo que subir",
    "status.systemActive": "sistema activo",

    "alert.connectFail": "No se pudo conectar: {e}",
    "alert.openFail": "No se pudo abrir: {e}",
    "alert.createFail": "No se pudo crear: {e}",
    "prompt.newFolder": "Nombre de la nueva carpeta:",

    "table.emptyFolder": "Carpeta vacía",
    "table.loading": "Cargando…",
    "table.noFiles": "Sin archivos con esas extensiones ({list})",
    "table.yes": "sí ✓",
    "table.no": "no",
    "table.enter": "Entrar",

    "note.activeWatching": "vigilando {exts} cada {n}s → {path}",
    "note.activeSchedule": "subida fija a las {time}",
    "note.activePrefix": "Activo: ",
    "note.none": "Sin automatización activa."
  },

  en: {
    "tagline": "Send your files via FTP with no effort",
    "header.connecting": "connecting…",
    "header.lang": "Language",

    "panel.ftp.title": "Where are we sending?",
    "panel.ftp.hint": "The destination FTP server details.",
    "label.host": "Server IP",
    "placeholder.host": "e.g. 192.168.1.100",
    "label.port": "Port",
    "label.user": "Username",
    "placeholder.user": "your username",
    "label.password": "Password",
    "btn.testConnection": "Test connection",
    "btn.save": "Save",

    "panel.browse.title": "Destination folder on the server",
    "panel.browse.hint": "Browse and choose where uploaded files will be saved.",
    "table.name": "Name",
    "table.size": "Size",
    "btn.createFolder": "New folder",
    "btn.useFolder": "Use this folder",

    "panel.local.title": "Which files we send",
    "panel.local.hint": "The folder we watch and the file types. Tip: use a dedicated folder (e.g. <b>C:\\Users\\...\\Downloads\\autoftp</b>) and put only what you want to send in there, so nothing unexpected gets included.",
    "label.localFolder": "Local folder",
    "label.extensions": "File extensions",
    "btn.useDownloads": "Use Downloads folder",
    "btn.viewFiles": "View files",
    "table.file": "File",
    "table.uploaded": "Uploaded",

    "panel.auto.title": "When does it send?",
    "switch.auto": "Send when the file appears",
    "label.checkEvery": "Check every (sec)",
    "switch.sched": "Send at a fixed time",
    "label.time": "Time",
    "btn.sendNow": "Send now",

    "panel.logs.title": "Activity",
    "panel.logs.hint": "What has been sent, and when.",

    "footer.suffix": "local server at",

    "ext.add": "Add another extension",
    "ext.remove": "Remove extension",

    "status.saved": "configuration saved",
    "status.saveShort": "saved",
    "status.connecting": "connecting…",
    "status.connectedTo": "connected to ",
    "status.disconnected": "disconnected",
    "status.connected": "connected",
    "status.destSet": "destination set to ",
    "status.uploading": "uploading…",
    "status.uploadError": "upload error",
    "status.uploadedCount": "uploaded {n} file(s)",
    "status.nothingNew": "nothing new to send",
    "status.systemActive": "system active",

    "alert.connectFail": "Could not connect: {e}",
    "alert.openFail": "Could not open: {e}",
    "alert.createFail": "Could not create: {e}",
    "prompt.newFolder": "Name of the new folder:",

    "table.emptyFolder": "Empty folder",
    "table.loading": "Loading…",
    "table.noFiles": "No files with those extensions ({list})",
    "table.yes": "yes ✓",
    "table.no": "no",
    "table.enter": "Open",

    "note.activeWatching": "watching {exts} every {n}s → {path}",
    "note.activeSchedule": "fixed upload at {time}",
    "note.activePrefix": "Active: ",
    "note.none": "No automation active."
  }
};

let currentLang = "es";

function getLang() {
  return currentLang;
}

function setLang(lang) {
  if (!I18N[lang]) return;
  currentLang = lang;
  try {
    localStorage.setItem("autoftp.lang", lang);
  } catch (e) { /* ignore */ }
  applyI18n();
}

function initLang() {
  let saved = null;
  try {
    saved = localStorage.getItem("autoftp.lang");
  } catch (e) { /* ignore */ }
  if (saved && I18N[saved]) {
    currentLang = saved;
  } else {
    const nav = (navigator.language || "es").toLowerCase();
    currentLang = nav.startsWith("en") ? "en" : "es";
  }
  const btn = document.getElementById("lang-toggle");
  if (btn) {
    btn.textContent = currentLang === "es" ? "EN" : "ES";
    btn.onclick = () => {
      setLang(getLang() === "es" ? "en" : "es");
      btn.textContent = getLang() === "es" ? "EN" : "ES";
    };
  }
  applyI18n();
}

/* translate a key with optional {placeholder} interpolation */
function t(key, vars) {
  const langDict = I18N[currentLang] || I18N.es;
  let str = langDict[key] !== undefined ? langDict[key] : (I18N.es[key] !== undefined ? I18N.es[key] : key);
  if (vars) {
    Object.keys(vars).forEach((k) => {
      str = str.split("{" + k + "}").join(vars[k]);
    });
  }
  return str;
}

function applyI18n() {
  document.documentElement.lang = currentLang;

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    const val = t(key);
    // allow simple HTML inside translated hints
    if (el.hasAttribute("data-i18n-html")) {
      el.innerHTML = val;
    } else {
      el.textContent = val;
    }
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.getAttribute("data-i18n-placeholder");
    el.placeholder = t(key);
  });

  // update status chip label if a known text is showing
  const statusEl = document.getElementById("conn-status");
  if (statusEl && statusEl.dataset.i18nKey) {
    statusEl.textContent = t(statusEl.dataset.i18nKey);
  }

  // re-render dynamic pieces
  if (typeof updateAutoNote === "function") updateAutoNote();
}
