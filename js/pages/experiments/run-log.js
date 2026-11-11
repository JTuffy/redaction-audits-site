/* The run log (Experiments tab): every recorded run in one grid (AG Grid), searchable and
   exportable. Smoke batches and replaced runs are hidden unless asked for, or unless the link
   names them. */

import { $, esc } from "../../lib/dom.js?v=2275844be3";
import { kTokens, money, shortWhen, stampOf } from "../../lib/format.js?v=2275844be3";
import { SITE } from "../../data/site.js?v=2275844be3";
import { CONDITION } from "../../lib/labels.js?v=2275844be3";
import { loadGrid } from "../../lib/grid.js?v=2275844be3";
import { themeNow } from "../../lib/theme.js?v=2275844be3";
import { query, setQuery } from "../../lib/view-state.js?v=2275844be3";
import { policyName, stanceName } from "../../data/constants.js?v=2275844be3";
import { datasetOfVersion, versionOf } from "../../data/datasets.js?v=2275844be3";
import { experimentHref, experimentOf } from "../../data/experiments.js?v=2275844be3";
import { allRuns, runFlags, runHref, runJudge, runStatus, runType, shortCommit, tokensOf } from "../../data/runs.js?v=2275844be3";
import { experimentsHead } from "./head.js?v=2275844be3";

const COLUMNS = ["when", "experiment", "part", "dataset", "lab", "policies", "judge", "cases", "tokens", "spent", "type", "status", "commit", "version"];

function rowOf(e) {
  const c = e.config || {};
  return {
    href: runHref(e.name), when: stampOf(e.name) || "", day: shortWhen(e.name),
    experiment: experimentOf(e)?.id || "", part: e.part || "", type: runType(e),
    dataset: datasetOfVersion(c.data, c.split)?.name || "", version: versionOf(c.data).slice(0, 10),
    lab: (stanceName(e.stance) || ""), policies: (c.policies || []).map(policyName).join(", ") || (c.conditions || []).map((k) => CONDITION[k] || k).join(", "),
    judge: runJudge(e), cases: c.sample_ids?.length ?? c.limit ?? null, tokens: tokensOf(e) || null, spent: e.spent ?? null,
    commit: shortCommit(e), status: runFlags(e).join(", "),
  };
}

export function pageRuns() {
  const q = query();
  const named = (q.get("runs") || "").split(",").filter(Boolean); // a link to several runs (Findings, a set page)
  const showAll = q.get("all") === "1" || named.length > 0;
  const kept = allRuns().filter((e) => !named.length || named.includes(e.name));
  const rows = kept.filter((e) => showAll || !runStatus(e));
  const hidden = kept.length - rows.length;
  const total = allRuns().reduce((a, e) => a + tokensOf(e), 0);
  const spentOnRuns = allRuns().reduce((a, e) => a + (e.spent || 0), 0);
  const spentOnReviews = (SITE.spend || []).reduce((a, r) => a + (r.spent || 0), 0);
  const spent = spentOnRuns || spentOnReviews
    ? ` · ${money(spentOnRuns)} on runs${spentOnReviews ? `, ${money(spentOnReviews)} on blind reviews` : ""}`
    : "";
  const toolbar = `<div class="grid-bar"><input type="search" id="run-search" placeholder="Search runs" aria-label="Search runs">
    ${named.length ? `<span class="muted small">${named.length} chosen runs · <a href="#/runs">All runs</a></span>`
      : `<label class="small muted"><input type="checkbox" id="run-all" ${showAll ? "checked" : ""}> Show smoke batches and replaced runs${hidden ? ` (${hidden})` : ""}</label>`}
    <button type="button" class="link-btn" id="run-csv">Export CSV</button></div>`;
  $("view").innerHTML = experimentsHead("runs") + `<p class="small muted">${allRuns().length} runs · ${kTokens(total)} tokens${spent}</p>` + toolbar + `<div id="run-grid" class="run-grid"></div>`;
  $("run-all")?.addEventListener("change", (ev) => setQuery({ all: ev.target.checked ? "1" : null }));
  loadGrid().then((agGrid) => {
    const el = $("run-grid");
    if (!el) return;
    el.className = `run-grid ${themeNow() === "dark" ? "ag-theme-quartz-dark" : "ag-theme-quartz"}`;
    const link = (p) => (p.value ? `<a href="${experimentHref(p.value)}">${esc(p.value)}</a>` : "");
    const api = agGrid.createGrid(el, {
      rowData: rows.map(rowOf),
      columnDefs: [
        { field: "when", headerName: "Run at", sort: "desc", width: 150, valueFormatter: (p) => p.data.day, cellRenderer: (p) => `<a href="${p.data.href}">${esc(p.data.day)}</a>`, filter: false },
        { field: "experiment", headerName: "Experiment", cellRenderer: link, width: 190, filter: "agTextColumnFilter" },
        { field: "part", headerName: "Part", width: 76 },
        { field: "dataset", headerName: "Dataset", width: 190, filter: "agTextColumnFilter" },
        { field: "lab", headerName: "Lab", width: 150, filter: "agTextColumnFilter" },
        { field: "policies", headerName: "Policies", width: 230, filter: "agTextColumnFilter" },
        { field: "judge", headerName: "Judge", width: 110, filter: "agTextColumnFilter" },
        { field: "cases", headerName: "Cases", width: 88, type: "numericColumn", filter: "agNumberColumnFilter" },
        { field: "tokens", headerName: "Tokens", width: 100, type: "numericColumn", valueFormatter: (p) => (p.value ? kTokens(p.value) : "—") },
        { field: "spent", headerName: "Spent", width: 92, type: "numericColumn", valueFormatter: (p) => (p.value == null ? "—" : money(p.value)) },
        { field: "type", headerName: "Type", width: 130, filter: "agTextColumnFilter" },
        { field: "status", headerName: "Status", width: 130 },
        { field: "commit", headerName: "Commit", width: 96, cellClass: "mono" },
        { field: "version", headerName: "Data version", width: 120, cellClass: "mono", hide: true },
      ],
      defaultColDef: { sortable: true, resizable: true, filter: true, floatingFilter: false },
      rowHeight: 34, headerHeight: 36, animateRows: false,
      // A row opens its run on click, or on Enter once a cell has the focus (arrows move it).
      onRowClicked: (ev) => { if (ev.event?.target?.closest("a")) return; location.hash = ev.data.href; },
      onCellKeyDown: (ev) => { if (ev.event?.key === "Enter" && !ev.event.target.closest("a")) location.hash = ev.data.href; },
      getRowClass: (p) => (p.data.status ? "run-dim" : ""),
    });
    $("run-search").addEventListener("input", (ev) => api.setGridOption("quickFilterText", ev.target.value));
    $("run-csv").onclick = () => api.exportDataAsCsv({ fileName: "runs.csv", columnKeys: COLUMNS });
  }).catch(() => { const el = $("run-grid"); if (el) el.innerHTML = `<p class="empty">The run table couldn't load.</p>`; });
}
