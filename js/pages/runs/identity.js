/* Who a run is, the same on every run page: its breadcrumbs, its labelled fields, an ablation's
   sub line, and the link to its transcripts. */

import { esc } from "../../lib/dom.js?v=2275844be3";
import { caseName, dayOf, timeOf, when } from "../../lib/format.js?v=2275844be3";
import { glossaryEntry, term } from "../../lib/tips.js?v=2275844be3";
import { query } from "../../lib/view-state.js?v=2275844be3";
import { policyName, stanceName } from "../../data/constants.js?v=2275844be3";
import { datasetHref, datasetOfVersion, versionOf } from "../../data/datasets.js?v=2275844be3";
import { experimentHref, experimentOf } from "../../data/experiments.js?v=2275844be3";
import { runFlags, runHref, runJudge, shortCommit } from "../../data/runs.js?v=2275844be3";
import { SITE } from "../../data/site.js?v=2275844be3";
import { badge, fields } from "../../components/blocks.js?v=2275844be3";

/* A run's breadcrumbs: experiment › run, and › case when a case is open. A run no experiment owns
   sits under the run log. */
export function runCrumbs(e, caseId = null) {
  const x = experimentOf(e);
  return [
    x ? { text: x.id, href: experimentHref(x.id), mono: true } : { text: "Run log", href: "#/runs" },
    { text: e.name, href: runHref(e.name), mono: true },
    caseId && { text: `case ${caseName(caseId)}`, href: runHref(e.name, "cases", { case: caseId, policy: query().get("policy") }), mono: true },
  ];
}

/* A run's dirty flag as its glossary term: unconfirmed where the ledger alone could have set it. */
const dirtyTerm = (e) => (e.dirty_unconfirmed ? "dirty_unconfirmed" : "dirty");
const dirtyText = (e) => (glossaryEntry(dirtyTerm(e))?.name || "uncommitted changes").toLowerCase();

/* A run's identity as labelled fields: where it belongs, what it read, how it was set up, when. */
export function runFields(e, r) {
  const c = e.config || {};
  const x = experimentOf(e);
  const d = datasetOfVersion(c.data, c.split);
  const v = versionOf(c.data);
  const part = e.part;
  const n = r?.cases?.length || c.sample_ids?.length;
  const f = [
    ["Experiment", x ? `<a href="${experimentHref(x.id)}">${esc(x.id)}</a>${part ? ` <span class="faint">part ${esc(part)}</span>` : ""}` : `<span class="faint">none</span>`],
    ["Dataset", d ? `<a href="${datasetHref(d)}">${esc(d.title)}</a> <span class="mono faint">${esc(v.slice(0, 10))}</span>` : esc(v || "—")],
    ["Lab", esc((stanceName(e.stance) || "—"))],
    ["Policies", esc((c.policies || []).map(policyName).join(", ") || "—")],
    ["Judge", `${esc(runJudge(e, "—"))}${c.judge_samples ? ` <span class="faint">${c.judge_samples} reads</span>` : ""}`],
    ["Cases", n != null ? String(n) : "—"],
    ["Run at", `${esc(dayOf(e.name))} ${esc(timeOf(e.name))}`],
    ["Commit", e.commit ? `<span class="mono">${esc(shortCommit(e))}</span>${e.dirty ? ` <span class="faint">${term(dirtyTerm(e), dirtyText(e))}</span>` : ""}` : "—"],
  ];
  const flags = runFlags(e);
  return `${fields(f)}${flags.length ? `<p class="small">${badge(esc(flags.join(", ")), "warn")}</p>` : ""}`;
}

/* An ablation's sub line: what else the caller adds, then when, the commit, and how it was recorded. */
export function subLine(e, extra = []) {
  const bits = [...extra, `<span>${when(e.name)}</span>`];
  if (e.commit) bits.push(`<span class="mono">${esc(shortCommit(e))}${e.dirty ? `<span class="dot" tabindex="0" role="img" aria-label="${dirtyText(e)}" data-tip="${dirtyTerm(e)}"></span>` : ""}</span>`);
  if (e.backfilled) bits.push(`<span>${term("backfilled", "backfilled")}</span>`);
  return bits.join("");
}

/* The run's own logs in the bundled Inspect viewer, when the bundle has them. */
export function transcripts(name) {
  if (!SITE.inspect_viewer || !(SITE.inspect_runs || []).includes(name)) return "";
  return `<a class="ext" href="viewer/#/logs/${encodeURIComponent(name)}/" target="_blank" rel="noopener">Transcripts ↗</a>`;
}
