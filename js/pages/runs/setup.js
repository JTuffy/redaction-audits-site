/* A run's setup, fixed before it ran: its data, advocate, policies, cases and judge setup, then the
   model each role used and the tokens each model spent. */

import { esc } from "../../lib/dom.js?v=863af23878";
import { kTokens } from "../../lib/format.js?v=863af23878";
import { CONDITION, ROLE, ROLES } from "../../lib/labels.js?v=863af23878";
import { term } from "../../lib/tips.js?v=863af23878";
import { policyName, stanceName } from "../../data/constants.js?v=863af23878";
import { datasetHref, datasetOfVersion, versionOf } from "../../data/datasets.js?v=863af23878";
import { fields } from "../../components/blocks.js?v=863af23878";

/* A run's dataset, linked: its name, and the version it read when that isn't the current one. */
function dataLink(c) {
  const v = versionOf(c.data);
  const d = datasetOfVersion(v, c.split || "dev");
  if (!d) return esc(c.data);
  const href = datasetHref(d, "cases", { version: v === d.current ? null : v });
  return `<a href="${href}">${esc(d.title)}</a> <span class="mono faint">${esc(v)}</span>`;
}

/* The models each role used, and the tokens each model spent. */
function protocol(e) {
  const c = e?.config || {};
  const models = c.models || {};
  const reasoning = c.reasoning || {};
  const used = e?.kind === "ablation" ? ["judge"] : ROLES; // an ablation only asks the judge
  const roles = used.filter((r) => models[r]).map((r) => [term(r, ROLE[r]), `${esc(models[r].split("/").pop())} <span class="faint">${esc(reasoning[r] || "")}</span>`]);
  const tokens = Object.entries(c.tokens || {}).map(([m, t]) =>
    [`Tokens · ${esc(m.split("/").pop())}`, `${kTokens((t.input_tokens || 0) + (t.output_tokens || 0))} <span class="faint">${kTokens(t.input_tokens || 0)} in · ${kTokens(t.output_tokens || 0)} out</span>`]);
  const cells = [...roles, ...tokens];
  return cells.length ? fields(cells) : "";
}

export function setupGrid(e) {
  const c = e?.config || {};
  const cells = [];
  const add = (k, v) => { if (v != null && v !== "" && !(Array.isArray(v) && !v.length)) cells.push([k, esc(Array.isArray(v) ? v.join(", ") : v)]); };
  if (c.data) cells.push(["Dataset", dataLink(c)]);
  add("Split", c.split);
  if (e?.stance) add("Advocate", stanceName(e.stance));
  if (c.policies) add("Policies", c.policies.map(policyName));
  if (c.conditions) add("Display conditions", c.conditions.map((x) => CONDITION[x] || x));
  add("Cases", c.sample_ids?.length ? `${c.sample_ids.length} chosen` : c.limit ? `first ${c.limit}` : "all");
  add("Judge samples", c.judge_samples);
  const js = e?.judge_setup;
  if (js) cells.push([term("judge_setup", "Judge setup"), `<span class="mono">${esc(js.key)}</span>${js.uncertain ? ` <span class="faint">prompts uncertain</span>` : ""}`]);
  if (c.report_context != null) add("Report quotes context", c.report_context ? "yes" : "no");
  add("Quotes carry timestamps", c.report_timestamps ? "yes" : "no");
  if (c.cache_replies != null) add("Reply cache", c.cache_replies ? "on" : "off");
  return `<div class="setup">${cells.length ? fields(cells) : ""}${protocol(e)}</div>`;
}
