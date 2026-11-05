/* Simulated datasets on the Data tab: each set's facts and its explorer, and the claim library
   on the Generators page. One idea runs the explorer:
   a case's label rests on a chain of connections between log lines, and each redaction policy
   keeps, cuts or fakes some of them. The set map counts what each policy leaves decidable; a
   family is one world's variants, each changing one fact; a case shows its chain under the
   chosen policy and, with a run chosen, what the judge scored and why. Sentences and states
   come from Python; the URL holds the view. */

import {
  $,
  datasetHref,
  datasetOfSet,
  esc,
  f0,
  human,
  LABELS,
  lazyJson,
  onKey,
  query,
  rerender,
  section,
  SITE,
  state,
  term,
  TIPS,
  withQuery,
  wordDiff,
} from "./core.js?v=2e746ab46e";
import { markdown } from "./markdown.js?v=2e746ab46e";

const SIM_VIEWS = ["as_written", "text_redaction", "text_pseudonym", "text_generalize"];
const SIM_VIEW = { as_written: "As written", text_redaction: "Text redaction", text_pseudonym: "Text pseudonyms", text_generalize: "Text generalize" };
const READINGS = ["decidable", "cant_decide", "may_mislead"];
const READING = { decidable: "Decidable", cant_decide: "Can't decide", may_mislead: "May mislead" };
const READING_CLASS = { decidable: "pass", cant_decide: "warn", may_mislead: "fail" };
const LINK_STATE = { kept: "kept", guessable: "guessable", cut: "cut", looks_same: "looks the same", not_stated: "not stated" };
const SIM_SET_NAME = { checker: "Classifier coverage: checker pilot" };
const SIM_TIER = { calibration: "calibration (small worlds)", hard: "hard (large worlds, many distractors)" };
// A set's name: its claim and tier (the classifier's one set, the pilot, by name).
const simSetName = (b) => SIM_SET_NAME[b.key] || `${b.title}: ${SIM_TIER[b.tier] || b.tier || "template"}${b.renderer && b.renderer !== "template" ? ", model text" : ""}`;
const SHORT_LABEL = { violation: "V", red_herring: "RH", clean: "C" };

Object.assign(TIPS, {
  sim_gates: ["Checks a set must pass before it ships: labels right, families one fact apart, nothing on the surface that gives the label or the evidence away, secrets planted as designed. Hover a badge for its checks."],
  sim_map: ["How many cases each policy leaves decidable from the quoted evidence, predicted by code before any model runs. With a run chosen, the bar under a count splits the judge's reads in that cell: right, unsure, wrong."],
  read_decidable: ["Every connection the label needs survives the policy, or survives as the one marker of its kind, which still points at its value."],
  read_cant_decide: ["A connection the label needs is cut, or the case's evidence now reads the same as a variant with the other label."],
  read_may_mislead: ["Two different things now look the same (two endpoints, or the approver and the lead), so the case can read as the other label."],
  sim_family: ["Cases built from one world, each changing one fact. A variant names that fact the way it has it."],
  sim_chain: ["The connections between log lines the label rests on, in roles rather than names, and what the chosen policy leaves of each."],
  sim_judge: ["The judge's three 0–100 reads of this case: hollow as written, filled under the chosen policy. Green is right for the label, amber unsure (31–69), red wrong: the same colours as on Findings."],
  sim_reads: ["The evidence the judge reads under the chosen policy. Lines the other variant doesn't quote are marked at the edge; words that differ from it are highlighted."],
  sim_leak: ["A detail that gives a secret away without stating it: a handle, a job name, a tenant id."],
  st_kept: ["The policy leaves something that still makes this connection: a non-secret id, or the value itself."],
  st_guessable: ["Only a marker is left, but it is the only marker of its kind in the evidence, so it still points at its value."],
  st_cut: ["Only a secret made this connection, and the policy removed it."],
  st_looks_same: ["The two lines named different values; after the policy they carry the same marker, so they look like one."],
  st_not_stated: ["Nothing in the text makes this connection."],
  sim_lines: ["Median log lines per case: records, leak lines and background."],
  sim_records: ["Median records per case that the claim's rule reads, the org chart included."],
  sim_two: ["Share of violations and red herrings whose proof rests on two or more connections between records (a matching name or id, or a telling-apart)."],
  sim_nolink: ["The rule checked with every connection dropped, so any record of the right kind that says the right thing decides. Balanced accuracy over violations and red herrings: 0.5 means a reader who never links two records does no better than a coin."],
  sim_text: ["How many cases the checker predicts stay decidable (green), can't be decided (amber), or may mislead (red) once text redaction is applied. Computed without a model."],
});

const listJoin = (xs) => (xs.length < 3 ? xs.join(" and ") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

/* ---------- state in the URL ---------- */

let exploring = null; // the set the explorer shows; its dataset's page holds the view
const setHref = (b, tail = "", changes = {}) => {
  const d = datasetOfSet(b.key);
  return d ? withQuery(`${datasetHref(d, "cases")}${tail}`, changes) : "#/data";
};
function simHref(family, changes = {}) {
  return setHref(exploring, family ? `/${encodeURIComponent(family)}` : "", changes);
}
function simGo(family, changes) { history.replaceState(null, "", simHref(family, changes)); rerender(); }


/* The studies that drew this case from this build of the set, with the cell it was drawn into. */
const studiesOf = (b, sid) => (SITE.studies || [])
  .filter((st) => st.design.sets.some((x) => x.set === b.key && x.version === b.version))
  .flatMap((st) => st.cells.filter((c) => c.cases.some((x) => x.id === sid && x.set === b.key)).map((c) => [st, c]));
/* A set's runs as the explorer offers them: never one that stopped early and was replaced (its
   ledger note says so); full runs before smoke batches; the newest full run is the default. */
const ledgerOf = (name) => (SITE.ledger || []).find((e) => e.name === name) || {};
const isSmoke = (r) => /^Smoke/.test(ledgerOf(r.run).purpose || "");
function shownRuns(b) {
  const keep = (b.runs || []).filter((r) => !/superseded by/.test(ledgerOf(r.run).amended || ""));
  const full = keep.filter((r) => !isSmoke(r));
  return { list: [...full].reverse().concat(keep.filter(isSmoke).reverse()), latest: full[full.length - 1] || keep[keep.length - 1] || null };
}
function runLabel(r) {
  const e = ledgerOf(r.run), c = e.config || {};
  const judge = String(c.models?.judge || "judge").split("/").pop();
  const n = (c.sample_ids || []).length;
  const day = e.recorded_at ? new Date(e.recorded_at).toLocaleDateString(undefined, { day: "numeric", month: "short" }) : "";
  return [judge, n ? `${n} cases` : "", isSmoke(r) ? "smoke batch" : "", day].filter(Boolean).join(" · ");
}
const simRunOf = (name) => (SITE.sim || []).flatMap((b) => (b.runs || []).map((r) => [b, r])).find(([, r]) => r.run === name) || null;
const readClass = (score, label) => { // the same rule as core/readings.outcome
  const { cleared_at: lo = 30, flagged_at: hi = 70 } = SITE.constants || {};
  return score > lo && score < hi ? "unsure" : (score >= hi) === (label === "violation") ? "right" : "wrong";
};
const readingBadge = (r) => `<span class="badge ${READING_CLASS[r]}">${term(`read_${r}`, READING[r])}</span>`;

/* ---------- the set map ---------- */

function simMap(b, run, { view = "", reading = "", href = null, scoped = false } = {}) {
  const cell = (v, r) => {
    const n = scoped ? run?.cells?.[v]?.[r]?.cases || 0 : b.map[v][r]; // scoped: the cases this run read
    if (!n) return `<td class="faint sim-none">—</td>`;
    const c = run?.cells?.[v]?.[r];
    const unit = run?.cases ? "reads" : "mean reads";  // a run without kept reasons has each case's mean only
    const bar = c && c.reads ? `<span class="sim-bar3" title="judge ${unit}: ${c.right} right, ${c.unsure} unsure, ${c.wrong} wrong">${["right", "unsure", "wrong"].map((k) => `<i class="${k}" style="width:${((c[k] / c.reads) * 100).toFixed(1)}%"></i>`).join("")}</span><span class="small ${c.wrong ? "label-violation" : "faint"}">${c.wrong} of ${c.reads} ${unit} wrong</span>` : "";
    const inner = `<b>${n}</b>${bar}`;
    const on = v === view && r === reading;
    return `<td class="sim-cell">${href ? `<a href="${href(v, r)}">${inner}</a>` : `<button type="button" data-cell="${v}|${r}" aria-pressed="${on}">${inner}</button>`}</td>`;
  };
  const rows = SIM_VIEWS.map((v) => `<tr class="${v === view ? "on" : ""}"><th scope="row" class="left">${esc(SIM_VIEW[v])}</th>${READINGS.map((r) => cell(v, r)).join("")}</tr>`).join("");
  return `<div class="panel"><div class="scroll"><table class="sim-map"><thead><tr><th class="left">Cases</th>${READINGS.map((r) => `<th>${term(`read_${r}`, READING[r])}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table></div></div>`;
}

/* What one policy does to the set, answer first: a sentence, one bar split three ways, and the
   three readings as buttons that filter the cases below. With a judge run chosen, each reading
   also says how often the judge was wrong there. */
const READING_MEANS = {
  decidable: "the judge still has every connection the label needs",
  cant_decide: "a connection the label needs is gone, so the evidence no longer settles it",
  may_mislead: "two different things now look the same, so the case can read as the other label",
};
function simSummary(b, run, view, reading) {
  const m = b.map[view] || {};
  const total = READINGS.reduce((a, r) => a + (m[r] || 0), 0) || 1;
  const p = (n) => `${Math.round((100 * n) / total)}%`;
  const name = SIM_VIEW[view].toLowerCase();
  const lead = view === "as_written"
    ? `As written, every case is decidable: that is how the set is built.`
    : m.decidable === total
      ? `<b>Under ${esc(name)}, all ${total} cases stay decidable:</b> ${READING_MEANS.decidable}.`
      : `<b>Under ${esc(name)}, ${m.decidable || 0} of ${total} cases (${p(m.decidable || 0)}) stay decidable.</b> ${[
        m.cant_decide ? `${m.cant_decide} can't be decided: ${READING_MEANS.cant_decide}.` : "",
        m.may_mislead ? `${m.may_mislead} may mislead: ${READING_MEANS.may_mislead}.` : "",
      ].filter(Boolean).join(" ")}`;
  const seg = (r) => (m[r] ? `<i class="${{ decidable: "right", cant_decide: "unsure", may_mislead: "wrong" }[r]}" style="width:${((100 * m[r]) / total).toFixed(1)}%"></i>` : "");
  const judged = (r) => {
    const c = run?.cells?.[view]?.[r];
    const pc = (k) => `${Math.round((100 * c[k]) / c.reads)}%`;
    return c?.reads ? `<span class="small muted">judge: ${pc("right")} right · ${pc("unsure")} unsure · <span class="${c.wrong ? "label-violation" : ""}">${pc("wrong")} wrong</span> <span class="faint">(${c.reads} reads)</span></span>` : "";
  };
  const btn = (r) => (m[r] ? `<button type="button" class="sim-pick ${READING_CLASS[r]}" data-cell="${view}|${r}" aria-pressed="${r === reading}"><span><b>${m[r]}</b> ${esc(READING[r].toLowerCase())}</span>${judged(r)}<span class="small faint">${r === reading ? "showing these · click to show all" : "show these below"}</span></button>` : "");
  return `<p class="sim-lead">${lead}</p>
    <div class="sim-sumbar" role="img" aria-label="${READINGS.map((r) => `${m[r] || 0} ${READING[r]}`).join(", ")}">${READINGS.map(seg).join("")}</div>
    <div class="sim-picks">${READINGS.map(btn).join("")}</div>
    <p class="small faint">The checker's call, from each case's proof; no model involved.${view === "as_written" ? "" : ` Switch policy above to compare.`}</p>`;
}

/* ---------- the tab: sets, claims and the explorer ---------- */

const SHAPE_NOTE = {
  permission: "Broken unless a record excuses it. Redaction can fake an excuse for a violation, or cut a red herring's.",
  prohibition: "Broken only when a record convicts it. Redaction can cut a violation's conviction, or fake one against an innocent lab.",
};

/* ---------- the claim library ---------- */

/* The claim library: each rule file, its shape and the sets built from it. */
export function simClaims() {
  const claims = SITE.claims || [];
  if (!claims.length) return `<p class="empty">No claims in the library.</p>`;
  const sets = SITE.sim || [];
  const intro = `<p class="muted sim-intro">The simulator's input. Each claim is a rule file read by one general checker, with a second checker written by hand that must agree on every case. A claim's shape decides which connections each label rests on, and so what a filter can do to it.</p>`;
  const card = (c) => {
    const mine = sets.filter((b) => b.claim === c.id);
    const rows = [
      ["Shape", `<span class="badge">${esc(c.shape)}</span> ${esc(SHAPE_NOTE[c.shape] || "")}`],
      ["About", esc(c.trigger)],
      ...(c.excused_by_itself.length ? [["Excused by what it says", c.excused_by_itself.map(esc).join("<br>")]] : []),
      ...c.deciding.map((d) => [d.role === "convicts" ? "Convicted by" : "Excused by",
        `a ${esc(d.record)} that ${esc(listJoin(d.needs))}.<span class="muted"> Falls short as: ${esc(d.falls_short.join("; "))}.${d.absent ? ` With none: ${esc(d.absent)}.` : ""}</span>`]),
      ...(c.distractors.length ? [["Distractors", esc(c.distractors.join(", "))]] : []),
      ["Families vary", esc(c.varies.join(", "))],
    ];
    const lines = (c.examples || []).map((e) => `<div><i></i><span class="id">${esc(e.record.replace(/_/g, " "))}</span><span class="src">${esc(e.source)}</span><span class="txt">${esc(e.text)}</span></div>`).join("");
    const setRows = mine.map((b) => `<li><a href="${datasetOfSet(b.key) ? datasetHref(datasetOfSet(b.key)) : "#/data"}">${esc(simSetName(b))}</a> <span class="muted small">${b.kept} cases</span> ${simGateSummary(b)}</li>`).join("");
    return section(esc(c.title), `<p class="claim">${esc(c.statement)}</p>
      <dl class="sim-rule">${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("")}</dl>
      ${lines ? `<h4 class="sim-h4">One line of each record</h4><div class="logs">${lines}</div>` : ""}
      <h4 class="sim-h4">Sets</h4>${setRows ? `<ul class="plain sim-sets">${setRows}</ul>` : `<p class="muted">None built yet.</p>`}
      <p class="small faint">Rule file <code>${esc(c.file)}</code>, checked a second way by <code>${esc(c.second_checker)}</code>.</p>`, `<code>${esc(c.id)}</code>`);
  };
  return intro + claims.map(card).join("");
}

/* ---------- the sets ---------- */

/* One badge for a set's gates: the worst status, each gate's on hover. */
function simGateSummary(b) {
  const gs = b.gates || [];
  if (!gs.length) return `<span class="faint small">not run</span>`;
  const status = b.gate_status;
  const cls = { pass: "pass", fail: "fail", pending: "warn" }[status];
  const lines = gs.map((g) => `${g.title}: ${g.status}`).join("\n");
  const auto = gs.filter((g) => g.status !== "pending").every((g) => g.status === "pass");
  const why = status === "pending" ? "human audit pending" : status;
  return `<span class="badge ${cls}" title="${esc(lines)}">${esc(why)}</span>${status === "pending" && auto ? `<span class="small faint" style="display:block">automated gates pass</span>` : ""}`;
}

/* A set's facts for its dataset page: size, difficulty, what text redaction leaves, gates. */
function simFacts(b) {
  const d = b.difficulty || {}, m = d.medians || {}, c = d.connections || {}, n = d.labels || {};
  const pct = (x) => (x == null ? "—" : `${Math.round(x * 100)}%`);
  const whole = (x) => (x == null ? "—" : Math.round(x));
  const clean = b.kept - (d.cases || 0);
  const mix = [`${n.violation || 0} violations`, `${n.red_herring || 0} red herrings`, ...(clean ? [`${clean} clean`] : [])].join(" · ");
  const tr = b.map?.text_redaction || {};
  const total = READINGS.reduce((a, r) => a + (tr[r] || 0), 0) || 1;
  const parts = [["decidable", "right"], ["cant_decide", "unsure"], ["may_mislead", "wrong"]];
  const bar = `<span class="sim-bar3" title="${parts.map(([r]) => `${READING[r]}: ${tr[r] || 0}`).join(", ")}">${parts.map(([r, k]) => `<i class="${k}" style="width:${(((tr[r] || 0) / total) * 100).toFixed(1)}%"></i>`).join("")}</span><span class="small">${parts.map(([r]) => `${tr[r] || 0} ${READING[r].toLowerCase()}`).join(" · ")}</span>`;
  const two = c["2"] == null ? null : c["2"] + c["3+"];
  const nolink = d.label_without_connections == null ? "—" : d.label_without_connections.toFixed(2);
  const kv = (k, v) => `<div><dt>${k}</dt><dd>${v}</dd></div>`;
  return `<dl class="kv">${kv("Cases", `${b.kept} <span class="faint">${mix}</span>`)}${kv(term("sim_lines", "Log lines per case"), whole(m.lines))}${kv(term("sim_records", "Records the rule reads"), whole(m.records))}${kv(term("sim_two", "Need 2+ connections"), `${pct(two)} <span class="faint">of cases</span>`)}${kv(term("sim_nolink", "Shortcut check"), `${nolink} <span class="faint">${d.label_without_connections != null && d.label_without_connections <= 0.6 ? "no better than a coin: good" : "a reader that never links records can guess"}</span>`)}${kv(term("sim_text", "Checker, under text redaction"), bar)}${kv(term("sim_gates", "Gates"), simGateSummary(b))}</dl>`;
}

/* A simulated dataset's page under `head`: its facts, then the explorer (map, families, cases). */
export function pageSimDataset(d, arg, head) {
  const b = (SITE.sim || []).find((x) => x.key === d.sim_key);
  if (!b) { $("view").innerHTML = head + `<p class="empty">This set's files aren't on this machine. Rebuild it with <code>uv run redaction simulator build</code>.</p>`; return; }
  exploring = b;
  $("view").innerHTML = head + section("This set", simFacts(b)) + dataSimulator(b, arg);
  wireSimulator(arg);
}

/* ---------- the explorer ---------- */

function dataSimulator(set, arg) {
  const q = query();
  const lists = lazyJson(set.explorer); // the set's families and case rows
  if (!lists || lists.error) {
    const why = lists ? `Could not load ${esc(set.explorer)} (${esc(lists.error)}).` : "Loading the set…";
    return section(term("sim_map", "What each policy leaves decidable"), simGates(set) + `<p class="empty">${why}</p>`);
  }
  const b = { ...set, ...lists };
  const view = SIM_VIEWS.includes(q.get("view")) ? q.get("view") : "text_redaction";
  const { list: runs, latest } = shownRuns(b);
  // The default judge: the newest full run that read this policy (an adversarial run reads none).
  const readsView = (r) => Object.values(r.cells?.[view] || {}).some((c) => c.reads);
  const run = q.get("run") === "none" ? null : (b.runs || []).find((r) => r.run === q.get("run")) || runs.find((r) => !isSmoke(r) && readsView(r)) || latest;
  const reading = READINGS.includes(q.get("reading")) ? q.get("reading") : "";
  const judge = run && ["wrong", "unsure"].includes(q.get("judge")) ? q.get("judge") : "";
  const after = (sid) => run?.reads?.[sid]?.[view]?.[1] || [];
  const fams = b.families.filter((f) => (!reading || f.cases.some((sid) => b.cases[sid].reading[view] === reading))
    && (!judge || f.cases.some((sid) => {
      const xs = after(sid), label = b.cases[sid].label;
      return judge === "wrong" ? xs.some((s) => readClass(s, label) === "wrong") : xs.length && readClass(xs.reduce((a, c) => a + c, 0) / xs.length, label) === "unsure";
    })));
  const fam = fams.find((f) => f.id === arg) || fams[0] || null;

  const controls = `<div class="seg" role="group" aria-label="Policy">${SIM_VIEWS.map((v) => `<button type="button" data-simview="${v}" aria-pressed="${v === view}">${esc(SIM_VIEW[v])}</button>`).join("")}</div>
    ${runs.length ? `<select id="sim-run" aria-label="Judge"><option value="none" ${run ? "" : "selected"}>No judge</option>${runs.map((r) => `<option value="${esc(r.run)}" ${r === run ? "selected" : ""} title="${esc(r.run)}">Judge: ${esc(runLabel(r))}</option>`).join("")}</select>` : ""}`;
  const about = b.card ? `<details class="sim-about"><summary>About this set: how it was made, its gates and limits</summary><div class="prose">${markdown(b.card)}</div></details>` : "";
  const map = section("What a redaction policy does to this set", simSummary(b, run, view, reading) + about, controls);

  const famLine = (f) => {
    const cs = f.cases.map((sid) => b.cases[sid]);
    const count = (k) => cs.filter((c) => c.label === k).length;
    const labels = ["violation", "red_herring", "clean"].filter(count).map((k) => `${count(k)} ${LABELS[k].toLowerCase()}${count(k) > 1 ? "s" : ""}`).join(" · ");
    const odd = READINGS.filter((r) => r !== "decidable").map((r) => [r, cs.filter((c) => c.reading[view] === r).length]).filter(([, n]) => n);
    const read = odd.length ? odd.map(([r, n]) => `<i class="rc ${READING_CLASS[r]}">${n} ${esc(READING[r].toLowerCase())}</i>`).join("") : `<span class="faint">all decidable</span>`;
    const wrong = run ? f.cases.reduce((n, sid) => n + after(sid).filter((x) => readClass(x, b.cases[sid].label) === "wrong").length, 0) : 0;
    return `<span class="sim-famline">${labels}</span><span class="sim-chips">${read}${wrong ? `<i class="rc fail">judge wrong ${wrong}×</i>` : ""}</span>`;
  };
  const differs = (f) => (f.differs ? f.differs.replace(/^one fact each: /, "variants change one of: ") : `${LABELS[b.cases[f.cases[0]].label]}, one case`);
  const items = fams.map((f) => `<li tabindex="0" data-fam="${esc(f.id)}" aria-selected="${f === fam}"><b>${esc(f.id)}</b><span>${esc(differs(f))}</span>${famLine(f)}</li>`).join("")
    || `<li><span>No families match.</span></li>`;
  const filters = `${reading ? `<button type="button" class="link-btn" data-cell="${view}|${reading}">Showing ${esc(READING[reading].toLowerCase())} only · show all</button>` : ""}
    ${run ? `<select id="sim-judge" aria-label="Judge"><option value="">Any judge read</option><option value="wrong" ${judge === "wrong" ? "selected" : ""}>Judge wrong at least once</option><option value="unsure" ${judge === "unsure" ? "selected" : ""}>Judge unsure on average</option></select>` : ""}`;

  const d = fam ? lazyJson(`${b.detail}${encodeURIComponent(fam.id)}.json`) : null;
  const cases = run?.cases ? lazyJson(run.cases) : null;
  let detail;
  if (!fam) detail = `<p class="empty">No family selected.</p>`;
  else if (!d || (run?.cases && !cases)) detail = `<p class="empty">Loading…</p>`;
  else if (d.error || cases?.error) detail = `<p class="empty">Could not load ${esc(d.error ? `${b.detail}${fam.id}.json` : run.cases)} (${esc(d.error || cases.error)}).</p>`;
  else detail = simFamily(b, fam, d, view, run, cases, q.get("case"));
  const intro = `<p class="muted small sim-intro">Each family is one fictional lab. Its variants each change one fact, which can flip the label. Pick a family on the left, then a variant, to see the chain of connections its label rests on and what ${esc(SIM_VIEW[view].toLowerCase())} does to each link.</p>`;
  const browser = section(`Browse the cases <span class="count">${fams.length} of ${b.families.length} families</span>`, `${intro}<div class="browser"><ol class="list panel" id="sim-list">${items}</ol><article class="detail sim">${detail}</article></div>`, filters);
  return map + browser;
}

/* The set's quality gates, one badge each; the checks behind each on hover. */
function simGates(b) {
  if (!b.gates?.length) return `<p class="sim-gates faint small">Quality gates not run: <code>uv run redaction simulator gates</code>.</p>`;
  const cls = { pass: "pass", fail: "fail", pending: "warn" };
  const mark = { true: "pass", false: "fail", null: "pending" };
  const badge = (g) => {
    const lines = g.checks.map((c) => `${c.name}: ${c.value ?? "—"} (${c.threshold}) ${mark[c.ok]}${c.detail ? ` · ${c.detail}` : ""}`).join("\n");
    return `<span class="badge ${cls[g.status]}" title="${esc(lines)}">${esc(g.title)} · ${esc(g.status)}</span>`;
  };
  return `<p class="sim-gates small"><span class="muted">${term("sim_gates", "Quality gates")}</span> ${b.gates.map(badge).join(" ")}</p>`;
}

/* ---------- one family, one case ---------- */

function simFamily(b, fam, d, view, run, cases, chosen) {
  const sid = fam.cases.includes(chosen) ? chosen : fam.cases[0];
  const row = b.cases[sid], s = d[sid];
  const variants = fam.cases.length > 1 ? `<p class="small faint sim-varhead">The same lab, one fact changed in each variant. The highlighted one is shown below.</p><div class="sim-variants" role="group" aria-label="Variants">${fam.cases.map((x) => {
    const c = b.cases[x];
    return `<button type="button" data-simcase="${esc(x)}" aria-pressed="${x === sid}"><b class="label-${c.label}">${esc(LABELS[c.label])}</b><span>${esc(c.variant || "")}</span></button>`;
  }).join("")}</div>` : "";
  const other = fam.cases.find((x) => x !== sid && b.cases[x].label !== row.label) || null;
  return `<div><h3>${esc(fam.id)}</h3><p class="claim">${esc(s.claim)}</p></div>
    ${variants}
    <p class="sim-verdict"><b class="label-${row.label}">${esc(LABELS[row.label])}.</b> ${esc(s.story.reason || "")}</p>
    ${simChainList(b, row, s, view, other)}
    ${run ? simJudge(row, sid, view, run, cases) : ""}
    <details class="sim-evidence" ${state.simEvidence ? "open" : ""}><summary>Evidence <span class="faint">what the judge reads, the world, secrets, the log</span></summary>
      ${simReads(sid, s, view, cases, other && d[other], other, run)}
      <div class="sim-two">
        <div class="sim-block"><h4>The lab</h4><ul class="sim-cast">${(s.story.cast || []).map((x) => `<li>${simDecorate(x, { secrets: s.story.secrets || [] })}</li>`).join("")}</ul></div>
        <div class="sim-block"><h4>What happened</h4><ol class="sim-events">${(s.story.timeline || []).map((e) => `<li><time>${esc(e.time.replace("T", " ").replace("Z", ""))}</time><span>${simDecorate(e.text, { secrets: s.story.secrets || [] })}</span></li>`).join("")}</ol></div>
      </div>
      ${simSecrets(s, view)}
      ${simLog(s)}
    </details>
    <p class="small faint">Reviewer: ${esc(row.review ? (row.review === (row.label === "violation" ? "violation" : "no_violation") ? "agreed with the label" : `read it as ${human(row.review)}`) : "not run")} · <span class="mono">${esc(sid)}</span>${studiesOf(b, sid).map(([st, cell]) => ` · in study <a href="#/experiments/${encodeURIComponent(st.name)}">${esc(st.name)}</a> (${esc(cell.name)})`).join("")}</p>`;
}

function simVia(via) {
  return via.map((m) => (m.secret ? `<span class="sim-tag" title="${esc(m.value)}">${esc(m.kind === "person" ? "name" : m.kind)}</span>` : `<span class="mono">${esc(m.value)}</span>`)).join(" ");
}

function simChainList(b, row, s, view, other) {
  const r = row.reading[view];
  const head = `<div class="sim-blockhead"><h4>${term("sim_chain", "The chain")} <span class="faint small">under ${esc(SIM_VIEW[view].toLowerCase())}</span></h4>${readingBadge(r)}</div>`;
  if (!s.chain.length) return `<div class="sim-block">${head}<p class="faint small">One line decides: no connection is needed.</p></div>`;
  const like = row.reads_like_other.includes(view) && other
    ? `<p class="sim-like">Its evidence reads the same as the ${esc(LABELS[b.cases[other].label].toLowerCase())} variant's, so the fact that decides the label is gone.</p>` : "";
  const items = s.chain.map((l) => {
    const st = l.state[view];
    return `<li class="st-${st}"><span class="sim-st">${term(`st_${st}`, LINK_STATE[st])}</span><span class="sim-says">${esc(l.says)}</span><span class="sim-via">${simVia(l.via)}</span></li>`;
  }).join("");
  return `<div class="sim-block">${head}${like}<ol class="sim-chain">${items}</ol></div>`;
}

/* One case's reads on a 0–100 line: hollow as written, filled under the view. */
function simStrip(label, before, after) {
  const W = 300, H = 32, x = (v) => 8 + (v / 100) * (W - 16);
  const lanes = [0, -8, 8], placed = [];
  const dot = (v, cls) => {
    const cx = x(v);
    const lane = lanes.find((dy) => !placed.some(([px, py]) => Math.abs(px - cx) < 9 && py === dy)) ?? 0;
    placed.push([cx, lane]);
    return `<circle class="${cls} ${readClass(v, label)}" cx="${cx.toFixed(1)}" cy="${H / 2 + lane}" r="4.5"><title>${v}</title></circle>`;
  };
  const dots = [...after.map((v) => dot(v, "after")), ...before.map((v) => dot(v, "before"))].join("");
  return `<svg viewBox="0 0 ${W} ${H}" class="sim-strip" role="img" aria-label="judge reads"><rect class="band" x="${x(0)}" y="3" width="${x(30) - x(0)}" height="${H - 6}"/><rect class="band" x="${x(70)}" y="3" width="${x(100) - x(70)}" height="${H - 6}"/><line x1="${x(0)}" x2="${x(100)}" y1="${H / 2}" y2="${H / 2}"/>${dots}</svg>`;
}

function simJudge(row, sid, view, run, cases) {
  const reads = run.reads?.[sid]?.[view];
  if (!reads) return `<div class="sim-block"><h4>${term("sim_judge", "The judge")}</h4><p class="faint small">This run didn't score this case under ${esc(SIM_VIEW[view].toLowerCase())}.</p></div>`;
  const [before, after] = reads;
  const c = cases?.[sid];
  const said = view === "as_written" ? c?.unedited : c?.policies?.[view]?.edited;
  const reasons = said ? `<ol class="sim-reasons">${said.map(([v, why]) => `<li><span class="sim-score ${readClass(v, row.label)}">${f0(v)}</span><p>${esc(why) || `<span class="faint">No reason recorded.</span>`}</p></li>`).join("")}</ol>`
    : `<p class="faint small">${run.cases ? "No reasons for this case." : "This run's reasons aren't in the build: run <code>uv run redaction p1 analyze</code> on its logs and rebuild."}</p>`;
  const nums = view === "as_written" ? before.map(f0).join(" ") : `${before.map(f0).join(" ")} → ${after.map(f0).join(" ")}`;
  return `<div class="sim-block"><div class="sim-blockhead"><h4>${term("sim_judge", "The judge")}</h4><span class="mono small">${nums}</span></div>
    <div class="sim-stripwrap">${simStrip(row.label, before, view === "as_written" ? [] : after)}</div>${reasons}</div>`;
}

/* What the judge reads under the view, marked against the other variant. */
function simReads(sid, s, view, cases, o, otherId, run) {
  const fromRun = (id) => (view === "as_written" ? null : cases?.[id]?.policies?.[view]?.read);
  const lines = (run && fromRun(sid)) || s.evidence[view] || [];
  const theirs = Object.fromEntries(o ? (run && fromRun(otherId)) || o.evidence[view] || [] : []);
  const key = new Set(s.key);
  const bars = (html) => html.replace(/\[REDACTED: ([^\]<]+)\]/g, (_, k) => `<span class="sim-bar" title="redacted: ${k}">${k}</span>`);
  const rows = lines.map(([id, text]) => {
    const mine = theirs[id];
    const html = !o || mine == null || mine === text ? bars(esc(text))
      : bars(wordDiff(text, mine).replace(/<ins>[\s\S]*?<\/ins>/g, "").replace(/<del>([\s\S]*?)<\/del>/g, '<mark class="sim-diff">$1</mark>'));
    return `<div class="${key.has(id) ? "key" : "background"}${o && mine == null ? " only" : ""}"><span class="id">${esc(id)}</span><span class="txt">${html}</span></div>`;
  }).join("");
  return `<div class="sim-block"><h4>${term("sim_reads", "What the judge reads")} <span class="faint small">under ${esc(SIM_VIEW[view].toLowerCase())}</span></h4><div class="logs diff sim-quoted">${rows}</div></div>`;
}

/* Mark spans of `text`: redaction markers, leak details, secret values. */
function simDecorate(text, { secrets = [], leaks = [] } = {}) {
  const spans = [];
  const find = (needle, kind, extra) => {
    if (!needle) return;
    const re = new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    let m;
    while ((m = re.exec(text))) spans.push([m.index, m.index + m[0].length, kind, extra]);
  };
  const markers = /\[REDACTED: ([^\]]+)\]/g;
  let m;
  while ((m = markers.exec(text))) spans.push([m.index, m.index + m[0].length, "bar", m[1]]);
  for (const l of leaks) find(l.snippet, "leak", l.secret_type);
  for (const s of secrets) find(s, "secret");
  spans.sort((a, b) => a[0] - b[0] || b[1] - a[1]);
  let out = "", at = 0;
  for (const [s, e, kind, extra] of spans) {
    if (s < at) continue;
    const t = esc(text.slice(s, e));
    out += esc(text.slice(at, s)) + (kind === "bar" ? `<span class="sim-bar" title="redacted: ${esc(extra)}">${esc(extra)}</span>`
      : kind === "leak" ? `<mark class="sim-leak" title="gives away the ${esc(human(extra))}">${t}</mark>`
      : `<mark class="sim-secret" title="confidential">${t}</mark>`);
    at = e;
  }
  return out + esc(text.slice(at));
}

function simSecrets(s, view) {
  const open = new Set((s.leaks[view] || []).map((r) => `${r.secret_type}|${r.value}|${r.snippet}`));
  const rowFor = (x, scored) => {
    const mine = s.routes.filter((r) => r.secret_type === x.secret_type && r.value === x.value);
    const stated = new Set(mine.filter((r) => r.level === "literal").flatMap((r) => r.lines));
    const leaks = mine.filter((r) => r.level !== "literal");
    return `<tr><td>${esc(human(x.secret_type))}${scored ? "" : ` <span class="faint">not scored</span>`}</td><td class="mono-cell">${esc(x.value)}</td>
      <td class="mono-cell">${leaks.map((r) => `<mark class="sim-leak">${esc(r.snippet)}</mark>${open.has(`${r.secret_type}|${r.value}|${r.snippet}`) && view !== "as_written" ? ` <span class="badge fail">still in the evidence</span>` : ""}`).join("<br>") || "—"}</td>
      <td class="num" title="${esc([...stated].join(" "))}">${stated.size || "—"}</td></tr>`;
  };
  const rows = s.secrets.map((x) => rowFor(x, true)).join("") + s.confidential.map((x) => rowFor(x, false)).join("");
  return `<div class="sim-block"><h4>Secrets</h4><div class="panel"><div class="scroll"><table class="left">
    <thead><tr><th>Secret</th><th>Value</th><th>${term("sim_leak", "Given away by")}</th><th class="num">Lines stating it</th></tr></thead><tbody>${rows}</tbody></table></div></div></div>`;
}

function simLog(s) {
  const key = new Set(s.key);
  const corr = Object.fromEntries((s.correlates || []).map((c) => [c.log_id, c]));
  const shown = s.logs.filter((e) => state.showBackground || e.kind !== "background");
  const hidden = s.logs.length - s.logs.filter((e) => e.kind !== "background").length;
  const lines = shown.map((e) => {
    const c = corr[e.log_id];
    return `<div class="${e.kind === "background" ? "background" : ""} ${key.has(e.log_id) ? "key" : ""}"><i class="k-${e.kind || "background"}"></i><span class="id">${esc(e.log_id)}</span><span class="src">${esc(e.source)}</span><span class="txt">${simDecorate(e.text, { secrets: s.story.secrets || [], leaks: c ? [{ snippet: c.snippet, secret_type: c.secret_type }] : [] })}</span></div>`;
  }).join("");
  return `<div class="sim-block"><div class="sim-blockhead"><h4>Log</h4><label class="toggle"><input type="checkbox" id="show-bg" ${state.showBackground ? "checked" : ""}> ${hidden} ${term("background", "background lines")}</label></div><div class="logs">${lines}</div></div>`;
}

/* ---------- the run page's section ---------- */

export function simRunSection(name) {
  const hit = simRunOf(name);
  if (!hit) return "";
  const [b, r] = hit;
  const at = (v, reading) => setHref(b, "", { run: r.run, view: v, reading: reading || null });
  return section(`The cases this run read · ${term("sim_map", "what each policy leaves decidable")}`, simMap(b, r, { href: at, scoped: true }), `<a href="${at("text_redaction", "")}">Open the cases on the Data tab</a>`);
}

function wireSimulator(arg) {
  const fam = (arg || "").split("?")[0];
  const view = $("view");
  view.querySelectorAll("#sim-list li[data-fam]").forEach((li) => onKey(li, () => simGo(li.dataset.fam, { case: null })));
  view.querySelectorAll("[data-simview]").forEach((x) => { x.onclick = () => simGo(fam, { view: x.dataset.simview }); });
  view.querySelectorAll("[data-cell]").forEach((x) => {
    x.onclick = () => { const [v, r] = x.dataset.cell.split("|"); const same = x.getAttribute("aria-pressed") === "true"; simGo("", { view: v, reading: same ? null : r, case: null }); };
  });
  view.querySelectorAll("[data-simcase]").forEach((x) => { x.onclick = () => simGo(fam, { case: x.dataset.simcase }); });
  const run = $("sim-run"); if (run) run.onchange = (e) => simGo(fam, { run: e.target.value, judge: null });
  const rd = $("sim-reading"); if (rd) rd.onchange = (e) => simGo("", { reading: e.target.value, case: null });
  const jd = $("sim-judge"); if (jd) jd.onchange = (e) => simGo("", { judge: e.target.value, case: null });
  const bg = $("show-bg"); if (bg) bg.onchange = (e) => { state.showBackground = e.target.checked; state.simEvidence = true; rerender(); };
  const ev = view.querySelector(".sim-evidence"); if (ev) ev.ontoggle = () => { state.simEvidence = ev.open; };
}

/* ---------- a worked example, for Method → How it works ---------- */

/* One real case from the prediction test, walked through: the truth, the chain its label rests
   on as written and after text redaction, the checker's call, and what each judge then scored.
   It picks, from the study's "conviction faked" cell, the case most judges read. */
const EXAMPLE = { study: "claim-shape-v2", cell: "prohibition red herring, conviction faked" };
const JUDGE_SHORT = [[/terra/, "Terra"], [/opus/, "Opus"], [/haiku/, "Haiku"], [/mini/, "GPT-5-mini"]];
const judgeOfRun = (r) => {
  const m = String(ledgerOf(r.run).config?.models?.judge || "");
  return (JUDGE_SHORT.find(([re]) => re.test(m)) || [null, m.split("/").pop() || "judge"])[1];
};

export function workedExample() {
  const wait = `<p class="empty">Loading the example…</p>`;
  const cell = (SITE.studies || []).find((s) => s.name === EXAMPLE.study)?.cells?.find((c) => c.name === EXAMPLE.cell);
  const setKey = cell?.cases?.[0]?.set;
  const set = (SITE.sim || []).find((b) => b.key === setKey);
  if (!set) return "";
  const lists = lazyJson(set.explorer);
  if (!lists) return wait;
  if (lists.error) return "";
  const b = { ...set, ...lists };
  const runs = shownRuns(b).list.filter((r) => !isSmoke(r));
  const readers = (sid) => runs.filter((r) => r.reads?.[sid]?.text_redaction);
  const judgesOf = (sid) => new Set(readers(sid).map(judgeOfRun)).size;
  const pick = cell.cases.filter((c) => c.set === setKey && b.cases[c.id]?.reading?.text_redaction === "may_mislead")
    .sort((x, y) => judgesOf(y.id) - judgesOf(x.id))[0];
  const fam = pick && b.families.find((f) => f.cases.includes(pick.id));
  if (!fam) return "";
  const d = lazyJson(`${b.detail}${encodeURIComponent(fam.id)}.json`);
  if (!d) return wait;
  if (d.error) return "";
  const sid = pick.id, s = d[sid], row = b.cases[sid];
  const other = fam.cases.find((x) => x !== sid && b.cases[x].label !== row.label) || null;
  // Each judge's latest run that read this case: as written, then after text redaction.
  const latest = new Map();
  for (const r of readers(sid)) latest.set(judgeOfRun(r), r);
  const order = ["Terra", "Opus", "Haiku", "GPT-5-mini"];
  const avg = (xs) => xs.reduce((a, c) => a + c, 0) / xs.length;
  const pairs = [...latest.entries()].sort(([a], [z]) => order.indexOf(a) - order.indexOf(z)).map(([judge, r]) => [judge, ...r.reads[sid].text_redaction]);
  const up = pairs.filter(([, b4, af]) => avg(af) > avg(b4)).length;
  const unsure = pairs.filter(([, , af]) => readClass(avg(af), row.label) === "unsure").length;
  const wrong = pairs.filter(([, , af]) => readClass(avg(af), row.label) === "wrong").length;
  const sum = pairs.length ? ` ${up === pairs.length ? "Every judge" : `${up} of ${pairs.length} judges`} moved toward guilty; by its average read, ${unsure} ended unsure and ${wrong} wrong.` : "";
  const judged = pairs.map(([judge, before, after]) => {
    return `<li><span class="ex-judge">${esc(judge)}</span><span class="sim-stripwrap">${simStrip(row.label, before, after)}</span><span class="mono small">${f0(avg(before))} → ${f0(avg(after))}</span></li>`;
  }).join("");
  const explorer = `${datasetHref(datasetOfSet(setKey), `cases/${fam.id}`, { case: sid, view: "text_redaction" })}`;
  const step = (n, title, body) => `<li class="ex-step"><span class="how-n">${n}</span><div><h4>${title}</h4>${body}</div></li>`;
  return `<ol class="ex-steps">
    ${step(1, "The claim and the truth", `<p class="claim">${esc(s.claim)}</p><p class="sim-verdict"><b class="label-${row.label}">${esc(LABELS[row.label])}.</b> ${esc(s.story.reason || "")}</p>`)}
    ${step(2, "What the label rests on, and what text redaction does to it", `<div class="ex-two">${simChainList(b, row, s, "as_written", other)}${simChainList(b, row, s, "text_redaction", other)}</div>
      <p class="small muted">Text redaction replaces every customer name with the same marker, so two different customers now look like one. The checker reads that off the proof, without a model: the case <b>may mislead</b>, toward guilty.</p>`)}
    ${step(3, "What the judges then scored", judged ? `<ul class="ex-judges">${judged}</ul><p class="small muted">Each dot is one read of how likely a violation is, 0–100: hollow on the evidence as written, filled after text redaction. The shaded ends are confident reads (30 or under, 70 or over): green right for an innocent lab, amber unsure, red wrong.${sum}</p>` : `<p class="faint small">No judge has read this case yet.</p>`)}
  </ol>
  <p class="small"><a href="${explorer}">Open this case in the explorer</a> · the evidence each judge read, line by line, and its reasons · <a href="#/findings">all 192 cases on Findings</a></p>`;
}
