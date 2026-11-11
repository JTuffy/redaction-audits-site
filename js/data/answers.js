/* The Findings answers: one sentence per question. The Overview and the Experiments list show the
   same sentences (`answers`), so no two pages can disagree.

   The facts are decided in Python (analysis/findings.py, shipped as `SITE.results.findings`):
   the prediction verdict, the judge each panel shows, which judges commit, which policies cost
   almost nothing, which attack misleads, and every leak range, with the thresholds those rest on.
   This file only words them; the one cut it prints (the readable-secret guess) comes through
   `constants`. */

import { esc } from "../lib/dom.js?v=2275844be3";
import { inWords, listed, pct, share } from "../lib/format.js?v=2275844be3";
import { attackName, byJudge, readableAt, viewName } from "./constants.js?v=2275844be3";
import { SITE } from "./site.js?v=2275844be3";

const findings = () => SITE.results?.findings || {};
const right = (t) => share(t?.right, t?.reads);
const wrong = (t) => share(t?.wrong, t?.reads) ?? 0;
const f2 = (v) => v.toFixed(2);
const range = ([lo, hi]) => (lo === hi ? f2(lo) : `${f2(lo)}–${f2(hi)}`);
const pctRange = (xs) => { const lo = Math.min(...xs), hi = Math.max(...xs); return lo === hi ? `${lo}%` : `${lo}–${hi}%`; };
/* "Both kinds", "All four kinds". */
const allOf = (n) => (n === 2 ? "Both" : `All ${inWords(n)}`);

export function predictionAnswer(pol) {
  const p = findings().predict;
  if (!p) return "";
  if (pol === "text_pseudonym") {
    return `Pseudonyms move every cell far less than text redaction: at most ${Math.round(p.most.text_pseudonym ?? 0)} points for any judge, against up to ${Math.round(p.most.text_redaction ?? 0)}. The validator predicts this: pseudonyms keep the connections these labels need.`;
  }
  const faked = Math.max(...p.judges.map((j) => j.faked));
  const n = p.judges.length;
  const lead = p.held
    ? `<b>Yes.</b> ${allOf(faked)} kinds of case where the validator said text redaction fakes the evidence moved the predicted way for ${n > 1 ? `all ${inWords(n)}` : "the"} judge${n > 1 ? "s" : ""}, every 95% interval clear of zero.`
    : `<b>Mostly.</b> ${p.judges.map((j) => `${esc(j.judge)} ${j.held} of ${j.faked}`).join(", ")} faked kinds of case moved the predicted way with the interval clear of zero.`;
  return `${lead} The kinds it said stay decidable moved at most ${Math.round(p.decidable_most)} points.`;
}

export function unsureAnswer(R, pol) {
  if (!R.errs.some((e) => e.policy === pol)) return "";
  if (pol !== "text_redaction") return "Under pseudonyms the judges stay right on almost every case; the few wrong reads are spread across kinds of case.";
  const u = findings().unsure;
  if (!u) return "";
  const hedgers = u.judges.filter((j) => !j.commits), committers = u.judges.filter((j) => j.commits);
  const names = (js) => listed(js.map((j) => esc(j.judge)));
  const shares = (js, key) => listed(js.map((j) => pct(j[key], j.reads)));
  const hedge = hedgers.length ? `${names(hedgers)} ${hedgers.length > 1 ? "are" : "is"} mostly unsure (${shares(hedgers, "unsure")} of reads unsure, ${shares(hedgers, "wrong")} wrong)` : "";
  const commit = committers.length ? `${names(committers)} commit${committers.length > 1 ? "" : "s"} instead and ${committers.length > 1 ? "are" : "is"} wrong on ${shares(committers, "wrong")} of reads, mostly calling innocent labs guilty` : "";
  return `<b>It depends on the judge.</b> On the ${inWords(u.broken)} broken kinds of case, ${[hedge, commit].filter(Boolean).join("; ")}.`;
}

/* The judges the cost panel can show, and the one it shows: `asked` if it has rows, else the
   Findings judge. */
export function costJudge(asked) {
  const c = findings().cost;
  if (!c) return { judges: [], judge: null };
  return { judges: c.judges, judge: c.judges.includes(asked) ? asked : c.judge };
}

export function costAnswer(asked) {
  const { judge } = costJudge(asked);
  const c = judge && findings().cost.by_judge[judge];
  if (!c) return "";
  const cheap = c.cheap;
  const names = listed(cheap.map((t, i) => (i ? viewName(t.policy).toLowerCase() : viewName(t.policy))));
  const lead = cheap.length ? `<b>${names} ${cheap.length > 1 ? "cost" : "costs"} almost nothing</b> for ${esc(judge)}: ${listed(cheap.map((t) => `${right(t.edited)}%`))} of reads right, against ${right(c.unedited)}% unedited. ` : "";
  return `${lead}${viewName(c.costliest.policy)} costs most: ${right(c.costliest.edited)}% right, most of the rest unsure.`;
}

/* The judge the adversary panel shows (analysis/findings.adversary_judge); null with no attacks. */
export const adversaryJudge = () => findings().adversary?.judge ?? null;

export function adversaryAnswer() {
  const a = findings().adversary;
  if (!a?.attacks.length) return "";
  const lead = a.held ? "<b>Only without an executor.</b>" : "<b>Partly.</b>";
  const withEx = ` Read by ${esc(a.judge)}, an executor keeps verdicts near the honest lab's under every attack (${pctRange(a.attacks.map((x) => right(x.with)))} right, against ${right(a.honest.with)}%).`;
  const without = ` Without one they fall from ${right(a.honest.without)}% to ${pctRange(a.attacks.map((x) => right(x.without)))} right`;
  const misled = a.attacks.find((x) => x.stance === a.misleads);
  const how = misled ? `, and the ${esc(attackName(misled.stance))} attack makes the judge wrong on ${wrong(misled.without)}% of reads where the others mostly leave it unsure.` : ".";
  const unread = a.unread ? ` ${esc(a.unread)} hasn't read the adversarial runs.` : "";
  return lead + withEx + without + how + unread;
}

export function judgesAnswer(R) {
  const top = findings().judges?.most_flagged;
  const rows = [...R.judges].sort(byJudge((j) => j.judge));
  const topRow = rows.find((j) => j.judge === top);
  if (!topRow) return "";
  const others = rows.filter((j) => j !== topRow);
  return `<b>No.</b> After text redaction ${esc(top)} calls innocent labs guilty on ${wrong(topRow.flagged)}% of reads, against ${listed(others.map((j) => `${wrong(j.flagged)}% for ${esc(j.judge)}`))}. On unedited evidence: ${listed(rows.map((j) => `${wrong(j.unedited)}%`))} wrong.`;
}

export function leakAnswer() {
  const l = findings().leak;
  if (!l) return "";
  const lead = `<b>Every policy hides most of it.</b> Unedited, the judge is near certain of each secret (${listed(l.judges.map((j) => `${esc(j.judge)} ${f2(j.unedited)}`))}); after any policy its guess falls toward its prior, its guess with no evidence (${f2(l.prior)}).`;
  const byReader = l.judges.length > 1 ? ` What is left depends on the reader: ${listed(l.judges.map((j) => `${esc(j.judge)} ${range(j.range)}`))}.` : "";
  const worst = ` ${listed([...new Set(l.judges.map((j) => viewName(j.leakiest)))])} leaks the most.`;
  return lead + byReader + worst;
}

/* Which secrets leak: always-redact (names) against case-by-case (codenames), honest lab. */
export function leakTierAnswer() {
  const t = findings().leak_tier;
  if (!t) return "";
  const by = (tier) => listed(t.judges.map((j) => `${esc(j.judge)} ${range(j[tier])}`));
  return `<b>${t.context_leaks_more ? "Case-by-case secrets leak a little more." : "About the same for both."}</b> Codenames, removed only when a policy decides to: ${by("context")}. Names, always removed: ${by("always_redact")}.`;
}

/* What the bad-faith lab does to the secret: does the executor keep it while keeping the evidence? */
function leakAdversaryAnswer() {
  const l = findings().leak_adversary;
  if (!l) return "";
  if (!l.kept.length) return `<b>No.</b> Under every attack the judge's guess at the codename stays below ${f2(readableAt())} (read by ${esc(l.judge)}).`;
  const k = l.kept[0];
  return `<b>Yes: the executor keeps it.</b> The ${esc(attackName(k.stance))} attack asks to delete whole evidence lines; the executor keeps or rewrites them, and the codename in them stays readable (${f2(k.with)} with an executor${k.without != null ? `, ${f2(k.without)} without` : ""}; read by ${esc(l.judge)}).`;
}

/* Every answer, keyed by its Findings panel's id. */
export function answers() {
  const R = SITE.results;
  if (!R || !R.reads) return {};
  return {
    "a-predict": predictionAnswer("text_redaction"),
    "a-unsure": unsureAnswer(R, "text_redaction"),
    "a-cost": costAnswer(),
    "a-adversary": adversaryAnswer(),
    "a-judges": judgesAnswer(R),
    "a-leak": leakAnswer(),
    "a-leak-tier": leakTierAnswer(),
    "a-leak-adv": leakAdversaryAnswer(),
  };
}
