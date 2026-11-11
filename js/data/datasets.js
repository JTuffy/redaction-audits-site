/* Datasets (research/datasets.toml, shaped by site/datasets.py) and the simulated sets behind them. */

import { withQuery } from "../lib/view-state.js?v=863af23878";
import { SITE } from "./site.js?v=863af23878";
import { SHAPES } from "./studies.js?v=863af23878";

export const datasets = () => SITE.datasets || [];
export const datasetNamed = (name) => datasets().find((d) => d.name === name) || null;
export const currentOf = (d) => d.versions.find((v) => v.version === d.current) || d.versions[0] || null;

/* The build version a run's `data` names: the ledger writes "built:<version>". */
export const versionOf = (data) => String(data || "").replace(/^built:/, "");

/* The dataset a recorded build version belongs to; a benchmark split folder holds one per split. */
export function datasetOfVersion(version, split) {
  const v = versionOf(version);
  return datasets().find((d) => d.versions.some((x) => x.version === v) && (!split || d.split === split)) || null;
}
export const datasetOfSet = (key) => datasets().find((d) => d.sim_key === key) || null;

/* A dataset page's link: its tab, any version other than the current one, and extra query. */
export function datasetHref(d, tab = "", extra = {}) {
  const q = new URLSearchParams(Object.entries(extra).filter(([, v]) => v != null && v !== ""));
  const s = q.toString();
  return `#/simulator/${d.name}${tab ? `/${tab}` : ""}${s ? `?${s}` : ""}`;
}

/* A simulated set's case explorer, with a family (`tail`) and the view's query changed. */
export const setHref = (b, tail = "", changes = {}) => {
  const d = datasetOfSet(b.key);
  return d ? withQuery(`${datasetHref(d, "cases")}${tail}`, changes) : "#/simulator/sets";
};

/* The current simulated sets: each dataset the catalog marks current that has a simulated set,
   as { d: the dataset, b: its set }. */
export const currentSimSets = () => datasets().filter((d) => d.status === "current" && d.sim_key)
  .map((d) => ({ d, b: (SITE.sim || []).find((b) => b.key === d.sim_key) })).filter((x) => x.b);

/* A set's automated gates: "fail" if any failed, "pass" once every gate that ran passed, else
   "not run" (a pending gate, such as the human audit, doesn't count). */
export function gateStatus(b) {
  const ran = (b.gates || []).filter((g) => g.status !== "pending");
  return !ran.length ? "not run" : ran.some((g) => g.status === "fail") ? "fail" : "pass";
}

/* What the simulator holds now: claims (and how many of each shape), current sets, their cases,
   how many pass their gates, the range of median log lines per tier, and the fewest and most
   connections a case's proof rests on (buckets with any case in them). */
export function simSummary() {
  const sets = currentSimSets();
  const claims = SITE.claims || [];
  const range = (xs) => (xs.length ? [Math.min(...xs), Math.max(...xs)] : null);
  const lines = (tier) => range(sets.filter((x) => x.b.tier === tier).map((x) => x.b.difficulty?.medians?.lines).filter((v) => v != null));
  const buckets = Object.keys(sets.find((x) => x.b.difficulty?.connections)?.b.difficulty.connections || {});
  const used = buckets.filter((k) => sets.some((x) => (x.b.difficulty?.connections?.[k] || 0) > 0));
  return {
    claims: claims.length,
    shapes: Object.fromEntries(SHAPES.map((s) => [s, claims.filter((c) => c.shape === s).length])),
    sets: sets.length,
    cases: sets.reduce((n, x) => n + (currentOf(x.d)?.cases || 0), 0),
    passing: sets.filter((x) => gateStatus(x.b) === "pass").length,
    lines: { hard: lines("hard"), calibration: lines("calibration") },
    connections: used.length ? [used[0], used[used.length - 1]] : null,
  };
}

/* The simulated set a recorded run read, and that run's entry in it: [set, run], or null. */
export const simRunOf = (name) => (SITE.sim || []).flatMap((b) => (b.runs || []).map((r) => [b, r])).find(([, r]) => r.run === name) || null;
