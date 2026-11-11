/* A run's judge scores by case as a grid (AG Grid): per policy the unedited and edited mean, the
   change, the same two scores on a 0–100 bar, and how the edited reads fare against the label.
   Sortable and filterable; it opens sorted by the largest change. */

import { $, esc } from "../../lib/dom.js?v=0cb80a196f";
import { caseName, sc, signed } from "../../lib/format.js?v=0cb80a196f";
import { loadGrid } from "../../lib/grid.js?v=0cb80a196f";
import { LABELS, READING } from "../../lib/labels.js?v=0cb80a196f";
import { themeNow } from "../../lib/theme.js?v=0cb80a196f";
import { policyName, scoreCut, wrongWayShift } from "../../data/constants.js?v=0cb80a196f";
import { simRunOf } from "../../data/datasets.js?v=0cb80a196f";
import { runHref } from "../../data/runs.js?v=0cb80a196f";
import { byCase, runPolicies } from "./samples.js?v=0cb80a196f";

const BAR = 120; // the bar's width in px
const AUTO_HEIGHT_ROWS = 40; // up to this many cases the grid is as tall as its rows

const at = (score) => 6 + ((BAR - 12) * score) / 100;

/* Unedited (hollow) and edited (filled) on one 0–100 line, with a tick at the verdict's cut. */
function bar(before, after) {
  if (before == null || after == null) return "";
  return `<svg viewBox="0 0 ${BAR} 14" width="${BAR}" height="14" aria-hidden="true"><line x1="6" x2="${BAR - 6}" y1="7" y2="7" class="score-grid"/>`
    + `<line x1="${at(scoreCut())}" x2="${at(scoreCut())}" y1="2" y2="12" class="score-grid"/><line x1="${at(before)}" x2="${at(after)}" y1="7" y2="7" class="score-line"/>`
    + `<circle cx="${at(before)}" cy="7" r="4" class="score-before"/><circle cx="${at(after)}" cy="7" r="4" class="score-after"/></svg>`;
}

function rowOf(r, group, policies, set) {
  const row = { id: group.id, href: runHref(r.name, "cases", { case: group.id }), name: caseName(group.id),
    label: LABELS[group.any.label], variant: set?.cases?.[group.id]?.variant || "" };
  for (const policy of policies) {
    const s = group.pol[policy];
    if (!s) continue;
    row[`${policy}_call`] = READING[set?.cases?.[group.id]?.reading?.[policy]] || "";
    row[`${policy}_before`] = s.judge_unedited;
    row[`${policy}_after`] = s.judge_edited;
    row[`${policy}_change`] = s.judge_edited - s.judge_unedited;
    row[`${policy}_outcome`] = s.outcomes?.judge_edited || "";
    // A change this large toward the wrong label is the damage the page is about: it shows in red.
    row[`${policy}_wrong_way`] = !!s.wrong_way && Math.abs(s.judge_edited - s.judge_unedited) >= wrongWayShift();
  }
  return row;
}

function policyColumns(policy, first, withCalls) {
  const score = { width: 96, type: "numericColumn", filter: "agNumberColumnFilter", valueFormatter: (p) => sc(p.value) };
  return { headerName: policyName(policy), children: [
    ...(withCalls ? [{ field: `${policy}_call`, headerName: "Validator", width: 126 }] : []),
    { ...score, field: `${policy}_before`, headerName: "Unedited" },
    { ...score, field: `${policy}_after`, headerName: "Edited" },
    { ...score, field: `${policy}_change`, headerName: "Change", valueFormatter: (p) => (p.value == null ? "—" : signed(p.value, 1)),
      comparator: (a, b) => Math.abs(a ?? 0) - Math.abs(b ?? 0), sort: first ? "desc" : null,
      cellClass: (p) => (p.data[`${policy}_wrong_way`] ? "read-wrong" : "") },
    { headerName: "0–100", width: BAR + 34, sortable: false, filter: false, cellRenderer: (p) => bar(p.data[`${policy}_before`], p.data[`${policy}_after`]) },
    { field: `${policy}_outcome`, headerName: "Edited reads", width: 124, cellClass: (p) => `read-${p.value}` },
  ] };
}

export const scoreGrid = () => `<div id="score-grid" class="run-grid score-grid"></div>`
  + `<p class="muted small">Violation score, 0 to 100, the mean of the judge's reads. On the bar the hollow dot is the unedited score, the filled dot the edited one, and the tick is ${scoreCut()}. A change in red moved toward the wrong label. Sorted by the largest change; click a heading to sort by it, and a row to open the case.</p>`;

/* Fill the grid `scoreGrid()` left on the page with the run's cases. */
export function wireScoreGrid(r) {
  if (!$("score-grid")) return;
  const policies = runPolicies(r), set = simRunOf(r.name)?.[0];
  const rows = byCase(r.samples).map((group) => rowOf(r, group, policies, set));
  const withCalls = rows.some((row) => policies.some((policy) => row[`${policy}_call`]));
  loadGrid().then((agGrid) => {
    const el = $("score-grid");
    if (!el || el.dataset.filled) return;
    el.dataset.filled = "1";
    el.className = `run-grid score-grid ${themeNow() === "dark" ? "ag-theme-quartz-dark" : "ag-theme-quartz"}`;
    agGrid.createGrid(el, {
      rowData: rows,
      columnDefs: [
        { field: "name", headerName: "Case", width: 110, pinned: "left", cellClass: "mono", cellRenderer: (p) => `<a href="${p.data.href}">${esc(p.value)}</a>` },
        { field: "label", headerName: "Label", width: 120 },
        { field: "variant", headerName: "What this variant changes", width: 260, hide: !rows.some((row) => row.variant) },
        ...policies.map((policy, i) => policyColumns(policy, i === 0, withCalls)),
      ],
      defaultColDef: { sortable: true, resizable: true, filter: "agTextColumnFilter" },
      domLayout: rows.length > AUTO_HEIGHT_ROWS ? "normal" : "autoHeight",
      rowHeight: 34, headerHeight: 36, animateRows: false,
      onRowClicked: (ev) => { if (!ev.event?.target?.closest("a")) location.hash = ev.data.href; },
      onCellKeyDown: (ev) => { if (ev.event?.key === "Enter" && !ev.event.target.closest("a")) location.hash = ev.data.href; },
    });
  }).catch(() => { const el = $("score-grid"); if (el) el.innerHTML = `<p class="empty">The score table couldn't load.</p>`; });
}
