/* Where an experiment stands, from its recorded runs and coverage, never from a hand-set status;
   and how its expectations were written. */

import { esc } from "../../lib/dom.js?v=2275844be3";
import { allRuns } from "../../data/runs.js?v=2275844be3";
import { DRAFT_EXPECTATION, experimentOf, planOf } from "../../data/experiments.js?v=2275844be3";
import { SITE } from "../../data/site.js?v=2275844be3";
import { meter } from "../../components/bars.js?v=2275844be3";
import { badge } from "../../components/blocks.js?v=2275844be3";

export const ENDED = ["settled", "superseded", "blocked"];
export const runsOf = (x) => allRuns().filter((e) => experimentOf(e) === x);
/* An experiment's runs that count, with a pilot's own batches, its record (as Python's
   analysis/plans.recorded_runs). */
export const recorded = (runs) => runs.filter((e) => e.counted || e.batch === "pilot");

export function progressOf(x) {
  if (ENDED.includes(x.status)) return { state: x.status, label: x.status };
  const runs = recorded(runsOf(x));
  const c = (SITE.results?.coverage || []).find((k) => k.experiment === x.id);
  if (x.group === "setup") return runs.length ? { state: "done", label: "ran", runs: runs.length } : { state: "todo", label: "not run" };
  if (c?.planned) {
    const state = c.cases >= c.planned ? "done" : c.cases ? "running" : "todo";
    return { state, label: { done: "complete", running: "in progress", todo: "not started" }[state], cases: c.cases, planned: c.planned, parts: c.parts || [], runs: runs.length };
  }
  return runs.length ? { state: "running", label: "in progress", runs: runs.length } : { state: "todo", label: "not started", planned: planOf(x)?.cases };
}

export const pill = (p) => badge(esc(p.label), p.state);
export const progressMeter = (p) => (p.planned ? `${meter(p.cases, p.planned)}<span class="small muted">${p.cases || 0} / ${p.planned} cases</span>` : "");

/* The expectation's status, and its text without the status prefix. */
export function expectationOf(x) {
  const t = String(x.expectation || "");
  const draft = t.match(DRAFT_EXPECTATION);
  if (draft) return { badge: badge("draft, not yet approved", "draft"), text: t.slice(draft[0].length) };
  if (/^Written .*before any run/.test(t)) return { badge: badge("written before any run", "pass"), text: t };
  if (/^Drafted .*before any run; approved .*after the runs/.test(t)) return { badge: badge("drafted before the runs, approved after", "partly"), text: t };
  return { badge: t ? badge("written after the first runs") : "", text: t || "None written." };
}
