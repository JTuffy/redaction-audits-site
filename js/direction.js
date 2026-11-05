/* Direction: the experiment threads (docs/direction.toml) and the Overview page. */

import { $, datasets, esc, pageHead, section, SITE } from "./core.js?v=2e746ab46e";
import { slugify, STATUS_CLASS } from "./markdown.js?v=2e746ab46e";
import { answers as findingsAnswers } from "./findings.js?v=2e746ab46e";

/* ---------- Experiments ---------- */

export const experiments = () => SITE.direction?.experiment || [];
const STATUS_TEXT = { planned: "planned", running: "running", open: "open", settled: "settled", blocked: "blocked", superseded: "superseded" };
export const statusBadge = (st) => `<span class="badge ${STATUS_CLASS[st] ?? ""}">${esc(STATUS_TEXT[st] || st)}</span>`;
export function experimentOf(e) {
  if (e.experiment) return experiments().find((x) => x.id === e.experiment) || null;
  return experiments().find((x) => (x.runs || []).includes(e.name)) || null;
}

/* Follow-up questions from direction.toml: the planned and running first, ideas folded away. */
const FU = { idea: "", planned: "info", running: "warn", done: "pass" };
const FU_TEXT = { planned: "next", idea: "idea", running: "running", done: "done" };
export function followupList(fus) {
  const item = (f) => `<li><span class="badge ${FU[f.status] ?? ""}">${esc(FU_TEXT[f.status] || f.status)}</span><div><p>${esc(f.question)}</p><p class="muted small">${esc(f.tweak)}</p></div></li>`;
  const active = fus.filter((f) => f.status !== "idea");
  const ideas = fus.filter((f) => f.status === "idea");
  return `<ul class="fu-list">${active.map(item).join("")}</ul>${ideas.length ? `<details class="fu-more"><summary>${ideas.length} more ideas</summary><ul class="fu-list">${ideas.map(item).join("")}</ul></details>` : ""}`;
}

function openDecisions() {
  const page = (SITE.notes || []).find((p) => p.slug === "questions");
  if (!page) return [];
  const out = [];
  let current = null;
  for (const line of page.markdown.split(/\r?\n/)) {
    const h = line.match(/^##\s+(.*)/);
    if (h) { current = { title: h[1].trim(), needs: "" }; out.push(current); continue; }
    const n = line.match(/^(?:Needs a decision|To decide):\s*(.*)/);
    if (n && current) current.needs = n[1].trim();
  }
  return out.filter((q) => q.needs && !/^none\b/i.test(q.needs));
}

/* ---------- Overview: the question, its two halves, and where each stands ---------- */

/* The two ways redaction can fail an audit, and the questions under each. The answers are the
   Findings sentences, so the Overview and Findings can't disagree. */
const HALVES = [
  ["Signal loss", "The audit reaches the wrong verdict, or none.", [
    ["Can a checker tell in advance which cases break?", "a-predict"],
    ["When a case breaks, is the judge wrong or just unsure?", "a-unsure"],
    ["What does each policy cost the verdict?", "a-cost"],
    ["Does a lab redacting in bad faith get through?", "a-adversary"],
  ]],
  ["Secret leakage", "The secret gets out anyway, through what the edit leaves.", [
    ["How much of the secret still gets out?", "a-leak"],
  ]],
];

function halves(answers) {
  const q = ([text, anchor]) => `<li><a href="#/findings/${anchor}">${esc(text)}</a>${answers[anchor] ? `<p>${answers[anchor]}</p>` : `<p class="faint">No runs yet.</p>`}</li>`;
  return `<div class="ov-halves">${HALVES.map(([name, what, qs]) => `<section class="ov-half"><h2>${esc(name)}</h2><p class="muted">${esc(what)}</p><ul class="ov-answers">${qs.map(q).join("")}</ul></section>`).join("")}</div>`;
}

function how() {
  const steps = [
    ["Cases with a known answer", "Simulated lab logs, each checked against one audit claim. Code computes every label with its proof."],
    ["A policy redacts", "Text redaction, pseudonyms, or a model that edits on the lab's behalf, with or without an executor ruling on each edit."],
    ["A judge reads blind", "A model sees only the claim and the edited quotes, and scores how likely a violation is."],
    ["A checker predicts first", "From each case's proof, without a model: which cases the policy breaks, and which way the judge will drift."],
  ];
  return `<ol class="ov-how">${steps.map(([t, b]) => `<li><b>${t}</b><span>${b}</span></li>`).join("")}</ol><p class="small"><a href="#/method/how">How it works, with a worked case</a></p>`;
}

function standing() {
  const R = SITE.results || {};
  const cov = R.coverage || [];
  const name = { "claim-shape-v2": "Prediction test · Terra", "claim-shape-v2-haiku": "Prediction test · Haiku", "claim-shape-v2-mini": "Prediction test · GPT-5-mini", "sim-policies": "Policies · Terra", "sim-policies-haiku": "Policies · Haiku", "sim-adversary-haiku": "Adversarial lab · Haiku", "sim-adversary": "Adversarial lab · Terra" };
  const rows = cov.map((c) => {
    const w = c.planned ? Math.min(100, (100 * c.cases) / c.planned) : 0;
    return `<li><a href="#/experiments/${encodeURIComponent(c.experiment)}">${esc(name[c.experiment] || c.experiment)}</a><span class="xp-meter"><i style="width:${w}%"></i></span><span class="small muted">${c.cases} / ${c.planned ?? "?"}</span></li>`;
  }).join("");
  const sets = datasets().filter((d) => d.status === "current" && d.source !== "benchmark");
  const open = SITE.public ? [] : openDecisions();
  const todo = (SITE.direction?.groundwork || []).filter((g) => g.status !== "done");
  return `<ul class="ov-progress">${rows}</ul>
    <p class="small muted">${sets.length} validated sets, every label computed with its proof. <a href="#/data">Data</a></p>
    ${todo.length ? `<p class="small"><span class="badge warn">${todo.length} to do</span> before the results count: ${todo.map((g) => esc(g.item.charAt(0).toLowerCase() + g.item.slice(1))).join("; ")}. <a href="#/experiments">Groundwork</a></p>` : ""}
    ${open.length ? `<p class="small"><b>Waiting on a decision:</b> ${open.map((q) => `<a href="#/notes/questions/${slugify(q.title)}">${esc(q.title)}</a>`).join(" · ")}</p>` : ""}`;
}

export function pageOverview() {
  const d = SITE.direction;
  if (!d) { $("view").innerHTML = pageHead({ title: "Overview" }) + `<p class="empty">No direction file. Add <code>docs/direction.toml</code>.</p>`; return; }
  const R = SITE.results;
  const answers = findingsAnswers();
  const head = `<div class="ov-head"><h1 class="ov-title">Redaction Audits</h1>
    <p class="ov-lede">An outside auditor checks a lab's claims against the lab's own records, and the lab redacts its secrets first. <b>Does the audit still work, and can we tell in advance when it won't?</b></p>
    ${R?.reads ? `<p class="small muted"><span class="badge warn">Preliminary</span> ${R.reads.toLocaleString()} judge reads on the validated sets; some runs still in progress.</p>` : ""}</div>`;
  $("view").innerHTML = head
    + section("Two ways redaction can fail an audit", halves(answers), `<a href="#/findings">All findings</a>`)
    + section("How we test it", how())
    + section("Where things stand", standing(), `<a href="#/experiments">Experiments</a>`);
}
