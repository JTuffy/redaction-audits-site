/* A study's kinds of case (its cells, from site/experiments.py, each with its title and the way
   text redaction should move the judge's violation score) and the claim shapes they group under;
   and the prediction studies' shifts, draw and sources, for the Findings prediction panel. */

import { listed } from "../lib/format.js?v=0cb80a196f";
import { glossaryEntry, term } from "../lib/tips.js?v=0cb80a196f";
import { experimentNamed, subNamed } from "./experiments.js?v=0cb80a196f";
import { SITE } from "./site.js?v=0cb80a196f";

/* The two claim shapes, in display order. */
export const SHAPES = ["permission", "prohibition"];
/* A shape's rule in a phrase ("allowed only if a record excuses it"), from the glossary. */
export const ruleOf = (shape) => glossaryEntry(shape)?.rule || "";

/* A shape's heading: its rule, and the claims of that shape on the site. */
export function shapeHead(shape) {
  const claims = (SITE.claims || []).filter((c) => c.shape === shape).map((c) => c.title.charAt(0).toLowerCase() + c.title.slice(1));
  const name = `${shape.charAt(0).toUpperCase()}${shape.slice(1)} claim${claims.length === 1 ? "" : "s"}`;
  return `${term(shape, name)}: ${ruleOf(shape)}${claims.length ? ` (${listed(claims)})` : ""}`;
}

/* The studies that test the validator's prediction, one per judge (direction.toml, the `predict`
   sub-question), as sent: those with a plan on the site. */
const predictionStudies = () => (subNamed("predict")?.experiments || [])
  .map((id) => (SITE.studies || []).find((s) => s.name === id)).filter(Boolean);

/* The kinds of case the prediction studies drew (they all draw the same), by shape. */
export function predictionCells() {
  const st = predictionStudies().find((s) => s.cells?.length);
  return SHAPES.flatMap((shape) => (st?.cells || []).filter((c) => c.shape === shape));
}

/* Each prediction study's score shifts per cell under `pol`, with the judge that read it: the
   prediction chart's marks. */
export function studyShifts(pol) {
  const cells = predictionCells();
  return predictionStudies().filter((s) => s.report).map((s) => ({ judge: experimentNamed(s.name)?.judge || s.name, report: s.report }))
    .map(({ judge, report }) => ({ judge, cells: Object.fromEntries(cells.map(({ name }) => [name, report[name]?.[pol]]).filter(([, v]) => v?.shift)) }))
    .filter((j) => Object.keys(j.cells).length);
}

/* How the prediction studies drew their cases: the total and the count per kind, from the first
   study with a report (they all read the same cases). */
export function predictionDraw() {
  const st = predictionStudies().find((s) => s.report);
  if (!st) return null;
  const per = [...new Set((st.cells || []).map((c) => c.chosen))];
  return { cases: st.design?.cases ?? (st.cells || []).reduce((a, c) => a + c.chosen, 0), perKind: per.length === 1 ? String(per[0]) : `${Math.min(...per)}–${Math.max(...per)}` };
}

/* What the prediction answer rests on, shaped like the results' `sources`: the studies with a
   report, the set versions they drew from, their judges, runs and cases. */
export function predictionSource() {
  const st = predictionStudies().filter((s) => s.report);
  if (!st.length) return null;
  const runs = st.map((s) => (SITE.results?.coverage || []).find((c) => c.experiment === s.name)?.runs?.length);
  return {
    experiments: st.map((s) => s.name),
    datasets: [...new Set(st.flatMap((s) => (s.design?.sets || []).map((x) => `${x.set}@${x.version}`)))].sort(),
    judges: st.map((s) => experimentNamed(s.name)?.judge || s.name),
    runs: runs.every((n) => n != null) ? runs.reduce((a, n) => a + n, 0) : null,
    cases: predictionDraw()?.cases ?? null,
  };
}
