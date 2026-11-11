/* Recorded runs: the ledger (research/runs/ledger.jsonl), each run's results, what kind of run it is, and
   the links to its page and the cases it read. */

import { stampOf } from "../lib/format.js?v=0cb80a196f";
import { withQuery } from "../lib/view-state.js?v=0cb80a196f";
import { judgeName } from "./constants.js?v=0cb80a196f";
import { datasetOfVersion, versionOf } from "./datasets.js?v=0cb80a196f";
import { lazyJson, SITE } from "./site.js?v=0cb80a196f";

export const ledgerEntry = (name) => SITE.ledger.find((e) => e.name === name);
export const p1Run = (name) => SITE.runs.find((r) => r.name === name);
export const ablationRun = (name) => SITE.ablations.find((r) => r.name === name);

/* A run's samples (P1 or ablation), loaded when its page opens: null while loading, then
   { samples } or { error }. site.json keeps only the run's case ids (`cases`). */
export const samplesOf = (r) => (r?.file ? lazyJson(r.file) : { samples: [] });

/* A run's page, or one of its tabs (`cases`), with `changes` to the query. Ablation runs are
   named ablation-<split>-<time>, P1 runs p1-<split>-<stance>-<time>. */
export function runHref(name, tab = "", changes = {}) {
  const page = String(name).startsWith("ablation-") ? "ablation" : "run";
  const path = `#/${page}/${encodeURIComponent(name)}${tab ? `/${tab}` : ""}`;
  const q = new URLSearchParams(Object.entries(changes).filter(([, v]) => v != null && v !== ""));
  return `${path}${q.size ? `?${q}` : ""}`;
}

/* Run names in escaped text as links to their pages (a stopped run names its replacement). */
export const linkRunNames = (html) => html.replace(/\b(p1|ablation)-[a-z]+(?:-[a-z_]+)?-\d{8}T\d{6}Z\b/g, (n) => `<a class="mono" href="${runHref(n)}">${n}</a>`);

/* The benchmark case a run read, in its set, when the build it read ships with the site; else null. */
export function caseHref(e, id) {
  const c = e?.config || {}, v = versionOf(c.data);
  const b = SITE.builds.find((x) => x.version === v && x.key === (c.split || "dev"));
  const d = b && datasetOfVersion(v, b.key);
  return d ? withQuery(`#/simulator/${d.name}/cases/${encodeURIComponent(id)}`, { version: v === d.current ? null : v }) : null;
}

/* Every recorded run, newest first. The ledger is the record: a results folder it never recorded
   (a smoke test, a killed run) isn't listed. */
export function allRuns() {
  return [...SITE.ledger].sort((a, b) => (stampOf(b.name) || "").localeCompare(stampOf(a.name) || ""));
}

/* A run's type (Redaction run, Ablation, Judge only, Re-ask): set by Python (site/runs.py run_type). */
export const runType = (e) => { const t = e.type ?? "P1"; return t === "P1" ? "Redaction run" : t; };

/* Why a run doesn't count, if it doesn't: a smoke batch, a pilot, or one stopped early and
   replaced. Python stamps each ledger row with its batch, part, counted, replaced and archived
   (site/runs.py load_ledger). */
export const runStatus = (e) => (e.batch !== "result" ? e.batch : e.replaced ? "replaced" : "");
/* What sets a run apart in the run log and on its page: its status, and archived data. */
export const runFlags = (e) => [runStatus(e), e.archived ? "archived data" : ""].filter(Boolean);

/* The commit a run ran at, shortened as git shows it. */
export const shortCommit = (e) => (e.commit ? String(e.commit).slice(0, 7) : "");

/* The judge a run read with, by name. */
export const runJudge = (e, missing = "") => judgeName(e?.config?.models?.judge, missing);

/* Whether a recorded run's dataset version fails the leakage check (several candidates per secret). */
export function leakageInvalid(name) {
  const c = ledgerEntry(name)?.config || {};
  const d = datasetOfVersion(c.data, c.split);
  const v = d?.versions.find((x) => x.version === versionOf(c.data));
  return v?.leakage?.valid === false;
}

/* How many counted runs were recorded after a time (ISO), e.g. since a note was last edited. */
export const countedSince = (iso) => {
  if (!iso) return 0;
  const after = new Date(iso);
  return allRuns().filter((e) => e.counted && e.recorded_at && new Date(e.recorded_at) > after).length;
};
export const tokensOf = (e) => Object.values(e?.config?.tokens || {}).reduce((a, t) => a + (t.input_tokens || 0) + (t.output_tokens || 0), 0);
