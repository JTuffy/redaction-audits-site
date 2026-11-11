/* One experiment's page, one template for all. An experiment with a result leads with its finding
   and result; one without leads with its hypothesis. Then reasoning, the expectations as written,
   design, progress, and its runs. */

import { esc } from "../../lib/dom.js?v=2275844be3";
import { money } from "../../lib/format.js?v=2275844be3";
import { judgeName, policyName, stanceName } from "../../data/constants.js?v=2275844be3";
import { datasetHref, datasetNamed, datasetOfVersion } from "../../data/datasets.js?v=2275844be3";
import { experimentHref, planOf, studyOf, subOf } from "../../data/experiments.js?v=2275844be3";
import { runHref, runJudge } from "../../data/runs.js?v=2275844be3";
import { fold, num, table } from "../../components/blocks.js?v=2275844be3";
import { crumbs } from "../../components/crumbs.js?v=2275844be3";
import { section } from "../../components/page.js?v=2275844be3";
import { answers as findingsAnswers } from "../../data/answers.js?v=2275844be3";
import { expectationOf, pill, progressMeter, progressOf, recorded, runsOf } from "./progress.js?v=2275844be3";
import { cellTable, checksBlock, reviewBlock } from "./study.js?v=2275844be3";

const datasetLink = (d, fallback) => (d ? `<a href="${datasetHref(d)}">${esc(d.title)}</a>` : esc(fallback));

/* The plan as a table: what it runs, on what, read by whom. */
function planTable(plan) {
  const rows = plan.runs.map((r) => {
    const [name, version] = r.dataset.split("@");
    return [`${datasetLink(datasetNamed(name), name)} <span class="faint mono">${esc(version || "")}</span>`, num(r.cases),
      { html: esc(r.policies.map(policyName).join(", ")), cls: "wrap" }, `${esc(judgeName(r.judge))} <span class="faint">${r.samples} reads</span>`];
  });
  return table(["Set", num("Cases"), "Policies", "Judge"], rows, { cls: "left" })
    + `<p class="small muted">${plan.cases} cases · ${plan.trials} trials · estimate ${esc(money(plan.estimate))} for the whole plan${plan.estimate_basis === "approximate" ? " (approximate: no recorded run with this judge)" : ""}</p>`;
}

function runsTable(runs) {
  if (!runs.length) return `<p class="empty">No recorded runs.</p>`;
  const rows = runs.map((e) => {
    const c = e.config || {};
    return [{ html: `<a href="${runHref(e.name)}">${esc(e.name)}</a>`, cls: "mono-cell" }, datasetLink(datasetOfVersion(c.data, c.split), c.data || "—"),
      esc((stanceName(e.stance) || e.stance || "")), { html: esc((c.policies || c.conditions || []).map(policyName).join(", ")), cls: "wrap" },
      esc(runJudge(e, "—")), num(c.sample_ids?.length || c.limit || "all")];
  });
  return table(["Run", "Set", "Lab", "Policies", "Judge", num("Cases")], rows, { cls: "left" });
}

export function experimentPage(x) {
  const p = progressOf(x);
  const st = studyOf(x);
  const plan = planOf(x);
  const runs = runsOf(x);
  const sub = subOf(x);
  const panel = sub ? sub.panel || sub.findings : null;
  const ex = expectationOf(x);
  const so = sub?.findings ? findingsAnswers()[sub.findings] : "";
  const trail = crumbs([
    sub ? { text: sub.main.title, href: "#/" } : { text: "Experiments", href: "#/experiments" },
    sub && { text: sub.ask, href: panel ? `#/findings/${panel}` : "#/" },
    { text: x.id, href: experimentHref(x.id), mono: true },
  ]);
  const head = `<div class="study-head">${trail}<h1>${esc(x.title)}</h1>
    <p class="study-status">${pill(p)} ${progressMeter(p)} ${x.judge ? `<span class="muted">read by ${esc(x.judge)}</span>` : ""}${x.replaced_by ? ` <span class="muted">· re-run as <a href="${experimentHref(x.replaced_by)}">${esc(x.replaced_by)}</a></span>` : ""}</p></div>`;
  const result = [
    x.result ? `<p>${esc(x.result)}</p>` : "",
    st?.checks?.length ? `<h3 class="sub-h">Expectations, scored</h3>${checksBlock(st)}` : "",
    so && p.state !== "todo" ? `<p class="experiment-answer"><span class="muted">Answer across judges, from Findings:</span> ${so} <a href="#/findings/${panel}">Findings</a></p>` : "",
  ].filter(Boolean).join("") || `<p class="muted">To be filled in when the runs are in.</p>`;
  const priced = runs.filter((e) => e.spent != null);
  const spent = priced.length ? ` · ${esc(money(priced.reduce((a, e) => a + e.spent, 0)))} spent` : "";
  const progress = p.state === "todo"
    ? `<p class="muted">Not started.${plan ? ` Estimate ${esc(money(plan.estimate))}.` : ""}</p>`
    : `<p>${progressMeter(p)}</p><p class="small muted">${p.runs ?? recorded(runs).length} runs recorded${spent}${p.parts?.length ? ` · parts ${esc(p.parts.join(", "))}` : ""}${plan && p.state !== "done" ? ` · whole plan estimated at ${esc(money(plan.estimate))}` : ""}</p>`;
  const hypothesis = section("Hypothesis", `<p class="experiment-lead">${esc(x.hypothesis || "—")}</p>`);
  const outcome = (x.finding ? section("Finding", `<p class="experiment-lead">${esc(x.finding)}</p>`) : "") + section("Result", result);
  const setup = (x.reasoning ? section("Reasoning", `<p>${esc(x.reasoning)}</p>`) : "")
    + section("Expectations, as written", `<p>${ex.badge}</p><p>${esc(ex.text)}</p>`)
    + section("Design", `<p>${esc(x.question || "")}</p>${plan ? planTable(plan) : ""}${st ? `<h3 class="sub-h">Cases drawn per kind</h3>${cellTable(st)}<h3 class="sub-h">Blind review of the drawn cases</h3>${reviewBlock(st)}` : ""}`)
    + section("Progress", progress);
  const body = x.result ? outcome + hypothesis + setup : hypothesis + setup + outcome;
  return head + body + fold(`Runs <span class="count">${runs.length}</span>`, runsTable(runs), { cls: "quiet experiment-fold" });
}
