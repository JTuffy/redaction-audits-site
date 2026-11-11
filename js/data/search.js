/* Everything the search palette can jump to: the site's pages, each Findings answer, and every
   experiment, dataset, recorded run and note. */

import { datasetHref, datasets } from "./datasets.js?v=0cb80a196f";
import { experimentHref, experiments, subQuestions } from "./experiments.js?v=0cb80a196f";
import { notePages } from "./notes.js?v=0cb80a196f";
import { runHref, runJudge } from "./runs.js?v=0cb80a196f";
import { SITE } from "./site.js?v=0cb80a196f";

const PAGES = [
  ["Overview", "#/"], ["Findings", "#/findings"], ["Experiments", "#/experiments"], ["Run log", "#/runs"],
  ["Coverage", "#/coverage"], ["Simulator", "#/simulator"], ["Sets", "#/simulator/sets"],
  ["Claims", "#/simulator/claims"], ["Secrets", "#/simulator/secrets"], ["Harness", "#/harness"],
  ["Prompts", "#/harness/prompts"], ["Notes", "#/notes"],
];

/* One entry per place: { kind, title, detail, href }. Runs come newest first, as the ledger does. */
export function searchEntries() {
  const entry = (kind, title, detail, href) => ({ kind, title, detail, href });
  return [
    ...PAGES.map(([title, href]) => entry("Page", title, "", href)),
    ...subQuestions().filter((s) => s.findings).map((s) => entry("Finding", s.ask, "", `#/findings/${s.findings}`)),
    ...experiments().map((x) => entry("Experiment", x.title, x.id, experimentHref(x.id))),
    ...datasets().map((d) => entry("Dataset", d.title, d.name, datasetHref(d))),
    ...(SITE.ledger || []).map((e) => entry("Run", e.name, [e.experiment, e.config?.dataset, runJudge(e)].filter(Boolean).join(" · "), runHref(e.name))),
    ...notePages().map((p) => entry("Note", p.title || p.slug, "", `#/notes/${p.slug}`)),
  ];
}
