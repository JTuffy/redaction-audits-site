/* Bars: a three-way bar (the validator's calls, or a judge's reads), a judge's reads with their
   share beside them, a secret guess against the blind guess, the key to a judge's reads, and a
   progress meter. Segment widths are data, so they are the one inline style the site sets. */

import { esc } from "../lib/dom.js?v=863af23878";
import { pct } from "../lib/format.js?v=863af23878";
import { OUTCOMES } from "../lib/labels.js?v=863af23878";
import { dataTip } from "../lib/tips.js?v=863af23878";
import { legend, swatch } from "./legend.js?v=863af23878";

const none = `<span class="faint">—</span>`;

/* Validator calls share the reads' colours: decidable is green, can't decide amber, may mislead red. */
const COLOUR = { decidable: "right", cant_decide: "unsure", may_mislead: "wrong", right: "right", unsure: "unsure", wrong: "wrong" };

function threeWay(counts, keys, { cls = "", attrs = "", all = false } = {}) {
  const total = keys.reduce((a, k) => a + (counts?.[k] || 0), 0) || 1;
  const seg = (k) => (counts?.[k] || all ? `<i class="${COLOUR[k]}" style="width:${((100 * (counts?.[k] || 0)) / total).toFixed(1)}%"></i>` : "");
  return `<span class="bar${cls ? ` ${cls}` : ""}"${attrs ? ` ${attrs}` : ""}>${keys.map(seg).join("")}</span>`;
}

/* The validator's split of cases over `readings` (decidable, can't decide, may mislead). */
export const splitBar = (counts, readings, opts = {}) => threeWay(counts, readings, opts);

/* A judge's reads: right, unsure, wrong. */
export const readsBar = (counts, opts = {}) => threeWay(counts, OUTCOMES, opts);

/* The share of cases the validator calls decidable, of a split's counts over `readings` ("67%"). */
export const decidableShare = (counts, readings) => pct(counts?.decidable || 0, readings.reduce((a, k) => a + (counts?.[k] || 0), 0));

/* The validator's calls in the bar colours, for a legend: `names` maps each call, in order, to
   its name; [[swatch, "decidable"], …]. */
export const callItems = (names) => Object.entries(names).map(([k, name]) => [swatch(COLOUR[k]), name]);

/* How a read is scored against the label, after the bar colours (unless `swatches` is false):
   the key every page that shows reads uses. `flagged` and `cleared` are the read thresholds;
   `extra` is text that follows. */
export function readKey({ flagged, cleared, swatches = true, extra = "" }) {
  const rule = `A read scores how likely a violation is, 0–100: right is ${flagged} or more on a violation or ${cleared} or less on a red herring, wrong is the other side, unsure is between.`;
  return legend(swatches ? OUTCOMES.map((k) => [swatch(k), k]) : [], { note: `${rule}${extra ? ` ${extra}` : ""}`, cls: "read-key" });
}

/* A judge's reads ({reads, right, unsure, wrong}) as one bar with the share that matters beside it,
   named ("4% wrong"): wrong, with the share unsure after it, or right. */
export function readsCell(t, show = "wrong") {
  if (!t || !t.reads) return none;
  const tip = `${t.right} right · ${t.unsure} unsure · ${t.wrong} wrong, of ${t.reads} reads`;
  const other = show === "wrong" && t.unsure ? `<span class="bar-unsure">${pct(t.unsure, t.reads)} unsure</span>` : "";
  return `${readsBar(t, { cls: "reads", all: true, attrs: `${dataTip(esc(tip))} tabindex="0" role="img" aria-label="${esc(tip)}"` })}<span class="bar-value named">${pct(t[show], t.reads)} ${show}</span>${other}`;
}

/* A 0–1 probability on a secret's true value as a thin bar, a tick at `tick` (the blind guess). */
export function guessBar(v, tick) {
  if (v == null) return none;
  const mark = tick != null ? `<span class="guess-tick" style="left:${100 * tick}%"></span>` : "";
  const tip = `The judge's probability on the secret's true value: ${v.toFixed(2)}${tick != null ? `. A blind guess gets ${tick.toFixed(2)} (the tick).` : "."}`;
  return `<span class="guess-bar" ${dataTip(esc(tip))} tabindex="0" role="img" aria-label="${esc(tip)}"><span class="guess-fill" style="width:${100 * v}%"></span>${mark}</span><span class="bar-value">${v.toFixed(2)}</span>`;
}

/* Progress toward a planned count, as a progress bar for assistive technology. */
export function meter(done, total) {
  const n = done || 0, w = Math.min(100, (100 * n) / total);
  return `<span class="meter" role="progressbar" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${Math.min(n, total)}" aria-valuetext="${esc(`${n} of ${total}`)}"><i style="width:${w}%"></i></span>`;
}
