const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

let config = null;
let remotePath = "/";
let logIndex = 0;

async function api(path, method = "GET", body = null) {
  const opts = { method, headers: { "Content-Type": "application/json" } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(path, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok && data.error) {
    const err = new Error(data.error);
    err.data = data;
    throw err;
  }
  return data;
}

function human(bytes) {
  if (bytes < 1024) return bytes + " B";
  const units = ["KB", "MB", "GB", "TB"];
  let i = -1;
  do { bytes /= 1024; i++; } while (bytes >= 1024 && i < units.length - 1);
  return bytes.toFixed(1) + " " + units[i];
}

function setStatus(text, kind) {
  const el = $("#conn-status");
  el.textContent = text;
  el.className = "status-chip" + (kind ? " " + kind : "");
}

function toastError(msg) {
  alert(msg);
}

/* ---------- config ---------- */
async function loadConfig() {
  config = await api("/api/config");
  $("#ftp-host").value = config.ftp.host || "";
  $("#ftp-port").value = config.ftp.port || 21;
  $("#ftp-user").value = config.ftp.username || "";
  $("#ftp-pass").value = config.ftp.password || "";
  $("#local-folder").value = config.auto_upload.folder || "";
  renderExtInputs(config.auto_upload.extensions || [".zip"]);
  $("#auto-enabled").checked = !!config.auto_upload.enabled;
  $("#auto-interval").value = config.auto_upload.interval_seconds || 10;
  $("#sched-enabled").checked = !!config.schedule.enabled;
  $("#sched-time").value = config.schedule.time || "20:00";
  remotePath = config.ftp.remote_dir || "/";
  updateAutoNote();
}

function collectConfig() {
  return {
    ftp: {
      host: $("#ftp-host").value.trim(),
      port: parseInt($("#ftp-port").value, 10) || 21,
      username: $("#ftp-user").value.trim(),
      password: $("#ftp-pass").value,
      remote_dir: remotePath,
    },
    auto_upload: {
      enabled: $("#auto-enabled").checked,
      extensions: $$(".ext-input").map((i) => i.value.trim()).filter(Boolean),
      folder: $("#local-folder").value.trim(),
      interval_seconds: parseInt($("#auto-interval").value, 10) || 10,
    },
    schedule: {
      enabled: $("#sched-enabled").checked,
      time: $("#sched-time").value || "20:00",
    },
    searched_files: config ? config.searched_files || [] : [],
  };
}

function renderExtInputs(exts) {
  const list = $("#ext-list");
  list.innerHTML = "";
  (exts.length ? exts : [".zip"]).forEach((ext) => addExtInput(ext));
}

function addExtInput(ext) {
  const list = $("#ext-list");
  const row = document.createElement("div");
  row.className = "ext-row";
  const input = document.createElement("input");
  input.className = "ext-input";
  input.placeholder = ".zip";
  input.value = ext || "";
  row.appendChild(input);
  const addBtn = document.createElement("button");
  addBtn.type = "button";
  addBtn.textContent = "+";
  addBtn.title = "Añadir otra extensión";
  addBtn.onclick = () => addExtInput("");
  row.appendChild(addBtn);
  if (document.querySelectorAll(".ext-input").length > 0) {
    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.textContent = "×";
    delBtn.title = "Quitar extensión";
    delBtn.onclick = () => {
      row.remove();
      updateAutoNote();
    };
    row.appendChild(delBtn);
  }
  list.appendChild(row);
  input.addEventListener("input", updateAutoNote);
}

async function saveConfig() {
  config = await api("/api/config", "POST", collectConfig());
  setStatus("configuración guardada", "ok");
}

function updateAutoNote() {
  const parts = [];
  const exts = $$(".ext-input").map((i) => i.value.trim()).filter(Boolean);
  if ($("#auto-enabled").checked) {
    parts.push(
      `vigilando ${exts.join(", ") || ".zip"} cada ` +
        `${$("#auto-interval").value || 10}s → ${remotePath}`
    );
  }
  if ($("#sched-enabled").checked) {
    parts.push(`subida fija a las ${$("#sched-time").value}`);
  }
  $("#auto-note").textContent = parts.length
    ? "Activo: " + parts.join(" · ")
    : "Sin automatización activa.";
}

/* ---------- remote browser ---------- */
function renderBreadcrumb() {
  const bc = $("#breadcrumb");
  bc.innerHTML = "";
  const parts = remotePath.split("/").filter(Boolean);
  const home = document.createElement("span");
  home.className = "crumb";
  home.textContent = "/";
  home.onclick = () => navigateTo("/");
  bc.appendChild(home);

  let acc = "";
  parts.forEach((p) => {
    acc += "/" + p;
    const sep = document.createElement("span");
    sep.className = "sep";
    sep.textContent = "›";
    bc.appendChild(sep);
    const c = document.createElement("span");
    c.className = "crumb";
    c.textContent = p;
    const target = acc;
    c.onclick = () => navigateTo(target);
    bc.appendChild(c);
  });
}

async function connectAndBrowse() {
  const body = {
    host: $("#ftp-host").value.trim(),
    port: parseInt($("#ftp-port").value, 10) || 21,
    username: $("#ftp-user").value.trim(),
    password: $("#ftp-pass").value,
  };
  setStatus("conectando…");
  try {
    const data = await api("/api/ftp/connect", "POST", body);
    remotePath = data.pwd || "/";
    renderBreadcrumb();
    renderRemote(data.entries);
    setStatus("conectado a " + body.host, "ok");
  } catch (e) {
    setStatus("sin conexión", "err");
    renderRemote([]);
    toastError("No se pudo conectar: " + e.message);
  }
}

async function navigateTo(path) {
  const body = {
    path,
    host: $("#ftp-host").value.trim(),
    port: parseInt($("#ftp-port").value, 10) || 21,
    username: $("#ftp-user").value.trim(),
    password: $("#ftp-pass").value,
  };
  try {
    const data = await api("/api/ftp/list", "POST", body);
    remotePath = data.pwd || path;
    renderBreadcrumb();
    renderRemote(data.entries);
    setStatus("conectado", "ok");
  } catch (e) {
    toastError("No se pudo abrir: " + e.message);
  }
}

function renderRemote(entries) {
  const tbody = $("#remote-table tbody");
  tbody.innerHTML = "";
  if (!entries || !entries.length) {
    tbody.innerHTML = `<tr><td colspan="3" class="hint">Carpeta vacía</td></tr>`;
    return;
  }
  const dirs = entries.filter((e) => e.is_dir);
  const files = entries.filter((e) => !e.is_dir);
  [...dirs, ...files].forEach((entry) => {
    const tr = document.createElement("tr");
    if (entry.is_dir) tr.className = "is-dir";
    const name = document.createElement("td");
    name.className = "name";
    name.textContent = (entry.is_dir ? "📁 " : "📄 ") + entry.name;
    const size = document.createElement("td");
    size.textContent = entry.is_dir ? "—" : human(entry.size || 0);
    const actions = document.createElement("td");
    actions.className = "actions";
    if (entry.is_dir) {
      const btn = document.createElement("button");
      btn.textContent = "Entrar";
      btn.onclick = () => navigateTo(joinPath(remotePath, entry.name));
      actions.appendChild(btn);
    }
    tr.append(name, size, actions);
    tbody.appendChild(tr);
  });
}

function joinPath(base, name) {
  base = (base || "/").replace(/\/+$/, "");
  if (!base) base = "/";
  return base === "/" ? "/" + name : base + "/" + name;
}

async function newFolder() {
  const name = prompt("Nombre de la nueva carpeta:");
  if (!name) return;
  try {
    await api("/api/ftp/mkdir", "POST", { path: joinPath(remotePath, name) });
    navigateTo(remotePath);
  } catch (e) {
    toastError("No se pudo crear: " + e.message);
  }
}

function useFolderAsTarget() {
  saveConfig().then(() => {
    setStatus("destino fijado en " + remotePath, "ok");
    updateAutoNote();
  });
}

/* ---------- local folder ---------- */
async function refreshLocal() {
  const folder = $("#local-folder").value.trim();
  const extensions = $$(".ext-input").map((i) => i.value.trim()).filter(Boolean);
  const tbody = $("#local-table tbody");
  tbody.innerHTML = `<tr><td colspan="3" class="hint">Cargando…</td></tr>`;
  try {
    const data = await api("/api/local/list", "POST", { folder, extensions });
    if (!data.ok) {
      tbody.innerHTML = `<tr><td colspan="3" class="err-text">${data.error}</td></tr>`;
      return;
    }
    if (!data.files.length) {
      tbody.innerHTML = `<tr><td colspan="3" class="hint">Sin archivos con esas extensiones (${data.extensions.join(
        ", "
      )})</td></tr>`;
      return;
    }
    const seen = await api("/api/status").then((s) => s.recent || {});
    tbody.innerHTML = "";
    data.files.forEach((f) => {
      const key = Object.keys(seen).find((k) => k.startsWith(f.name + "|"));
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="name">📄 ${f.name}</td>
        <td>${human(f.size)}</td>
        <td class="${key ? "ok-text" : ""}">${key ? "sí ✓" : "no"}</td>`;
      tbody.appendChild(tr);
    });
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="3" class="err-text">${e.message}</td></tr>`;
  }
}

async function useDownloads() {
  const data = await api("/api/downloads");
  $("#local-folder").value = data.path;
}

/* ---------- manual upload / scan ---------- */
async function scanNow() {
  const btn = $("#btn-scan-now");
  btn.disabled = true;
  setStatus("subiendo…");
  try {
    await saveConfig();
    const data = await api("/api/scan", "POST", { force: false });
    if (data.status === "error") {
      setStatus("error en la subida", "err");
    } else if (data.results && data.results.length) {
      setStatus(`subidos ${data.results.length} archivo(s)`, "ok");
    } else {
      setStatus("nada nuevo que subir", "");
    }
    refreshLocal();
  } catch (e) {
    setStatus("error", "err");
    toastError(e.message);
  } finally {
    btn.disabled = false;
  }
}

/* ---------- logs ---------- */
function renderLog(entry) {
  const logs = $("#logs");
  const line = document.createElement("div");
  line.className = "line " + entry.level;
  line.innerHTML = `<span class="t">${entry.time}</span><span class="msg">${escapeHtml(
    entry.message
  )}</span>`;
  logs.appendChild(line);
  logs.scrollTop = logs.scrollHeight;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function pollLogs() {
  try {
    const data = await api("/api/status");
    const logs = data.logs || [];
    if (logs.length > logIndex) {
      logs.slice(logIndex).forEach(renderLog);
      logIndex = logs.length;
    }
    if (data.running) setStatus("sistema activo", "ok");
  } catch (e) {
    /* ignore */
  }
}

/* ---------- init ---------- */
function bind() {
  $("#btn-connect").onclick = connectAndBrowse;
  $("#btn-save-config").onclick = () => saveConfig().then(() => setStatus("guardado", "ok"));
  $("#btn-new-folder").onclick = newFolder;
  $("#btn-use-folder").onclick = useFolderAsTarget;
  $("#btn-use-downloads").onclick = useDownloads;
  $("#btn-refresh-local").onclick = refreshLocal;
  $("#btn-scan-now").onclick = scanNow;
  ["auto-enabled", "auto-interval", "sched-enabled", "sched-time"].forEach((id) => {
    $("#" + id).addEventListener("change", updateAutoNote);
  });
}

async function init() {
  bind();
  renderBreadcrumb();
  await loadConfig();
  await refreshLocal();
  await connectAndBrowse();
  setInterval(pollLogs, 2000);
  pollLogs();
}

init();