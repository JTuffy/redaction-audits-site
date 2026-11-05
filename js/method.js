/* Method, in two halves: making the cases (the simulator) and running an audit on them (the
   protocol, and the prompt each model is given). How it works opens with both; the glossary
   defines the terms the results use. */

import { $, datasets, esc, pageHead, section, SITE, term, TIPS } from "./core.js?v=2e746ab46e";
import { workedExample } from "./sim.js?v=2e746ab46e";
import { noteArticle, notePages } from "./notes.js?v=2e746ab46e";

const TABS = [["how", "How it works"], ["cases", "Making cases"], ["protocol", "Running an audit"], ["prompts", "Prompts"], ["glossary", "Glossary"]];
const TAB_NOTE = {
  cases: "The simulator: how a case and its proof are generated, checked and frozen into a set.",
  protocol: "What happens to one case in an experiment: who edits the evidence, under which rules, and how the judge's reads become numbers.",
  prompts: "What each model is told, in the order a trial uses them. Placeholders such as $claim are filled per case.",
};

/* The prompts, grouped by the model that receives them, in the order a trial runs. */
const PROMPT_GROUPS = [
  ["The lab's advocate", "Reads the auditor's report and asks for redactions. Its message is the base prompt, one stance, and the process it works under.", [
    ["advocate", "Base prompt: who it represents, what is confidential, the report."],
    ["stance_honest", "Honest lab: protect legitimate secrets, never misstate facts."],
    ["stance_red_team", "Red team: an authorized exercise to make the evidence less conclusive."],
    ["stance_cover_up", "Cover-up: protect the lab as far as the process allows (archived; the model refused)."],
    ["process_executor", "With an executor: requests are ruled on under the rules."],
    ["process_self", "Without one (self-redaction): requests are applied as written."],
  ]],
  ["The executor", "Rules on each request: grant, rewrite or deny. Only under contextual rewrite.", [
    ["executor", "Its instructions."],
    ["rules", "The rules it applies, also shown to the advocate."],
  ]],
  ["The judge", "Sees only the claim and the edited quotes. Asked twice per case: the verdict, and each secret.", [
    ["judge_violation", "How likely is a violation, 0–100, with a reason."],
    ["judge_secrets", "A probability for every option of each secret."],
    ["judge_secrets_careful", "The same, told to look for indirect traces (one archived experiment)."],
    ["context_evidence", "Context for the secrets question: the evidence it read."],
    ["context_prior", "Context for the blind guess: no evidence at all."],
  ]],
  ["Checks", "", [
    ["integrity_check", "Did editing change what the finding concludes? (Benchmark runs.)"],
    ["retry", "Sent once when a reply can't be parsed."],
  ]],
];
function prompts() {
  const all = SITE.prompts || {};
  if (!Object.keys(all).length) return `<p class="empty">No prompts in this build.</p>`;
  const one = ([name, what]) => (all[name] ? `<details class="prompt-file"><summary><span class="mono">${esc(name)}</span> <span class="muted">${esc(what)}</span></summary><pre class="prompt">${esc(all[name])}</pre></details>` : "");
  const listed = new Set(PROMPT_GROUPS.flatMap(([, , xs]) => xs.map(([n]) => n)));
  const rest = Object.keys(all).filter((n) => !listed.has(n)).map((n) => [n, ""]);
  return PROMPT_GROUPS.map(([title, about, xs]) => section(title, `${about ? `<p class="muted small">${esc(about)}</p>` : ""}${xs.map(one).join("")}`)).join("")
    + (rest.length ? section("Other", rest.map(one).join("")) : "")
    + `<p class="small faint">From <code>escalation/prompts/</code> at the commit this site was built from; a run used the prompts at its own commit.</p>`;
}

Object.assign(TIPS, {
  claim_shape: ["A sentence a lab's records can break, such as \"no deploy switches the safety classifier off unless the endpoint's team lead approved it first\". Its rule file says which records it reads and what makes each case a violation."],
  permission: ["A claim broken unless a record excuses the action (an approval, a passing evaluation). Redaction can fake an excuse for a violation, or hide a red herring's real one."],
  prohibition: ["A claim broken only when a record convicts the action (an opt-out by this customer before the run). Redaction can fake a conviction for an innocent lab, or hide a real one."],
});

/* How it works, for a reader new to the project: how a simulated case is made (and why its
   label can be trusted), how a filter is tested against the checker's prediction, then one real
   case walked through. Counts are live; the archived benchmark gets one line. */
function howItWorks() {
  const cur = (d) => d.versions.find((v) => v.version === d.current) || {};
  const sims = datasets().filter((d) => d.source === "simulator-rules" && d.status === "current");
  const simCases = sims.reduce((n, d) => n + (cur(d).cases || 0), 0);
  const benchCases = datasets().filter((d) => d.source === "benchmark").reduce((n, d) => n + (cur(d).cases || 0), 0);
  const claims = SITE.claims || [];
  const shapes = (k) => claims.filter((c) => c.shape === k).length;
  const sets = (SITE.sim || []).filter((b) => sims.some((d) => d.sim_key === b.key));
  const auto = ["Families clean", "No shortcuts", "Secrets planted as designed"];
  const autoPass = sets.filter((b) => auto.every((t) => b.gates.find((g) => g.title === t)?.status === "pass")).length;
  const step = ([title, body, fact]) => `<li class="how-step"><h3>${title}</h3><p>${body}</p>${fact ? `<p class="how-fact">${fact}</p>` : ""}</li>`;
  const lane = (n, title, sub, more, steps) => `<div class="how-lane"><div class="how-lanehead"><span class="how-n">${n}</span><h3>${title}</h3><p class="muted small">${sub} <a href="${more}">More</a></p></div><ol class="how-steps">${steps.map(step).join("")}</ol></div>`;
  const make = lane("A", "Make a case whose answer is known", "Everything here is code: no model writes or labels a case.", "#/method/cases", [
    ["Draw a world", `A fictional lab's records: deploys, change requests, training runs, opt-outs, an org chart, plus background noise. The hard sets have 110 to 180 log lines per case.`, ""],
    ["A rule file decides the label", `Each audit ${term("claim_shape", "claim")} is a rule file. Run on the world, it gives the label (violation, ${term("red_herring", "red herring")} or clean) and its proof: the chain of connections between log lines the verdict rests on.`,
      `<a href="#/data/claims">${claims.length} claims</a>: ${shapes("permission")} ${term("permission", "permission")}, ${shapes("prohibition")} ${term("prohibition", "prohibition")}`],
    ["A second checker must agree", "An independent checker, written by hand, labels every case again. Any disagreement stops the build.", ""],
    ["Quality gates, then freeze", `Families differ by one fact, nothing on the surface gives the label away, secrets are planted as designed, and a blind model reviewer must read the label right. Passing sets are frozen under a version hash.`,
      `<a href="#/data">${simCases.toLocaleString()} cases in ${sims.length} sets</a> · ${autoPass} of ${sets.length} pass every automated gate · human label audit pending`],
  ]);
  const test = lane("B", "Test a filter against a prediction", "The checker predicts; a model is only used to test the prediction.", "#/method/protocol", [
    ["A filter edits the evidence", `The auditor quotes the lines that matter; a ${term("policies_all", "redaction policy")} edits them. ${term("text_redaction", "Text redaction")} swaps each secret for a type marker; ${term("text_pseudonym", "pseudonyms")} swap each for a consistent fake name.`, `<a href="#/method/protocol">All five policies</a>`],
    ["The checker reads the proof", `For each connection in the proof it asks: does the edit keep it, cut it, or make two different things look the same? So each case is ${term("read_decidable", "<i>decidable</i>")}, ${term("read_cant_decide", "<i>can't decide</i>")} or ${term("read_may_mislead", "<i>may mislead</i>")}, and for the last, which way.`, ""],
    ["A judge reads blind", `A ${term("judge", "judge")} model sees only the claim and the edited quotes, never the rules or the label, and scores how likely a violation is, 0–100, three to five times.`, "Terra (GPT-5.6), Haiku 5.5, GPT-5-mini"],
    ["Compare", "Did the score move where the checker said, and the way it said? The prediction test draws 24 cases per kind of case by the checker's call alone, before any judge reads them.", `<a href="#/findings">The result, on Findings</a>`],
  ]);
  return section("How it works", `<div class="how-lanes">${make}${test}</div>`)
    + section("A worked example", `<div class="panel ex">${workedExample()}</div>`)
    + (benchCases ? `<p class="small faint how-archive">Before the simulator, a benchmark of ${benchCases} cases built from hand-written blueprints gave the first results. It is archived: its labels have no proof for a checker to read, its numbers are preliminary, and <a href="#/findings">Findings</a> folds them away.</p>` : "");
}

/* The terms the results use, defined once; the same text shows on hover wherever they appear. */
const GLOSSARY = [
  ["Cases", ["disjoint", "entangled", "red_herring", "skeleton", "hard_set", "calibration_set", "cell"]],
  ["Policies", ["text_redaction", "text_pseudonym", "text_generalize", "contextual_rewrite", "self_redaction", "marker"]],
  ["Roles and labs", ["advocate", "executor", "judge", "terra", "stance", "link_break", "evidence_removal"]],
  ["Measures", ["persistence", "leakage", "auroc_unedited", "fpr", "fnr", "wrong_way", "checker"]],
  ["Runs", ["kind_p1", "kind_ablation", "kind_judge", "kind_reask", "smoke", "written_first", "judge_setup"]],
];
const NAMES = {
  disjoint: "Disjoint", entangled: "Entangled", red_herring: "Red herring", skeleton: "Skeleton", hard_set: "Hard set", calibration_set: "Calibration set", cell: "Cell",
  text_redaction: "Text redaction", text_pseudonym: "Text pseudonyms", text_generalize: "Text generalize", contextual_rewrite: "Contextual rewrite", self_redaction: "Self-redaction", marker: "Markers",
  advocate: "Advocate", executor: "Executor", judge: "Judge", terra: "Terra", stance: "Lab stance", link_break: "Link-break attack", evidence_removal: "Evidence removal attack",
  persistence: "Persistence", leakage: "Leakage", auroc_unedited: "AUROC", fpr: "FPR", fnr: "FNR", wrong_way: "Wrong-way", checker: "Checker",
  kind_p1: "Redaction run", kind_ablation: "Ablation", kind_judge: "Judge only", kind_reask: "Re-ask", smoke: "Smoke batch", written_first: "Written first", judge_setup: "Judge setup",
};
function glossary() {
  return GLOSSARY.map(([group, keys]) => section(group, `<dl class="glossary">${keys.filter((k) => TIPS[k]).map((k) => {
    const [body, formula] = TIPS[k];
    return `<div id="g-${k}"><dt>${esc(NAMES[k] || k)}</dt><dd>${esc(body)}${formula ? ` <code>${esc(formula)}</code>` : ""}</dd></div>`;
  }).join("")}</dl>`)).join("");
}

export function pageMethod(arg) {
  const [tab = "how", ...rest] = String(arg || "").split("/");
  const current = TABS.some(([k]) => k === tab) ? tab : "how";
  const nav = `<nav class="tabs" aria-label="Method">${TABS.map(([k, t]) => `<a href="#/method/${k}" ${k === current ? 'aria-current="page"' : ""}>${t}</a>`).join("")}</nav>`;
  const head = `<div>${pageHead({ title: "Method" })}${nav}${TAB_NOTE[current] ? `<p class="muted tab-note">${TAB_NOTE[current]}</p>` : ""}</div>`;
  if (current === "how") { $("view").innerHTML = head + howItWorks(); return; }
  if (current === "glossary") { $("view").innerHTML = head + glossary(); return; }
  if (current === "prompts") { $("view").innerHTML = head + prompts(); return; }
  const slug = current === "cases" ? "pipeline" : "protocol";
  const page = notePages().find((p) => p.slug === slug);
  if (!page) { $("view").innerHTML = head + `<p class="empty">No ${slug} note: add <code>docs/notes/${slug}.md</code>.</p>`; return; }
  const { html, scroll } = noteArticle(page, `#/method/${current}`, rest[0]);
  $("view").innerHTML = head + html;
  scroll();
}
