/* A redaction run's cases tab: the case list, the policy variations of the chosen case, and that
   case under one policy (verdicts, the finding, requests and rulings, the judge's evidence,
   secrets, prompts). Also groups a run's samples by case for the run page. */

import { $, esc } from "../../lib/dom.js?v=2275844be3";
import { wordDiff } from "../../lib/diff.js?v=2275844be3";
import { caseName, f2, human, sc, signed } from "../../lib/format.js?v=2275844be3";
import { READING, ROLE } from "../../lib/labels.js?v=2275844be3";
import { term } from "../../lib/tips.js?v=2275844be3";
import { query } from "../../lib/view-state.js?v=2275844be3";
import { clearedAt, flaggedAt, policyKeys, policyName, rankCase } from "../../data/constants.js?v=2275844be3";
import { promptsFor } from "../../data/prompts.js?v=2275844be3";
import { simRunOf } from "../../data/datasets.js?v=2275844be3";
import { caseHref, ledgerEntry, runHref } from "../../data/runs.js?v=2275844be3";
import { lazyJson, SITE } from "../../data/site.js?v=2275844be3";
import { readKey } from "../../components/bars.js?v=2275844be3";
import { badge, cell, choice, fields, fold, labelBadge, subnav, table } from "../../components/blocks.js?v=2275844be3";
import { browser } from "../../components/browser.js?v=2275844be3";

/* A case gets the list's leak flag once a secret's leakage reaches this: page wording, not a
   measure (domain/metrics.py defines leakage, and its tail at LEAKAGE_TAIL_THRESHOLD). */
const LEAK_FLAG_AT = 0.5;
const leaked = (s) => s.secrets.some((x) => (x.leakage ?? 0) >= LEAK_FLAG_AT);
export const runPolicies = (r) => policyKeys().filter((p) => (r.samples || []).some((s) => s.policy === p));
/* A secret the unedited evidence points at: domain/metrics.leakage scores it (null when the unedited
   guess is no surer than the prior, so nothing can leak). */
export const scorable = (x) => x.leakage != null;

/* The run's samples by case: { id, pol: policy -> sample, any }, violations first. */
export function byCase(samples) {
  const map = new Map();
  for (const s of samples) {
    if (!map.has(s.scenario_id)) map.set(s.scenario_id, {});
    map.get(s.scenario_id)[s.policy] = s;
  }
  return [...map.entries()].map(([id, pol]) => ({ id, pol, any: Object.values(pol)[0] }))
    .sort((a, b) => rankCase(a.any) - rankCase(b.any) || a.id.localeCompare(b.id));
}


function promptBar(policy) {
  if (!SITE.prompts || !Object.keys(SITE.prompts).length) return "";
  const roles = ["advocate", ...(policy === "contextual_rewrite" ? ["executor"] : []), "judge", "integrity_check"];
  const used = (policy.startsWith("text_") ? ["judge", "integrity_check"] : roles).filter((r) => promptsFor(r).length);
  return `<div class="prompt-bar"><span class="faint">Prompts</span>${used.map((r) => `<button type="button" class="chip" data-prompt="${r}">${esc(ROLE[r])}</button>`).join("")}<span class="faint small">templates as of the current commit; ${SITE.inspect_viewer ? "full calls in Transcripts" : "filled with the case at run time"}</span></div>`;
}

export function showPrompt(role) {
  const box = $("prompt-view");
  if (!box) return;
  if (box.dataset.role === role && !box.hidden) { box.hidden = true; return; }
  box.dataset.role = role;
  box.hidden = false;
  const names = promptsFor(role);
  box.innerHTML = `<div class="row-head"><h4>${esc(ROLE[role])} prompt</h4><button type="button" class="link-btn" data-close-prompt>Close</button></div>`
    + names.map((n, i) => fold(`<span class="mono">${esc(n)}.md</span>`, `<pre class="prompt">${esc(SITE.prompts[n])}</pre>`, { cls: "quiet", open: i === 0 })).join("");
  box.querySelector("[data-close-prompt]").onclick = () => { box.hidden = true; };
  box.scrollIntoView({ block: "nearest" });
}

/* One of a sample's scores and how it fares against the label: right, unsure or wrong. */
function verdict(s, key) {
  const ok = s.outcomes[key];
  return `<b>${sc(s[key])}</b> ${badge(ok, ok)}`;
}

/* Each requested span's number within its category, as `domain.policies.span_numbers` counts. */
function spanNumbers(asked) {
  const numbers = {};
  const perCategory = {};
  for (const rq of asked) {
    const key = `${rq.category}\n${rq.span.toLowerCase()}`;
    if (key in numbers) continue;
    perCategory[rq.category] = (perCategory[rq.category] || 0) + 1;
    numbers[key] = perCategory[rq.category];
  }
  return (rq) => numbers[`${rq.category}\n${rq.span.toLowerCase()}`];
}

/* What each request left in the report, as `domain.policies.applied_edits` writes it: the given
   text, else the category's marker (numbered per span unless the run used the bare marker); under
   "distinct", a text two different spans share is numbered too. */
function finalTexts(s, standIn) {
  const numberOf = spanNumbers(s.requests);
  const rulings = Object.fromEntries(s.rulings.map((x) => [x.request_index, x]));
  const marker = (rq) => `[REDACTED: ${rq.category}${standIn && standIn !== "marker" ? ` ${numberOf(rq)}` : ""}]`;
  const texts = s.requests.map((rq, k) => {
    const ru = rulings[k];
    if (ru && ru.decision === "deny") return rq.span;
    if (ru && ru.decision === "modify" && ru.replacement) return ru.replacement;
    return rq.action === "generalize" && rq.proposed_replacement ? rq.proposed_replacement : marker(rq);
  });
  if (standIn !== "distinct") return texts;
  const applied = (k) => s.policy === "self_redaction" || (rulings[k] && rulings[k].decision !== "deny");
  const spans = {};
  s.requests.forEach((rq, k) => {
    if (!applied(k)) return;
    const shared = (spans[texts[k].toLowerCase()] ||= []);
    if (!shared.includes(rq.span.toLowerCase())) shared.push(rq.span.toLowerCase());
  });
  return texts.map((text, k) => {
    const shared = applied(k) ? spans[text.toLowerCase()] : [];
    if (shared.length < 2) return text;
    const n = shared.indexOf(s.requests[k].span.toLowerCase()) + 1;
    return text.endsWith("]") ? `${text.slice(0, -1)} ${n}]` : `${text} (${n})`;
  });
}

function requests(s, standIn) {
  if (!s.requests.length) return `<li class="muted">${s.policy.startsWith("text_") ? "A script replaced the registry values; no requests." : "No requests."}</li>`;
  const rulings = Object.fromEntries(s.rulings.map((x) => [x.request_index, x]));
  const finals = finalTexts(s, standIn);
  return s.requests.map((rq, k) => {
    const ru = rulings[k];
    const decision = s.policy === "self_redaction" ? "applied" : ru ? { grant: "granted", modify: "rewritten", deny: "denied" }[ru.decision] || ru.decision : "denied";
    const final = finals[k];
    return `<li class="request"><div class="request-head"><span class="request-n">${k + 1}</span><span class="request-span">${esc(rq.span)}</span>${badge(esc(decision), decision)}</div>
      ${fields([
        ["Asked", `${esc(rq.action)} · ${esc(rq.category)}${rq.rule ? ` · ${esc(rq.rule)}` : ""}<span class="request-why">${esc(rq.reason)}</span>`],
        ru && s.policy !== "self_redaction" && ["Executor", esc(ru.reason)],
        ["Result", `<code>${esc(final ?? "")}</code>`],
      ], "rows request-body")}</li>`;
  }).join("");
}

/* A case under one policy opens on what happened to the verdict; its secrets and its setup are
   one click away. */
const PARTS = [["signal", "Signal"], ["secrets", "Secrets"], ["setup", "Setup"]];

/* Each read of one question: its score, how it fares against the label, and the judge's reason. */
function readsSaid(reads) {
  if (!reads?.length) return `<p class="faint small">No reads recorded.</p>`;
  return `<ol class="sim-reasons">${reads.map(([v, why, outcome]) => `<li><span class="sim-score ${esc(outcome)}">${sc(v)}</span><p>${esc(why) || `<span class="faint">No reason recorded.</span>`}</p></li>`).join("")}</ol>`;
}

/* The judge's reads of the case, unedited beside edited, from the run's reasons file. */
function judgeSaid(r, s) {
  const file = simRunOf(r.name)?.[1].cases;
  if (!file) return `<p class="faint small">This run's reasons aren't in this build of the site.</p>`;
  const reasons = lazyJson(file); // null while it loads; the page redraws when it lands
  if (!reasons) return `<p class="empty">Loading the judge's reasons…</p>`;
  const c = reasons[s.scenario_id];
  if (!c) return `<p class="faint small">No reasons recorded for this case.</p>`;
  return `<div class="said-cols"><div><h4>Unedited</h4>${readsSaid(c.unedited)}</div>`
    + `<div><h4>After ${esc(policyName(s.policy).toLowerCase())}</h4>${readsSaid(c.policies?.[s.policy]?.edited)}</div></div>`;
}

/* The trial in one block: the truth, what the validator predicted, and what came out. */
function summary(r, s, label) {
  const call = simRunOf(r.name)?.[0].cases?.[s.scenario_id]?.reading?.[s.policy];
  const scored = s.secrets.filter(scorable);
  const mean = (key) => scored.reduce((a, x) => a + x[key], 0) / scored.length;
  return fields([
    ["Truth", labelBadge(label)],
    call && [term("sim_reading", "Validator predicted"), `<span class="call-${esc(call)}">${esc(READING[call])}</span>`],
    [term("judge_score", "Judge, unedited → edited"), `${verdict(s, "judge_unedited")} → ${verdict(s, "judge_edited")} <span class="faint">${signed(s.judge_edited - s.judge_unedited)}</span>`],
    scored.length > 0 && [term("secret_guess", "Secret guess, unedited → edited"), `<b>${f2(mean("p_unedited"))}</b> → <b>${f2(mean("p_edited"))}</b> <span class="faint">over ${scored.length} secret${scored.length === 1 ? "" : "s"}</span>`],
    [term("finding", "Finding after edits"), esc(s.integrity)],
  ]);
}

function sampleBody(r, s, label) {
  const asked = query().get("part");
  const part = PARTS.some(([key]) => key === asked) ? asked : "signal";
  const href = (key) => runHref(r.name, "cases", { case: s.scenario_id, policy: s.policy, part: key === "signal" ? null : key });
  const head = summary(r, s, label) + subnav(PARTS.map(([key, name]) => [href(key), name, key]), part, "Case");
  if (part === "secrets") {
    const secrets = s.secrets.filter(scorable);
    return head + (secrets.length ? table(["Secret", cell("True value", "left"), term("prior", "No evidence"), term("p_unedited", "Unedited"), term("p_edited", "Edited"), "Leakage"],
      secrets.map((x) => [esc(human(x.secret_type)), cell(esc(x.value), "mono-cell left"), f2(x.p_prior), f2(x.p_unedited), f2(x.p_edited), f2(x.leakage)]))
      + `<p class="muted small">The judge's probability on each secret's true value, among its options: with no evidence, on the unedited quotes, and on the edited ones.</p>`
      : `<p class="empty">The unedited evidence points at no secret in this case, so nothing can leak.</p>`);
  }
  if (part === "setup") return `${head}${promptBar(s.policy)}<div class="prompt-view" id="prompt-view" hidden></div>`;
  const edited = Object.fromEntries(s.edited_evidence.map((x) => [x.log_id, x.quote]));
  const ev = s.evidence.map((x) => `<div><span class="id">${esc(x.log_id)}</span><span class="txt">${wordDiff(x.quote, edited[x.log_id] ?? "")}</span></div>`).join("");
  // Numbered: this is the order the trial ran in.
  return head
    + fold("1. The auditor's report", `<p class="finding-text">${esc(s.finding)}</p>${s.reasoning ? `<p class="muted small">${esc(s.reasoning)}</p>` : ""}<p class="muted small">Graded ${verdict(s, "auditor_grade")} by the auditor.</p>`, { open: true })
    + fold("2. What the lab asked to remove, and the ruling", `<ol class="request-list">${requests(s, ledgerEntry(r.name)?.config?.rewrite_stand_in)}</ol>`, { open: true, note: `${s.requests.length} requests` })
    + fold("3. What the judge read", `<p class="small muted">The quoted lines after edits; struck words were removed, underlined words were added.</p><div class="logs diff">${ev}</div>`, { open: true, note: `${s.evidence.length} lines` })
    + fold("4. What the judge said", judgeSaid(r, s) + readKey({ flagged: flaggedAt(), cleared: clearedAt(), swatches: false }), { open: true });
}

/* The case the cases tab shows: the one asked for in the query, else the first. */
export function chosenCase(r) {
  const groups = byCase(r.samples || []);
  const asked = query().get("case");
  return groups.some((x) => x.id === asked) ? asked : groups[0]?.id ?? null;
}

export function sampleBrowser(r) {
  const groups = byCase(r.samples);
  const q = query(), pols = runPolicies(r);
  const caseId = chosenCase(r);
  const policy = pols.includes(q.get("policy")) ? q.get("policy") : pols.includes("contextual_rewrite") ? "contextual_rewrite" : pols[0];
  const g = groups.find((x) => x.id === caseId);
  if (!g) return "";
  const items = groups.map((x) => {
    const own = pols.map((p) => x.pol[p]).filter(Boolean);
    return { id: x.id, chosen: x.id === caseId, html: `<span class="browser-id">${esc(caseName(x.id))}</span>
      <span class="browser-tags">${labelBadge(x.any.label)}${own.some(leaked) ? badge("leak", "warn") : ""}</span>` };
  });
  const s = g.pol[policy];
  const variations = pols.length > 1 ? `<div class="variations"><p class="variations-label">Policy variations <span class="faint">${pols.length}, same case</span></p>${choice(pols.map((p) => {
    const v = g.pol[p];
    const granted = v ? (p === "self_redaction" ? v.requests.length : v.rulings.filter((x) => x.decision !== "deny").length) : 0;
    return [p, esc(policyName(p)), v ? [`Judge ${sc(v.judge_unedited)} → ${sc(v.judge_edited)}`, `<span class="faint">${v.requests.length} requests, ${granted} granted or rewritten</span>`] : [`<span class="faint">not run</span>`]];
  }), policy, "data-p")}</div>` : `<p class="variations-label">Policy <b>${esc(policyName(policy))}</b></p>`;
  const body = s ? sampleBody(r, s, g.any.label) : `<p class="empty">No sample for this policy.</p>`;
  const dataHref = caseHref(ledgerEntry(r.name), g.id);
  const detail = `<div class="browser-head"><h3>Case ${esc(caseName(g.id))} ${labelBadge(g.any.label)}</h3><p class="browser-claim">${esc(g.any.claim)}</p>${dataHref ? `<p class="small"><a href="${dataHref}">Open this case in its set</a></p>` : ""}</div>
      ${variations}${body}`;
  return browser({ id: "run-list", label: "Cases", items, detail });
}
