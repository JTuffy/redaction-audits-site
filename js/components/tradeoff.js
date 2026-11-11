/* The trade-off chart: what each policy leaves of the secret against what it leaves of the verdict,
   one mark per policy and judge. The two questions in one picture: up is signal kept, left is
   secret hidden, so the best policy sits top left and unedited evidence top right. */

import { esc } from "../lib/dom.js?v=863af23878";
import { dataTip } from "../lib/tips.js?v=863af23878";
import { judgeClass, judgeMark, judgeSwatch } from "./judge-marks.js?v=863af23878";
import { legend } from "./legend.js?v=863af23878";

const W = 520, H = 342;
const PAD = { left: 46, right: 14, top: 26, bottom: 42 };
const LABEL_GAP = 12; // the least vertical room between two policy labels on one side
const LABEL_LEFT_FROM = 0.75; // a policy whose marks reach past this share is labelled on its left

const pct = (v) => `${Math.round(v * 100)}%`;

/* `points`: [{ judge, rank, policy, name, secret, verdict, cases }], `secret` the judge's mean
   probability on the secret's true value and `verdict` the share of reads right. `blindGuess` marks
   the probability of a guess with no evidence. */
export function tradeoffChart(points, { blindGuess } = {}) {
  if (!points.length) return "";
  const lowest = Math.min(...points.map((p) => p.verdict));
  const yMin = Math.max(0, Math.floor(lowest * 10) / 10 - 0.1);
  const x = (v) => PAD.left + v * (W - PAD.left - PAD.right);
  const y = (v) => PAD.top + ((1 - v) / (1 - yMin)) * (H - PAD.top - PAD.bottom);

  const yTicks = [];
  for (let v = yMin; v <= 1.0001; v += 0.1) yTicks.push(Math.round(v * 10) / 10);
  const xTicks = [0, 0.25, 0.5, 0.75, 1];
  const grid = yTicks.map((v) => `<line class="tradeoff-grid" x1="${PAD.left}" x2="${W - PAD.right}" y1="${y(v)}" y2="${y(v)}"/><text class="tradeoff-tick" x="${PAD.left - 6}" y="${y(v) + 3.5}" text-anchor="end">${pct(v)}</text>`).join("")
    + xTicks.map((v) => `<text class="tradeoff-tick" x="${x(v)}" y="${H - PAD.bottom + 15}" text-anchor="middle">${pct(v)}</text>`).join("");
  const axes = `<text class="tradeoff-axis" x="${(PAD.left + W - PAD.right) / 2}" y="${H - 6}" text-anchor="middle">Secret recovered: the judge's probability on its true value</text>`
    + `<text class="tradeoff-axis" transform="translate(12 ${(PAD.top + H - PAD.bottom) / 2}) rotate(-90)" text-anchor="middle">Verdict right: share of reads</text>`
    + `<text class="tradeoff-corner" x="${PAD.left}" y="${PAD.top - 12}">↖ verdict kept, secret hidden</text>`;
  const guess = blindGuess == null ? ""
    : `<line class="tradeoff-guess" x1="${x(blindGuess)}" x2="${x(blindGuess)}" y1="${PAD.top}" y2="${H - PAD.bottom}"/><text class="tradeoff-tick" x="${x(blindGuess) + 4}" y="${H - PAD.bottom - 6}">blind guess</text>`;

  const policies = [...new Set(points.map((p) => p.policy))];
  const marksOf = (policy) => points.filter((p) => p.policy === policy).sort((a, b) => a.rank - b.rank);
  const links = policies.map((policy) => {
    const ms = marksOf(policy);
    return ms.length > 1 ? `<polyline class="tradeoff-link" points="${ms.map((p) => `${x(p.secret)},${y(p.verdict)}`).join(" ")}"/>` : "";
  }).join("");

  const marks = points.map((p) => {
    const said = `${p.judge}, ${p.name}: verdict right ${pct(p.verdict)}, secret ${p.secret.toFixed(2)}`;
    const tip = `<b>${esc(p.name)}</b> · ${esc(p.judge)}<br>Verdict right: ${pct(p.verdict)} of reads<br>Secret recovered: ${p.secret.toFixed(2)}<br>${p.cases} cases`;
    return `<g class="${judgeClass(p.rank)} tradeoff-mark" tabindex="0" role="img" aria-label="${esc(said)}" ${dataTip(tip)}><circle class="tradeoff-hit" cx="${x(p.secret)}" cy="${y(p.verdict)}" r="11"/>${judgeMark(p.rank, x(p.secret), y(p.verdict))}</g>`;
  }).join("");

  // Each policy is named once, beside its first judge's mark; labels on one side are pushed apart
  // to stay legible.
  const labels = policies.map((policy) => {
    const first = marksOf(policy)[0];
    const left = first.secret > LABEL_LEFT_FROM;
    const edge = x(first.secret) + (left ? -9 : 9);
    return { name: first.name, left, edge, at: y(first.verdict) + 3.5 };
  });
  for (const side of [true, false]) {
    const own = labels.filter((l) => l.left === side).sort((a, b) => a.at - b.at);
    for (let i = 1; i < own.length; i++) own[i].at = Math.max(own[i].at, own[i - 1].at + LABEL_GAP);
  }
  const names = labels.map((l) => `<text class="tradeoff-label" x="${l.edge}" y="${l.at}" text-anchor="${l.left ? "end" : "start"}">${esc(l.name)}</text>`).join("");

  const judges = [...new Map(points.map((p) => [p.judge, p.rank])).entries()].sort((a, b) => a[1] - b[1]);
  return legend(judges.map(([judge, rank]) => [judgeSwatch(rank), esc(judge)]), { note: "A line joins one policy's marks across judges." })
    + `<div class="scroll"><svg class="tradeoff" viewBox="0 0 ${W} ${H}" role="group" aria-label="Verdict right against secret recovered, per policy and judge">${grid}${guess}${axes}${links}${marks}${names}</svg></div>`;
}
