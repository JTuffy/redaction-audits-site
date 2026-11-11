/* What each policy costs on both sides, per judge (`SITE.results.tradeoffs`): the share of reads
   right and the judge's probability on the secret, after the edit. */

import { judgeRank, viewKeys, viewName } from "./constants.js?v=0cb80a196f";
import { SITE } from "./site.js?v=0cb80a196f";

/* Generalize ran once on a 32-case slice and was dropped (on simulated data it edits exactly as
   pseudonyms do), so it would sit beside the full runs on a fifth of their cases. */
const LEFT_OUT = new Set(["text_generalize"]);

/* One point per judge and policy, for the trade-off chart. */
export function tradeoffPoints() {
  const perJudge = SITE.results?.tradeoffs || {};
  return Object.entries(perJudge).flatMap(([judge, rows]) => rows
    .filter((t) => !LEFT_OUT.has(t.policy) && t.guess_edited != null && t.edited?.reads)
    .map((t) => ({
      judge,
      rank: judgeRank(judge),
      policy: t.policy,
      name: viewName(t.policy),
      secret: t.guess_edited,
      verdict: t.edited.right / t.edited.reads,
      cases: t.cases,
    })))
    .sort((a, b) => viewKeys().indexOf(a.policy) - viewKeys().indexOf(b.policy));
}
