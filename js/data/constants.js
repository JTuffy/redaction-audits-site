/* Facts the Python code defines and site.json carries in `constants`: read thresholds, the
   wrong-way shift, the blind guess, the retry cap, the reviewer's agreement gate, the shortcut
   gate, the readable-secret cut, the names of policies and judges, and the order of the
   validator's views and readings and of the labels. */

import { SITE } from "./site.js?v=0cb80a196f";

const constants = () => SITE?.constants || {};

/* A read at or above flagged_at says violation; at or below cleared_at, no violation. */
export const flaggedAt = () => constants().flagged_at;
export const clearedAt = () => constants().cleared_at;
export const scoreCut = () => constants().score_cut;
export const wrongWayShift = () => constants().wrong_way_shift;
/* A uniform guess over a secret's options (domain/registry.OPTIONS_PER_SECRET). */
export const blindGuess = () => constants().blind_guess;
/* API retries per call before a run gives up (infra/settings.max_retries). */
export const maxRetries = () => constants().max_retries;
/* What a new run takes unless its plan says otherwise: batch API calls, and each role's model. */
export const batchApi = () => !!constants().batch_api;
export const defaultModels = () => constants().default_models || {};
/* The share of blind reviews that must agree with a set's labels (records/reviews.REVIEW_MIN). */
export const reviewMin = () => constants().review_min;
/* The most a word-level probe may score before a set has a shortcut (domain/gate_limits). */
export const shortcutMax = () => constants().shortcut_max;

/* A secret guessed at this probability or more stays readable (analysis/findings.READABLE_AT). */
export const readableAt = () => constants().readable_at;

/* The policies in the build's order, and each one's name (domain/policies.POLICY_NAMES). */
export const policyKeys = () => Object.keys(constants().policies || {});
export const policyName = (p) => constants().policies?.[p] || p;

/* What the validator reads a simulated case under: as written, then each text policy
   (domain/readings.VIEWS). */
export const validatorViews = () => constants().views || [];
/* The validator's calls on a case, in display order (domain/readings.READINGS). */
export const readings = () => constants().readings || [];

/* Labels and difficulties in display order (domain/models.Label, Difficulty). */
export const labelOrder = () => constants().labels || [];
const difficultyOrder = () => constants().difficulties || [];
/* A case's place in a list: by label, then difficulty. */
export const rankCase = (x) => labelOrder().indexOf(x.label) * 10 + difficultyOrder().indexOf(x.difficulty ?? "");

/* What a case is read under: unedited, then each policy. */
export const viewKeys = () => ["unedited", ...policyKeys()];
export const viewName = (v) => (v === "as_written" || v === "unedited" ? "Unedited" : policyName(v));

/* The judges as [substring of a model id, short name], in display order (domain/roles.JUDGE_NAMES). */
const judgePatterns = () => constants().judges || [];

/* A judge model ("openai/gpt-5.6-terra") as the page names it ("Terra"); `missing` when empty. */
export function judgeName(model, missing = "") {
  const m = String(model || "").split("/").pop();
  if (!m) return missing;
  const hit = judgePatterns().find(([pattern]) => m.includes(pattern));
  return hit ? hit[1] : m;
}
/* Judge names in display order. */
export const judgeOrder = () => judgePatterns().map(([, name]) => name);
/* A judge's place in that order; a judge the build doesn't name goes last. */
export const judgeRank = (name) => { const i = judgeOrder().indexOf(name); return i < 0 ? Infinity : i; };
/* A comparator for rows in judge order, the judge's name read by `get`. */
export const byJudge = (get = (x) => x) => (a, b) => judgeRank(get(a)) - judgeRank(get(b));

/* The lab a run plays, by its name in the code (domain/roles.STANCE_NAMES): "Link break". */
export const stanceName = (s) => constants().stances?.[s] || s;
/* Every stance, in the build's order. */
export const stanceKeys = () => Object.keys(constants().stances || {});
/* A bad-faith stance as the attack it makes, in running text ("link break"). */
export const attackName = (s) => stanceName(s).toLowerCase();
