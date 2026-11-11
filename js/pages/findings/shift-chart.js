/* The prediction test's chart: one row per kind of case, the predicted side shaded, and each judge's
   score shift as a mark with its 95% interval. */

import { esc } from "../../lib/dom.js?v=863af23878";
import { signed } from "../../lib/format.js?v=863af23878";
import { dataTip } from "../../lib/tips.js?v=863af23878";
import { judgeRank } from "../../data/constants.js?v=863af23878";
import { cell, table } from "../../components/blocks.js?v=863af23878";
import { judgeClass, judgeMark, judgeSwatch } from "../../components/judge-marks.js?v=863af23878";
import { legend, swatch } from "../../components/legend.js?v=863af23878";
import { predictionCells, SHAPES, shapeHead } from "../../data/studies.js?v=863af23878";

const WAY = { "-1": "toward cleared", "1": "toward guilty", "0": "no change" };
export function shiftChart(js) {
  const LIM = 60, W = 520, LANE = 13, H = js.length * LANE + 10;
  const x = (v) => (W * (Math.max(-LIM, Math.min(LIM, v)) + LIM)) / (2 * LIM);
  const row = ({ name: k, title: name, direction: d }) => {
    const band = d === 0 ? "" : `<rect class="shift-band" x="${d > 0 ? x(0) : 0}" y="0" width="${W / 2}" height="${H}"/>`;
    const marks = js.map((j, i) => {
      const c = j.cells[k]; if (!c) return "";
      const s = c.shift, cy = 8 + i * LANE;
      const tip = `<b>${esc(j.judge)}</b><br>${esc(name)}<br>${signed(s.estimate)} points, 95% interval ${signed(s.low)} to ${signed(s.high)}<br>${c.cases} cases · ${c.reads} reads`;
      const said = `${j.judge}: ${signed(s.estimate)} points, 95% interval ${signed(s.low)} to ${signed(s.high)}`;
      return `<g class="shift-judge ${judgeClass(judgeRank(j.judge))}" tabindex="0" role="img" aria-label="${esc(said)}" ${dataTip(tip)}><rect class="shift-hit" x="0" y="${cy - LANE / 2}" width="${W}" height="${LANE}"/><line x1="${x(s.low)}" x2="${x(s.high)}" y1="${cy}" y2="${cy}"/>${judgeMark(judgeRank(j.judge), x(s.estimate), cy)}</g>`;
    }).join("");
    return [esc(name), cell(WAY[String(d)], `shift-way way${d}`),
      cell(`<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="group" aria-label="${esc(name)}: score shift per judge">${band}<line class="shift-zero" x1="${x(0)}" x2="${x(0)}" y1="0" y2="${H}"/>${marks}</svg>`, "shift-cell")];
  };
  const cells = predictionCells();
  const rows = SHAPES.flatMap((s) => [{ group: shapeHead(s) }, ...cells.filter((c) => c.shape === s).map(row)]);
  const axis = { cls: "shift-axis", cells: ["", "", `<span>−${LIM}</span><span>← toward cleared · 0 · toward guilty →</span><span>+${LIM}</span>`] };
  const key = js.map((j) => [judgeSwatch(judgeRank(j.judge)),
    `${esc(j.judge)} <span class="faint">${Math.max(...Object.values(j.cells).map((c) => c.cases))} per cell</span>`]);
  return legend([...key, [swatch("predicted"), "predicted side"]])
    + table(["Case", "Validator predicts", "Change in the judge's violation score after the edit (points, 95% interval)"], [...rows, axis], { cls: "left answer-table shift-chart", panel: false });
}
