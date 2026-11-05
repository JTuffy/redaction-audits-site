/* Findings (what the runs show) and Experiments (how each question is tested). */

import { answers as findingsAnswers, resultsBlock, wireResults } from "./findings.js?v=2e746ab46e";
import { $, allRuns, datasetHref, datasetNamed, datasetOfVersion, esc, pageHead, POLICY, section, SITE, STANCE } from "./core.js?v=2e746ab46e";
import { experimentOf, experiments, followupList } from "./direction.js?v=2e746ab46e";
import { cellTable, checksBlock, reviewBlock } from "./studies.js?v=2e746ab46e";

/* Experiments, one template each: question, hypothesis, reasoning, the expectations as written,
   design, progress and result. Grouped by the question each one answers (direction.toml `group`).
   Progress comes from the recorded runs, never from a hand-set status. */

const GROUPS = [
  ["predict", "Signal loss", "Can a checker tell in advance which cases break?", "a-predict"],
  ["cost", "Signal loss and leakage", "What does each policy cost the verdict, and how much leaks?", "a-cost"],
  ["adversary", "Signal loss", "Does a lab redacting in bad faith get through?", "a-adversary"],
];
const ENDED = ["settled", "superseded", "blocked"];
const planOf = (x) => (SITE.plans || {})[x.id];
const money = (v) => (v == null ? "no estimate" : `$${v.toFixed(2)}`);
const shortJudge = (j) => { const m = String(j || "").split("/").pop(); return /terra/.test(m) ? "Terra" : m.replace(/^gpt-/, "GPT-"); };
const runsOf = (x) => allRuns().filter((e) => experimentOf(e) === x);
const isSmoke = (e) => /^Smoke/.test(e.purpose || "");
const counted = (runs) => runs.filter((e) => !isSmoke(e) && !/superseded by/.test(e.amended || ""));
const studyOf = (x) => (SITE.studies || []).find((st) => st.name === x.id) || null;
const judgeShort = (e) => { const m = String(e.config?.models?.judge || "").split("/").pop(); return /terra/.test(m) ? "Terra" : m.replace(/^gpt-/, "GPT-") || "—"; };
const datasetOf = (e) => datasetOfVersion(e.config?.data, e.config?.split);

/* Where an experiment stands, from its recorded runs. */
function progressOf(x) {
  if (ENDED.includes(x.status)) return { state: x.status, label: x.status };
  const runs = counted(runsOf(x));
  const c = (SITE.results?.coverage || []).find((k) => k.experiment === x.id);
  if (x.group === "setup") return runs.length ? { state: "done", label: "ran", runs: runs.length } : { state: "todo", label: "not run" };
  if (c?.planned) {
    const state = c.cases >= c.planned ? "done" : c.cases ? "running" : "todo";
    return { state, label: { done: "complete", running: "in progress", todo: "not started" }[state], cases: c.cases, planned: c.planned, parts: c.parts || [], runs: runs.length };
  }
  return runs.length ? { state: "running", label: "in progress", runs: runs.length } : { state: "todo", label: "not started", planned: planOf(x)?.cases };
}
const STATE_CLASS = { done: "pass", running: "warn", todo: "", settled: "pass", superseded: "", blocked: "fail" };
const pill = (p) => `<span class="badge ${STATE_CLASS[p.state] ?? ""}">${esc(p.label)}</span>`;
function meter(p) {
  if (!p.planned) return "";
  const w = Math.min(100, (100 * (p.cases || 0)) / p.planned);
  return `<span class="xp-meter" aria-label="${p.cases || 0} of ${p.planned} cases"><i style="width:${w}%"></i></span><span class="small muted">${p.cases || 0} / ${p.planned} cases</span>`;
}
/* The expectation's status, and its text without the status prefix. */
function expectationOf(x) {
  const t = String(x.expectation || "");
  const draft = t.match(/^Draft for Josh to approve \(([\d-]+)\)[.,]?\s*(?:not yet the written-before-run expectation\.\s*)?/);
  if (draft) return { badge: `<span class="badge warn">draft, not yet approved</span>`, text: t.slice(draft[0].length) };
  if (/^Written .*before any run/.test(t)) return { badge: `<span class="badge pass">written before any run</span>`, text: t };
  return { badge: t ? `<span class="badge">written after the first runs</span>` : "", text: t || "None written." };
}

function row(x) {
  const p = progressOf(x);
  return `<a class="xp-row" href="#/experiments/${encodeURIComponent(x.id)}">
    <span class="xp-judge">${esc(x.judge || "—")}</span>
    <span class="xp-state">${pill(p)}${meter(p)}</span>
    <span class="xp-hyp">${esc(x.hypothesis || x.title)}</span></a>`;
}

function list() {
  const all = experiments();
  if (!all.length) return `<p class="empty">No experiments in <code>docs/direction.toml</code>.</p>`;
  const live = all.filter((x) => !ENDED.includes(x.status));
  const order = ["Terra", "Opus", "Haiku", "GPT-5-mini"];
  const byJudge = (a, b) => order.indexOf(a.judge) - order.indexOf(b.judge);
  const answers = findingsAnswers();
  const groups = GROUPS.map(([key, kind, question, anchor]) => {
    const xs = live.filter((x) => x.group === key).sort(byJudge);
    if (!xs.length) return "";
    const so = answers[anchor];
    return `<section class="xp-group"><header><span class="xp-kind">${esc(kind)}</span><h2>${esc(question)}</h2></header>
      <div class="xp-rows">${xs.map(row).join("")}</div>
      ${so ? `<p class="xp-so"><span class="muted">So far:</span> ${so} <a href="#/findings/${anchor}">Findings</a></p>` : ""}</section>`;
  }).join("");
  const setup = live.filter((x) => x.group === "setup");
  const other = live.filter((x) => !x.group);
  const fus = (SITE.direction?.followup || []).filter((f) => f.status !== "done");
  const fold = (title, n, body) => `<details class="xp-fold"><summary>${title} <span class="count">${n}</span></summary>${body}</details>`;
  const ran = setup.filter((x) => progressOf(x).state === "done").length;
  return groundwork()
    + groups
    + (setup.length ? fold(`Pilots: ${ran} of ${setup.length} ran`, setup.length, `<div class="xp-rows">${setup.map(row).join("")}</div>`) : "")
    + (other.length ? fold("Other", other.length, `<div class="xp-rows">${other.map(row).join("")}</div>`) : "")
    + (fus.length ? fold("Ideas, not planned", fus.length, followupList(fus)) : "");
}

/* Groundwork (direction.toml): what has to be true before the results count, to-dos flagged. */
export function groundwork({ compact = false } = {}) {
  const items = SITE.direction?.groundwork || [];
  if (!items.length) return "";
  const todo = items.filter((g) => g.status !== "done");
  const li = (g) => `<li class="${g.status === "done" ? "ok" : "todo"}"><span aria-hidden="true">${g.status === "done" ? "✓" : "!"}</span><span>${esc(g.item)}${g.note ? `<span class="faint gw-note">${esc(g.note)}</span>` : ""}</span></li>`;
  const shown = compact ? todo : [...todo, ...items.filter((g) => g.status === "done")];
  const head = `<header class="gw-head"><h2>Groundwork</h2><span class="${todo.length ? "badge warn" : "badge pass"}">${todo.length ? `${todo.length} to do` : "done"}</span></header>`;
  return `<section class="gw">${head}<p class="muted small">What has to be true before the results count (day 0).</p><ul class="gw-list">${shown.map(li).join("")}</ul></section>`;
}

/* The plan as a table: what it runs, on what, read by whom. */
function planTable(plan) {
  const rows = plan.runs.map((r) => {
    const [name, version] = r.dataset.split("@");
    const d = datasetNamed(name);
    return `<tr><td>${d ? `<a href="${datasetHref(d)}">${esc(d.title)}</a>` : esc(name)} <span class="faint mono">${esc(version || "")}</span></td><td class="num">${r.cases}</td>
      <td class="wrap">${esc(r.policies.map((p) => POLICY[p] || p).join(", "))}</td><td>${esc(shortJudge(r.judge))} <span class="faint">${r.samples} reads</span></td></tr>`;
  }).join("");
  return `<div class="panel"><div class="scroll"><table class="left"><thead><tr><th>Set</th><th class="num">Cases</th><th>Policies</th><th>Judge</th></tr></thead><tbody>${rows}</tbody></table></div></div>
    <p class="small muted">${plan.cases} cases · ${plan.trials} trials · estimate ${esc(money(plan.estimate))} for the whole plan${plan.estimate_basis === "approximate" ? " (approximate: no recorded run with this judge)" : ""}</p>`;
}

function runsTable(runs) {
  const rows = runs.map((e) => {
    const c = e.config || {}, d = datasetOf(e);
    return `<tr><td class="mono-cell"><a href="#/${e.kind === "ablation" ? "ablation" : "run"}/${esc(e.name)}">${esc(e.name)}</a></td>
      <td>${d ? `<a href="${datasetHref(d)}">${esc(d.title)}</a>` : esc(c.data || "—")}</td>
      <td>${esc(STANCE[e.stance] || e.stance || "")}</td>
      <td class="wrap">${esc((c.policies || c.conditions || []).map((p) => POLICY[p] || p).join(", "))}</td>
      <td>${esc(judgeShort(e))}</td><td class="num">${c.sample_ids?.length || c.limit || "all"}</td></tr>`;
  }).join("");
  return rows ? `<div class="panel"><div class="scroll"><table class="left"><thead><tr><th>Run</th><th>Set</th><th>Lab</th><th>Policies</th><th>Judge</th><th class="num">Cases</th></tr></thead><tbody>${rows}</tbody></table></div></div>` : `<p class="empty">No recorded runs.</p>`;
}

function page(x) {
  const p = progressOf(x);
  const st = studyOf(x);
  const plan = planOf(x);
  const runs = runsOf(x);
  const g = GROUPS.find(([k]) => k === x.group);
  const ex = expectationOf(x);
  const so = g ? findingsAnswers()[g[3]] : "";
  const crumbs = `<a href="#/experiments">Experiments</a> / <span class="mono">${esc(x.id)}</span>`;
  const head = `<div class="study-head"><div class="crumbs">${crumbs}</div><h2>${esc(x.title)}</h2>
    <p class="study-status">${pill(p)} ${meter(p)} ${x.judge ? `<span class="muted">read by ${esc(x.judge)}</span>` : ""}${g ? ` <span class="muted">· answers <a href="#/findings/${g[3]}">${esc(g[2])}</a></span>` : ""}${x.replaced_by ? ` <span class="muted">· re-run as <a href="#/experiments/${encodeURIComponent(x.replaced_by)}">${esc(x.replaced_by)}</a></span>` : ""}</p></div>`;
  const block = (title, body, aside = "") => section(title, body, aside);
  const result = [
    x.result ? `<p>${esc(x.result)}</p>` : "",
    st?.checks?.length ? `<h3 class="sub-h">Expectations, scored</h3>${checksBlock(st)}` : "",
    so && p.state !== "todo" ? `<p class="xp-so"><span class="muted">So far, across judges:</span> ${so} <a href="#/findings/${g[3]}">Findings</a></p>` : "",
  ].filter(Boolean).join("") || `<p class="muted">To be filled in when the runs are in.</p>`;
  const progress = p.state === "todo"
    ? `<p class="muted">Not started.${plan ? ` Estimate ${esc(money(plan.estimate))}.` : ""}</p>`
    : `<p>${meter(p)}</p><p class="small muted">${p.runs ?? counted(runs).length} runs recorded${p.parts?.length ? ` · parts ${esc(p.parts.join(", "))}` : ""}${plan && p.state !== "done" ? ` · whole plan estimated at ${esc(money(plan.estimate))}` : ""}</p>`;
  return head
    + block("Hypothesis", `<p class="xp-lead">${esc(x.hypothesis || "—")}</p>`)
    + (x.reasoning ? block("Reasoning", `<p>${esc(x.reasoning)}</p>`) : "")
    + block("Expectations, as written", `<p>${ex.badge}</p><p>${esc(ex.text)}</p>`)
    + block("Design", `<p>${esc(x.question || "")}</p>${plan ? planTable(plan) : ""}${st ? `<h3 class="sub-h">Cases drawn per kind</h3>${cellTable(st)}<h3 class="sub-h">Blind review of the drawn cases</h3>${reviewBlock(st)}` : ""}`)
    + block("Progress", progress)
    + block("Result", result)
    + `<details class="xp-fold"><summary>Runs <span class="count">${runs.length}</span></summary>${runsTable(runs)}</details>`;
}

/* Findings and Experiments are top-level pages (#/findings, #/experiments). */
export function pageFindings(anchor) {
  const results = resultsBlock();
  const head = pageHead({ title: "Findings", sub: "<span>What the runs on the validated data show so far.</span>" });
  $("view").innerHTML = results ? `<div class="r-page">${head}${results}</div>` : head + `<p class="empty">No findings yet.</p>`;
  if (!results) return;
  wireResults($("view"));
  if (/^a-/.test(anchor || "")) document.getElementById(anchor)?.scrollIntoView();
}

export function pageExperiments(id) {
  const x = experiments().find((e) => e.id === decodeURIComponent(id || ""));
  if (id && !x) { $("view").innerHTML = pageHead({ title: "Experiments" }) + `<p class="empty">No experiment <code>${esc(id)}</code>. <a href="#/experiments">All experiments</a></p>`; return; }
  $("view").innerHTML = x ? page(x) : pageHead({ title: "Experiments", sub: "<span>One question each. The hypothesis and expectations are written before the runs; the result after.</span>" }) + list();
}
