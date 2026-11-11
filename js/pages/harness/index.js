/* The Harness tab: one trial and its settings, how it is scored, the guards on paid runs; the long
   write-up (docs/notes/protocol.md) folds underneath. Prompts are a sub-tab. */

import { $, esc } from "../../lib/dom.js?v=2275844be3";
import { term } from "../../lib/tips.js?v=2275844be3";
import { batchApi, blindGuess, clearedAt, defaultModels, flaggedAt, judgeName, judgeOrder, maxRetries, policyKeys, policyName, stanceKeys, stanceName } from "../../data/constants.js?v=2275844be3";
import { allRuns, runJudge } from "../../data/runs.js?v=2275844be3";
import { codeHref } from "../../data/links.js?v=2275844be3";
import { noteNamed } from "../../data/notes.js?v=2275844be3";
import { readKey } from "../../components/bars.js?v=2275844be3";
import { cards, flow, subnav, table } from "../../components/blocks.js?v=2275844be3";
import { writeUp } from "../../components/note.js?v=2275844be3";
import { pageHead, section } from "../../components/page.js?v=2275844be3";
import { prompts } from "./prompts.js?v=2275844be3";

const TABS = [["#/harness", "Overview", "overview"], ["#/harness/prompts", "Prompts", "prompts"]];

/* The judges recorded runs have read with, in display order, and the reads per question they used;
   `next` is every named judge no run has used yet (domain/roles.JUDGE_NAMES). */
function judgesUsed() {
  const runs = allRuns().filter((e) => e.config?.models?.judge);
  const used = new Set(runs.map((e) => runJudge(e)));
  const reads = runs.map((e) => e.config.judge_samples).filter((n) => n > 0);
  const lo = Math.min(...reads), hi = Math.max(...reads);
  const range = !reads.length ? "" : lo === hi ? `; ${lo} reads per question` : `; ${lo} to ${hi} reads per question`;
  const order = judgeOrder();
  const named = [...used].sort((a, b) => (order.indexOf(a) + 1 || 99) - (order.indexOf(b) + 1 || 99));
  return { now: named.length ? `${named.join(", ")}${range}` : "", next: order.filter((j) => !used.has(j)).join(", ") };
}

/* Each role's model for a new run, by role (the judge, the lab's advocate and executor, the
   integrity check and the blind reviewer), from the settings' defaults. */
function newRunModels() {
  const roles = [["judge", "judge"], ["advocate", "advocate"], ["executor", "executor"], ["integrity_check", "integrity check"], ["reviewer", "blind reviewer"]];
  const models = defaultModels();
  return roles.filter(([key]) => models[key]).map(([key, label]) => `${esc(label)}: ${esc(judgeName(models[key], models[key]))}`).join("; ");
}

/* The labs runs on current data have played (pilots included, smoke batches not), in the site's
   order. */
function labsUsed() {
  const used = new Set(allRuns().filter((e) => e.batch !== "smoke" && !e.archived).map((e) => e.stance));
  return stanceKeys().filter((s) => used.has(s)).map((s) => stanceName(s).toLowerCase());
}

function overview(anchor) {
  const w = writeUp(noteNamed("protocol"), { base: "#/harness/overview", anchor, link: codeHref });
  const judges = judgesUsed();
  const guess = blindGuess();
  const html = section("One trial", flow([
    ["Report", "An auditor quotes the log lines that matter for the claim.", ""],
    ["Advocate", `The lab's ${term("advocate", "advocate")} asks for edits, honestly or as an attack.`, ""],
    ["Executor", `An ${term("executor", "executor")} grants, rewrites or denies each edit. Under self-redaction there is none.`, ""],
    ["Judge", `A ${term("judge", "judge")} reads only the claim and the edited quotes: how likely a violation is, and a guess at each secret.`, ""],
    ["Record", "Every read, edit and setting is saved with the commit it ran at.", "research/runs/ledger.jsonl"],
  ]))
    + section("What an experiment sets", table(["Setting", "Options now", "Next"], [
      ["Redaction policy", policyKeys().map((p) => term(p, policyName(p).replace(/^Text (?=pseudonyms|generalize)/, "").toLowerCase())).join(", "), ""],
      ["Lab", esc(labsUsed().join(", ")), "a model advocate willing to play a bad-faith lab"],
      ["Executor", "with one (contextual rewrite) or without (self-redaction)", ""],
      ["Judge", esc(judges.now), esc(judges.next)],
      ["Prompts", "one template per role; one variant for the secrets question", "variants for every role, chosen per experiment"],
      ["Data", "any set, pinned to a version", ""],
      ["Models", newRunModels(), "a plan that must match recorded runs names their models"],
      ["Calls", batchApi() ? "through the providers' batch APIs: half price, slower replies" : "one at a time, at list price", ""],
    ], { cls: "left labelled" }))
    + section("Scoring", cards([
      [term("read_outcome", "Verdict"), "Each read is right, unsure or wrong against the label (below)."],
      [term("secret_guess", "Secret guess"), `The judge's probability on a secret's true value. ${guess != null ? `A blind guess gets ${+guess.toFixed(3)}; ` : ""}1.00 is certain. Reported per secret tier.`],
      ["Validator call", "Decidable, can't decide or may mislead, from each case's proof. What the reads are compared with."],
    ]) + readKey({ flagged: flaggedAt(), cleared: clearedAt() }))
    + `<p class="lede">Scores are computed from the recorded runs without calling a model, so a changed measure rescores every past run for free. Run pages also show AUROC, persistence and error rates; see the <a href="#/notes/glossary">glossary</a>.</p>`
    + section("Guards on every paid run", cards([
      ["Budget", "A run needs an estimate under its budget before it spends anything."],
      ["Model check", "Every model answers one tiny call first, or the run stops."],
      ["Retries", `Capped at ${maxRetries()} per call, so a dead balance stops a run in minutes.`],
      ["Committed code", "A run won't start from uncommitted changes, so its record names the code that ran."],
      ["No repeats", "Running a plan again launches only the sets it has no recorded run on."],
    ]))
    + (w ? w.html : "");
  return { html, scroll: w ? w.scroll : () => {} };
}

export function pageHarness(arg) {
  const [first = "overview", ...rest] = String(arg || "").split("/").map(decodeURIComponent);
  const current = TABS.some(([, , k]) => k === first) ? first : "overview";
  const head = `<div>${pageHead({ title: "Harness" })}${subnav(TABS, current, "Harness")}</div>`;
  if (current === "prompts") { $("view").innerHTML = head + prompts(); return; }
  const view = overview(rest[0]);
  $("view").innerHTML = head + view.html;
  view.scroll();
}
