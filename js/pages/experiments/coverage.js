/* Coverage status: what has been run on each current dataset, per lab stance and policy, by which
   judges and on how many cases of its current version. */

import { $, esc } from "../../lib/dom.js?v=863af23878";
import { NONE } from "../../lib/format.js?v=863af23878";
import { term } from "../../lib/tips.js?v=863af23878";
import { judgeName, policyKeys, policyName, stanceName } from "../../data/constants.js?v=863af23878";
import { datasetHref, datasets } from "../../data/datasets.js?v=863af23878";
import { runHref } from "../../data/runs.js?v=863af23878";
import { SITE } from "../../data/site.js?v=863af23878";
import { table } from "../../components/blocks.js?v=863af23878";
import { section } from "../../components/page.js?v=863af23878";
import { experimentsHead } from "./head.js?v=863af23878";

function coverageGrid() {
  const rows = (SITE.coverage || []).filter((r) => r.stance);
  const other = (SITE.coverage || []).filter((r) => r.other);
  const pols = policyKeys();
  // Hover lists the runs; runs on an earlier version of the dataset are named but not counted.
  const runList = (j) => [...j.runs, ...j.earlier_runs.map((n) => `${n} (earlier version)`)].join("\n");
  const chips = (judges) => (judges?.length
    ? judges.map((j) => `<a class="chip" href="${runHref(j.runs[0] ?? j.earlier_runs[0])}" title="${esc(runList(j))}">${esc(judgeName(j.judge, "judge"))} · ${j.cases == null ? "all" : j.cases}</a>`).join(" ")
    : NONE);
  const byName = Object.fromEntries(datasets().map((d) => [d.name, d]));
  const lines = datasets().filter((d) => d.status === "current").flatMap((d) => {
    const mine = rows.filter((r) => r.dataset === d.name);
    const label = (stance) => `<a href="${datasetHref(d)}">${esc(d.title)}</a>${stance ? `<div class="small faint">Lab: ${esc((stanceName(stance)).toLowerCase())}</div>` : `<div class="small faint">no redaction runs</div>`}`;
    if (!mine.length) return [{ cls: "gap", cells: [label(null), ...pols.map(() => NONE)] }];
    return mine.map((r) => [label(r.stance), ...pols.map((p) => chips(r.cells[p]))]);
  });
  const grid = table(["Dataset", ...pols.map((p) => term(p, esc(policyName(p))))], lines, { cls: "left coverage" });
  const others = other.length
    ? table(["Dataset", "Judge-only runs"], other.map((r) => [esc(byName[r.dataset]?.title || r.dataset), Object.entries(r.other).map(([k, n]) => `${n} ${esc(k.toLowerCase())}`).join(" · ")]), { cls: "left" })
    : "";
  return section(term("data_coverage", "Runs by dataset, lab stance and policy"), `<p class="muted small">Each chip is a judge and how many cases of the dataset's current version it read; hover for the runs, including any on earlier versions. Smoke batches and runs replaced after stopping early aren't counted.</p>${grid}`)
    + (others ? section("Judge-only runs (marker ablation, separability, re-asks)", others) : "");
}

export function pageCoverage() {
  $("view").innerHTML = experimentsHead("coverage") + coverageGrid();
}
