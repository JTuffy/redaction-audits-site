/* Data: the validated sets, one row per claim (hard and calibration side by side); the claims
   they come from; the secrets planted in them; what has been run on each. How sets are built is
   on Method. The benchmark's pages still open by address but aren't linked (archived 2 Nov).
   Catalog: data/datasets.toml via viewer/datasets.py. */

import {
  $,
  datasetHref,
  datasetOfSet,
  datasetNamed,
  datasets,
  esc,
  ledgerEntry,
  runStatus,
  pageHead,
  POLICIES,
  POLICY,
  query,
  section,
  SITE,
  SOURCE,
  STANCE,
  term,
  TIPS,
  withQuery,
} from "./core.js?v=2e746ab46e";
import { BENCH_TABS, benchPage, secretRegistry } from "./bench.js?v=2e746ab46e";
import { pageSimDataset, simClaims } from "./sim.js?v=2e746ab46e";

Object.assign(TIPS, {
  data_leakage: ["Whether the leakage measure means what it says on this dataset. It assumes the full evidence points at one value per secret; where most secrets have two or more candidates named, the judge can't tell which one is meant until redaction removes the others, and the ratio passes 1. Not valid above a quarter."],
  data_cases_run: ["Recorded runs on the current version, and the distinct cases they read (smoke batches and replaced runs aside). Runs on older versions are counted underneath."],
  data_coverage: ["What has been run on each dataset: per lab stance and policy, which judges read it and on how many cases (all, or the chosen ones). An empty cell is a gap."],
});

const TABS = [["", "Sets"], ["claims", "Claims"], ["secrets", "Secrets"], ["coverage", "What's been run"]];

const currentOf = (d) => d.versions.find((v) => v.version === d.current) || d.versions[0] || null;
const shownVersion = (d) => d.versions.find((v) => v.version === query().get("version")) || currentOf(d);
const judgeName = (model) => { const m = String(model || "judge").split("/").pop(); return /terra/.test(m) ? "Terra" : m.replace(/^gpt-/, "GPT-"); };

function leakageBadge(v) {
  const c = v?.leakage;
  if (!c || c.valid == null) return `<span class="badge">not checked</span>`;
  const share = c.several_share == null ? "" : `${Math.round(c.several_share * 100)}% of scored secrets have 2+ candidates named`;
  return `<span class="badge ${c.valid ? "pass" : "warn"}" title="${esc(share)}">${c.valid ? "valid" : "not valid"}</span>`;
}

/* The validated sets, one row per claim: its hard set and its calibration set side by side, each
   with its size, how many cases the checker says text redaction leaves decidable, and its runs. */
const SHAPE_WORD = { permission: "allowed only if a record excuses it", prohibition: "forbidden if a record convicts it" };
function setCell(b, label) {
  if (!b) return `<td class="faint" data-label="${esc(label)}">—</td>`;
  const d = datasetOfSet(b.key);
  const v = d ? currentOf(d) : null;
  const m = b.map?.text_redaction || {};
  const total = (m.decidable || 0) + (m.cant_decide || 0) + (m.may_mislead || 0) || 1;
  const seg = (k, cls) => (m[k] ? `<i class="${cls}" style="width:${((100 * m[k]) / total).toFixed(1)}%"></i>` : "");
  const n = (v?.runs || []).filter((r) => !runStatus(ledgerEntry(r) || {})).length;
  const fail = b.gate_status === "fail" ? ` <span class="badge fail">fails a gate</span>` : "";
  return `<td data-label="${esc(label)}"><a class="set-cell" href="${d ? datasetHref(d) : "#/data"}"><span><b>${b.kept}</b> cases${fail}</span>
    <span class="sim-bar3" title="Under text redaction: ${m.decidable || 0} decidable, ${m.cant_decide || 0} can't decide, ${m.may_mislead || 0} may mislead">${seg("decidable", "right")}${seg("cant_decide", "unsure")}${seg("may_mislead", "wrong")}</span>
    <span class="small muted">${Math.round((100 * (m.decidable || 0)) / total)}% decidable under text redaction · ${n ? `${n} run${n > 1 ? "s" : ""}` : "no runs"}</span></a></td>`;
}
function setsIndex() {
  const sims = SITE.sim || [];
  const claims = SITE.claims || [];
  const current = datasets().filter((d) => d.status === "current" && d.source !== "benchmark");
  const cases = current.reduce((n, d) => n + (currentOf(d)?.cases || 0), 0);
  const of = (c, tier) => sims.find((b) => b.claim === c.id && b.tier === tier && datasetOfSet(b.key)?.status === "current");
  const rows = claims.map((c) => `<tr><td class="left"><a href="#/data/claims">${esc(c.title)}</a><div class="small muted">${esc(c.shape)}: ${esc(SHAPE_WORD[c.shape] || "")}</div></td>${setCell(of(c, "hard"), "Hard set")}${setCell(of(c, "calibration"), "Calibration set")}</tr>`).join("");
  const gates = current.every((d) => currentOf(d)?.gates !== "fail");
  return `<p class="data-lede">${current.length} sets, ${cases.toLocaleString()} cases: each audit claim has a <b>hard</b> set (large worlds, 110–180 log lines; every experiment reads it) and a <b>calibration</b> set (small worlds, for checking the checker). Labels are computed by code with their proof, then checked by a second checker and a blind model reviewer.${gates ? " Every set passes the automated gates;" : ""} the human label audit is still to do.</p>
    <div class="panel"><div class="scroll"><table class="left sets"><thead><tr><th>Claim</th><th>Hard set</th><th>Calibration set</th></tr></thead><tbody>${rows}</tbody></table></div></div>
    <p class="small muted sets-key"><span class="key right"></span>decidable <span class="key unsure"></span>can't decide <span class="key wrong"></span>may mislead · the checker's call on each case under text redaction, before any model reads it.</p>`;
}

/* ---------- Coverage ---------- */

function coverageGrid() {
  const rows = (SITE.coverage || []).filter((r) => r.stance);
  const other = (SITE.coverage || []).filter((r) => r.other);
  const cell = (judges) => (judges?.length
    ? judges.map((j) => `<a class="chip" href="#/run/${esc(j.runs[0])}" title="${esc(j.runs.join("\n"))}">${esc(judgeName(j.judge))} · ${j.cases == null ? "all" : j.cases}</a>`).join(" ")
    : `<span class="faint">—</span>`);
  const byName = Object.fromEntries(datasets().map((d) => [d.name, d]));
  const lines = datasets().filter((d) => d.status === "current").flatMap((d) => {
    const mine = rows.filter((r) => r.dataset === d.name);
    const label = (stance) => `<a href="${datasetHref(d)}">${esc(d.title)}</a>${stance ? `<div class="small faint">${esc(STANCE[stance] || stance)} lab</div>` : `<div class="small faint">no redaction runs</div>`}`;
    if (!mine.length) return [`<tr class="gap"><td class="left">${label(null)}</td>${POLICIES.map(() => `<td><span class="faint">—</span></td>`).join("")}</tr>`];
    return mine.map((r) => `<tr><td class="left">${label(r.stance)}</td>${POLICIES.map((p) => `<td>${cell(r.cells[p])}</td>`).join("")}</tr>`);
  });
  const grid = `<div class="panel"><div class="scroll"><table class="coverage"><thead><tr><th class="left">Dataset</th>${POLICIES.map((p) => `<th class="left">${term(p, POLICY[p])}</th>`).join("")}</tr></thead><tbody>${lines.join("")}</tbody></table></div></div>`;
  const others = other.length
    ? `<div class="panel"><div class="scroll"><table class="left"><thead><tr><th>Dataset</th><th>Judge-only runs</th></tr></thead><tbody>${other.map((r) => `<tr><td>${esc(byName[r.dataset]?.title || r.dataset)}</td><td>${Object.entries(r.other).map(([k, n]) => `${n} ${esc(k.toLowerCase())}`).join(" · ")}</td></tr>`).join("")}</tbody></table></div></div>`
    : "";
  return section(term("data_coverage", "Runs by dataset, lab stance and policy"), `<p class="muted small">Each chip is a judge and how many cases it read; hover for the runs. Smoke batches and runs replaced after stopping early aren't counted.</p>${grid}`)
    + (others ? section("Judge-only runs (marker ablation, separability, re-asks)", others) : "");
}

/* ---------- Generators and pipeline ---------- */

/* ---------- One dataset ---------- */

function datasetHead(d, tab) {
  const v = shownVersion(d);
  const status = d.status === "current" ? "" : `<span class="badge">${esc(d.status)}</span>`;
  const which = v ? `<span class="mono">${esc(v.version)}</span>${v.version === d.current ? "<span>current</span>" : ""}${v.version === d.latest ? "<span>latest</span>" : ""}` : "";
  const built = (v?.renderer && v.renderer !== "template" ? `<span>renderer ${esc(v.renderer)}</span>` : "") + (v?.built_at ? `<span>${esc(v.built_at.replace("T", " ").slice(0, 16))} UTC</span>` : "");
  const counted = (v?.runs || []).filter((n) => !runStatus(ledgerEntry(n) || {}));
  const runs = counted.length ? `<span>read by <a href="#/runs?runs=${counted.map(encodeURIComponent).join(",")}">${counted.length} run${counted.length > 1 ? "s" : ""}</a></span>` : "<span>no runs on this version</span>";
  const sub = `<span>${esc(SOURCE[d.source] || d.source)}</span>${status}${which}${built}${runs}<span>${term("data_leakage", "leakage")} ${leakageBadge(v)}</span>`;
  const crumbs = `<a href="#/data">Data</a> / <span class="mono">${esc(d.name)}</span>`;
  const tabs = d.source === "benchmark"
    ? `<nav class="tabs" aria-label="${esc(d.title)}">${BENCH_TABS.map(([k, t]) => `<a href="${withQuery(datasetHref(d, k))}" ${k === tab ? 'aria-current="page"' : ""}>${t}</a>`).join("")}</nav>`
    : "";
  const failing = (v?.gate_failures || []).length ? `<p class="small"><span class="badge fail">fails a quality check</span> ${v.gate_failures.map(esc).join("; ")}</p>` : "";
  return `<div>${pageHead({ crumbs, title: esc(d.title), sub })}${d.note ? `<p class="purpose muted">${esc(d.note)}</p>` : ""}${failing}${tabs}</div>`;
}

function datasetPage(d, rest) {
  const [tab = "cases", ...more] = rest;
  const arg = more.join("/");
  if (d.source === "benchmark") { benchPage(d, BENCH_TABS.some(([k]) => k === tab) ? tab : "cases", arg, datasetHead(d, tab)); return; }
  pageSimDataset(d, tab === "cases" ? arg : "", datasetHead(d, "cases"));
}

/* ---------- The tab ---------- */

export function pageDataTab(arg) {
  const parts = String(arg || "").split("/").map(decodeURIComponent);
  const [first = "", ...rest] = parts;
  const d = datasetNamed(first);
  if (d) { datasetPage(d, rest); return; }
  const current = TABS.some(([k]) => k === first) ? first : "";
  const nav = `<nav class="tabs" aria-label="Data">${TABS.map(([k, t]) => `<a href="#/data${k ? `/${k}` : ""}" ${k === current ? 'aria-current="page"' : ""}>${t}</a>`).join("")}</nav>`;
  const head = `<div>${pageHead({ title: "Data", sub: "<span>Simulated lab logs, each checked against one audit claim, with secrets planted in them.</span>" })}${nav}</div>`;
  if (current === "coverage") { $("view").innerHTML = head + coverageGrid(); return; }
  if (current === "claims") { $("view").innerHTML = head + `<p class="small muted">How the sets are generated from these: <a href="#/method/cases">Method, making cases</a>.</p>` + simClaims(); return; }
  if (current === "secrets") { $("view").innerHTML = head + secretRegistry(); return; }
  $("view").innerHTML = head + setsIndex();
}
