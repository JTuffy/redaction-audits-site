/* The hand-written benchmark's set pages (an archived dataset): its cases, composition and checks,
   so a run on the benchmark opens the cases it read. */

import { $, esc } from "../lib/dom.js?v=2275844be3";
import { f2, human } from "../lib/format.js?v=2275844be3";
import { LABELS, labelText, SETS } from "../lib/labels.js?v=2275844be3";
import { term } from "../lib/tips.js?v=2275844be3";
import { query, withQuery } from "../lib/view-state.js?v=2275844be3";
import { labelOrder } from "../data/constants.js?v=2275844be3";
import { ledgerEntry, p1Run, runHref } from "../data/runs.js?v=2275844be3";
import { lazyJson, SITE } from "../data/site.js?v=2275844be3";
import { badge, cell, fields, table } from "../components/blocks.js?v=2275844be3";
import { browser, wireBrowser } from "../components/browser.js?v=2275844be3";
import { legend, swatch } from "../components/legend.js?v=2275844be3";
import { logLines, wireLogs } from "../components/logs.js?v=2275844be3";
import { section } from "../components/page.js?v=2275844be3";

export const BENCH_TABS = [["cases", "Cases"], ["composition", "Composition"], ["checks", "Checks"]];

const KINDS = [["evidence", "Evidence"], ["correlate", "Correlates"], ["secret_mention", "Secret mentions"], ["lab_noise", "Lab chatter"], ["background", "Background"]];
const STAGES = [["planned", "Planned"], ["rendered", "Rendered"], ["valid", "Valid"], ["reviewed", "Reviewed"], ["kept", "Kept"]];
const CHECKS = {
  shape: "One rendered line per planned line",
  background_intact: "Background unchanged",
  required_kept: "Secret values and cue tokens kept",
  correlate_kept: "Correlate details kept",
  no_verbatim_in_correlate: "Correlates do not state the value",
  no_foreign_option: "No other option of a secret",
  label_clean: "No violation-only token in non-violations",
  no_duplicates: "No repeated lines",
};
const setOf = (s) => s.depth; // which of the build's sets a case is in (site/build.py)

/* The build shown for a benchmark dataset: the version the URL names, else the dataset's current
   one (the version results rest on), else its split's latest. */
function buildFor(d) {
  const mine = SITE.builds.filter((b) => b.key === d.split);
  const want = query().get("version");
  return mine.find((b) => b.version === want) || mine.find((b) => b.version === d.current) || mine.find((b) => b.latest) || mine[0] || null;
}

/* The recorded runs that read this case of this build: every run of the build, unless it ran
   chosen cases only; a run whose case ids are here must list this one. */
function readBy(build, id) {
  return build.runs.filter((name) => {
    const c = ledgerEntry(name)?.config || {};
    if (c.sample_ids?.length && !c.sample_ids.includes(id)) return false;
    const r = p1Run(name);
    return !r?.cases?.length || r.cases.includes(id);
  });
}

function caseDetail(s, build) {
  if (!s) return `<p class="empty">No case selected.</p>`;
  const runs = readBy(build, s.scenario_id);
  const readLine = runs.length
    ? `<p class="small read-by"><span class="muted">Read by</span> ${runs.slice(0, 6).map((n) => `<a href="${p1Run(n)?.cases?.length ? runHref(n, "cases", { case: s.scenario_id }) : runHref(n)}">${esc(n)}</a>`).join(" · ")}${runs.length > 6 ? ` <span class="faint">and ${runs.length - 6} more</span>` : ""}</p>`
    : `<p class="small faint read-by">No recorded run read this case of this build.</p>`;
  const values = [...s.secrets, ...(s.confidential || [])].map((x) => x.value);
  const corrByLog = Object.fromEntries(s.correlates.map((c) => [c.log_id, c]));
  const keys = new Set(s.key_evidence_ids);
  const secretRows = [
    ...s.secrets.map((x) => {
      const cs = s.correlates.filter((c) => c.secret_type === x.secret_type);
      return [esc(human(x.secret_type)), cell(esc(x.value), "mono-cell"),
        cell(cs.map((c) => `${esc(c.log_id)} · ${term(c.strength, c.strength)}`).join("<br>") || "—", "mono-cell"),
        cell(cs.map((c) => esc(c.rationale)).join("<br>"), "wrap muted")];
    }),
    ...(s.confidential || []).map((x) => [`${esc(human(x.secret_type))} <span class="faint">second</span>`, cell(esc(x.value), "mono-cell"),
      cell("—", "mono-cell"), cell(term("confidential", "Redacted like a secret, not scored"), "wrap muted")]),
  ];
  const leakOf = (e) => { const c = corrByLog[e.log_id]; return c ? { snippet: c.snippet, type: c.secret_type } : null; };
  const label = s.label === "red_herring" ? term("red_herring", labelText(s)) : labelText(s);
  return `
    <div><h3>${esc(s.scenario_id)}</h3><p class="browser-claim">${esc(s.claim)}</p>${readLine}</div>
    ${fields([
      ["Label", `<span class="label-${s.label}">${label}</span>`],
      ["Setup", esc(s.variant || "—")],
      ["Lab", esc(s.lab_name)],
      ["Lines", `${s.logs.length} <span class="faint">${term("key_evidence", `${keys.size} key`)}</span>`],
    ])}
    <div><h4>Secrets</h4>${table(["Secret", "Value", term("correlate", "Correlates"), "Why it leaks"], secretRows, { cls: "left" })}</div>
    <div>
      ${logLines(s.logs, { heading: "<h4>Logs</h4>", keys: s.key_evidence_ids, secrets: values, leakOf })}
      ${legend([[`<mark class="log-secret">value</mark>`, "secret"], [`<mark class="log-leak">detail</mark>`, term("correlate", "correlate")], [`<span class="key-id">LOG-ID</span>`, term("key_evidence", "key evidence")]], { cls: "logs-key" })}
    </div>`;
}

/* A picker when the split has more than one build shown (the current one, latest, any a run read). */
function versionPick(build) {
  const mine = SITE.builds.filter((b) => b.key === build.key);
  const label = (b) => `${b.version}${b.latest ? " · latest" : ""} · ${b.runs.length ? `${b.runs.length} run${b.runs.length > 1 ? "s" : ""}` : "no runs"}`;
  return mine.length > 1 ? `<select id="f-build" aria-label="Version">${mine.map((b) => `<option value="${esc(b.version)}" ${b.version === build.version ? "selected" : ""}>${esc(label(b))}</option>`).join("")}</select>` : "";
}

/* A benchmark dataset's tab under `head` (the set page's header and tabs). */
export function benchPage(d, tab, arg, head) {
  const index = buildFor(d);
  if (!index) { $("view").innerHTML = head + `<p class="empty">No build of this dataset ships with the site. Run <code>uv run redaction benchmark build</code>.</p>`; return; }
  const data = lazyJson(index.file);
  const build = { ...index, ...data, dataset: d };
  let body;
  if (!data) body = `<p class="empty">Loading build ${esc(index.version)}…</p>`;
  else if (data.error) body = `<p class="empty">Could not load ${esc(index.file)} (${esc(data.error)}).</p>`;
  else body = { cases: casesTab, composition: compositionTab, checks: checksTab }[tab](build, arg);
  $("view").innerHTML = head + body;
  const here = `#/simulator/${d.name}/${tab}${tab === "cases" || !arg ? "" : `/${arg}`}`; // another version drops the chosen case
  if ($("f-build")) $("f-build").onchange = (e) => { location.hash = withQuery(here, { version: e.target.value === d.current ? null : e.target.value }); };
  if (tab === "cases" && data && !data.error) wireCases(build);
}

function casesTab(build, id) {
  const types = [...new Set(build.scenarios.map((s) => s.violation_type))];
  const sets = [...new Set(build.scenarios.map(setOf))];
  const q = query(), want = { label: q.get("label") || "", type: q.get("type") || "", set: q.get("set") || "" };
  const list = build.scenarios.filter((s) => (!want.label || s.label === want.label) && (!want.type || s.violation_type === want.type) && (!want.set || setOf(s) === want.set));
  const selected = build.scenarios.find((s) => s.scenario_id === id) || list[0] || null;
  const filters = `${versionPick(build)}
    <select id="f-label" aria-label="Label"><option value="">All labels</option>${labelOrder().map((l) => `<option value="${l}" ${want.label === l ? "selected" : ""}>${LABELS[l]}</option>`).join("")}</select>
    ${sets.length > 1 ? `<select id="f-set" aria-label="Set"><option value="">All sets</option>${sets.map((k) => `<option value="${k}" ${want.set === k ? "selected" : ""}>${esc(SETS[k] || k)}</option>`).join("")}</select>` : ""}
    <select id="f-type" aria-label="Violation type"><option value="">All types</option>${types.map((t) => `<option value="${t}" ${want.type === t ? "selected" : ""}>${esc(human(t))}</option>`).join("")}</select>`;
  const items = list.map((s) => ({ id: s.scenario_id, chosen: s === selected,
    html: `<b>${esc(s.scenario_id)}</b><span class="label-${s.label}">${labelText(s)}${sets.length > 1 ? ` · ${esc((SETS[setOf(s)] || setOf(s)).toLowerCase())}` : ""}</span>` }));
  return section(`Cases <span class="count">${list.length} of ${build.scenarios.length}</span>`,
    browser({ id: "bench-list", label: "Cases", items, detail: caseDetail(selected, build), empty: "No cases match." }), filters);
}

function wireCases(build) {
  const base = `#/simulator/${build.dataset.name}/cases`;
  wireBrowser("bench-list", (id) => { location.hash = withQuery(`${base}/${id}`); });
  const filter = (key) => (e) => { location.hash = withQuery(base, { [key]: e.target.value }); };
  $("f-label").onchange = filter("label");
  $("f-type").onchange = filter("type");
  if ($("f-set")) $("f-set").onchange = filter("set");
  wireLogs($("view"));
}

function compositionTab(build) {
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
  const rows = setsHere.flatMap((k) => [
    ...(setsHere.length > 1 ? [{ group: esc(SETS[k] || k) }] : []),
    ...types.map((t) => [t, cols.map(([l, d]) => count(t, l, d, k))]).filter(([, cells]) => cells.some(Boolean))
      .map(([t, cells]) => [esc(human(t)), ...cells.map((n) => cell(n, n ? "" : "muted"))]),
  ]);
  const total = Object.values(m.line_kinds).reduce((a, b) => a + b, 0) || 1;
  const share = (k) => (100 * (m.line_kinds[k] || 0)) / total;
  const kinds = `<div class="panel pad"><div class="kind-bar" role="img" aria-label="Share of lines by kind">${KINDS.map(([k]) => `<i class="kind-${k}" style="width:${share(k).toFixed(2)}%"></i>`).join("")}</div>
    ${legend(KINDS.map(([k, name]) => [swatch(`kind-${k}`), term(k, name), `${share(k).toFixed(0)}%`]), { stacked: true })}
    <div class="sub kinds-sub"><span>${m.lines.min}–${m.lines.max} lines per case</span><span>mean ${m.lines.mean}</span><span>${esc(m.background === "lab" ? "lab-style background" : "Philly scheduler background")}</span>${m.background_jobs ? `<span>job sizes and outcomes from ${m.background_jobs.toLocaleString()} real cluster jobs</span>` : ""}</div></div>`;
  return section("Pipeline", stages, versionPick(build))
    + `<div class="grid2">${section("Kept cases by cell", table(["Violation type", ...cols.map((c) => c[2])], rows))}${section("Lines by kind", kinds)}</div>`;
}

function checksTab(build) {
  const m = build.manifest;
  const counts = m.issues || {};
  const disagreed = build.records.filter((r) => r.status === "review_disagrees").length;
  const rows = [
    ...Object.entries(CHECKS).map(([k, name]) => [name, counts[k] ? badge(`${counts[k]} failed`, "fail") : badge("pass", "pass")]),
    [term("surface", "Background not filterable by surface"), m.surface_auroc == null ? badge("not measured")
      : `${badge(`AUROC ${f2(m.surface_auroc)}`, m.surface_auroc > 0.75 ? "fail" : "pass")} <span class="faint">${esc(m.background || "philly")} background; 0.5 is unfilterable</span>`],
    ["Blind label review", m.reviewer ? `${badge(disagreed ? `${disagreed} disagreed` : "agreed", disagreed ? "fail" : "pass")} <span class="faint">${esc(m.reviewer.split("/").pop())}</span>` : badge("not run")],
  ];
  const dropped = build.records.filter((r) => r.status !== "kept");
  const why = (r) => (r.status === "review_disagrees" ? `Reviewer read it as <b>${esc(human(r.review?.verdict || ""))}</b>: ${esc(r.review?.reason || "")}` : esc((r.issues || []).map((i) => `${i.check}${i.detail ? ": " + i.detail : ""}`).join("; ")));
  const droppedTable = dropped.length
    ? table(["Case", "Planned as", "Why it was dropped"], dropped.map((r) => [cell(esc(r.scenario_id), "mono-cell nowrap"), cell(labelText(r), "nowrap"), cell(why(r), "wrap")]), { cls: "left" })
    : `<p class="empty">Every planned case was kept.</p>`;
  return section("Code checks and review", table(["Check", "Result"], rows), versionPick(build))
    + section(`Dropped cases <span class="count">${dropped.length}</span>`, droppedTable);
}
