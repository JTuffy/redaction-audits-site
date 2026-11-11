/* The site's vocabulary: what each key in the data is called on the page, one map per kind of
   thing. Which keys exist and their order (views, readings, labels), and policy and judge names,
   come from the build (SITE.constants, through data/constants.js). */

/* The validator's call on a case under a view, and what it leaves of each connection. */
export const READING = { decidable: "Decidable", cant_decide: "Can't decide", may_mislead: "May mislead" };
export const LINK_STATE = { kept: "kept", guessable: "guessable", cut: "cut", looks_same: "looks the same", not_stated: "not stated" };

/* How one judge read fares against the label. */
export const OUTCOMES = ["right", "unsure", "wrong"];

export const LABELS = { violation: "Violation", red_herring: "Red herring", clean: "Clean" };
export const labelText = (x) => `${LABELS[x.label]}${x.difficulty ? " · " + x.difficulty : ""}`;

export const ROLES = ["advocate", "executor", "judge", "integrity_check"];
export const ROLE = { advocate: "Advocate", executor: "Executor", judge: "Judge", integrity_check: "Integrity check" };
export const CONDITIONS = ["unedited", "marker", "pseudonym", "marker_only"];
export const CONDITION = { unedited: "Unedited", marker: "Marker", pseudonym: "Pseudonym", marker_only: "Marker only" };
export const SETS = { shallow: "Disjoint", disjoint: "Disjoint", entangled: "Entangled", deep: "Deep (archived)", sim: "Simulated" };
export const SOURCE = { benchmark: "Hand-written benchmark", "simulator-first": "Simulator, first generator", "simulator-rules": "Simulator, rule files" };

/* Status, state or call -> badge tone (pass, warn, fail, info, or none). One map for every page. */
const TONE = {
  pass: "pass", done: "pass", settled: "pass", answered: "pass", holds: "pass", decidable: "pass", right: "pass", none: "pass", granted: "pass", applied: "pass", valid: "pass",
  warn: "warn", running: "warn", open: "warn", partly: "warn", cant_decide: "warn", unsure: "warn", cut: "warn", rewritten: "warn", draft: "warn",
  fail: "fail", blocked: "fail", may_mislead: "fail", wrong: "fail", faked: "fail", denied: "fail", fails: "fail", violation: "fail",
  info: "info", planned: "info",
};
export const tone = (status) => TONE[String(status ?? "").toLowerCase()] ?? "";
