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

function setStatus(text, kind, key) {
  const el = $("#conn-status");
  el.textContent = text;
  el.className = "status-chip" + (kind ? " " + kind : "");
  if (key) el.dataset.i18nKey = key;
  else delete el.dataset.i18nKey;
}

function toastError(msg) {
  alert(msg);
}

/* ---------- theme ---------- */
function initTheme() {
  let saved = null;
  try {
    saved = localStorage.getItem("autoftp.theme");
  } catch (e) { /* ignore */ }
  const prefersDark = window.matchMedia
    ? window.matchMedia("(prefers-color-scheme: dark)").matches
    : false;
  const theme = saved || (prefersDark ? "dark" : "light");
  applyTheme(theme);
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  $("#theme-toggle").textContent = theme === "dark" ? "☀️" : "🌙";
  try {
    localStorage.setItem("autoftp.theme", theme);
  } catch (e) { /* ignore */ }
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme");
  applyTheme(current === "dark" ? "light" : "dark");
}

/* ---------- i18n ---------- */
function initLanguage() {
  initLang();
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
  addBtn.title = t("ext.add");
  addBtn.onclick = () => addExtInput("");
  row.appendChild(addBtn);
  if (document.querySelectorAll(".ext-input").length > 0) {
    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.textContent = "×";
    delBtn.title = t("ext.remove");
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
  setStatus(t("status.saved"), "ok", "status.saved");
}

function updateAutoNote() {
  const parts = [];
  const exts = $$(".ext-input").map((i) => i.value.trim()).filter(Boolean);
  if ($("#auto-enabled").checked) {
    parts.push(
      t("note.activeWatching", {
        exts: exts.join(", ") || ".zip",
        n: $("#auto-interval").value || 10,
        path: remotePath,
      })
    );
  }
  if ($("#sched-enabled").checked) {
    parts.push(t("note.activeSchedule", { time: $("#sched-time").value }));
  }
  $("#auto-note").textContent = parts.length
    ? t("note.activePrefix") + parts.join(" · ")
    : t("note.none");
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
  setStatus(t("status.connecting"), null, "status.connecting");
  try {
    const data = await api("/api/ftp/connect", "POST", body);
    remotePath = data.pwd || "/";
    renderBreadcrumb();
    renderRemote(data.entries);
    setStatus(t("status.connectedTo") + body.host, "ok");
  } catch (e) {
    setStatus(t("status.disconnected"), "err", "status.disconnected");
    renderRemote([]);
    toastError(t("alert.connectFail", { e: e.message }));
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
    setStatus(t("status.connected"), "ok", "status.connected");
  } catch (e) {
    toastError(t("alert.openFail", { e: e.message }));
  }
}

function renderRemote(entries) {
  const tbody = $("#remote-table tbody");
  tbody.innerHTML = "";
  if (!entries || !entries.length) {
    tbody.innerHTML = `<tr><td colspan="3" class="hint">${t("table.emptyFolder")}</td></tr>`;
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
      btn.textContent = t("table.enter");
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
  const name = prompt(t("prompt.newFolder"));
  if (!name) return;
  try {
    await api("/api/ftp/mkdir", "POST", { path: joinPath(remotePath, name) });
    navigateTo(remotePath);
  } catch (e) {
    toastError(t("alert.createFail", { e: e.message }));
  }
}

function useFolderAsTarget() {
  saveConfig().then(() => {
    setStatus(t("status.destSet") + remotePath, "ok");
    updateAutoNote();
  });
}

/* ---------- local folder ---------- */
async function refreshLocal() {
  const folder = $("#local-folder").value.trim();
  const extensions = $$(".ext-input").map((i) => i.value.trim()).filter(Boolean);
  const tbody = $("#local-table tbody");
  tbody.innerHTML = `<tr><td colspan="3" class="hint">${t("table.loading")}</td></tr>`;
  try {
    const data = await api("/api/local/list", "POST", { folder, extensions });
    if (!data.ok) {
      tbody.innerHTML = `<tr><td colspan="3" class="err-text">${escapeHtml(data.error)}</td></tr>`;
      return;
    }
    if (!data.files.length) {
      tbody.innerHTML = `<tr><td colspan="3" class="hint">${t("table.noFiles", {
        list: data.extensions.join(", "),
      })}</td></tr>`;
      return;
    }
    const seen = await api("/api/status").then((s) => s.recent || {});
    tbody.innerHTML = "";
    data.files.forEach((f) => {
      const key = Object.keys(seen).find((k) => k.startsWith(f.name + "|"));
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="name">📄 ${escapeHtml(f.name)}</td>
        <td>${human(f.size)}</td>
        <td class="${key ? "ok-text" : ""}">${key ? escapeHtml(t("table.yes")) : escapeHtml(t("table.no"))}</td>`;
      tbody.appendChild(tr);
    });
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="3" class="err-text">${escapeHtml(e.message)}</td></tr>`;
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
  setStatus(t("status.uploading"), null, "status.uploading");
  try {
    await saveConfig();
    const data = await api("/api/scan", "POST", { force: false });
    if (data.status === "error") {
      setStatus(t("status.uploadError"), "err", "status.uploadError");
    } else if (data.results && data.results.length) {
      setStatus(t("status.uploadedCount", { n: data.results.length }), "ok");
    } else {
      setStatus(t("status.nothingNew"), null, "status.nothingNew");
    }
    refreshLocal();
  } catch (e) {
    setStatus(t("status.uploadError"), "err", "status.uploadError");
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
    if (data.running) setStatus(t("status.systemActive"), "ok", "status.systemActive");
  } catch (e) {
    /* ignore */
  }
}

/* ---------- init ---------- */
function bind() {
  $("#btn-connect").onclick = connectAndBrowse;
  $("#btn-save-config").onclick = () => saveConfig().then(() => setStatus(t("status.saveShort"), "ok", "status.saveShort"));
  $("#btn-new-folder").onclick = newFolder;
  $("#btn-use-folder").onclick = useFolderAsTarget;
  $("#btn-use-downloads").onclick = useDownloads;
  $("#btn-refresh-local").onclick = refreshLocal;
  $("#btn-scan-now").onclick = scanNow;
  $("#theme-toggle").onclick = toggleTheme;
  ["auto-enabled", "auto-interval", "sched-enabled", "sched-time"].forEach((id) => {
    $("#" + id).addEventListener("change", updateAutoNote);
  });
}

async function init() {
  initTheme();
  bind();
  initLanguage();
  renderBreadcrumb();
  await loadConfig();
  await refreshLocal();
  await connectAndBrowse();
  setInterval(pollLogs, 2000);
  pollLogs();
}

init();