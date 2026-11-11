/* A run's benchmark-era metrics (AUROC, persistence, leakage, verbatim leak), overall, by set and
   by violation type. The tables come computed from Python (domain/sample_metrics.py): one
   definition per number. */

import { esc } from "../../lib/dom.js?v=2275844be3";
import { f2, human } from "../../lib/format.js?v=2275844be3";
import { SETS } from "../../lib/labels.js?v=2275844be3";
import { term } from "../../lib/tips.js?v=2275844be3";
import { policyName } from "../../data/constants.js?v=2275844be3";
import { leakageInvalid } from "../../data/runs.js?v=2275844be3";
import { badge, fold, num, table } from "../../components/blocks.js?v=2275844be3";
import { section } from "../../components/page.js?v=2275844be3";

function resultsTable(r) {
  const noLeak = leakageInvalid(r.name); // the dataset fails its leakage check: no number to show
  // From the run's samples by the shared definitions; a run without samples shows its summary file.
  const rows = (r.table?.length ? r.table : (r.summary || []).map((s) => ({
    policy: s.policy, n: s.samples, persistence: s.persistence?.estimate, leakage: s.leakage_mean?.estimate,
    auroc_unedited: s.auroc_unedited, auroc_edited: s.auroc_edited, fpr: s.errors_edited?.false_positive_rate,
    fnr: s.errors_edited?.false_negative_rate, wrong_way: null, evidence_loss: s.evidence_loss,
  }))).map((s) => [term(s.policy, esc(policyName(s.policy))), s.n, f2(s.persistence),
    noLeak ? `<span class="faint" title="not valid on this dataset (see its set page)">n/a</span>` : f2(s.leakage),
    f2(s.verbatim), f2(s.auroc_unedited), f2(s.auroc_edited), f2(s.fpr), f2(s.fnr), s.wrong_way ?? "—", f2(s.evidence_loss)]);
  const checks = (r.checks || []).filter((c) => !(/herring/i.test(c.name) && !["pass", "FAIL"].includes(c.result))).map((c) => {
    const key = /AUROC/.test(c.name) ? "gate_auroc" : /herring/i.test(c.name) ? "gate_difficulty" : null;
    return `<span>${badge(c.result === "FAIL" ? "fail" : esc(c.result), c.result === "pass" ? "pass" : c.result === "FAIL" ? "fail" : "warn")} ${key ? term(key, esc(c.name)) : esc(c.name)}<span class="muted">${esc(c.detail)}</span></span>`;
  }).join("");
  return table(["Policy", "n", term("persistence", "Persistence"), term("leakage", "Leakage"), term("verbatim", "Verbatim leak"), term("auroc_unedited", "AUROC unedited"), term("auroc_edited", "AUROC edited"),
    term("fpr", "FPR"), term("fnr", "FNR"), term("wrong_way", "Wrong-way"), term("evidence_loss", "Evidence loss")], rows)
    + (checks ? `<div class="checks">${checks}</div>` : "");
}

function bySetSection(r) {
  if (!r.by_set?.length) return "";
  const rows = r.by_set.map((x) => [esc(policyName(x.policy)), esc(SETS[x.set] || x.set), num(x.n), num(f2(x.persistence)), num(f2(x.leakage)), num(f2(x.fnr)), num(f2(x.fpr))]);
  return section("By set", table(["Policy", "Set", num("n"), num(term("persistence", "Persistence")), num(term("leakage", "Leakage")), num(term("fnr", "FNR")), num(term("fpr", "FPR"))], rows));
}

function byTypeSection(r) {
  if (!r.by_type?.length) return "";
  const pols = Object.keys(r.by_type[0].persistence);
  const rows = r.by_type.map((x) => [esc(human(x.type)), ...pols.map((p) => num(f2(x.persistence[p]))), { html: x.n, cls: "num faint" }]);
  return section("By violation type", table(["Type", ...pols.map((p) => num(esc(policyName(p)))), num("n")], rows), `<span>persistence, both sets; small n per cell, read as direction only</span>`);
}

/* The metrics, folded under the reads; open when the run has no reads to lead with. */
export function benchmarkFold(r, open) {
  return fold("Benchmark metrics: AUROC, persistence, leakage, verbatim leak",
    resultsTable(r) + bySetSection(r) + byTypeSection(r), { open, cls: "run-bench" });
}
