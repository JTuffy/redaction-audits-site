/* A judge-only run's page: a marker ablation (how removed values are shown), a judge-only
   separability run, or a re-ask (judge noise). Mean scores per group, then each case's scores
   shaded by their shift from unedited. */

import { $, esc } from "../../lib/dom.js?v=0cb80a196f";
import { f0, mean, sc, sceneName, sd, signed } from "../../lib/format.js?v=0cb80a196f";
import { CONDITION, CONDITIONS, LABELS } from "../../lib/labels.js?v=0cb80a196f";
import { dataTip, term, tipRows } from "../../lib/tips.js?v=0cb80a196f";
import { rankCase } from "../../data/constants.js?v=0cb80a196f";
import { ablationRun, caseHref, ledgerEntry, linkRunNames, runType, samplesOf } from "../../data/runs.js?v=0cb80a196f";
import { SITE } from "../../data/site.js?v=0cb80a196f";
import { cell, table } from "../../components/blocks.js?v=0cb80a196f";
import { pageHead, section } from "../../components/page.js?v=0cb80a196f";
import { runCrumbs, subLine } from "./identity.js?v=0cb80a196f";
import { setupGrid } from "./setup.js?v=0cb80a196f";
import { validatorTable } from "./validator.js?v=0cb80a196f";

const groupOf = (row) => (row.label === "red_herring" ? `red_herring:${row.difficulty}` : row.label);
const GROUPS = [["violation", "Violation"], ["red_herring:easy", "Red herring · easy"], ["red_herring:medium", "Red herring · medium"], ["red_herring:hard", "Red herring · hard"], ["clean", "Clean"]];
const groupName = (k, label) => (k.startsWith("red_herring") ? term("red_herring", label) : label);

export function pageAblation(name) {
  const r = ablationRun(name);
  const e = ledgerEntry(name) || { name, config: {} };
  const crumbs = runCrumbs(e);
  const conds = CONDITIONS.filter((c) => r?.conditions.includes(c));
  const reask = runType(e) === "Re-ask";
  const judgeOnly = runType(e) === "Judge only";
  const title = reask ? term("kind_reask", "Judge re-ask") : judgeOnly ? term("kind_judge", "Judge only") : term("kind_ablation", "Marker ablation");
  const n = r?.cases.length;
  const head = pageHead({ crumbs, title, sub: subLine(e, [`<span>${esc(e.config?.split || "dev")}</span>`, n ? `<span>${n} cases</span>` : ""]), purpose: e.purpose ? linkRunNames(esc(e.purpose)) : "" });
  const inputs = (fixed) => `<div class="io io-in">${section("Inputs", setupGrid(e), `<span>fixed before the run: ${fixed}</span>`)}</div>`;
  if (!r) { // recorded in the ledger, but its results and logs aren't in this build of the site
    $("view").innerHTML = head + inputs("data build, protocol, models")
      + validatorTable(name) + `<p class="empty">This run's results aren't in this build of the site (they live with its logs, on the machine that ran it).</p>`;
    return;
  }

  // The base is this run's unedited score, or for a re-ask, the latest full ablation's unedited
  // score on the same split.
  const split = (a) => a.name.split("-")[1];
  const others = SITE.ablations.filter((a) => a.name !== name && split(a) === split(r));
  const fullRun = others.find((a) => a.conditions.includes("marker"));
  const baseRun = reask ? fullRun : r;
  const reaskRuns = others.filter((a) => a.name !== baseRun?.name && a.conditions.every((c) => c === "unedited"));
  const noiseCol = !reask && reaskRuns.length;
  const loaded = [r, baseRun, ...(noiseCol ? reaskRuns : [])].filter(Boolean).map((a) => [a, samplesOf(a)]);
  const failed = loaded.find(([, got]) => got?.error);
  if (failed || loaded.some(([, got]) => !got)) {
    $("view").innerHTML = head + inputs("data build, conditions, judge")
      + `<p class="empty">${failed ? `Could not load ${esc(failed[0].file)} (${esc(failed[1].error)}).` : "Loading the run's scores…"}</p>`;
    return;
  }
  const samples = (a) => loaded.find(([x]) => x === a)?.[1].samples || [];
  const scores = samples(r);
  const base = Object.fromEntries(samples(baseRun).filter((s) => s.condition === "unedited").map((s) => [s.scenario_id, s.score]));
  const shiftsFor = (xs) => xs.filter((s) => s.scenario_id in base).map((s) => s.score - base[s.scenario_id]);
  const cols = reask ? ["unedited"] : conds;
  const colHead = (c) => (reask ? "Re-ask" : term(c, CONDITION[c]));

  const groupRows = GROUPS.map(([key, label]) => {
    const rows = scores.filter((s) => groupOf(s) === key);
    if (!rows.length) return null;
    const ids = new Set(rows.map((s) => s.scenario_id));
    const cells = cols.map((c) => {
      const these = rows.filter((s) => s.condition === c);
      const m = mean(these.map((s) => s.score));
      if (c === "unedited" && !reask) return f0(m);
      return `${f0(m)}<span class="delta">${signed(mean(shiftsFor(these)), 1)}</span>`;
    });
    const ns = noiseCol ? reaskRuns.flatMap((a) => shiftsFor(samples(a).filter((s) => ids.has(s.scenario_id)))) : [];
    return [groupName(key, label), ids.size, ...cells, ...(noiseCol ? [`${signed(mean(ns), 1)}<span class="delta">± ${f0(sd(ns))}</span>`] : [])];
  }).filter(Boolean);
  const means = table(["Group", "n", ...cols.map(colHead), ...(noiseCol ? [term("reask_noise", "Re-ask noise")] : [])], groupRows);

  // Per-case matrix: score per condition, shaded by shift from unedited.
  const ids = r.cases
    .map((id) => scores.find((s) => s.scenario_id === id))
    .sort((a, b) => rankCase(a) - rankCase(b) || a.scenario_id.localeCompare(b.scenario_id));
  let last = null;
  const matrix = ids.flatMap((any) => {
    const groupHead = any.label !== last ? [{ group: LABELS[any.label] }] : [];
    last = any.label;
    const b = base[any.scenario_id];
    const cells = cols.map((c) => {
      const s = scores.find((x) => x.scenario_id === any.scenario_id && x.condition === c);
      if (!s) return cell("—", "muted");
      if (c === "unedited" && !reask) return sc(s.score);
      const d = b == null ? 0 : s.score - b;
      const tip = tipRows(`${sceneName(any.scenario_id)} · ${reask ? "Re-ask" : CONDITION[c]}`, [["Unedited", sc(b)], ["This condition", sc(s.score)], ["Change", signed(d)]]);
      return cell(sc(s.score), d > 0 ? "shift-up" : d < 0 ? "shift-down" : "", `style="--s:${Math.min(1, Math.abs(d) / 50).toFixed(2)}" ${dataTip(tip)}`);
    });
    const href = caseHref(e, any.scenario_id);
    const caseName = esc(sceneName(any.scenario_id));
    return [...groupHead, [cell(href ? `<a href="${href}">${caseName}</a>` : caseName, "mono-cell"), cell(any.difficulty || "", "muted"), ...cells]];
  });
  const byCase = table(["Case", cell("", "left"), ...cols.map(colHead)], matrix);

  $("view").innerHTML = head
    + `<div class="io io-in">${section("Inputs", setupGrid(e), `<span>fixed before the run: data build, conditions, judge</span>`)}</div>`
    + `<div class="io io-out">${section("Results · mean judge score", means, reask ? `<span>shift vs ${esc(baseRun?.name || "—")}</span>` : `<span>shift vs unedited</span>`)}`
    + section("By case", byCase, `<span>shaded by shift from unedited</span>`) + `</div>`;
}
