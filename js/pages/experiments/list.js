/* The experiments list: the live experiments grouped by the sub-question each
   answers (direction.toml `group`), then pilots, others and ideas, folded. */

import { esc } from "../../lib/dom.js?v=2275844be3";
import { byJudge } from "../../data/constants.js?v=2275844be3";
import { experimentHref, experiments, mainQuestions, subQuestions } from "../../data/experiments.js?v=2275844be3";
import { SITE } from "../../data/site.js?v=2275844be3";
import { badge, fold } from "../../components/blocks.js?v=2275844be3";
import { answers as findingsAnswers } from "../../data/answers.js?v=2275844be3";
import { ENDED, pill, progressMeter, progressOf } from "./progress.js?v=2275844be3";

/* The main questions a group of experiments bears on: its own sub-question's, and any other whose
   sub-questions rest on every experiment in the group (the policy runs answer leakage too). */
function questionsOf(sub, xs) {
  const ids = xs.map((x) => x.id);
  const covers = (m) => m === sub.main || (m.sub || []).some((s) => ids.every((id) => (s.experiments || []).includes(id)));
  const titles = mainQuestions().filter(covers).map((m) => m.title);
  return titles.map((t, i) => (i ? t.toLowerCase() : t)).join(" and ");
}

function row(x) {
  const p = progressOf(x);
  return `<a class="experiment-row" href="${experimentHref(x.id)}">
    <span class="experiment-judge">${esc(x.judge || "—")}</span>
    <span class="experiment-state">${pill(p)}${progressMeter(p)}</span>
    <span class="experiment-hyp">${esc(x.hypothesis || x.title)}</span></a>`;
}
const rows = (xs) => `<div class="experiment-rows">${xs.map(row).join("")}</div>`;
const folded = (title, n, body) => fold(`${title} <span class="count">${n}</span>`, body, { cls: "quiet experiment-fold" });

/* Follow-up questions from direction.toml: the planned and running first, ideas folded away. */
const FOLLOWUP = { planned: "next", idea: "idea", running: "running", done: "done" };
function followupList(fus) {
  const item = (f) => `<li>${badge(esc(FOLLOWUP[f.status] || f.status), f.status)}<div><p>${esc(f.question)}</p><p class="muted small">${esc(f.tweak)}</p></div></li>`;
  const active = fus.filter((f) => f.status !== "idea");
  const ideas = fus.filter((f) => f.status === "idea");
  return `<ul class="followup-list">${active.map(item).join("")}</ul>${ideas.length ? fold(`${ideas.length} more ideas`, `<ul class="followup-list">${ideas.map(item).join("")}</ul>`, { cls: "quiet followup-more" }) : ""}`;
}

export function experimentList() {
  const all = experiments();
  if (!all.length) return `<p class="empty">No experiments in <code>research/direction.toml</code>.</p>`;
  const live = all.filter((x) => !ENDED.includes(x.status));
  const answers = findingsAnswers();
  const groups = subQuestions().map((sub) => {
    const xs = live.filter((x) => x.group === sub.id).sort(byJudge((x) => x.judge));
    if (!xs.length) return "";
    const so = sub.findings ? answers[sub.findings] : "";
    const panel = sub.panel || sub.findings;
    return `<section class="experiment-group"><header><span class="experiment-kind">${esc(questionsOf(sub, xs))}</span><h2>${esc(sub.ask)}</h2></header>
      ${rows(xs)}
      ${so ? `<p class="experiment-answer"><span class="muted">Answer now:</span> ${so} <a href="#/findings/${panel}">Findings</a></p>` : ""}</section>`;
  }).join("");
  const setup = live.filter((x) => x.group === "setup");
  const other = live.filter((x) => !x.group);
  const fus = (SITE.direction?.followup || []).filter((f) => f.status !== "done");
  const ran = setup.filter((x) => progressOf(x).state === "done").length;
  return groups
    + (setup.length ? folded(`Pilots: ${ran} of ${setup.length} ran`, setup.length, rows(setup)) : "")
    + (other.length ? folded("Other", other.length, rows(other)) : "")
    + (fus.length ? folded("Ideas, not planned", fus.length, followupList(fus)) : "");
}
