/* A redaction run's page: its identity and setup; its reads right, unsure and wrong against the
   label and its secret guesses, per policy; the validator against its reads; the benchmark-era
   metrics, folded; judge scores (score-grid.js) and secret leakage by case. Or its cases tab (samples.js). */

import { $, esc } from "../../lib/dom.js?v=0cb80a196f";
import { f2, human, sceneName } from "../../lib/format.js?v=0cb80a196f";
import { LABELS } from "../../lib/labels.js?v=0cb80a196f";
import { dataTip, term, tipRows } from "../../lib/tips.js?v=0cb80a196f";
import { query, setQuery, state } from "../../lib/view-state.js?v=0cb80a196f";
import { blindGuess, clearedAt, flaggedAt, policyName, stanceName } from "../../data/constants.js?v=0cb80a196f";
import { datasetOfVersion } from "../../data/datasets.js?v=0cb80a196f";
import { leakageInvalid, ledgerEntry, p1Run, runHref, samplesOf } from "../../data/runs.js?v=0cb80a196f";
import { guessBar, readKey, readsCell } from "../../components/bars.js?v=0cb80a196f";
import { cell, fold, num, subnav, table } from "../../components/blocks.js?v=0cb80a196f";
import { keepScroll, wireBrowser } from "../../components/browser.js?v=0cb80a196f";
import { pageHead, section } from "../../components/page.js?v=0cb80a196f";
import { benchmarkFold } from "./benchmark.js?v=0cb80a196f";
import { runCrumbs, runFields, transcripts } from "./identity.js?v=0cb80a196f";
import { byCase, chosenCase, runPolicies, sampleBrowser, scorable, showPrompt } from "./samples.js?v=0cb80a196f";
import { scoreGrid, wireScoreGrid } from "./score-grid.js?v=0cb80a196f";
import { setupGrid } from "./setup.js?v=0cb80a196f";
import { validatorTable } from "./validator.js?v=0cb80a196f";

/* Where the dataset's evidence names several candidates for most secrets (its leakage check, set
   page), the judge can't tell which one is the secret until redaction removes the others and a
   surviving detail points at one, so the edited guess can beat the unedited one. */
const leakNote = (name) => (leakageInvalid(name)
  ? `<p class="muted small">Leakage isn't valid on this dataset: its evidence names several candidates for most secrets, so the judge can't tell which one is the secret until redaction removes the others and a surviving detail (a handle, a job slug) points at one. Its guess can then be surer after editing than before, so leakage here sits near 1 and isn't comparable with the benchmark's.</p>`
  : "");

/* The policies' rows that carry reads scored against the label (builds before them have none). */
const readRows = (r) => (r.table || []).filter((t) => t.reads_edited?.reads);

/* Right, unsure and wrong against the label per policy: the unedited reads, then the edited. */
function readsSection(r, e) {
  const rows = readRows(r);
  if (!rows.length) return "";
  const body = rows.map((t) => [term(t.policy, esc(policyName(t.policy))), num(t.n), readsCell(t.reads_unedited), readsCell(t.reads_edited)]);
  // Without the run's case file each case's mean read stands in for its reads.
  const means = (e.config?.judge_samples || 1) > 1 && rows.every((t) => t.reads_edited.reads === t.n);
  return section(term("read_outcome", "Reads against the label"),
    table(["Policy", num("Cases"), "Unedited", "Edited"], body, { cls: "left reads-table" })
    + readKey({ flagged: flaggedAt(), cleared: clearedAt(), extra: means ? "One read per case, its mean: this run's case file wasn't kept." : "" }));
}

/* The judge's mean probability on each secret's true value per policy, against the blind guess. */
function guessSection(r, name) {
  const rows = readRows(r).filter((t) => t.guess_edited != null);
  if (!rows.length) return "";
  const g = blindGuess();
  const body = rows.map((t) => [term(t.policy, esc(policyName(t.policy))), guessBar(t.guess_prior, g), guessBar(t.guess_unedited, g), guessBar(t.guess_edited, g)]);
  return section(term("secret_guess", "Secret guess"), leakNote(name)
    + table(["Policy", term("prior", "No evidence"), term("p_unedited", "Unedited"), "Edited"], body, { cls: "left reads-table" }),
  g != null ? `<span>tick: a blind guess, ${g}</span>` : "");
}

/* Each scored secret per case: its prior, unedited guess, and edited guess per policy, shaded by leakage. */
function secretsTable(r) {
  const pols = runPolicies(r);
  const leaks = (g, i) => pols.some((p) => (g.pol[p]?.secrets[i]?.leakage ?? 0) > 0);
  let last = null;
  const rows = byCase(r.samples).flatMap((g) => g.any.secrets.map((x, i) => [x, i])
    .filter(([x, i]) => scorable(x) && (state.allSecrets || leaks(g, i))).flatMap(([x, i]) => {
      const head = g.any.label !== last ? [{ group: LABELS[g.any.label] }] : [];
      last = g.any.label;
      const cells = pols.map((p) => {
        const s = g.pol[p];
        if (!s) return cell("—", "muted");
        const v = s.secrets[i], l = v.leakage ?? 0;
        return cell(f2(v.p_edited), "leak", `style="--l:${l.toFixed(2)}" ${dataTip(tipRows(policyName(p), [["p edited", f2(v.p_edited)], ["Leakage", f2(v.leakage)]]))}`);
      });
      return [...head, { cls: `link ${query().get("case") === g.id ? "sel" : ""}`, attrs: `data-id="${esc(g.id)}"`,
        cells: [cell(`<a href="${runHref(r.name, "cases", { case: g.id })}">${esc(sceneName(g.id))}</a>`, "mono-cell"), cell(esc(human(x.secret_type)), "left"), cell(esc(x.value), "mono-cell left"), f2(x.p_prior), f2(x.p_unedited), ...cells] }];
    }));
  return table(["Case", cell("Secret", "left"), cell("True value", "left"), term("prior", "Prior"), term("p_unedited", "Unedited"), ...pols.map((p) => term(p, esc(policyName(p))))],
    rows, { empty: "No secret leaked under any policy." });
}

function secretCounts(r) {
  const pols = runPolicies(r);
  let scored = 0, leakedRows = 0;
  for (const g of byCase(r.samples)) g.any.secrets.forEach((x, i) => {
    if (!scorable(x)) return;
    scored++;
    if (pols.some((p) => (g.pol[p]?.secrets[i]?.leakage ?? 0) > 0)) leakedRows++;
  });
  return { scored, leakedRows };
}

export function pageRun(name, tab = "") {
  const r = p1Run(name);
  const e = ledgerEntry(name) || { name, config: {} };
  const hasSamples = !!r?.cases?.length;
  const got = hasSamples ? samplesOf(r) : null; // null while the samples load; the page redraws
  const full = got?.samples ? { ...r, samples: got.samples } : null;
  const current = (tab === "samples" || tab === "cases") && hasSamples ? "cases" : "overview";
  const crumbs = runCrumbs(e, current === "cases" && full ? chosenCase(full) : null);
  const stance = e.stance;
  const ds = datasetOfVersion(e.config?.data, e.config?.split);
  const title = `${(stanceName(stance) || "Redaction run")}${ds ? ` · ${esc(ds.title)}` : ""}`;
  const head = `<div>${pageHead({ crumbs, title })}${runFields(e, r)}</div>`;
  const setup = fold("Full setup: protocol and models", setupGrid(e), { cls: "quiet writeup run-setup" });
  if (!r) {
    $("view").innerHTML = head + setup + `<p class="empty">This run's results aren't in this build of the site; they live with its logs on the machine that ran it.</p>`;
    return;
  }
  const tabs = hasSamples ? subnav([[runHref(name), "Overview", "overview"], [runHref(name, "cases"), "Cases", "cases"]], current, "Run", transcripts(name)) : "";
  const pending = got?.error ? `<p class="empty">Could not load ${esc(r.file)} (${esc(got.error)}).</p>` : `<p class="empty">Loading the run's cases…</p>`;
  let body;
  if (current === "cases") {
    body = full ? sampleBrowser(full) : pending;
  } else {
    const counts = full ? secretCounts(full) : null;
    const toggle = counts ? `<span>${counts.leakedRows} of ${counts.scored} leaked</span><button type="button" class="link-btn" id="all-secrets">${state.allSecrets ? "Show leaked only" : "Show all"}</button>` : "";
    const reads = readsSection(r, e);
    const guess = guessSection(r, name); // carries the leakage note when it shows
    const byCase = !hasSamples ? "" : full
      ? section("Judge score by case", scoreGrid()) + section("Secret leakage by case", (guess ? "" : leakNote(name)) + secretsTable(full), toggle)
      : section("By case", pending);
    body = setup + reads + guess
      + validatorTable(name)
      + benchmarkFold(r, !reads)
      + byCase;
  }
  const listBack = keepScroll("run-list"), keepY = window.scrollY, picking = !!$("run-list"); // picking a case redraws the page
  $("view").innerHTML = `${head}${tabs}${body}`;
  if (picking && $("run-list")) { listBack(); window.scrollTo(0, keepY); }
  const open = (id, p) => { location.hash = runHref(name, "cases", { case: id, policy: p }); };
  // A row opens its case on click; its first cell is the link keyboards and screen readers use.
  $("view").querySelectorAll("tr.link[data-id]").forEach((el) => { el.onclick = (ev) => { if (!ev.target.closest("a")) open(el.dataset.id, null); }; });
  if (full && current === "overview") wireScoreGrid(full);
  wireBrowser("run-list", (id) => setQuery({ case: id }));
  $("view").querySelectorAll("[data-p]").forEach((b) => { b.onclick = () => setQuery({ policy: b.dataset.p }); });
  $("view").querySelectorAll("[data-prompt]").forEach((b) => { b.onclick = () => showPrompt(b.dataset.prompt); });
  const t = $("all-secrets");
  if (t) t.onclick = () => { state.allSecrets = !state.allSecrets; pageRun(name, tab); };
}
