/* Experiments (research/direction.toml), the questions they answer, the studies and plans behind
   them, and the runs each owns. */

import { SITE } from "./site.js?v=2275844be3";

export const experiments = () => SITE.direction?.experiment || [];
export const experimentNamed = (id) => experiments().find((x) => x.id === id) || null;
export const experimentHref = (id) => `#/experiments/${encodeURIComponent(id)}`;

/* The experiment a recorded run belongs to: the one its ledger entry names, else the one that lists it. */
export function experimentOf(e) {
  if (e.experiment) return experimentNamed(e.experiment);
  return experiments().find((x) => (x.runs || []).includes(e.name)) || null;
}

/* An expectation still waiting for approval opens with this; the rest of it is the text. */
export const DRAFT_EXPECTATION = /^Draft for \S+ to approve \(([\d-]+)\)[.,]?\s*(?:not yet the written-before-run expectation\.\s*)?/;
export const expectationIsDraft = (x) => DRAFT_EXPECTATION.test(String(x?.expectation || ""));

export const studyOf = (x) => (SITE.studies || []).find((st) => st.name === x.id) || null;
export const planOf = (x) => (SITE.plans || {})[x.id];

/* The main questions, and every sub-question with its main question as `main`. */
export const mainQuestions = () => SITE.direction?.main_question || [];
export const subQuestions = () => mainQuestions().flatMap((m) => (m.sub || []).map((s) => ({ ...s, main: m })));
export const subNamed = (id) => subQuestions().find((s) => s.id === id) || null;
/* The question a Findings panel answers: the sub-question whose answer it shows. */
export const panelAsk = (panelId) => subQuestions().find((s) => s.findings === panelId)?.ask || "";

/* The sub-question an experiment answers: the one its `group` names, else the first that lists it. */
export const subOf = (x) => subNamed(x.group) || subQuestions().find((s) => (s.experiments || []).includes(x.id)) || null;
