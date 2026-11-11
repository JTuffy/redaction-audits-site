/* Findings on the validated data, under the project's two questions: signal loss (does the audit
   still reach the right verdict?) and secret leakage (does the secret get out anyway?). Each panel
   leads with its answer (data/answers.js), then the chart or table it rests on, folded. */

import { $, esc } from "../../lib/dom.js?v=2275844be3";
import { listed, NONE, pct } from "../../lib/format.js?v=2275844be3";
import { dataTip } from "../../lib/tips.js?v=2275844be3";
import { query, setQuery } from "../../lib/view-state.js?v=2275844be3";
import { attackName, blindGuess, byJudge, clearedAt, flaggedAt, judgeOrder, policyName, stanceName, viewKeys, viewName } from "../../data/constants.js?v=2275844be3";
import { SITE } from "../../data/site.js?v=2275844be3";
import { guessBar, readKey, readsCell } from "../../components/bars.js?v=2275844be3";
import { cell, fold, num, table } from "../../components/blocks.js?v=2275844be3";
import { pageHead } from "../../components/page.js?v=2275844be3";
import { sourceLine } from "../../components/source.js?v=2275844be3";
import {
  adversaryAnswer, adversaryJudge, costAnswer, costJudge, judgesAnswer, leakAnswer, leakTierAnswer, predictionAnswer, unsureAnswer,
} from "../../data/answers.js?v=2275844be3";
import { experimentHref, panelAsk } from "../../data/experiments.js?v=2275844be3";
import { datasetRefHref } from "../../data/links.js?v=2275844be3";
import { predictionCells, predictionDraw, predictionSource, SHAPES, shapeHead, studyShifts } from "../../data/studies.js?v=2275844be3";
import { shiftChart } from "./shift-chart.js?v=2275844be3";
import { tradeoffPoints } from "../../data/tradeoffs.js?v=2275844be3";
import { tradeoffChart } from "../../components/tradeoff.js?v=2275844be3";

const TIER = { always_redact: "always-redact secrets", context: "case-by-case secrets" };
/* A row's mean guess on one tier's secrets after the edit. */
const tierOf = (t, tier) => t?.guess_tiers?.[tier]?.edited;
/* Policy rows in the build's order: unedited, then each policy. */
const ordered = (rows) => [...rows].sort((a, b) => viewKeys().indexOf(a.policy) - viewKeys().indexOf(b.policy));


/* What a panel's source line links to. */
const SOURCE_LINKS = { experimentHref, datasetHref: datasetRefHref, byJudge: byJudge() };

/* The panel whose evidence is open when the address names none, so the read key above it has
   something to point at. */
const OPEN_FIRST = "a-predict";

/* A panel folds: its question, answer and source line stay visible, the evidence opens underneath. */
function panel(id, answer, note, body, src = null) {
  const named = /\/a-[a-z-]+/.exec(location.hash)?.[0].slice(1);
  return fold(`<h3>${esc(panelAsk(id))}</h3>${answer ? `<p class="answer-text">${answer}</p>` : ""}${sourceLine(src, SOURCE_LINKS)}`, `${note ? `<p class="answer-note">${note}</p>` : ""}${body}`,
    { cls: "bare answer", attrs: `id="${id}"`, open: (named || OPEN_FIRST) === id });
}

const toggle = (label, attr, items, chosen) =>
  `<div class="answer-tools"><div class="seg-toggle" role="group" aria-label="${label}">${items.map(([k, t]) => `<button data-${attr}="${esc(k)}" aria-pressed="${k === chosen}">${esc(t)}</button>`).join("")}</div></div>`;
const polToggle = (pol) => toggle("Policy", "pol", ["text_redaction", "text_pseudonym"].map((p) => [p, policyName(p)]), pol);
const chosenPol = () => (query().get("pol") === "text_pseudonym" ? "text_pseudonym" : "text_redaction");
const shapeRows = (shape, rows) => [{ group: shapeHead(shape) }, ...rows];
/* What a read's colours mean, in each panel whose table shows reads. */
const readsKey = () => readKey({ flagged: flaggedAt(), cleared: clearedAt() });

/* ---- Signal loss ---- */

function predictionPanel() {
  const pol = chosenPol();
  const js = studyShifts(pol);
  if (!js.length) return "";
  const draw = predictionDraw();
  return panel("a-predict", predictionAnswer(pol),
    `${draw ? `${draw.cases} cases, ${draw.perKind} per kind, ` : "Cases "}drawn by the validator's call alone, before any judge read them.`,
    `${polToggle(pol)}${shiftChart(js)}`, predictionSource());
}

function unsurePanel(R) {
  const pol = chosenPol();
  const rows = R.errs.filter((e) => e.policy === pol);
  const judges = judgeOrder().filter((j) => rows.some((e) => e.judge === j));
  if (!rows.length) return "";
  const cases = (j, c) => rows.find((e) => e.judge === j && e.cell === c);
  const cells = predictionCells();
  const body = SHAPES.flatMap((shape) => shapeRows(shape,
    cells.filter((c) => c.shape === shape && rows.some((e) => e.cell === c.name))
      .map((c) => [c.title, ...judges.map((j) => { const e = cases(j, c.name); return e ? readsCell(e.edited) : NONE; })])));
  const n = judges.map((j) => `${j} ${Math.max(...rows.filter((e) => e.judge === j).map((e) => e.cases))}`).join(", ");
  return panel("a-unsure", unsureAnswer(R, pol),
    `Honest lab. Share of reads wrong, with the share unsure beside it. Cases per row: ${esc(n)}.`,
    polToggle(pol) + readsKey() + table([`Case, after ${esc(policyName(pol).toLowerCase())}`, ...judges.map(esc)], body, { cls: "left answer-table", panel: false }),
    R.sources?.errs?.[pol]);
}

function costPanel(R) {
  const { judges, judge } = costJudge(query().get("judge"));
  if (!judge) return "";
  const rows = ordered(R.tradeoffs[judge]);
  const changed = (c) => (c ? `<span ${dataTip("Cases right unedited but not after the edit (−), and the other way round (+)")} tabindex="0">−${c.lost} <span class="faint">/</span> +${c.gained}</span>` : `<span class="faint">baseline</span>`);
  const body = rows.map((t) => ({
    cls: t.policy === "unedited" ? "baseline-row" : "",
    cells: [`${esc(viewName(t.policy))}${t.policy === "text_generalize" ? '<sup class="faint">*</sup>' : ""}`, readsCell(t.edited, "right"), num(changed(t.changed))],
  }));
  const n = Math.max(...rows.map((t) => t.cases));
  return panel("a-cost", costAnswer(judge),
    `Honest lab, the same ${n} cases for every policy. Verdict: share of reads right. Cases −/+: right before the edit and not after, or the other way.`,
    (judges.length > 1 ? toggle("Judge", "judge", judges.map((j) => [j, j]), judge) : "")
    + readsKey() + table(["Policy", "Verdict", num("Cases −/+")], body, { cls: "left answer-table", panel: false })
    + (rows.some((t) => t.policy === "text_generalize") ? `<p class="answer-foot faint">* On simulated data generalize edits exactly as pseudonyms do (no numbers or dates to keep), so it ran once and was dropped.</p>` : ""),
    R.sources?.tradeoffs?.[judge]);
}

function adversaryPanel(R) {
  const judge = adversaryJudge();
  const mine = R.adversary.filter((a) => !judge || a.judge === judge);
  const rows = mine.filter((a) => a.stance !== "honest");
  const honest = mine.filter((a) => a.stance === "honest");
  const note = `The lab's advocate asks for edits. Under contextual rewrite an executor rules on each; under self-redaction nothing does. Granted: requests applied as asked or rewritten. Verdict: share of reads right, unsure and wrong.`;
  if (!rows.length) return panel("a-adversary", "", note, `<p class="empty">No adversarial runs on the validated data yet.</p>`);
  const order = ["honest", "red_team", "scripted_link", "scripted_blatant"];
  const body = [...honest, ...rows].sort((a, b) => order.indexOf(a.stance) - order.indexOf(b.stance) || a.policy.localeCompare(b.policy)).map((a) => ({
    cls: a.stance === "honest" ? "baseline-row" : "",
    cells: [esc(stanceName(a.stance)), esc(policyName(a.policy)), num(a.cases), num(`${pct(a.granted, a.requests)} <span class="faint">of ${a.requests}</span>`),
      readsCell(a.edited), tierOf(a, "context") != null ? guessBar(tierOf(a, "context"), blindGuess()) : NONE],
  }));
  const kept = R.findings?.leak_adversary?.kept || [];
  const keptNote = kept.length
    ? ` Under the ${listed(kept.map((k) => esc(attackName(k.stance))))} attack the case-by-case secret stays readable (${listed(kept.map((k) => k.with.toFixed(2)))}): the attack asks to delete whole evidence lines, the executor keeps or rewrites them, and the secret written in them stays.`
    : "";
  return panel("a-adversary", adversaryAnswer(), `${note} Secret: the judge's probability on the case-by-case secret; the tick is a blind guess.${keptNote}`,
    readsKey() + table(["Lab", "Policy", num("Cases"), num("Granted"), "Verdict", "Secret"], body, { cls: "left answer-table", panel: false }),
    R.sources?.adversary?.[judge]);
}

function judgesPanel(R) {
  const rows = [...R.judges].sort(byJudge((j) => j.judge));
  if (!rows.length) return "";
  const body = rows.map((j) => [esc(j.judge), num(j.cases), readsCell(j.unedited), readsCell(j.flagged), readsCell(j.cleared)]);
  return panel("a-judges", judgesAnswer(R),
    "Honest lab. Share of reads wrong: unedited, then after text redaction on red herrings (flagged as violations) and on violations (cleared).",
    readsKey() + table(["Judge", num("Cases"), "Unedited", "Innocent labs flagged", "Violations cleared"], body, { cls: "left answer-table", panel: false }),
    R.sources?.judges);
}

/* ---- Secret leakage: each judge's probability on the secret's true value, per policy ---- */

function leakPanel(R) {
  const by = R.tradeoffs || {};
  const judges = judgeOrder().filter((j) => by[j]?.length);
  if (!judges.length) return "";
  const pols = viewKeys().filter((p) => p !== "text_generalize" && judges.some((j) => by[j].some((t) => t.policy === p)));
  const tiers = ["always_redact", "context"].filter((tier) => judges.some((j) => by[j].some((t) => tierOf(t, tier) != null)));
  const cols = judges.flatMap((j) => (tiers.length ? tiers.map((tier) => [j, tier]) : [[j, null]]));
  const guess = (j, tier, p) => {
    const t = by[j].find((x) => x.policy === p);
    const v = tier ? tierOf(t, tier) : t?.guess_edited;
    return guessBar(v, blindGuess());
  };
  const body = pols.map((p) => ({ cls: p === "unedited" ? "baseline-row" : "", cells: [esc(viewName(p)), ...cols.map(([j, tier]) => guess(j, tier, p))] }));
  const head2 = ["Policy", ...cols.map(([j, tier]) => (tier ? esc(TIER[tier]) : esc(j)))];
  const head = tiers.length ? [["", ...judges.map((j) => cell(esc(j), "", `colspan="${tiers.length}"`))], head2] : head2;
  const types = (tier) => { const t = by[judges[0]].find((x) => x.guess_tiers?.[tier]); return (t?.guess_tiers?.[tier]?.types || []).map((x) => x.replace(/_/g, " ")).join(", "); };
  const tierNote = tiers.length ? ` Always-redact secrets (${types("always_redact")}) are removed by every script and by the executor's rules; case-by-case secrets (${types("context")}) are removed only when a policy decides to.` : "";
  const n = judges.map((j) => `${esc(j)} ${Math.max(...by[j].map((t) => t.cases))} cases`).join(", ");
  return panel("a-leak", `${leakAnswer()} ${leakTierAnswer().replace(/<\/?b>/g, "")}`,
    `Honest lab. The judge's probability on each secret's true value after the edit; the tick is a blind guess (${blindGuess()}), 1.00 is certain.${tierNote} ${n}.`,
    table(head, body, { cls: "left answer-table", panel: false }),
    R.sources?.leak);
}

function status(R) {
  const open = R.coverage.filter((c) => c.planned && c.cases < c.planned).length;
  return open ? `<p class="findings-status muted">${open} experiment${open > 1 ? "s" : ""} still running. <a href="#/experiments">Progress</a></p>` : "";
}

const part = (title, sub) => `<header class="findings-part"><h2>${title}</h2><p class="muted">${sub}</p></header>`;

export function pageFindings(anchor) {
  const R = SITE.results;
  const head = pageHead({ title: "Findings" });
  if (!R || !R.reads) { $("view").innerHTML = head + `<p class="empty">No findings yet.</p>`; return; }
  const both = tradeoffChart(tradeoffPoints(), { blindGuess: blindGuess() });
  $("view").innerHTML = `<div class="findings">${head}${status(R)}`
    + (both ? `<section class="findings-tradeoff">${part("The trade-off", "Each policy's verdict against its secret, honest lab, per judge. The tables below give every number.")}${both}</section>` : "")
    + part("Signal loss", "Does the audit still reach the right verdict after redaction?")
    + predictionPanel() + unsurePanel(R) + costPanel(R) + adversaryPanel(R) + judgesPanel(R)
    + part("Secret leakage", "Does the redacted secret get out anyway?")
    + leakPanel(R) + `</div>`;
  $("view").querySelectorAll(".seg-toggle button[data-pol]").forEach((b) => { b.onclick = () => setQuery({ pol: b.dataset.pol === "text_redaction" ? null : b.dataset.pol }); });
  $("view").querySelectorAll(".seg-toggle button[data-judge]").forEach((b) => { b.onclick = () => setQuery({ judge: b.dataset.judge }); });
  if (/^a-/.test(anchor || "")) document.getElementById(anchor)?.scrollIntoView();
}
