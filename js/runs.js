/* Runs: the index, a P1 run page and an ablation page. */

import {
  $,
  ablationRun,
  allRuns,
  bySetSection,
  byTypeSection,
  CONDITION,
  CONDITIONS,
  dataTip,
  dayOf,
  esc,
  f0,
  f2,
  hrefOf,
  human,
  kindOf,
  kTokens,
  LABELS,
  labelText,
  ledgerEntry,
  mean,
  onKey,
  p1Run,
  pageHead,
  POLICIES,
  POLICY,
  query,
  rankCase,
  ROLE,
  sc,
  sceneName,
  sd,
  section,
  setQuery,
  setupGrid,
  SHIFT,
  signed,
  SITE,
  STANCE,
  state,
  subLine,
  term,
  timeOf,
  tipRows,
  tokensOf,
  withQuery,
  wordDiff,
  datasetOfVersion,
  leakageInvalid,
  runStatus,
  onArchivedData,
} from "./core.js?v=2e746ab46e";
import { experimentOf } from "./direction.js?v=2e746ab46e";
import { simRunSection } from "./sim.js?v=2e746ab46e";

/* ---------- Page: runs index ---------- */

export function pageRuns() {
  const q = query(), kind = q.get("kind") || "all";
  const named = (q.get("runs") || "").split(",").filter(Boolean); // a link to several runs (Findings)
  const showAll = q.get("all") === "1" || named.length > 0;
  const kept = allRuns().filter((e) => kind === "all" || kindOf(e) === kind).filter((e) => !named.length || named.includes(e.name));
  const rows = kept.filter((e) => showAll || !runStatus(e));
  const hidden = kept.length - rows.length;
  const kinds = ["all", "Redaction run", "Ablation", "Judge only", "Re-ask"];
  const filter = `<div class="seg" role="group" aria-label="Type">${kinds.map((k) =>
    `<button type="button" data-k="${k}" aria-pressed="${kind === k}">${k === "all" ? "All" : k}</button>`).join("")}</div>`;
  const setup = (e) => {
    const c = e.config || {};
    if (e.kind === "ablation") return (c.conditions || []).map((x) => CONDITION[x] || x).join(", ");
    const pols = c.policies || [];
    return `${STANCE[e.stance] || "—"}${pols.length && pols.length < POLICIES.length - 1 ? " · " + pols.map((p) => POLICY[p]).join(", ") : ""}`;
  };
  const n = (e) => { const c = e.config || {}; return c.sample_ids?.length ?? c.limit ?? "all"; };
  let lastDay = null;
  const body = rows.length ? `<div class="panel"><div class="scroll"><table class="left runs-table">
    <thead><tr><th>Time <span class="faint">(yours)</span></th><th>Type</th><th>Dataset</th><th>Setup</th><th class="num">Cases</th><th>Experiment</th><th class="num">${term("tokens", "Tokens")}</th><th>Commit</th><th>Purpose</th></tr></thead>
    <tbody>${rows.map((e) => {
      const d = dayOf(e.name);
      const head = d !== lastDay ? `<tr class="group-row"><td colspan="9">${d}</td></tr>` : "";
      lastDay = d;
      return `${head}<tr class="link" tabindex="0" data-href="${hrefOf(e)}">
      <td>${timeOf(e.name)}${runStatus(e) ? ` <span class="badge run-status">${runStatus(e)}</span>` : ""}${onArchivedData(e) ? ` <span class="badge run-status" ${dataTip("Read data the final product no longer rests on: the benchmark or an earlier version of a simulated set. Kept as the record; re-run on the validated sets.")}>archived data</span>` : ""}</td><td>${term({ "Redaction run": "kind_p1", Ablation: "kind_ablation", "Judge only": "kind_judge", "Re-ask": "kind_reask" }[kindOf(e)], kindOf(e))}</td><td>${esc(datasetOfVersion(e.config?.data, e.config?.split)?.name || "—")}</td><td>${esc(setup(e))}</td>
      <td class="num">${n(e)}</td><td>${experimentOf(e) ? `<a href="#/experiments/${encodeURIComponent(experimentOf(e).id)}">${esc(experimentOf(e).id)}</a>` : `<span class="faint">—</span>`}</td><td class="num">${tokensOf(e) ? kTokens(tokensOf(e)) : "—"}</td>
      <td class="mono-cell">${e.commit ? esc(String(e.commit).slice(0, 7)) : "—"}${e.dirty ? `<span class="dot" data-tip="dirty"></span>` : ""}</td>
      <td class="ellipsis" ${e.purpose ? dataTip(esc(e.purpose)) : ""}>${esc(e.purpose || "")}</td></tr>`;
    }).join("")}</tbody></table></div></div>`
    : `<p class="empty">No recorded runs.</p>`;
  const all = allRuns();
  const count = (k) => all.filter((e) => kindOf(e) === k).length;
  const total = all.reduce((a, e) => a + tokensOf(e), 0);
  const sub = [`${all.length} runs`, `${count("Redaction run")} redaction`, `${count("Ablation")} ablation`, `${count("Judge only")} judge-only`, `${count("Re-ask")} re-ask`, `${kTokens(total)} tokens`]
    .map((t) => `<span>${t}</span>`).join("");
  const content = body;
  const waiting = (SITE.studies || []).filter((st) => ["planned", "running"].includes(st.status) && !st.runs.length);
  const planned = waiting.length ? `<p class="muted small runs-planned">Planned, not run yet: ${waiting.map((st) => `<a href="#/experiments/${encodeURIComponent(st.name)}">${esc(st.title)}</a>`).join(" · ")}</p>` : "";
  const intro = named.length
    ? `<p class="muted small">Showing ${named.length} chosen runs. <a href="#/runs">All runs</a></p>`
    : `<p class="muted small runs-hidden">${hidden ? `${hidden} smoke batches and replaced runs hidden: they don't count toward any result. <a href="#" data-all="1">Show them</a>` : showAll && !named.length ? `<a href="#" data-all="0">Hide smoke batches and replaced runs</a>` : ""}</p>`;
  $("view").innerHTML = pageHead({ title: "Runs", sub }) + section("History", intro + planned + content, filter);
  $("view").querySelectorAll("tr[data-href]").forEach((tr) => onKey(tr, () => { location.hash = tr.dataset.href; }));
  $("view").querySelectorAll("[data-k]").forEach((b) => { b.onclick = () => setQuery({ kind: b.dataset.k === "all" ? null : b.dataset.k }); });
  $("view").querySelectorAll("[data-all]").forEach((a) => { a.onclick = (ev) => { ev.preventDefault(); setQuery({ all: a.dataset.all === "1" ? "1" : null }); }; });
}

/* The run's own logs in the bundled Inspect viewer, when the bundle has them. */
function transcripts(name) {
  if (!SITE.inspect_viewer || !(SITE.inspect_runs || []).includes(name)) return "";
  return `<a class="ext" href="viewer/#/logs/${encodeURIComponent(name)}/" target="_blank" rel="noopener">Transcripts ↗</a>`;
}

/* ---------- Page: P1 run ---------- */

const wrongWay = (s) => Boolean(s.wrong_way); // flagged in Python (core/sample_metrics.py)
/* Where the dataset's evidence names several candidates for most secrets (its leakage check, Data
   tab), the judge can't tell which one is the secret until redaction removes the others and a
   surviving detail points at one, so the edited guess can beat the unedited one. */
const simLeakNote = (name) => (leakageInvalid(name)
  ? `<p class="muted small">Leakage isn't valid on this dataset: its evidence names several candidates for most secrets, so the judge can't tell which one is the secret until redaction removes the others and a surviving detail (a handle, a job slug) points at one. Its guess can then be surer after editing than before, so leakage here sits near 1 and isn't comparable with the benchmark's.</p>`
  : "");
const leaked = (s) => s.secrets.some((x) => (x.leakage ?? 0) >= 0.5);
const runPolicies = (r) => POLICIES.filter((p) => (r.samples || []).some((s) => s.policy === p));
function byCase(samples) {
  const map = new Map();
  for (const s of samples) {
    if (!map.has(s.scenario_id)) map.set(s.scenario_id, {});
    map.get(s.scenario_id)[s.policy] = s;
  }
  return [...map.entries()].map(([id, pol]) => ({ id, pol, any: Object.values(pol)[0] }))
    .sort((a, b) => rankCase(a.any) - rankCase(b.any) || a.id.localeCompare(b.id));
}

function resultsTable(r, name = r.name) {
  const noLeak = leakageInvalid(name); // the dataset fails its leakage check: no number to show
  // From the run's samples by the shared definitions; a run without samples shows its summary file.
  const rows = (r.table?.length ? r.table : (r.summary || []).map((s) => ({
    policy: s.policy, n: s.samples, persistence: s.persistence?.estimate, leakage: s.leakage_mean?.estimate,
    auroc_unedited: s.auroc_unedited, auroc_edited: s.auroc_edited, fpr: s.errors_edited?.false_positive_rate,
    fnr: s.errors_edited?.false_negative_rate, wrong_way: null, evidence_loss: s.evidence_loss,
  }))).map((s) => `<tr><td>${term(s.policy, POLICY[s.policy] || esc(s.policy))}</td><td>${s.n}</td>
      <td>${f2(s.persistence)}</td><td>${noLeak ? `<span class="faint" title="not valid on this dataset (Data tab)">n/a</span>` : f2(s.leakage)}</td>
      <td>${f2(s.auroc_unedited)}</td><td>${f2(s.auroc_edited)}</td>
      <td>${f2(s.fpr)}</td><td>${f2(s.fnr)}</td>
      <td>${s.wrong_way ?? "—"}</td><td>${f2(s.evidence_loss)}</td></tr>`).join("");
  const checks = (r.checks || []).map((c) => {
    const cls = c.result === "pass" ? "pass" : c.result === "FAIL" ? "fail" : "warn";
    const key = /AUROC/.test(c.name) ? "gate_auroc" : /herring/i.test(c.name) ? "gate_difficulty" : null;
    return `<span><span class="badge ${cls}">${c.result === "FAIL" ? "fail" : esc(c.result)}</span> ${key ? term(key, esc(c.name)) : esc(c.name)}<span class="muted">${esc(c.detail)}</span></span>`;
  }).join("");
  return `<div class="panel"><div class="scroll"><table>
    <thead><tr><th>Policy</th><th>n</th><th>${term("persistence", "Persistence")}</th><th>${term("leakage", "Leakage")}</th>
    <th>${term("auroc_unedited", "AUROC unedited")}</th><th>${term("auroc_edited", "AUROC edited")}</th><th>${term("fpr", "FPR")}</th><th>${term("fnr", "FNR")}</th><th>${term("wrong_way", "Wrong-way")}</th><th>${term("evidence_loss", "Evidence loss")}</th></tr></thead>
    <tbody>${rows}</tbody></table></div></div>
    ${checks ? `<div class="checks">${checks}</div>` : ""}`;
}

function dumbbells(r) {
  const groups = byCase(r.samples);
  const pols = runPolicies(r);
  const rowH = 24, top = 44, nameW = 200, plotW = 220, gap = 64, panelW = plotW + gap;
  const rows = [];
  let y = top, last = null;
  for (const g of groups) {
    if (g.any.label !== last) { rows.push({ head: LABELS[g.any.label], y: y + 16 }); y += 26; last = g.any.label; }
    rows.push({ g, y: y + rowH / 2 }); y += rowH;
  }
  const h = y + 8, w = nameW + pols.length * panelW;
  const x0 = (k) => nameW + k * panelW;
  const x = (k, v) => x0(k) + (plotW * v) / 100;
  const frame = pols.map((p, k) => `<text x="${x0(k)}" y="14" class="db-cap">${POLICY[p]}</text>` +
    [0, 50, 100].map((v) => `<line x1="${x(k, v)}" x2="${x(k, v)}" y1="${top - 10}" y2="${h - 4}" class="db-grid"/><text x="${x(k, v)}" y="${top - 16}" class="db-tick">${v}</text>`).join("")).join("");
  const body = rows.map((row) => {
    if (row.head) return `<text x="0" y="${row.y}" class="db-head">${esc(row.head)}</text>`;
    const g = row.g;
    const marks = pols.map((p, k) => {
      const s = g.pol[p];
      if (!s) return "";
      const a = x(k, s.judge_unedited), b = x(k, s.judge_edited), d = s.judge_edited - s.judge_unedited;
      const tip = `${s.scenario_id} · ${POLICY[p]}: ${sc(s.judge_unedited)} → ${sc(s.judge_edited)}`;
      const html = tipRows(`${sceneName(s.scenario_id)} · ${POLICY[p]}`, [["Unedited", sc(s.judge_unedited)], ["Edited", sc(s.judge_edited)], ["Change", signed(d)]]);
      return `<g class="db-row ${wrongWay(s) ? "bad" : ""} ${query().get("case") === s.scenario_id && query().get("policy") === p ? "sel" : ""}" data-id="${esc(s.scenario_id)}" data-p="${p}" tabindex="0" role="button" aria-label="${esc(tip)}" ${dataTip(html)}>
        <rect x="${x0(k) - 8}" y="${row.y - rowH / 2 + 1}" width="${panelW - 12}" height="${rowH - 2}" rx="4" class="db-hit"></rect>
        <line x1="${a}" x2="${b}" y1="${row.y}" y2="${row.y}" class="db-line"/>
        <circle cx="${a}" cy="${row.y}" r="4.5" class="db-before"/><circle cx="${b}" cy="${row.y}" r="4.5" class="db-after"/>
        ${Math.abs(d) >= SHIFT ? `<text x="${x0(k) + plotW + 10}" y="${row.y + 4}" class="db-delta">${signed(d)}</text>` : ""}</g>`;
    }).join("");
    return `<text x="0" y="${row.y + 4}" class="db-name">${esc(sceneName(g.id))}${g.any.difficulty ? " · " + g.any.difficulty : ""}</text>${marks}`;
  }).join("");
  return `<div class="panel chart"><svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="group" aria-label="Judge scores by case and policy">${frame}${body}</svg></div>`;
}

function secretsTable(r) {
  const pols = runPolicies(r);
  const groups = byCase(r.samples);
  const scorable = (x) => x.p_unedited - x.p_prior > 0.01;
  const leaks = (g, i) => pols.some((p) => (g.pol[p]?.secrets[i]?.leakage ?? 0) > 0);
  let last = null;
  const rows = groups.flatMap((g) => g.any.secrets.map((x, i) => [x, i])
    .filter(([x, i]) => scorable(x) && (state.allSecrets || leaks(g, i))).map(([x, i]) => {
    const head = g.any.label !== last ? `<tr class="group-row"><td colspan="${5 + pols.length}">${LABELS[g.any.label]}</td></tr>` : "";
    last = g.any.label;
    const cells = pols.map((p) => {
      const s = g.pol[p];
      if (!s) return `<td class="muted">—</td>`;
      const v = s.secrets[i], l = v.leakage ?? 0;
      return `<td class="leak" style="--l:${l.toFixed(2)}" ${dataTip(tipRows(POLICY[p], [["p edited", f2(v.p_edited)], ["Leakage", f2(v.leakage)]]))}>${f2(v.p_edited)}</td>`;
    }).join("");
    return `${head}<tr class="link ${query().get("case") === g.id ? "sel" : ""}" data-id="${esc(g.id)}" tabindex="0">
      <td class="mono-cell">${esc(sceneName(g.id))}</td><td style="text-align:left">${esc(human(x.secret_type))}</td><td class="mono-cell" style="text-align:left">${esc(x.value)}</td>
      <td>${f2(x.p_prior)}</td><td>${f2(x.p_unedited)}</td>${cells}</tr>`;
  })).join("");
  return `<div class="panel"><div class="scroll"><table>
    <thead><tr><th>Case</th><th style="text-align:left">Secret</th><th style="text-align:left">True value</th><th>${term("prior", "Prior")}</th><th>${term("p_unedited", "Unedited")}</th>${pols.map((p) => `<th>${term(p, POLICY[p])}</th>`).join("")}</tr></thead>
    <tbody>${rows || `<tr><td colspan="${5 + pols.length}" class="muted" style="text-align:left">No secret leaked under any policy.</td></tr>`}</tbody></table></div></div>`;
}

function secretCounts(r) {
  const pols = runPolicies(r);
  let scored = 0, leakedRows = 0;
  for (const g of byCase(r.samples)) g.any.secrets.forEach((x, i) => {
    if (x.p_unedited - x.p_prior <= 0.01) return;
    scored++;
    if (pols.some((p) => (g.pol[p]?.secrets[i]?.leakage ?? 0) > 0)) leakedRows++;
  });
  return { scored, leakedRows };
}

const PROMPT_SETS = {
  advocate: ["advocate", "process_executor", "process_self", "stance_honest", "stance_red_team", "stance_cover_up", "rules"],
  executor: ["executor", "rules"],
  judge: ["judge_violation", "judge_secrets", "context_evidence", "context_prior"],
  integrity: ["integrity_check"],
};
function promptBar(policy) {
  if (!SITE.prompts || !Object.keys(SITE.prompts).length) return "";
  const roles = ["advocate", ...(policy === "contextual_rewrite" ? ["executor"] : []), "judge", "integrity"];
  const used = policy.startsWith("text_") ? ["judge", "integrity"] : roles;
  return `<div class="prompt-bar"><span class="faint">Prompts</span>${used.map((r) => `<button type="button" class="chip" data-prompt="${r}">${esc(ROLE[r === "integrity" ? "integrity_check" : r] || r)}</button>`).join("")}<span class="faint small">templates as of the current commit; ${SITE.inspect_viewer ? "full calls in Transcripts" : "filled with the case at run time"}</span></div>`;
}
function showPrompt(role) {
  const box = $("prompt-view");
  if (!box) return;
  if (box.dataset.role === role && !box.hidden) { box.hidden = true; return; }
  box.dataset.role = role;
  box.hidden = false;
  box.innerHTML = `<div class="sub" style="justify-content:space-between"><h4 style="margin:0">${esc(ROLE[role === "integrity" ? "integrity_check" : role] || role)} prompt</h4><button type="button" class="link-btn" data-close-prompt>Close</button></div>` + PROMPT_SETS[role].filter((n) => SITE.prompts[n]).map((n) =>
    `<details ${n === PROMPT_SETS[role][0] ? "open" : ""}><summary class="mono">${esc(n)}.md</summary><pre class="prompt">${esc(SITE.prompts[n])}</pre></details>`).join("");
  box.querySelector("[data-close-prompt]").onclick = () => { box.hidden = true; };
  box.scrollIntoView({ block: "nearest" });
}

function sampleBrowser(r) {
  const groups = byCase(r.samples);
  const q = query(), pols = runPolicies(r);
  const caseId = groups.some((x) => x.id === q.get("case")) ? q.get("case") : groups[0]?.id ?? null;
  const policy = pols.includes(q.get("policy")) ? q.get("policy") : pols.includes("contextual_rewrite") ? "contextual_rewrite" : pols[0];
  const g = groups.find((x) => x.id === caseId);
  const list = groups.map((x) => {
    const own = pols.map((p) => x.pol[p]).filter(Boolean);
    const flags = [own.some(wrongWay) && "wrong-way", own.some(leaked) && "leak"].filter(Boolean);
    return `<li tabindex="0" data-id="${esc(x.id)}" aria-selected="${x.id === caseId}"><b>${esc(x.id)}</b>
      <span>${labelText(x.any)}${flags.length ? ` · <em>${flags.join(", ")}</em>` : ""}</span></li>`;
  }).join("");
  if (!g) return "";
  const s = g.pol[policy];
  const seg = `<div class="seg" role="group" aria-label="Policy">${pols.map((p) => `<button type="button" data-p="${p}" data-tip="${p}" aria-pressed="${p === policy}">${POLICY[p]}</button>`).join("")}</div>`;
  let body = `<p class="empty">No sample for this policy.</p>`;
  if (s) {
    const rulings = Object.fromEntries(s.rulings.map((x) => [x.request_index, x]));
    const reqs = s.requests.length ? s.requests.map((q, k) => {
      const ru = rulings[k];
      const decision = s.policy === "self_redaction" ? "applied" : ru ? ru.decision : "denied";
      const final = ru && ru.decision === "modify" ? ru.replacement : ru && ru.decision === "deny" ? q.span : q.action === "generalize" && q.proposed_replacement ? q.proposed_replacement : `[REDACTED: ${q.category}]`;
      const cls = decision === "deny" || decision === "denied" ? "fail" : decision === "modify" ? "warn" : "pass";
      const why = `<div class="why"><p><span class="who">Advocate</span>${q.rule ? `<span class="faint"> cites ${esc(q.rule)}</span>` : ""}: ${esc(q.reason)}${q.proposed_replacement ? ` <span class="faint">Proposed: ${esc(q.proposed_replacement)}</span>` : ""}</p>${ru && s.policy !== "self_redaction" ? `<p><span class="who">Executor</span>: ${esc(ru.reason)}</p>` : ""}</div>`;
      return `<tr class="req"><td class="num faint">${k + 1}</td><td class="mono-cell wrap">${esc(q.span)}</td><td>${esc(q.action)}</td><td>${esc(q.category)}</td>
        <td><span class="badge ${cls}">${esc(decision)}</span></td><td class="mono-cell wrap">${esc(final ?? "")}</td></tr>
        <tr class="req-why" ${state.showReasons ? "" : "hidden"}><td></td><td colspan="5">${why}</td></tr>`;
    }).join("") : `<tr><td colspan="6" class="muted">${s.policy.startsWith("text_") ? "Registry values replaced by script." : "No requests."}</td></tr>`;
    const edited = Object.fromEntries(s.edited_evidence.map((e) => [e.log_id, e.quote]));
    const ev = s.evidence.map((e) => `<div><span class="id">${esc(e.log_id)}</span><span class="txt">${wordDiff(e.quote, edited[e.log_id] ?? "")}</span></div>`).join("");
    const secrets = s.secrets.filter((x) => x.p_unedited - x.p_prior > 0.01);
    body = `
      <div class="finding-callout"><p class="eyebrow">Auditor's finding</p><p class="finding-text">${esc(s.finding)}</p>${s.reasoning ? `<p class="muted small">${esc(s.reasoning)}</p>` : ""}</div>
      ${promptBar(s.policy)}
      <div class="prompt-view" id="prompt-view" hidden></div>
      <dl class="kv">
        <div><dt>${term("auditor_grade", "Auditor grade")}</dt><dd>${s.auditor_grade}</dd></div>
        <div><dt>${term("judge_score", "Judge, unedited")}</dt><dd>${sc(s.judge_unedited)}</dd></div>
        <div><dt>${term("judge_score", "Judge, edited")}</dt><dd>${sc(s.judge_edited)} <span class="faint">${signed(s.judge_edited - s.judge_unedited)}</span></dd></div>
        <div><dt>${term("finding", "Finding")}</dt><dd>${esc(s.integrity)}</dd></div>
      </dl>
      <div><h4>Evidence shown to the judge</h4><div class="logs diff">${ev}</div></div>
      <div><div class="sub" style="justify-content:space-between;margin:0 0 8px"><h4 style="margin:0">Requests and rulings</h4>${s.requests.length ? `<button type="button" class="link-btn" id="toggle-why">${state.showReasons ? "Hide reasoning" : "Show reasoning"}</button>` : ""}</div><div class="panel"><div class="scroll"><table class="left reqs">
        <thead><tr><th></th><th>Span</th><th>Action</th><th>Category</th><th>${term("ruling", "Ruling")}</th><th>${term("result", "Result")}</th></tr></thead><tbody>${reqs}</tbody></table></div></div></div>
      ${secrets.length ? `<div><h4>Secrets</h4><div class="panel"><div class="scroll"><table>
        <thead><tr><th>Secret</th><th style="text-align:left">True value</th><th>${term("prior", "Prior")}</th><th>${term("p_unedited", "Unedited")}</th><th>${term("p_edited", "Edited")}</th><th>${term("leakage", "Leakage")}</th></tr></thead><tbody>
        ${secrets.map((x) => `<tr><td>${esc(human(x.secret_type))}</td><td class="mono-cell" style="text-align:left">${esc(x.value)}</td><td>${f2(x.p_prior)}</td><td>${f2(x.p_unedited)}</td><td>${f2(x.p_edited)}</td><td>${f2(x.leakage)}</td></tr>`).join("")}
        </tbody></table></div></div></div>` : ""}
`;
  }
  return `<div class="browser" id="samples">
    <ol class="list panel" id="run-list">${list}</ol>
    <article class="detail">
      <div><h3>${esc(g.id)}</h3><p class="claim">${esc(g.any.claim)}</p>${(() => { const href = caseLink(ledgerEntry(r.name), g.id); return href ? `<p class="small read-by"><a href="${href}">The whole case on the Data tab</a> <span class="faint">its logs, secrets and correlates</span></p>` : ""; })()}</div>
      ${seg}${body}
    </article></div>`;
}

export function pageRun(name, tab = "") {
  const r = p1Run(name);
  const e = ledgerEntry(name) || { name, config: {} };
  const c = e.config || {};
  const x = experimentOf(ledgerEntry(name) || { name });
  const thread = x ? ` / <a href="#/experiments/${encodeURIComponent(x.id)}">${esc(x.title)}</a>` : "";
  const crumbs = `<a href="#/runs">Runs</a>${thread} / <span class="mono">${esc(name)}</span>`;
  const stance = e.stance || name.split("-")[2]; // unrecorded runs have only their name
  const title = `Redaction run · ${STANCE[stance] ? term(stance, STANCE[stance]) : "run"}`;
  const n = r?.samples ? new Set(r.samples.map((s) => s.scenario_id)).size : null;
  const sub = subLine(e, [`<span>${esc(datasetOfVersion(c.data, c.split)?.title || c.split || "dev")}</span>`, n ? `<span>${n} cases</span>` : ""]);
  const head = pageHead({ crumbs, title, sub, purpose: e.purpose });
  if (!r) { // recorded in the ledger, but its results and logs aren't in this build of the site
    $("view").innerHTML = head + `<div class="io io-in">${section("Inputs", setupGrid(e), `<span>fixed before the run: data build, protocol, models</span>`)}</div>`
      + simRunSection(name) + `<p class="empty">This run's results aren't in this build of the site (they live with its logs, on the machine that ran it).</p>`;
    return;
  }
  const base = `#/run/${encodeURIComponent(name)}`;
  const hasSamples = !!r.samples?.length;
  const tabs = hasSamples ? `<nav class="tabs" aria-label="Run">
    <a href="${base}" ${tab !== "samples" ? 'aria-current="page"' : ""}>Overview</a>
    <a href="${base}/samples" ${tab === "samples" ? 'aria-current="page"' : ""}>Samples</a>
    ${transcripts(name)}</nav>` : "";
  let body;
  if (tab === "samples" && hasSamples) {
    body = sampleBrowser(r);
  } else {
    const legend = `<span class="legend-mark"><i class="before"></i>Unedited</span><span class="legend-mark"><i class="after"></i>Edited</span><span class="legend-mark"><i class="bad"></i>${term("wrong_way", `Moved ${SHIFT}+ the wrong way`)}</span>`;
    const counts = hasSamples ? secretCounts(r) : null;
    const toggle = counts ? `<span>${counts.leakedRows} of ${counts.scored} leaked</span><button type="button" class="link-btn" id="all-secrets">${state.allSecrets ? "Show leaked only" : "Show all"}</button>` : "";
    body = `<div class="io">${section("Results", resultsTable(r))}${simRunSection(name)}`
      + bySetSection(r) + byTypeSection(r)
      + (hasSamples ? section(term("judge_score", "Judge score"), dumbbells(r), legend) + section(term("leakage", "Secret leakage"), simLeakNote(name) + secretsTable(r), toggle) : "")
      + section("Setup", setupGrid(e), `<span>fixed before the run: data, protocol, models</span>`) + `</div>`;
  }
  $("view").innerHTML = `<div>${head}${tabs}</div>${body}`;
  const open = (id, p) => { location.hash = withQuery(`${base}/samples`, { case: id, policy: p }); };
  $("view").querySelectorAll(".db-row").forEach((el) => onKey(el, () => open(el.dataset.id, el.dataset.p)));
  $("view").querySelectorAll("tr.link[data-id]").forEach((el) => onKey(el, () => open(el.dataset.id, null)));
  $("view").querySelectorAll("#run-list li").forEach((li) => onKey(li, () => setQuery({ case: li.dataset.id })));
  $("view").querySelectorAll("#samples .seg button").forEach((b) => { b.onclick = () => setQuery({ policy: b.dataset.p }); });
  $("view").querySelectorAll("[data-prompt]").forEach((b) => { b.onclick = () => showPrompt(b.dataset.prompt); });
  const why = $("toggle-why");
  if (why) why.onclick = () => { state.showReasons = !state.showReasons; pageRun(name, "samples"); };
  const t = $("all-secrets");
  if (t) t.onclick = () => { state.allSecrets = !state.allSecrets; pageRun(name, tab); };
}

/* ---------- Page: ablation ---------- */

/* The benchmark case a run read, when the build it read ships with the site; else null. */
function caseLink(e, id) {
  const c = e?.config || {}, v = String(c.data || "").replace(/^built:/, "");
  const b = SITE.builds.find((x) => x.version === v && x.key === (c.split || "dev"));
  const d = b && datasetOfVersion(v, b.key);
  return d ? withQuery(`#/data/${d.name}/cases/${encodeURIComponent(id)}`, { version: v === d.current ? null : v }) : null;
}

function groupOf(row) {
  return row.label === "red_herring" ? `red_herring:${row.difficulty}` : row.label;
}
const GROUPS = [["violation", "Violation"], ["red_herring:easy", "Red herring · easy"], ["red_herring:medium", "Red herring · medium"], ["red_herring:hard", "Red herring · hard"], ["clean", "Clean"]]
  .map(([k, label]) => [k, k.startsWith("red_herring") ? term("red_herring", label) : label]);

export function pageAblation(name) {
  const r = ablationRun(name);
  const e = ledgerEntry(name) || { name, config: {} };
  const x = experimentOf(ledgerEntry(name) || { name });
  const thread = x ? ` / <a href="#/experiments/${encodeURIComponent(x.id)}">${esc(x.title)}</a>` : "";
  const crumbs = `<a href="#/runs">Runs</a>${thread} / <span class="mono">${esc(name)}</span>`;
  const conds = CONDITIONS.filter((c) => r?.samples.some((s) => s.condition === c));
  const reask = kindOf(e) === "Re-ask";
  const judgeOnly = kindOf(e) === "Judge only";
  const title = reask ? term("kind_reask", "Judge re-ask") : judgeOnly ? term("kind_judge", "Judge only") : term("kind_ablation", "Marker ablation");
  const n = r ? new Set(r.samples.map((s) => s.scenario_id)).size : null;
  const head = pageHead({ crumbs, title, sub: subLine(e, [`<span>${esc(e.config?.split || "dev")}</span>`, n ? `<span>${n} cases</span>` : ""]), purpose: e.purpose });
  if (!r) { // recorded in the ledger, but its results and logs aren't in this build of the site
    $("view").innerHTML = head + `<div class="io io-in">${section("Inputs", setupGrid(e), `<span>fixed before the run: data build, protocol, models</span>`)}</div>`
      + simRunSection(name) + `<p class="empty">This run's results aren't in this build of the site (they live with its logs, on the machine that ran it).</p>`;
    return;
  }

  // The base is this run's unedited score, or for a re-ask, the latest full ablation's unedited score.
  const full = SITE.ablations.find((a) => a.name !== name && a.samples.some((s) => s.condition === "marker"));
  const baseRun = reask ? full : r;
  const base = Object.fromEntries((baseRun?.samples || []).filter((s) => s.condition === "unedited").map((s) => [s.scenario_id, s.score]));
  const reasks = SITE.ablations.filter((a) => a.name !== baseRun?.name && a.samples.every((s) => s.condition === "unedited"));
  const shiftsFor = (rows) => rows.filter((s) => s.scenario_id in base).map((s) => s.score - base[s.scenario_id]);

  const cols = reask ? ["unedited"] : conds;
  const noiseCol = !reask && reasks.length;
  const tableRows = GROUPS.map(([key, label]) => {
    const rows = r.samples.filter((s) => groupOf(s) === key);
    if (!rows.length) return "";
    const ids = new Set(rows.map((s) => s.scenario_id));
    const cells = cols.map((c) => {
      const these = rows.filter((s) => s.condition === c);
      const m = mean(these.map((s) => s.score));
      if (c === "unedited" && !reask) return `<td>${f0(m)}</td>`;
      const sh = mean(shiftsFor(these));
      return `<td>${f0(m)}<span class="delta">${signed(sh, 1)}</span></td>`;
    }).join("");
    let noise = "";
    if (noiseCol) {
      const ns = reasks.flatMap((a) => shiftsFor(a.samples.filter((s) => ids.has(s.scenario_id))));
      noise = `<td>${signed(mean(ns), 1)}<span class="delta">± ${f0(sd(ns))}</span></td>`;
    }
    return `<tr><td>${label}</td><td>${ids.size}</td>${cells}${noise}</tr>`;
  }).join("");
  const table = `<div class="panel"><div class="scroll"><table>
    <thead><tr><th>Group</th><th>n</th>${cols.map((c) => `<th>${reask ? "Re-ask" : term(c, CONDITION[c])}</th>`).join("")}${noiseCol ? `<th>${term("reask_noise", "Re-ask noise")}</th>` : ""}</tr></thead>
    <tbody>${tableRows}</tbody></table></div></div>`;

  // Per-case matrix: score per condition, shaded by shift from unedited.
  const ids = [...new Set(r.samples.map((s) => s.scenario_id))]
    .map((id) => r.samples.find((s) => s.scenario_id === id))
    .sort((a, b) => rankCase(a) - rankCase(b) || a.scenario_id.localeCompare(b.scenario_id));
  let last = null;
  const matrix = ids.map((any) => {
    const head = any.label !== last ? `<tr class="group-row"><td colspan="${2 + cols.length}">${LABELS[any.label]}</td></tr>` : "";
    last = any.label;
    const b = base[any.scenario_id];
    const cells = cols.map((c) => {
      const s = r.samples.find((x) => x.scenario_id === any.scenario_id && x.condition === c);
      if (!s) return `<td class="muted">—</td>`;
      if (c === "unedited" && !reask) return `<td>${sc(s.score)}</td>`;
      const d = b == null ? 0 : s.score - b;
      const k = Math.min(1, Math.abs(d) / 50).toFixed(2);
      return `<td class="${d > 0 ? "shift-up" : d < 0 ? "shift-down" : ""}" style="--s:${k}" ${dataTip(tipRows(`${sceneName(any.scenario_id)} · ${reask ? "Re-ask" : CONDITION[c]}`, [["Unedited", sc(b)], ["This condition", sc(s.score)], ["Change", signed(d)]]))}>${sc(s.score)}</td>`;
    }).join("");
    const href = caseLink(e, any.scenario_id);
    const name = esc(sceneName(any.scenario_id));
    return `${head}<tr><td class="mono-cell">${href ? `<a href="${href}">${name}</a>` : name}</td><td class="muted">${any.difficulty || ""}</td>${cells}</tr>`;
  }).join("");
  const matrixTable = `<div class="panel"><div class="scroll"><table>
    <thead><tr><th>Case</th><th style="text-align:left"></th>${cols.map((c) => `<th>${reask ? "Re-ask" : term(c, CONDITION[c])}</th>`).join("")}</tr></thead>
    <tbody>${matrix}</tbody></table></div></div>`;

  $("view").innerHTML = head
    + `<div class="io io-in">${section("Inputs", setupGrid(e), `<span>fixed before the run: data build, conditions, judge</span>`)}</div>`
    + `<div class="io io-out">${section("Results · mean judge score", table, reask ? `<span>shift vs ${esc(baseRun?.name || "—")}</span>` : `<span>shift vs unedited</span>`)}`
    + section("By case", matrixTable, `<span>shaded by shift from unedited</span>`) + `</div>`;
}
