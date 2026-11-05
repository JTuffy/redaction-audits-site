/* The page's entry module: router, theme and boot. Imports every page, fetches data/site.json,
   then routes. Links from older layouts redirect (movedTo). */

import { $, datasetOfSet, datasets, esc, setRouter, setSite, SITE, systemDark } from "./core.js?v=2e746ab46e";
import { pageOverview } from "./direction.js?v=2e746ab46e";
import { NOTE_HOME, pageNotes } from "./notes.js?v=2e746ab46e";
import { pageAblation, pageRun, pageRuns } from "./runs.js?v=2e746ab46e";
import { pageDataTab } from "./data.js?v=2e746ab46e";
import { pageMethod } from "./method.js?v=2e746ab46e";
import { pageExperiments, pageFindings } from "./results.js?v=2e746ab46e";
import { pagePaper, stopPaper } from "./paper.js?v=2e746ab46e";

/* ---------- Router ---------- */

/* Where a link from an older layout now points, or null. `q` is the old link's query. */
const BENCH_PAGES = ["cases", "composition", "checks"];
function moved(path, q) {
  const s = q.toString();
  return `${path}${s ? `?${s}` : ""}`;
}
function fromBenchmark(arg, q) { // the Benchmark tab, or Data when it was the Benchmark (before 28 Oct)
  const [tab = "cases", ...rest] = arg.split("/");
  const page = tab === "scenarios" ? "cases" : tab;
  if (page === "blueprints" || page === "secrets") return page === "secrets" ? "#/data/secrets" : "#/data";
  const split = q.get("split") || "dev", build = q.get("build");
  q.delete("split"); q.delete("build");
  const d = datasets().find((x) => x.name === `benchmark-${split}`);
  if (build && d && build !== d.current) q.set("version", build);
  return moved(`#/data/benchmark-${split}/${BENCH_PAGES.includes(page) ? page : "cases"}${rest.length ? `/${rest.join("/")}` : ""}`, q);
}
function movedTo(page, arg, q) {
  const [first = "", ...rest] = arg.split("/");
  const tail = rest.length ? `/${rest.join("/")}` : "";
  if (page === "benchmark") return fromBenchmark(arg, q);
  if (page === "scenarios") return `#/data/benchmark-dev/cases/${arg}`;
  if (page === "data" && ["cases", "composition", "checks", "scenarios", "blueprints"].includes(first)) return fromBenchmark(arg, q);
  if (page === "data" && first === "simulator") return "#/data";
  // The archived findings' question anchors (q-e1 …) open the panel that answers that question now.
  const Q_PANEL = { "q-e1": "a-cost", "q-e2": "a-predict", "q-h1": "a-leak", "q-h2": "a-adversary", "q-h3": "a-adversary", "q-h4": "a-adversary" };
  if (page === "findings" && /^q-/.test(first)) return `#/findings/${Q_PANEL[first] || ""}`.replace(/\/$/, "");
  if (page === "data" && first === "generators") return rest[0] === "secrets" ? "#/data/secrets" : "#/data/claims"; // split 5 Nov
  if (page === "data" && first === "archive") return rest[0] === "secrets" ? "#/data/secrets" : "#/data";
  if (page === "data" && first === "pipeline") return `#/method/cases${tail}`;
  if (page === "simulator") {
    if (first === "platform") return "#/notes/design";
    if (first === "claims") return "#/data/claims";
    if (first === "studies") return `#/experiments${tail}`;
    if (first === "explore") {
      const d = datasetOfSet(q.get("set") || "") || datasets().find((x) => x.sim_key);
      q.delete("set");
      return d ? moved(`#/data/${d.name}/cases${tail}`, q) : "#/data";
    }
    return "#/data";
  }
  if (page === "notes" && NOTE_HOME[first]) return `${NOTE_HOME[first]}${tail}`;
  if (page === "notes" && first === "timeline") return "#/notes/decisions"; // the timeline was cut (2 Nov)
  if (page === "results") return first === "experiments" || first === "studies" ? `#/experiments${tail}` : `#/findings${first === "findings" ? tail : ""}`; // Results was split (2 Nov)
  return null;
}

/* ---------- Theme ---------- */

const THEMES = ["auto", "light", "dark"];
function themeChoice() { try { return localStorage.getItem("theme") || "auto"; } catch { return "auto"; } }
function applyTheme(choice) {
  if (choice === "auto") delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = choice;
  try { if (choice === "auto") localStorage.removeItem("theme"); else localStorage.setItem("theme", choice); } catch { /* private window */ }
  const b = $("theme-btn");
  if (b) b.textContent = `Theme: ${choice}`;
}
function wireTheme() {
  const b = $("theme-btn");
  if (!b) return;
  applyTheme(themeChoice());
  b.onclick = () => { applyTheme(THEMES[(THEMES.indexOf(themeChoice()) + 1) % THEMES.length]); if (SITE) route(); };
  systemDark.addEventListener("change", () => { if (themeChoice() === "auto" && SITE) route(); });
}
wireTheme();
setRouter(route);

function route() {
  if (!SITE) return; // still loading; the fetch below routes when it lands
  const hash = location.hash === "#runs" ? "#/runs" : location.hash || "#/";
  const path = hash.split("?")[0]; // a page may keep its view in the query (see sim.js)
  const [, page = "", arg = ""] = path.match(/^#\/([^/]*)\/?(.*)$/) || [];
  const query = new URLSearchParams(hash.includes("?") ? hash.slice(hash.indexOf("?") + 1) : "");
  const to = movedTo(page, arg, query); // old links keep working
  if (to) { location.replace(to); return; }
  const nav = { "": "overview", findings: "findings", experiments: "experiments", data: "data", method: "method", runs: "runs", run: "runs", ablation: "runs", notes: "notes", paper: "paper" }[page];
  stopPaper();
  document.querySelectorAll("[data-nav]").forEach((a) => a.toggleAttribute("aria-current", false));
  document.querySelector(`[data-nav="${nav}"]`)?.setAttribute("aria-current", "page");
  const paperLink = document.querySelector('[data-nav="paper"]');
  if (paperLink) paperLink.hidden = !paperWritten() && page !== "paper"; // shown once there's a draft to read
  const name = decodeURIComponent(arg);
  if (page === "run") {
    const [runName, tab = ""] = name.split("/");
    pageRun(runName, tab);
  }
  else if (page === "ablation") pageAblation(name);
  else if (page === "findings") pageFindings(decodeURIComponent(arg));
  else if (page === "experiments") pageExperiments(arg);
  else if (page === "data") pageDataTab(arg);
  else if (page === "method") pageMethod(arg);
  else if (page === "notes") pageNotes(name);
  else if (page === "paper") pagePaper();
  else if (page === "runs") pageRuns();
  else if (page === "") pageOverview();
  else notFound(hash);
}

/* The paper tab appears once a draft has some substance, not while it is an outline. */
const PAPER_WORDS = 500;
const paperWritten = () => (SITE.paper?.outline || []).reduce((n, s) => n + (s.words || 0), 0) >= PAPER_WORDS;

function notFound(hash) {
  $("view").innerHTML = `<div class="not-found"><h1>Nothing at this address</h1><p class="muted">${esc(hash)} isn't a page on this site; it may have moved. Try the <a href="#/">Overview</a>, <a href="#/findings">Findings</a> or <a href="#/experiments">Experiments</a>.</p></div>`;
}

// To the top first, so a page that opens at a section (#/notes/findings/<heading>) can scroll to it.
window.addEventListener("hashchange", () => { window.scrollTo(0, 0); route(); });

$("view").innerHTML = `<p class="empty">Loading…</p>`;
fetch("data/site.json", { cache: "no-cache" })
  .then((r) => { if (!r.ok) throw new Error(`site.json: HTTP ${r.status}`); return r.json(); })
  .then((site) => {
    setSite({ builds: [], runs: [], ablations: [], ledger: [], notes: [], decisions: [], direction: null, figures: [], ...site });
    route();
  })
  .catch((err) => {
    $("view").innerHTML = `<p class="empty">Could not load data/site.json (${esc(err.message)}). </p>`;
  });
