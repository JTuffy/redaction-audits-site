/* Overview: why the project exists, the two questions and their sub-questions (direction.toml
   `main_question`), and the three experimental assets. Each sub-question shows the Findings answer
   for it, so the two pages can't disagree. */

import { $, esc } from "../../lib/dom.js?v=863af23878";
import { term } from "../../lib/tips.js?v=863af23878";
import { SITE } from "../../data/site.js?v=863af23878";
import { expectationIsDraft, experimentHref, experiments, mainQuestions } from "../../data/experiments.js?v=863af23878";
import { badge, fields, fold } from "../../components/blocks.js?v=863af23878";
import { pageHead, section } from "../../components/page.js?v=863af23878";
import { answers as findingsAnswers } from "../../data/answers.js?v=863af23878";

function evidenceOf(ids) {
  const cov = SITE.results?.coverage || [];
  return ids.map((id) => {
    const x = experiments().find((e) => e.id === id);
    const c = cov.find((e) => e.experiment === id);
    const done = c && c.planned && c.cases >= c.planned;
    return { id, judge: x?.judge || "", cases: c?.cases || 0, planned: c?.planned || null, draft: expectationIsDraft(x), state: done ? "done" : c?.cases ? "running" : "todo" };
  }).filter((e) => experiments().some((x) => x.id === e.id));
}

/* Answered, partly answered or not started, from coverage, never written by hand; an answer
   whose experiments' expectations are still drafts is provisional. */
function statusOf(ev, answered) {
  if (!answered || !ev.length || ev.every((e) => e.state === "todo")) return badge("Not started");
  if (ev.some((e) => e.state !== "todo" && e.draft)) return term("provisional", badge("Provisional", "draft"));
  if (ev.every((e) => e.state === "done")) return badge("Answered", "answered");
  return badge("Partly answered", "partly");
}

/* A sub-question: the Findings answer it shows, the panel that holds its evidence, and the
   experiments behind it. */
function subCard(s, answers) {
  const html = s.findings ? answers[s.findings] || "" : "";
  const m = html.match(/^<b>(.*?)<\/b>\s*(.*)$/s);
  const lead = m ? m[1] : "";
  const detail = m ? m[2] : html;
  const ev = evidenceOf(s.experiments || []);
  const evRows = ev.map((e) => `<li><a href="${experimentHref(e.id)}" class="mono">${esc(e.id)}</a><span>${esc(e.judge)}</span><span class="faint">${e.state === "todo" ? "not started" : `${e.cases} / ${e.planned ?? "?"} cases`}</span></li>`).join("");
  const panel = s.panel || s.findings;
  const title = `<span class="question-ask">${esc(s.ask)}</span>${statusOf(ev, !!html)}${lead ? `<span class="question-lead">${lead}</span>` : ""}`;
  return fold(title, fields([
    ["Answer", detail || `<span class="faint">${esc(s.note || "No runs yet.")}</span>`],
    ev.length && ["Evidence", `<ul class="question-evidence">${evRows}</ul>${panel && html ? `<a class="question-more" href="#/findings/${panel}">Charts and tables in Findings</a>` : ""}`],
    s.side && ["Note", `<span class="muted">A side question: how the reader fails, not what the policy does.</span>`],
  ], "rows question-body"), { cls: `bare question${s.side ? " question-side" : ""}` });
}

function questionCols(answers) {
  return `<div class="overview-cols">${mainQuestions().map((m, i) => `<section class="overview-col">
    <header class="overview-main"><span class="overview-n">${i + 1}</span><div><h3>${esc(m.title)}</h3><p>${esc(m.ask)}</p></div></header>
    <div class="question-list">${(m.sub || []).map((s) => subCard(s, answers)).join("")}</div></section>`).join("")}</div>`;
}

/* The experimental assets: three parts, what each holds. */
const PARTS = [
  ["Simulator", "#/simulator", "Makes audit cases with known answers.", [
    "Claims written as rule files",
    "Simulated lab logs, with look-alike variants",
    "Validator: predicts what each policy breaks, without a model",
    "Quality gates, then frozen versions",
  ]],
  ["Harness", "#/harness", "Runs and scores one audit per case, under the settings an experiment picks.", [
    "Redaction policy, lab and executor",
    "Judge model, reads and prompt variant",
    "Scores: verdict right, unsure or wrong; secret guess",
    "Every run recorded with its settings",
  ]],
  ["Interpreting results", "#/reading", "Turns scored runs into answers.", [
    "Experiment template: hypothesis, expectations",
    "Expectations scored against the runs",
    "Findings, one panel per question",
  ]],
];

function parts() {
  return `<div class="parts">${PARTS.map(([name, href, role, items], i) => `${i ? `<span class="parts-arrow" aria-hidden="true">→</span>` : ""}<a class="part" href="${href}">
    <h3>${esc(name)}</h3><p class="part-role">${esc(role)}</p>
    <ul>${items.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></a>`).join("")}</div>`;
}

export function pageOverview() {
  const d = SITE.direction;
  if (!d) { $("view").innerHTML = pageHead({ title: "Overview" }) + `<p class="empty">No direction file. Add <code>research/direction.toml</code>.</p>`; return; }
  const why = (d.project?.motivation || []).map((p) => `<p>${esc(p)}</p>`).join("");
  $("view").innerHTML = `<div class="overview-head"><h1 class="overview-title">Redaction Audits</h1><div class="overview-why">${why}</div></div>`
    + section("The questions", questionCols(findingsAnswers()), `<a href="#/findings">Findings</a>`)
    + section("Experimental assets", parts());
}
