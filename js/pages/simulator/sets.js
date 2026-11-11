/* The validated sets, one row per claim: its hard set and its calibration set side by side, each
   with its size, how many cases the validator says text redaction leaves decidable, and its runs;
   and the numbers that sum them up, which the Simulator overview shows too. */

import { esc } from "../../lib/dom.js?v=0cb80a196f";
import { READING } from "../../lib/labels.js?v=0cb80a196f";
import { currentOf, currentSimSets, datasetHref, datasetOfSet, simSummary } from "../../data/datasets.js?v=0cb80a196f";
import { ledgerEntry } from "../../data/runs.js?v=0cb80a196f";
import { readings } from "../../data/constants.js?v=0cb80a196f";
import { SITE } from "../../data/site.js?v=0cb80a196f";
import { ruleOf } from "../../data/studies.js?v=0cb80a196f";
import { callItems, decidableShare, splitBar } from "../../components/bars.js?v=0cb80a196f";
import { badge, cell, stats, table } from "../../components/blocks.js?v=0cb80a196f";
import { legend } from "../../components/legend.js?v=0cb80a196f";

/* What the simulator holds: claims, sets, cases and how many sets pass their gates. */
export function setStats() {
  const s = simSummary();
  return stats([
    ["Claims", s.claims, `${s.shapes.permission} permission, ${s.shapes.prohibition} prohibition`],
    ["Sets", s.sets, "a hard and a calibration set per claim"],
    ["Cases", s.cases.toLocaleString(), ""],
    ["Automated gates", `${s.passing} of ${s.sets}`, "sets pass"],
  ]);
}

function setCell(b, label) {
  const attrs = `data-label="${esc(label)}"`;
  if (!b) return cell("—", "faint", attrs);
  const d = datasetOfSet(b.key);
  const m = b.map?.text_redaction || {};
  const n = ((d ? currentOf(d) : null)?.runs || []).filter((r) => ledgerEntry(r)?.counted).length;
  const fail = b.gate_status === "fail" ? ` ${badge("fails a gate", "fail")}` : "";
  const title = `Under text redaction: ${m.decidable || 0} decidable, ${m.cant_decide || 0} can't decide, ${m.may_mislead || 0} may mislead`;
  return cell(`<a class="set-cell" href="${d ? datasetHref(d) : "#/simulator/sets"}"><span><b>${b.kept}</b> cases${fail}</span>
    ${splitBar(m, readings(), { attrs: `title="${esc(title)}"` })}
    <span class="small muted">${decidableShare(m, readings())} decidable${n ? "" : " · not run"}</span></a>`, "", attrs);
}

export function setsIndex() {
  const sets = currentSimSets();
  const of = (c, tier) => sets.find(({ b }) => b.claim === c.id && b.tier === tier)?.b;
  const rows = (SITE.claims || []).map((c) => [`<a href="#/simulator/claims">${esc(c.title)}</a><div class="small muted">${esc(c.shape)}: ${esc(ruleOf(c.shape))}</div>`,
    setCell(of(c, "hard"), "Hard set"), setCell(of(c, "calibration"), "Calibration set")]);
  const names = Object.fromEntries(readings().map((r) => [r, READING[r].toLowerCase()]));
  return setStats()
    + table(["Claim", `Hard set <span class="faint">every experiment</span>`, `Calibration set <span class="faint">small worlds</span>`], rows, { cls: "left sets" })
    + legend(callItems(names), { cls: "sets-key", note: `The validator's call under text redaction, made before any model reads a case. <a href="#/simulator">What these mean</a>` });
}
