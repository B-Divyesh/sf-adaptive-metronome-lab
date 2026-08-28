import "./style.css";
import { amountDefault, createDrill, modeLabels, type Drill, type DrillMode, type PracticeLog } from "./types";
import { describeDrill, estimateSeconds, routePoints, validateDrill } from "./drill";
import { Metronome } from "./metronome";
import { database } from "./storage";

const workspace = document.querySelector<HTMLElement>("#workspace")!;
const toast = document.querySelector<HTMLElement>("#toast")!;
let current = createDrill();
let saved: Drill[] = [];
let logs: PracticeLog[] = [];
let runner: Metronome | null = null;
let startedAt = 0;
let lastBeat = 0;

const modeInfo: Record<DrillMode, { short: string; description: string; min: number; max: number; step: number; unit: string }> = {
  drift: { short: "Wander inside a limit", description: "A seeded tempo route changes every two bars and always stays inside your chosen bound.", min: 1, max: 20, step: 1, unit: "± BPM" },
  ramp: { short: "Move to a destination", description: "The click moves evenly from the starting tempo to a faster or slower destination.", min: -40, max: 60, step: 1, unit: "BPM change" },
  delay: { short: "Meet a late arrival", description: "The final click of every second bar arrives late while the underlying grid stays steady.", min: 20, max: 180, step: 10, unit: "ms late" },
  recovery: { short: "Hold pulse through silence", description: "Two reference bars give way to silent bars, followed by an accented recovery bar.", min: 1, max: 4, step: 1, unit: "silent bars" }
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]!);
}

function showToast(message: string, tone: "normal" | "error" = "normal"): void {
  toast.textContent = message;
  toast.dataset.tone = tone;
  toast.hidden = false;
  window.setTimeout(() => { toast.hidden = true; }, 3600);
}

function routeSvg(drill: Drill): string {
  const values = routePoints(drill);
  const min = Math.min(...values, drill.bpm - 1);
  const max = Math.max(...values, drill.bpm + 1);
  const points = values.map((value, index) => `${Math.round(index * 560 / (values.length - 1))},${Math.round(92 - (value - min) / (max - min) * 68)}`).join(" ");
  const stations = [0, 8, 16, 24].map((index) => {
    const [x, y] = points.split(" ")[index].split(",");
    return `<circle cx="${x}" cy="${y}" r="6" />`;
  }).join("");
  return `<svg viewBox="-8 0 576 108" role="img" aria-labelledby="route-title route-desc"><title id="route-title">Tempo route preview</title><desc id="route-desc">${escapeHtml(describeDrill(drill))}</desc><line x1="0" y1="92" x2="560" y2="92" /><polyline points="${points}" />${stations}</svg>`;
}

function duration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function amountText(drill: Drill): string {
  if (drill.mode === "drift") return `±${drill.amount} BPM`;
  if (drill.mode === "ramp") return `${drill.amount >= 0 ? "+" : ""}${drill.amount} → ${drill.bpm + drill.amount} BPM`;
  if (drill.mode === "delay") return `${drill.amount} ms`;
  return `${drill.amount} silent bar${drill.amount === 1 ? "" : "s"}`;
}

function render(): void {
  const info = modeInfo[current.mode];
  workspace.innerHTML = `
    <section class="practice-grid" id="practice" aria-labelledby="practice-title">
      <div class="editor">
        <div class="section-heading"><div><p class="eyebrow">Route planner</p><h2 id="practice-title">Build your drill</h2></div><div class="planner-actions"><p id="share-note" class="share-note" hidden>Shared route loaded. Save it to keep it.</p><button id="new-drill" class="quiet">New route</button></div></div>
        <fieldset class="mode-picker"><legend>Variation pattern</legend>
          ${Object.entries(modeLabels).map(([mode, label]) => `<label class="mode-option"><input type="radio" name="mode" value="${mode}" ${current.mode === mode ? "checked" : ""} /><span><strong>${label}</strong><small>${modeInfo[mode as DrillMode].short}</small></span></label>`).join("")}
        </fieldset>
        <div class="control-grid">
          <label class="field"><span>Starting tempo <output id="bpm-output" for="bpm">${current.bpm} BPM</output></span><input id="bpm" aria-label="Starting tempo" type="range" min="40" max="220" step="1" value="${current.bpm}" /></label>
          <label class="field"><span>${current.mode === "ramp" ? "Destination change" : modeLabels[current.mode]} <output id="amount-output" for="amount">${amountText(current)}</output></span><input id="amount" type="range" min="${info.min}" max="${info.max}" step="${info.step}" value="${current.amount}" /></label>
          <label class="compact-field"><span>Length</span><select id="bars">${[4, 8, 12, 16, 24, 32, 48, 64].map((n) => `<option value="${n}" ${current.bars === n ? "selected" : ""}>${n} bars</option>`).join("")}</select></label>
          <label class="compact-field"><span>Meter</span><select id="meter">${[2, 3, 4, 5, 6, 7].map((n) => `<option value="${n}" ${current.meter === n ? "selected" : ""}>${n}/4</option>`).join("")}</select></label>
        </div>
        <div class="route-card"><div class="route-meta"><span>Route preview</span><strong id="route-duration">About ${duration(estimateSeconds(current))}</strong></div><div id="route-graphic">${routeSvg(current)}</div><p id="mode-description">${info.description}</p></div>
        <div class="options" aria-label="Cue options">
          <label><input id="audio" type="checkbox" ${current.audio ? "checked" : ""} /><span aria-hidden="true">♪</span> Sound</label>
          <label><input id="visual" type="checkbox" ${current.visual ? "checked" : ""} /><span aria-hidden="true">◉</span> Visual</label>
          <label><input id="haptic" type="checkbox" ${current.haptic ? "checked" : ""} ${"vibrate" in navigator ? "" : "disabled"} /><span aria-hidden="true">≋</span> Vibration${"vibrate" in navigator ? "" : " unavailable"}</label>
        </div>
        <div class="save-row"><label for="drill-name">Drill name</label><div><input id="drill-name" maxlength="60" value="${escapeHtml(current.name)}" placeholder="e.g. Bridge at 92" /><button id="save-drill" class="secondary">Save drill</button><button id="share-drill" class="quiet">Share link</button></div><p class="field-hint">The name and settings stay only on this device.</p></div>
      </div>
      <aside class="transport" aria-labelledby="transport-title">
        <p class="eyebrow">Now departing</p><h2 id="transport-title">${modeLabels[current.mode]}</h2>
        <div class="beat-dial" id="beat-dial" data-silent="false"><span class="beat-ring"></span><strong id="live-bpm">${current.bpm}</strong><small>BPM</small></div>
        <p id="beat-count" class="beat-count">Ready · ${current.meter}/4</p><p id="phase" class="phase">${amountText(current)}</p>
        <button id="transport-button" class="primary"><span aria-hidden="true">▶</span> Start drill</button>
        <p class="shortcut">Press Space to start or stop outside a form field.</p>
        <div class="transport-track" aria-hidden="true"><span id="progress-bar"></span></div>
        <p id="elapsed" class="elapsed">0:00 / ${duration(estimateSeconds(current))}</p>
        <p id="audio-error" class="error" role="alert" hidden></p>
      </aside>
    </section>
    <section class="collection" id="saved" aria-labelledby="saved-title"><div class="section-heading"><div><p class="eyebrow">Your local lines</p><h2 id="saved-title">Saved drills</h2></div><span>${saved.length} on this device</span></div>${renderSaved()}</section>
    <section class="log-section" id="log" aria-labelledby="log-title"><div class="section-heading"><div><p class="eyebrow">Station record</p><h2 id="log-title">Practice log</h2></div><div class="export-actions"><button id="export-csv" class="quiet" ${logs.length ? "" : "disabled"}>Export CSV</button><button id="export-json" class="quiet">Back up JSON</button><label class="import-label">Import JSON<input id="import-json" type="file" accept="application/json" /></label></div></div>${renderLogs()}</section>
    <section class="method" aria-labelledby="method-title"><p class="eyebrow">Operating notes</p><h2 id="method-title">A variation instrument, not a score editor</h2><div><p>Every route is generated from its saved seed, so replaying a bounded-drift drill produces the same tempo changes. Delayed clicks never move the underlying beat grid. Recovery gaps mute the reference, then return on a marked bar.</p><p>Tempo Lab does not listen to or grade your playing. Use the visual and vibration cues with sound, or as alternatives. Start with a comfortable range and stop if a drill is not useful to you.</p></div></section>`;
  bindEvents();
}

function renderSaved(): string {
  if (!saved.length) return `<div class="empty-state"><span aria-hidden="true">◇—◇—◇</span><h3>No routes saved yet</h3><p>Name the drill above and save it. Your first repeatable route will appear here.</p><a href="#practice">Build the first route</a></div>`;
  return `<ul class="drill-list">${saved.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).map((drill) => `<li><div><span class="mode-tag">${modeLabels[drill.mode]}</span><h3>${escapeHtml(drill.name || "Untitled route")}</h3><p>${drill.bpm} BPM · ${amountText(drill)} · ${drill.bars} bars · seed ${drill.seed}</p></div><div><button class="load-drill secondary" data-id="${drill.id}">Load</button><button class="delete-drill quiet danger" data-id="${drill.id}" aria-label="Delete ${escapeHtml(drill.name || "untitled route")}">Delete</button></div></li>`).join("")}</ul>`;
}

function renderLogs(): string {
  if (!logs.length) return `<div class="empty-state compact"><h3>No departures recorded</h3><p>Completed and stopped drills are logged here with the variation you attempted.</p></div>`;
  return `<div class="table-wrap"><table><caption class="sr-only">Practice attempts, newest first</caption><thead><tr><th scope="col">Drill</th><th scope="col">When</th><th scope="col">Route</th><th scope="col">Reached</th><th scope="col">Result</th><th scope="col"><span class="sr-only">Actions</span></th></tr></thead><tbody>${logs.sort((a, b) => b.startedAt.localeCompare(a.startedAt)).map((log) => `<tr><th scope="row">${escapeHtml(log.drillName)}</th><td>${formatDate(log.startedAt)}</td><td>${modeLabels[log.mode]} · ${log.bpm} BPM</td><td>${log.barsReached}/${log.barsPlanned} bars · ${duration(log.seconds)}</td><td><span class="result ${log.completed ? "complete" : "stopped"}">${log.completed ? "Complete" : "Stopped"}</span></td><td><button class="delete-log icon-button" data-id="${log.id}" aria-label="Delete log for ${escapeHtml(log.drillName)}">×</button></td></tr>`).join("")}</tbody></table></div>`;
}

function bindEvents(): void {
  document.querySelectorAll<HTMLInputElement>('input[name="mode"]').forEach((input) => input.addEventListener("change", () => {
    current.mode = input.value as DrillMode; current.amount = amountDefault(current.mode); current.updatedAt = new Date().toISOString(); render();
  }));
  const bpm = document.querySelector<HTMLInputElement>("#bpm")!;
  const amount = document.querySelector<HTMLInputElement>("#amount")!;
  bpm.addEventListener("input", () => { current.bpm = Number(bpm.value); updatePreview(); });
  amount.addEventListener("input", () => { current.amount = Number(amount.value); updatePreview(); });
  document.querySelector<HTMLSelectElement>("#bars")!.addEventListener("change", (event) => { current.bars = Number((event.target as HTMLSelectElement).value); updatePreview(); });
  document.querySelector<HTMLSelectElement>("#meter")!.addEventListener("change", (event) => { current.meter = Number((event.target as HTMLSelectElement).value); updatePreview(); });
  for (const key of ["audio", "visual", "haptic"] as const) document.querySelector<HTMLInputElement>(`#${key}`)!.addEventListener("change", (event) => { current[key] = (event.target as HTMLInputElement).checked; });
  document.querySelector<HTMLInputElement>("#drill-name")!.addEventListener("input", (event) => { current.name = (event.target as HTMLInputElement).value; });
  document.querySelector("#transport-button")!.addEventListener("click", toggleTransport);
  document.querySelector("#save-drill")!.addEventListener("click", saveCurrent);
  document.querySelector("#share-drill")!.addEventListener("click", shareCurrent);
  document.querySelector("#new-drill")!.addEventListener("click", newDrill);
  document.querySelectorAll<HTMLButtonElement>(".load-drill").forEach((button) => button.addEventListener("click", () => loadSaved(button.dataset.id!)));
  document.querySelectorAll<HTMLButtonElement>(".delete-drill").forEach((button) => button.addEventListener("click", () => deleteSaved(button.dataset.id!)));
  document.querySelectorAll<HTMLButtonElement>(".delete-log").forEach((button) => button.addEventListener("click", () => deleteLog(button.dataset.id!)));
  document.querySelector("#export-csv")!.addEventListener("click", exportCsv);
  document.querySelector("#export-json")!.addEventListener("click", exportJson);
  document.querySelector<HTMLInputElement>("#import-json")!.addEventListener("change", importJson);
}

function updatePreview(): void {
  document.querySelector("#bpm-output")!.textContent = `${current.bpm} BPM`;
  document.querySelector("#amount-output")!.textContent = amountText(current);
  document.querySelector("#route-duration")!.textContent = `About ${duration(estimateSeconds(current))}`;
  document.querySelector("#route-graphic")!.innerHTML = routeSvg(current);
  document.querySelector("#live-bpm")!.textContent = String(current.bpm);
  document.querySelector("#phase")!.textContent = amountText(current);
  document.querySelector("#elapsed")!.textContent = `0:00 / ${duration(estimateSeconds(current))}`;
}

async function toggleTransport(): Promise<void> {
  if (runner?.isRunning()) { stopAttempt(false); return; }
  const error = document.querySelector<HTMLElement>("#audio-error")!;
  error.hidden = true;
  if (!current.audio && !current.visual && !current.haptic) {
    error.textContent = "Turn on at least one cue—sound, visual, or vibration—before starting."; error.hidden = false; return;
  }
  lastBeat = 0; startedAt = Date.now();
  runner = new Metronome(onBeat, () => void stopAttempt(true));
  try {
    await runner.start({ ...current });
    const button = document.querySelector<HTMLButtonElement>("#transport-button")!;
    button.innerHTML = `<span aria-hidden="true">■</span> Stop drill`;
    button.classList.add("stop");
    document.querySelector(".transport")!.classList.add("running");
    document.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLButtonElement>(".editor input, .editor select, .editor button").forEach((control) => { control.disabled = true; });
    document.querySelector("#beat-count")!.textContent = "Count in…";
  } catch {
    runner = null;
    error.textContent = "Audio could not start. Check browser sound permissions, or turn off sound and use the visual cue."; error.hidden = false;
  }
}

function onBeat(index: number, plan: ReturnType<typeof import("./drill").getBeatPlan>): void {
  lastBeat = index;
  const bar = Math.floor(index / current.meter) + 1;
  const beat = index % current.meter + 1;
  const dial = document.querySelector<HTMLElement>("#beat-dial")!;
  dial.dataset.silent = String(!plan.audible);
  if (current.visual) {
    dial.classList.remove("pulse");
    if (plan.bpm <= 180) { dial.classList.remove("fast-beat"); requestAnimationFrame(() => dial.classList.add("pulse")); }
    else dial.classList.add("fast-beat");
  }
  document.querySelector("#live-bpm")!.textContent = String(Math.round(plan.bpm));
  document.querySelector("#beat-count")!.textContent = `Bar ${bar} of ${current.bars} · Beat ${beat} of ${current.meter}`;
  document.querySelector("#phase")!.textContent = plan.phase;
  const progress = (index + 1) / (current.bars * current.meter) * 100;
  (document.querySelector<HTMLElement>("#progress-bar")!).style.width = `${progress}%`;
  const elapsed = (Date.now() - startedAt) / 1000;
  document.querySelector("#elapsed")!.textContent = `${duration(elapsed)} / ${duration(estimateSeconds(current))}`;
}

async function stopAttempt(completed: boolean): Promise<void> {
  if (!runner && !completed) return;
  runner?.stop(); runner = null;
  const seconds = Math.max(0, (Date.now() - startedAt) / 1000);
  const barsReached = completed ? current.bars : Math.min(current.bars, Math.floor(lastBeat / current.meter) + 1);
  const button = document.querySelector<HTMLButtonElement>("#transport-button");
  if (button) { button.innerHTML = `<span aria-hidden="true">▶</span> Start drill`; button.classList.remove("stop"); }
  document.querySelector(".transport")?.classList.remove("running");
  const log: PracticeLog = { id: crypto.randomUUID(), drillName: current.name.trim() || modeLabels[current.mode], mode: current.mode, startedAt: new Date(startedAt).toISOString(), seconds: Math.round(seconds), barsPlanned: current.bars, barsReached, bpm: current.bpm, amount: current.amount, completed };
  try { await database.saveLog(log); logs.push(log); showToast(completed ? "Route complete. Practice logged." : "Stopped route added to the log."); }
  catch { showToast("The attempt ended, but the local log could not be saved.", "error"); }
  render();
}

function newDrill(): void {
  if (runner?.isRunning()) runner.stop();
  current = createDrill();
  render();
  document.querySelector<HTMLInputElement>("#drill-name")?.focus();
  showToast("Fresh route ready with a new repeatable seed.");
}

async function saveCurrent(): Promise<void> {
  const nameInput = document.querySelector<HTMLInputElement>("#drill-name")!;
  current.name = nameInput.value.trim();
  if (!current.name) { nameInput.setCustomValidity("Give this drill a name so you can find it later."); nameInput.reportValidity(); nameInput.focus(); return; }
  nameInput.setCustomValidity(""); current.updatedAt = new Date().toISOString();
  try {
    await database.saveDrill({ ...current });
    const index = saved.findIndex((item) => item.id === current.id);
    if (index >= 0) saved[index] = { ...current }; else saved.push({ ...current });
    showToast(`Saved “${current.name}”.`); render(); document.querySelector("#saved")?.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch { showToast("This drill could not be saved. Check that private browsing allows local storage.", "error"); }
}

function loadSaved(id: string): void {
  const drill = saved.find((item) => item.id === id); if (!drill) return;
  if (runner?.isRunning()) runner.stop();
  current = { ...drill }; render(); location.hash = "practice"; showToast(`Loaded “${drill.name}”.`);
}

async function deleteSaved(id: string): Promise<void> {
  const drill = saved.find((item) => item.id === id); if (!drill) return;
  if (!confirm(`Delete “${drill.name}” from this device? Practice log entries will stay.`)) return;
  try { await database.deleteDrill(id); saved = saved.filter((item) => item.id !== id); render(); showToast(`Deleted “${drill.name}”.`); }
  catch { showToast("The saved drill could not be deleted.", "error"); }
}

async function deleteLog(id: string): Promise<void> {
  const log = logs.find((item) => item.id === id); if (!log || !confirm(`Delete this ${formatDate(log.startedAt)} log entry?`)) return;
  try { await database.deleteLog(id); logs = logs.filter((item) => item.id !== id); render(); showToast("Log entry deleted."); }
  catch { showToast("The log entry could not be deleted.", "error"); }
}

function sharePayload(drill: Drill): string {
  const copy = { n: drill.name, m: drill.mode, b: drill.bpm, l: drill.bars, t: drill.meter, a: drill.amount, s: drill.seed };
  const bytes = new TextEncoder().encode(JSON.stringify(copy));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function shareCurrent(): Promise<void> {
  const url = new URL(location.href); url.hash = ""; url.search = `?route=${sharePayload(current)}`;
  try { await navigator.clipboard.writeText(url.toString()); showToast("Share link copied. It contains settings only."); }
  catch { prompt("Copy this settings-only link:", url.toString()); }
}

function loadShared(): boolean {
  const encoded = new URLSearchParams(location.search).get("route"); if (!encoded) return false;
  try {
    const data = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(encoded.replace(/-/g, "+").replace(/_/g, "/")), (char) => char.charCodeAt(0))));
    const candidate = validateDrill({ id: crypto.randomUUID(), name: data.n || "Shared route", mode: data.m, bpm: data.b, bars: data.l, meter: data.t, amount: data.a, seed: data.s, audio: true, visual: true, haptic: false });
    if (!candidate) throw new Error("Invalid route"); current = candidate; return true;
  } catch { showToast("That share link is incomplete or invalid. A fresh drill was opened instead.", "error"); return false; }
}

function download(name: string, content: string, type: string): void {
  const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([content], { type })); link.download = name; link.click(); window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

function exportCsv(): void {
  const fields = ["started_at", "drill", "mode", "starting_bpm", "variation", "bars_planned", "bars_reached", "seconds", "result"];
  const quote = (value: unknown) => `"${String(value).replace(/"/g, '""')}"`;
  const rows = logs.map((log) => [log.startedAt, log.drillName, modeLabels[log.mode], log.bpm, log.amount, log.barsPlanned, log.barsReached, log.seconds, log.completed ? "complete" : "stopped"].map(quote).join(","));
  download(`tempo-lab-log-${new Date().toISOString().slice(0, 10)}.csv`, [fields.join(","), ...rows].join("\n"), "text/csv");
}

function exportJson(): void { download(`tempo-lab-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify({ product: "Tempo Lab", version: 1, exportedAt: new Date().toISOString(), drills: saved, logs }, null, 2), "application/json"); }

async function importJson(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement; const file = input.files?.[0]; if (!file) return;
  try {
    const data = JSON.parse(await file.text()) as { drills?: unknown[]; logs?: PracticeLog[] };
    const drills = (data.drills ?? []).map(validateDrill).filter((item): item is Drill => item !== null);
    const incomingLogs = Array.isArray(data.logs) ? data.logs.filter((log) => log && typeof log.id === "string" && typeof log.startedAt === "string") : [];
    if (!drills.length && !incomingLogs.length) throw new Error("No data");
    await database.importData(drills, incomingLogs); saved = await database.getDrills(); logs = await database.getLogs(); render(); showToast(`Imported ${drills.length} drill${drills.length === 1 ? "" : "s"} and ${incomingLogs.length} log entr${incomingLogs.length === 1 ? "y" : "ies"}.`);
  } catch { showToast("That file is not a valid Tempo Lab JSON backup.", "error"); }
  input.value = "";
}

function updateNetwork(): void {
  const element = document.querySelector<HTMLElement>("#network-status")!;
  element.textContent = navigator.onLine ? "Online · offline ready" : "Offline · practice available";
  element.classList.toggle("offline", !navigator.onLine);
}

function registerServiceWorker(): void {
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register("/sw.js").then((registration) => {
    registration.addEventListener("updatefound", () => {
      const worker = registration.installing; if (!worker) return;
      worker.addEventListener("statechange", () => { if (worker.state === "installed" && navigator.serviceWorker.controller) showToast("A Tempo Lab update is ready. Refresh when you finish this drill."); });
    });
  }).catch(() => showToast("Offline install is unavailable, but the current page still works.", "error"));
}

window.addEventListener("online", updateNetwork); window.addEventListener("offline", updateNetwork);
window.addEventListener("keydown", (event) => {
  if (event.code !== "Space" || event.repeat) return;
  const target = event.target as HTMLElement;
  if (["INPUT", "SELECT", "TEXTAREA", "BUTTON", "A"].includes(target.tagName) || target.isContentEditable) return;
  event.preventDefault(); void toggleTransport();
});

async function init(): Promise<void> {
  updateNetwork(); registerServiceWorker(); const shared = loadShared();
  try { [saved, logs] = await Promise.all([database.getDrills(), database.getLogs()]); }
  catch { showToast("Local storage is unavailable. You can practice, but saves and logs will not persist.", "error"); }
  render(); if (shared) { const note = document.querySelector<HTMLElement>("#share-note"); if (note) note.hidden = false; }
}

void init();
