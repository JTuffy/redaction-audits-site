/* The validator against a run: its call on each case of a simulated set the run read, and how often
   the run's judge read those cases wrong. */

import { esc } from "../../lib/dom.js?v=863af23878";
import { pct, share } from "../../lib/format.js?v=863af23878";
import { READING } from "../../lib/labels.js?v=863af23878";
import { term } from "../../lib/tips.js?v=863af23878";
import { clearedAt, flaggedAt, readings, validatorViews, viewName } from "../../data/constants.js?v=863af23878";
import { setHref, simRunOf } from "../../data/datasets.js?v=863af23878";
import { readKey } from "../../components/bars.js?v=863af23878";
import { cell, table } from "../../components/blocks.js?v=863af23878";
import { section } from "../../components/page.js?v=863af23878";

export function validatorTable(name) {
  const hit = simRunOf(name);
  if (!hit) return "";
  const [b, run] = hit;
  const readingKeys = readings();
  const views = validatorViews().filter((v) => readingKeys.some((k) => run?.cells?.[v]?.[k]?.reads));
  if (!views.length) return "";
  const at = (v, k) => {
    const c = run.cells[v]?.[k];
    if (!c?.cases) return cell("—", "faint");
    const wrong = c.reads ? `<span class="small ${share(c.wrong, c.reads) ? "label-violation" : "faint"}"> · ${pct(c.wrong, c.reads)} wrong reads</span>` : "";
    return `<a href="${setHref(b, "", { run: run.run, view: v, reading: k })}"><b>${c.cases}</b> cases</a>${wrong}`;
  };
  const rows = views.map((v) => [esc(viewName(v)), ...readingKeys.map((k) => at(v, k))]);
  return section("Validator against this run", `<p class="lede">The validator's call on each case this run read, and how often this run's judge got those cases wrong.</p>`
    + table(["Evidence", ...readingKeys.map((k) => term(`read_${k}`, READING[k]))], rows, { cls: "left labelled" })
    + readKey({ flagged: flaggedAt(), cleared: clearedAt(), swatches: false }),
  `<a href="${setHref(b, "", { run: run.run, view: "as_written" })}">These cases in the set</a>`);
}
