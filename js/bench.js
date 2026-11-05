/* A benchmark dataset's pages on the Data tab (its cases, composition and checks), and the
   benchmark's generator pages (blueprints and the secret registry). Simulated sets are in sim.js. */

import {
  $,
  CHECKS,
  esc,
  f2,
  human,
  KINDS,
  LABEL_ORDER,
  LABELS,
  labelText,
  lazyJson,
  ledgerEntry,
  onKey,
  p1Run,
  query,
  rerender,
  section,
  setOf,
  SETS,
  SITE,
  STAGES,
  state,
  term,
  withQuery,
} from "./core.js?v=2e746ab46e";

/* ---------- Page: cases ---------- */

/* The build shown for a benchmark dataset: the version the URL names, else the dataset's current
   one (the version results rest on), else its split's latest. */
function buildFor(d) {
  const mine = SITE.builds.filter((b) => b.key === d.split);
  const want = query().get("version");
  return mine.find((b) => b.version === want) || mine.find((b) => b.version === d.current) || mine.find((b) => b.latest) || mine[0] || null;
}
const runHref = (name, caseId) => (name.startsWith("ablation") ? `#/ablation/${name}` : `#/run/${name}${caseId ? `/samples?case=${encodeURIComponent(caseId)}` : ""}`);

/* The recorded runs that read this case of this build: every run of the build, unless it ran
   chosen cases only; a run whose samples are here must have this case among them. */
function readBy(build, id) {
  return build.runs.filter((name) => {
    const c = ledgerEntry(name)?.config || {};
    if (c.sample_ids?.length && !c.sample_ids.includes(id)) return false;
    const r = p1Run(name);
    return !r?.samples?.length || r.samples.some((s) => s.scenario_id === id);
  });
}

function highlight(text, secrets, snippet) {
  let html = esc(text);
  if (snippet) html = html.replace(esc(snippet), `<mark class="correlate">${esc(snippet)}</mark>`);
  for (const v of secrets) html = html.split(esc(v)).join(`<mark class="secret">${esc(v)}</mark>`);
  return html;
}

function caseDetail(s, build) {
  if (!s) return `<p class="empty">No case selected.</p>`;
  const runs = readBy(build, s.scenario_id);
  const readLine = runs.length
    ? `<p class="small read-by"><span class="muted">Read by</span> ${runs.slice(0, 6).map((n) => `<a href="${runHref(n, p1Run(n)?.samples?.length ? s.scenario_id : "")}">${esc(n)}</a>`).join(" · ")}${runs.length > 6 ? ` <span class="faint">and ${runs.length - 6} more</span>` : ""}</p>`
    : `<p class="small faint read-by">No recorded run read this case of this build.</p>`;
  const values = [...s.secrets, ...(s.confidential || [])].map((x) => x.value);
  const corrByLog = Object.fromEntries(s.correlates.map((c) => [c.log_id, c]));
  const keys = new Set(s.key_evidence_ids);
  const secretRows = s.secrets.map((x) => {
    const cs = s.correlates.filter((c) => c.secret_type === x.secret_type);
    return `<tr><td>${esc(human(x.secret_type))}</td><td class="mono-cell">${esc(x.value)}</td>
      <td class="mono-cell">${cs.map((c) => `${esc(c.log_id)} · ${term(c.strength, c.strength)}`).join("<br>") || "—"}</td>
      <td class="wrap muted">${cs.map((c) => esc(c.rationale)).join("<br>")}</td></tr>`;
  }).join("") + (s.confidential || []).map((x) => `<tr><td>${esc(human(x.secret_type))} <span class="faint">second</span></td><td class="mono-cell">${esc(x.value)}</td>
      <td class="mono-cell">—</td><td class="wrap muted">${term("confidential", "Redacted like a secret, not scored")}</td></tr>`).join("");
  const hidden = s.logs.filter((e) => e.kind === "background").length;
  const logs = s.logs.filter((e) => state.showBackground || e.kind !== "background").map((e) => {
    const c = corrByLog[e.log_id];
    return `<div class="${e.kind === "background" ? "background" : ""} ${keys.has(e.log_id) ? "key" : ""}">
      <i class="k-${e.kind || "background"}"></i>
      <span class="id">${esc(e.log_id)}</span><span class="src">${esc(e.source)}</span>
      <span class="txt">${highlight(e.text, values, c && c.snippet)}</span></div>`;
  }).join("");
  return `
    <div><h3>${esc(s.scenario_id)}</h3><p class="claim">${esc(s.claim)}</p>${readLine}</div>
    <dl class="kv">
      <div><dt>Label</dt><dd class="text label-${s.label}">${s.label === "red_herring" ? term("red_herring", labelText(s)) : labelText(s)}</dd></div>
      <div><dt>Setup</dt><dd class="text">${esc(s.variant || "—")}</dd></div>
      <div><dt>Lab</dt><dd class="text">${esc(s.lab_name)}</dd></div>
      <div><dt>Lines</dt><dd>${s.logs.length} <span class="faint">${term("key_evidence", `${keys.size} key`)}</span></dd></div>
    </dl>
    <div><h4>Secrets</h4><div class="panel"><div class="scroll"><table class="left">
      <thead><tr><th>Secret</th><th>Value</th><th>${term("correlate", "Correlates")}</th><th>Why it leaks</th></tr></thead><tbody>${secretRows}</tbody></table></div></div></div>
    <div>
      <div class="sub" style="justify-content:space-between;margin:0 0 8px">
        <h4 style="margin:0">Logs</h4>
        <span><label class="toggle"><input type="checkbox" id="show-bg" ${state.showBackground ? "checked" : ""}> ${hidden} ${term("background", "background lines")}</label></span>
      </div>
      <div class="logs">${logs}</div>
      <div class="sub"><span><mark class="secret">value</mark> secret</span><span><mark class="correlate">detail</mark> ${term("correlate", "correlate")}</span><span><span style="color:var(--evidence)">LOG-ID</span> ${term("key_evidence", "key evidence")}</span></div>
    </div>`;
}

export const BENCH_TABS = [["cases", "Cases"], ["composition", "Composition"], ["checks", "Checks"]];

/* A picker when the split has more than one build shown (the current one, latest, any a run read). */
function versionPick(build) {
  const mine = SITE.builds.filter((b) => b.key === build.key);
  const label = (b) => `${b.version}${b.latest ? " · latest" : ""} · ${b.runs.length ? `${b.runs.length} run${b.runs.length > 1 ? "s" : ""}` : "no runs"}`;
  return mine.length > 1 ? `<select id="f-build" aria-label="Version">${mine.map((b) => `<option value="${esc(b.version)}" ${b.version === build.version ? "selected" : ""}>${esc(label(b))}</option>`).join("")}</select>` : "";
}

/* A benchmark dataset's tab under `head` (the Data tab's dataset header). */
export function benchPage(d, tab, arg, head) {
  const index = buildFor(d);
  if (!index) { $("view").innerHTML = head + `<p class="empty">No build of this dataset ships with the site. Run <code>uv run redaction benchmark build</code>.</p>`; return; }
  if (!BENCH_TABS.some(([k]) => k === tab)) tab = "cases";
  const data = lazyJson(index.file);
  const build = { ...index, ...data, dataset: d };
  let body;
  if (!data) body = `<p class="empty">Loading build ${esc(index.version)}…</p>`;
  else if (data.error) body = `<p class="empty">Could not load ${esc(index.file)} (${esc(data.error)}).</p>`;
  else body = { cases: dataCases, composition: dataComposition, checks: dataChecks }[tab](build, arg);
  $("view").innerHTML = head + body;
  const here = `#/data/${d.name}/${tab}${tab === "cases" || !arg ? "" : `/${arg}`}`; // another version drops the chosen case
  if ($("f-build")) $("f-build").onchange = (e) => { location.hash = withQuery(here, { version: e.target.value === d.current ? null : e.target.value }); };
  if (tab === "cases" && data && !data.error) wireCases(build, arg);
}

function dataCases(build, id) {
  const types = [...new Set(build.scenarios.map((s) => s.violation_type))];
  const sets = [...new Set(build.scenarios.map(setOf))];
  const q = query(), want = { label: q.get("label") || "", type: q.get("type") || "", set: q.get("set") || "" };
  const list = build.scenarios.filter((s) => (!want.label || s.label === want.label) && (!want.type || s.violation_type === want.type) && (!want.set || setOf(s) === want.set));
  const selected = build.scenarios.find((s) => s.scenario_id === id) || list[0] || null;
  const filters = `${versionPick(build)}
    <select id="f-label" aria-label="Label"><option value="">All labels</option>${LABEL_ORDER.map((l) => `<option value="${l}" ${want.label === l ? "selected" : ""}>${LABELS[l]}</option>`).join("")}</select>
    ${sets.length > 1 ? `<select id="f-set" aria-label="Set"><option value="">All sets</option>${sets.map((k) => `<option value="${k}" ${want.set === k ? "selected" : ""}>${esc(SETS[k] || k)}</option>`).join("")}</select>` : ""}
    <select id="f-type" aria-label="Violation type"><option value="">All types</option>${types.map((t) => `<option value="${t}" ${want.type === t ? "selected" : ""}>${esc(human(t))}</option>`).join("")}</select>`;
  const items = list.map((s) => `<li tabindex="0" data-id="${esc(s.scenario_id)}" aria-selected="${s === selected}"><b>${esc(s.scenario_id)}</b><span class="label-${s.label}">${labelText(s)}${sets.length > 1 ? ` · ${esc((SETS[setOf(s)] || setOf(s)).toLowerCase())}` : ""}</span></li>`).join("")
    || `<li><span>No cases match.</span></li>`;
  return section(`Cases <span class="count">${list.length} of ${build.scenarios.length}</span>`, `<div class="browser"><ol class="list panel">${items}</ol><article class="detail">${caseDetail(selected, build)}</article></div>`, filters);
}

function wireCases(build, id) {
  const base = `#/data/${build.dataset.name}/cases`;
  $("view").querySelectorAll(".list li[data-id]").forEach((li) => onKey(li, () => { location.hash = withQuery(`${base}/${li.dataset.id}`); }));
  const filter = (key) => (e) => { location.hash = withQuery(base, { [key]: e.target.value }); };
  $("f-label").onchange = filter("label");
  $("f-type").onchange = filter("type");
  if ($("f-set")) $("f-set").onchange = filter("set");
  const bg = $("show-bg");
  if (bg) bg.onchange = (e) => { state.showBackground = e.target.checked; rerender(); };
}

function dataComposition(build) {
  const m = build.manifest;
  const stages = `<div class="stages">${STAGES.map(([key, name]) => {
    const skipped = key === "reviewed" && !m.reviewer;
    return `<div class="stage ${skipped ? "skipped" : ""}"><b>${skipped ? "—" : m.stages[key]}</b><span>${term(key, name)}</span></div>`;
  }).join("")}</div>`;
  const kept = build.scenarios;
  const types = [...new Set(build.records.map((r) => r.violation_type))];
  const cols = [["violation", null, "Violation"], ["red_herring", "easy", term("red_herring", "RH easy")], ["red_herring", "medium", term("red_herring", "RH medium")], ["red_herring", "hard", term("red_herring", "RH hard")], ["clean", null, "Clean"]];
  const setsHere = [...new Set(kept.map(setOf))];
  const count = (t, l, d, k) => kept.filter((s) => s.violation_type === t && s.label === l && (s.difficulty ?? null) === d && setOf(s) === k).length;
  const compRows = setsHere.map((k) => `${setsHere.length > 1 ? `<tr class="group-row"><td colspan="${cols.length + 1}">${esc(SETS[k] || k)}</td></tr>` : ""}${types.map((t) => {
    const cells = cols.map(([l, d]) => count(t, l, d, k));
    return cells.some(Boolean) ? `<tr><td>${esc(human(t))}</td>${cells.map((n) => `<td class="${n ? "" : "muted"}">${n}</td>`).join("")}</tr>` : "";
  }).join("")}`).join("");
  const composition = `<div class="panel"><div class="scroll"><table><thead><tr><th>Violation type</th>${cols.map((c) => `<th>${c[2]}</th>`).join("")}</tr></thead>
    <tbody>${compRows}</tbody></table></div></div>`;
  const total = Object.values(m.line_kinds).reduce((a, b) => a + b, 0) || 1;
  const kinds = `<div class="panel pad"><div class="kind-bar" role="img" aria-label="Share of lines by kind">${KINDS.map(([k]) =>
      `<i class="k-${k}" style="width:${(100 * (m.line_kinds[k] || 0) / total).toFixed(2)}%"></i>`).join("")}</div>
    <div class="legend">${KINDS.map(([k, name]) => `<div><i class="k-${k}"></i><span>${term(k === "correlate" ? "correlate" : k, name)}</span><span>${(100 * (m.line_kinds[k] || 0) / total).toFixed(0)}%</span></div>`).join("")}</div>
    <div class="sub" style="margin-top:14px"><span>${m.lines.min}–${m.lines.max} lines per case</span><span>mean ${m.lines.mean}</span><span>${esc(m.background === "lab" ? "lab-style background" : "Philly scheduler background")}</span>${m.background_jobs ? `<span>job sizes and outcomes from ${m.background_jobs.toLocaleString()} real cluster jobs</span>` : ""}</div></div>`;
  return section("Pipeline", stages, versionPick(build))
    + `<div class="grid2">${section("Kept cases by cell", composition)}${section("Lines by kind", kinds)}</div>`;
}

function dataChecks(build) {
  const m = build.manifest;
  const counts = m.issues || {};
  const checks = `<div class="panel"><div class="scroll"><table><thead><tr><th>Check</th><th>Result</th></tr></thead><tbody>${Object.entries(CHECKS).map(([k, name]) => {
    const n = counts[k] || 0;
    return `<tr><td>${name}</td><td><span class="badge ${n ? "fail" : "pass"}">${n ? n + " failed" : "pass"}</span></td></tr>`;
  }).join("")}<tr><td>${term("surface", "Background not filterable by surface")}</td><td>${m.surface_auroc == null ? '<span class="badge">not measured</span>' : `<span class="badge ${m.surface_auroc > 0.75 ? "fail" : "pass"}">AUROC ${f2(m.surface_auroc)}</span> <span class="faint">${esc(m.background || "philly")} background; 0.5 is unfilterable</span>`}</td></tr><tr><td>Blind label review</td><td>${m.reviewer ? (() => { const n = build.records.filter((r) => r.status === "review_disagrees").length; return `<span class="badge ${n ? "fail" : "pass"}">${n ? `${n} disagreed` : "agreed"}</span> <span class="faint">${esc(m.reviewer.split("/").pop())}</span>`; })() : '<span class="badge">not run</span>'}</td></tr></tbody></table></div></div>`;
  const dropped = build.records.filter((r) => r.status !== "kept");
  const droppedTable = dropped.length ? `<div class="panel"><div class="scroll"><table class="left"><thead><tr><th>Case</th><th>Planned as</th><th>Why it was dropped</th></tr></thead><tbody>${dropped.map((r) => `<tr>
      <td class="mono-cell nowrap">${esc(r.scenario_id)}</td><td class="nowrap">${labelText(r)}</td>
      <td class="wrap">${r.status === "review_disagrees" ? `Reviewer read it as <b>${esc(human(r.review?.verdict || ""))}</b>: ${esc(r.review?.reason || "")}` : esc((r.issues || []).map((i) => `${i.check}${i.detail ? ": " + i.detail : ""}`).join("; "))}</td></tr>`).join("")}</tbody></table></div></div>`
    : `<p class="empty">Every planned case was kept.</p>`;
  return section("Code checks and review", checks, versionPick(build))
    + section(`Dropped cases <span class="count">${dropped.length}</span>`, droppedTable);
}

const CELL_ORDER = [["violation", null], ["red_herring", "easy"], ["red_herring", "medium"], ["red_herring", "hard"], ["clean", null]];
const placeholderHtml = (t) => esc(t).replace(/\{([a-z_0-9]+)\}/g, '<span class="ph">$1</span>');

/* The benchmark generator's blueprints: every case of a type and set uses these lines. */
export function benchBlueprints(arg) {
  const all = SITE.blueprints || [];
  if (!all.length) return `<p class="empty">No blueprint catalog in this site build.</p>`;
  const sets = [...new Set(all.map((b) => b.set))];
  const asked = query().get("set");
  const set = asked && sets.includes(asked) ? asked : (sets.includes("entangled") ? "entangled" : sets[0]);
  const inSet = all.filter((b) => b.set === set);
  const bp = inSet.find((b) => b.violation_type === arg) || inSet[0];
  const seg = `<div class="seg" role="group" aria-label="Set">${sets.map((k) => `<button type="button" data-bpset="${k}" aria-pressed="${k === set}">${esc(SETS[k] || k)}</button>`).join("")}</div>`;
  const side = `<nav class="side" aria-label="Types">${inSet.map((b) => `<a href="${withQuery(`#/data/archive/blueprints/${b.violation_type}`)}" ${b === bp ? 'aria-current="page"' : ""}>${esc(human(b.violation_type))}</a>`).join("")}</nav>`;
  const cell = (c) => `<article class="bp-cell"><header><span class="label-${c.label}">${labelText(c)}</span><span class="muted">${esc(c.description)}</span></header>
    <ol class="bp-lines">${c.lines.map((l) => `<li><span class="src">${esc(l.source)}</span><span class="txt">${placeholderHtml(l.template)}</span></li>`).join("")}</ol></article>`;
  const cells = CELL_ORDER.map(([l, d]) => bp.cells.find((c) => c.label === l && (c.difficulty ?? null) === d)).filter(Boolean).map(cell).join("");
  const meta = `<dl class="kv"><div><dt>Claim</dt><dd class="text">${esc(bp.claim)}</dd></div>
    <div><dt>Deciding details</dt><dd class="text">${esc(bp.separating_cues.join("; "))}</dd></div>
    <div><dt>Secrets planted</dt><dd class="text">${esc([...bp.core_secrets, ...bp.extra_secrets.map((t) => t + " (second)")].map(human).join(", "))}</dd></div></dl>`;
  return section("Benchmark blueprints", `<div class="notes">${side}<div class="bp">${meta}<p class="muted small">Every case of this type and set uses these evidence lines; the highlighted names are filled in per case.</p>${cells}</div></div>`, seg);
}

export function wireBlueprints() {
  $("view").querySelectorAll("[data-bpset]").forEach((b) => { b.onclick = () => { location.hash = withQuery("#/data/archive/blueprints", { set: b.dataset.bpset }); }; });
}

/* The secret registry both generators plant from. */
export function secretRegistry() {
  const rows = (SITE.registry || []).map((r) => `<tr><td>${esc(r.label)}</td><td>${esc(human(r.tier))}</td><td>${esc(r.sensitivity)}</td><td class="wrap mono-cell">${r.options.map(esc).join("<br>")}</td></tr>`).join("");
  return section("Secret registry", `<p class="muted small">Each case draws its secrets' true values from these options. Always-redact secrets are removed under every policy; context secrets are ruled on case by case.</p><div class="panel"><div class="scroll"><table class="left"><thead><tr><th>Secret</th><th>Tier</th><th>Sensitivity</th><th>Options</th></tr></thead><tbody>${rows}</tbody></table></div></div>`);
}
