/* The page's entry module: the router, old-link redirects and boot. Fetches data/site.json, then
   routes. Each tab's pages live in pages/<tab>/. */

import { $, esc } from "./lib/dom.js?v=0cb80a196f";
import { wireTheme } from "./lib/theme.js?v=0cb80a196f";
import { setGlossary } from "./lib/tips.js?v=0cb80a196f";
import { leavePage, setRouter } from "./lib/view-state.js?v=0cb80a196f";
import { searchEntries } from "./data/search.js?v=0cb80a196f";
import { setSite, SITE } from "./data/site.js?v=0cb80a196f";
import { wirePalette } from "./components/palette.js?v=0cb80a196f";
import { pageOverview } from "./pages/overview/index.js?v=0cb80a196f";
import { pageSimulator } from "./pages/simulator/index.js?v=0cb80a196f";
import { pageHarness } from "./pages/harness/index.js?v=0cb80a196f";
import { pageExperiments } from "./pages/experiments/index.js?v=0cb80a196f";
import { pageCoverage } from "./pages/experiments/coverage.js?v=0cb80a196f";
import { pageReading } from "./pages/experiments/reading.js?v=0cb80a196f";
import { pageRuns } from "./pages/experiments/run-log.js?v=0cb80a196f";
import { pageRun } from "./pages/runs/run.js?v=0cb80a196f";
import { pageAblation } from "./pages/runs/ablation.js?v=0cb80a196f";
import { pageFindings } from "./pages/findings/index.js?v=0cb80a196f";
import { pageNotes } from "./pages/notes/index.js?v=0cb80a196f";
import { pagePaper } from "./pages/paper/index.js?v=0cb80a196f";

/* ---------- Old links ----------
   Old path -> new path. A key ending in /* also matches everything under it, and the rest of the
   old path replaces * in the new one. {split} is the old link's ?split= (default dev); ?build=
   becomes ?version=. The longest matching key wins. */
const MOVED = {
  "method/*": "",
  "method/simulator/*": "simulator/overview/*",
  "method/cases/*": "simulator/overview/*",
  "method/harness/*": "harness/overview/*",
  "method/protocol/*": "harness/overview/*",
  "method/results/*": "reading",
  "method/evaluation/*": "reading",
  "method/prompts/*": "harness/prompts",
  "method/glossary/*": "notes/glossary",
  "data": "simulator/sets",
  "data/*": "simulator/*",
  "data/claims/*": "simulator/claims",
  "data/secrets/*": "simulator/secrets",
  "data/coverage/*": "coverage",
  "data/simulator/*": "simulator/sets",
  "data/generators/*": "simulator/claims",
  "data/generators/secrets/*": "simulator/secrets",
  "data/archive/*": "simulator/sets",
  "data/archive/secrets/*": "simulator/secrets",
  "data/pipeline/*": "simulator/overview/*",
  "data/blueprints/*": "simulator/sets",
  "data/cases/*": "simulator/benchmark-{split}/cases/*",
  "data/scenarios/*": "simulator/benchmark-{split}/cases/*",
  "data/composition/*": "simulator/benchmark-{split}/composition",
  "data/checks/*": "simulator/benchmark-{split}/checks",
  "benchmark/*": "simulator/benchmark-{split}/cases",
  "benchmark/cases/*": "simulator/benchmark-{split}/cases/*",
  "benchmark/scenarios/*": "simulator/benchmark-{split}/cases/*",
  "benchmark/composition/*": "simulator/benchmark-{split}/composition",
  "benchmark/checks/*": "simulator/benchmark-{split}/checks",
  "benchmark/blueprints/*": "simulator/sets",
  "benchmark/secrets/*": "simulator/secrets",
  "scenarios/*": "simulator/benchmark-dev/cases/*",
  "simulator/platform/*": "notes/design",
  "simulator/studies/*": "experiments/*",
  "simulator/explore/*": "simulator/sets",
  "notes/findings/*": "findings/*",
  "notes/protocol/*": "harness/overview/*",
  "notes/pipeline/*": "simulator/overview/*",
  "notes/timeline/*": "notes/decisions",
  "results/*": "findings",
  "results/experiments/*": "experiments/*",
  "results/studies/*": "experiments/*",
  "results/findings/*": "findings/*",
  "findings/q-e1": "findings/a-cost",
  "findings/q-e2": "findings/a-predict",
  "findings/q-h1": "findings/a-leak",
  "findings/q-h2": "findings/a-adversary",
  "findings/q-h3": "findings/a-adversary",
  "findings/q-h4": "findings/a-adversary",
};

/* Where an old link points, or null. `path` is the hash path without "#/"; `q` its query. */
function movedTo(path, q) {
  let best = null;
  for (const [from, to] of Object.entries(MOVED)) {
    const prefix = from.endsWith("/*") ? from.slice(0, -2) : null;
    const tail = prefix == null ? (path === from ? "" : null)
      : path === prefix ? "" : path.startsWith(`${prefix}/`) ? path.slice(prefix.length + 1) : null;
    if (tail != null && (!best || (prefix ?? from).length > best.length)) best = { length: (prefix ?? from).length, to, tail };
  }
  if (!best) return null;
  const split = q.get("split") || "dev";
  if (q.has("build")) q.set("version", q.get("build"));
  q.delete("split"); q.delete("build");
  const target = best.to.replace("{split}", split).replace("*", best.tail).replace(/\/$/, "");
  const s = q.toString();
  return `#/${target}${s ? `?${s}` : ""}`;
}

/* ---------- Router ---------- */

const NAV = { "": "overview", simulator: "simulator", harness: "harness", findings: "findings", experiments: "experiments", runs: "experiments", run: "experiments", ablation: "experiments", coverage: "experiments", reading: "experiments", notes: "notes", paper: "paper" };

let shown = null; // the page on screen, so the router knows when the reader leaves it

function route() {
  if (!SITE) return; // still loading; the fetch below routes when it lands
  const hash = location.hash || "#/";
  const path = hash.split("?")[0].replace(/^#\/?/, "").replace(/\/$/, ""); // "#runs" reads as "#/runs"; a page may keep its view in the query
  const query = new URLSearchParams(hash.includes("?") ? hash.slice(hash.indexOf("?") + 1) : "");
  const to = movedTo(path, query); // old links keep working
  if (to) { location.replace(to); return; }
  const [page = "", ...rest] = path.split("/");
  const arg = rest.join("/");
  if (page !== shown) { leavePage(); shown = page; }
  document.querySelectorAll("[data-nav], [data-sub]").forEach((a) => a.toggleAttribute("aria-current", false));
  document.querySelector(`[data-nav="${NAV[page]}"]`)?.setAttribute("aria-current", "page");
  // The sidebar's sub-links: a page of its own (runs), or a section's first level (simulator/sets).
  const sub = page === "simulator" && rest[0] ? `simulator/${rest[0]}` : page;
  document.querySelector(`[data-sub="${sub}"]`)?.setAttribute("aria-current", "page");
  const paperLink = document.querySelector('[data-nav="paper"]');
  if (paperLink) paperLink.hidden = !paperWritten() && page !== "paper"; // shown once there's a draft to read
  const name = decodeURIComponent(arg);
  if (page === "run") { const [runName, tab = ""] = name.split("/"); pageRun(runName, tab); }
  else if (page === "ablation") pageAblation(name);
  else if (page === "findings") pageFindings(name);
  else if (page === "experiments") pageExperiments(arg);
  else if (page === "simulator") pageSimulator(arg);
  else if (page === "harness") pageHarness(arg);
  else if (page === "coverage") pageCoverage();
  else if (page === "reading") pageReading();
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

/* ---------- Boot ---------- */

setRouter(route);
wireTheme($("theme-btn"), route);
wirePalette($("search-btn"), searchEntries);
// To the top first, so a page that opens at a section (#/notes/findings/<heading>) can scroll to it.
window.addEventListener("hashchange", () => { window.scrollTo(0, 0); route(); });

$("view").innerHTML = `<p class="empty">Loading…</p>`;
fetch("data/site.json", { cache: "no-cache" })
  .then((r) => { if (!r.ok) throw new Error(`site.json: HTTP ${r.status}`); return r.json(); })
  .then((site) => {
    setSite({ builds: [], runs: [], ablations: [], ledger: [], notes: [], direction: null, ...site });
    setGlossary(SITE.glossary, SITE.constants);
    route();
  })
  .catch((err) => {
    $("view").innerHTML = `<p class="empty">Could not load data/site.json (${esc(err.message)}). </p>`;
  });
