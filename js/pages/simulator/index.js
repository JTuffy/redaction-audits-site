/* The Simulator tab: its overview (build steps, what it holds, the validator, the dials), its inputs
   (claims, secrets), its outputs (sets), and each set's page. The long write-up
   (docs/notes/pipeline.md) folds under the overview. */

import { $ } from "../../lib/dom.js?v=2275844be3";
import { READING } from "../../lib/labels.js?v=2275844be3";
import { term } from "../../lib/tips.js?v=2275844be3";
import { datasetNamed, simSummary } from "../../data/datasets.js?v=2275844be3";
import { codeHref } from "../../data/links.js?v=2275844be3";
import { noteNamed } from "../../data/notes.js?v=2275844be3";
import { ruleOf } from "../../data/studies.js?v=2275844be3";
import { cards, flow, subnav, table } from "../../components/blocks.js?v=2275844be3";
import { swatch } from "../../components/legend.js?v=2275844be3";
import { writeUp } from "../../components/note.js?v=2275844be3";
import { pageHead, section } from "../../components/page.js?v=2275844be3";
import { claimCards } from "./claims.js?v=2275844be3";
import { secretRegistry } from "./secrets.js?v=2275844be3";
import { setPage } from "./set-page.js?v=2275844be3";
import { setStats, setsIndex } from "./sets.js?v=2275844be3";

const TABS = [["#/simulator", "Overview", "overview"], ["#/simulator/claims", "Claims", "claims"], ["#/simulator/secrets", "Secrets", "secrets"], ["#/simulator/sets", "Sets", "sets"]];

function overview(anchor) {
  const s = simSummary();
  const span = (r) => (!r ? "" : r[0] === r[1] ? `${Math.round(r[0])}` : `${Math.round(r[0])}–${Math.round(r[1])}`);
  const lines = (tier) => (s.lines[tier] ? `, a median of ${span(s.lines[tier])} log lines` : "");
  const w = writeUp(noteNamed("pipeline"), { base: "#/simulator/overview", anchor, link: codeHref });
  const html = section("Build steps", flow([
    ["Claim", `One ${term("claim_shape", "claim")} per rule file: what triggers it, what excuses or convicts it, which records distract.`, "simulator/claims/*.toml"],
    ["World", "Code simulates a fictional lab and its logs around each trigger, plus background noise.", "simulator/lab.py"],
    ["Label and proof", "The rule file decides the label and records the connections it rests on. A second checker must agree.", "simulator/rules/"],
    ["Variants", `Each ${term("family", "family")} rewrites one world, changing one fact: outcome, presence, state, target or timing.`, "simulator/variants/families.py"],
    ["Validate and freeze", "Quality gates and a blind reviewer, then the set is frozen under a version hash.", "simulator/gates/"],
  ]))
    + section("What it holds now", setStats(), `<a href="#/simulator/sets">Sets</a>`)
    + section("The validator", `<p class="lede">Reads each case's proof and calls what a text policy leaves of it, before any model reads the case.</p>`
      + cards([
        [`${swatch("right")}${READING.decidable}`, "Every connection the label needs survives."],
        [`${swatch("unsure")}${READING.cant_decide}`, "A connection the label needs is cut, so the evidence no longer settles the case."],
        [`${swatch("wrong")}${READING.may_mislead}`, "Two different things now look the same, so the case can read as the other label."],
      ]))
    + section("What we can turn", table(["Setting", "What it changes", "Now"], [
      ["Claim shape", `Permission: ${ruleOf("permission")}. Prohibition: ${ruleOf("prohibition")}`, `${s.shapes.permission} permission, ${s.shapes.prohibition} prohibition`],
      ["Tier", `Calibration: small worlds, one deciding fact${lines("calibration")}. Hard: several connections${lines("hard")}`, "both, per claim"],
      ["Demand", "How many connections a reader must make", s.connections ? `${s.connections[0]} to ${s.connections[1]} per case` : "per case"],
      ["Overlap", "How much of the proof runs through secrets", "per case"],
      ["Exposure", "How indirectly a secret can be recovered: literal, encoded, narrowing, mosaic", "per case"],
      ["Look-alikes", "How often a similar record names a different thing", "set per build"],
    ], { cls: "left labelled" }))
    + section("Growing it", cards([
      ["A new claim", "A rule file and its second-checker rule. The rest of the pipeline is generic."],
      ["Harder data", "More connections per label, more look-alikes, secrets that leak only in combination."],
      ["Real-looking text", "Model-written log lines in place of templates. Planned; the labels stay computed."],
    ]))
    + (w ? w.html : "");
  return { html, scroll: w ? w.scroll : () => {} };
}

export function pageSimulator(arg) {
  const [first = "overview", ...rest] = String(arg || "").split("/").map(decodeURIComponent);
  const d = datasetNamed(first);
  if (d) { setPage(d, rest); return; }
  const current = TABS.some(([, , k]) => k === first) ? first : "overview";
  const head = `<div>${pageHead({ title: "Simulator" })}${subnav(TABS, current, "Simulator")}</div>`;
  if (current === "claims") { $("view").innerHTML = head + claimCards(); return; }
  if (current === "secrets") { $("view").innerHTML = head + secretRegistry(); return; }
  if (current === "sets") { $("view").innerHTML = head + setsIndex(); return; }
  const view = overview(rest[0]);
  $("view").innerHTML = head + view.html;
  view.scroll();
}
