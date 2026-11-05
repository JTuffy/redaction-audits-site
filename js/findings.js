/* Findings on the validated data, under the project's two sub-questions: signal loss (does the
   audit still reach the right verdict?) and secret leakage (does the secret get out anyway?).
   The prediction test comes from data/studies/*-report.json; every other view from the counted
   judge reads (infra/grid.py). Each panel leads with a sentence computed from the numbers below
   it, and the Overview shows the same sentences (`answers`), so they can't disagree. Reads are
   scored one by one: right, unsure (31–69), wrong. Archived findings follow, folded. */

import { dataTip, esc, POLICY, query, setQuery, SITE, STANCE } from "./core.js?v=2e746ab46e";

const pct = (n, d) => (d ? `${Math.round((100 * n) / d)}%` : "—");
const share = (n, d) => (d ? Math.round((100 * n) / d) : null);
const minus = (s) => String(s).replace(/-/g, "−");
const signed = (v) => (v == null ? "—" : minus(`${v > 0 ? "+" : ""}${Math.round(v)}`));
const JUDGE_ORDER = ["Terra", "Opus", "Haiku", "GPT-5-mini"];
const POLICY_ORDER = ["unedited", "text_pseudonym", "text_generalize", "contextual_rewrite", "self_redaction", "text_redaction"];
const policyName = (p) => (p === "unedited" ? "Unedited" : POLICY[p] || p);
const list = (xs) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

/* The study's eight cells: what redaction does to the case, in words, and which way the checker
   says the judge's violation score should move (−1 toward cleared, +1 toward guilty, 0 not at all). */
const CELLS = [
  ["permission violation, excuse faked", "Violation that redaction makes look excused", -1],
  ["permission red herring, excuse cut", "Red herring whose excuse redaction hides", +1],
  ["permission violation, decidable", "Violation, still decidable", 0],
  ["permission red herring, decidable", "Red herring, still decidable", 0],
  ["prohibition red herring, conviction faked", "Red herring that redaction makes look convicted", +1],
  ["prohibition violation, conviction cut", "Violation whose conviction redaction hides", -1],
  ["prohibition violation, decidable", "Violation, still decidable", 0],
  ["prohibition red herring, decidable", "Red herring, still decidable", 0],
];
const CELL = Object.fromEntries(CELLS.map(([k, name]) => [k, name]));
const SHAPE = {
  permission: "Permission claims: allowed only if a record excuses it (skipped eval, chain of thought, classifier)",
  prohibition: "Prohibition claim: forbidden only if a record convicts it (opted-out data)",
};
const WAY = { "-1": "toward cleared", "1": "toward guilty", "0": "no change" };
/* The study each judge read the 192 cases in. */
const STUDY_JUDGE = [["claim-shape-v2", "Terra"], ["claim-shape-v2-haiku", "Haiku"], ["claim-shape-v2-mini", "GPT-5-mini"]];
const MARK = { Terra: "circle", Haiku: "square", "GPT-5-mini": "diamond", Opus: "triangle" };

/* Right / unsure / wrong as one bar; the share that matters printed beside it, unsure faint. */
function bar(t, show = "wrong") {
  if (!t || !t.reads) return `<span class="faint">—</span>`;
  const w = (k) => (100 * t[k]) / t.reads;
  const tip = `${t.right} right · ${t.unsure} unsure · ${t.wrong} wrong, of ${t.reads} reads`;
  const other = show === "wrong" && t.unsure ? `<span class="rbar-u">${pct(t.unsure, t.reads)} unsure</span>` : "";
  return `<span class="rbar" ${dataTip(esc(tip))} tabindex="0"><span class="seg right" style="width:${w("right")}%"></span><span class="seg unsure" style="width:${w("unsure")}%"></span><span class="seg wrong" style="width:${w("wrong")}%"></span></span><span class="rbar-n">${pct(t[show], t.reads)}</span>${other}`;
}

/* A 0–1 probability as a thin bar, with the blind guess marked. */
function guessBar(v, prior) {
  if (v == null) return `<span class="faint">—</span>`;
  const mark = prior != null ? `<span class="gmark" style="left:${100 * prior}%"></span>` : "";
  const tip = `The judge's probability on the secret's true value: ${v.toFixed(2)}${prior != null ? `. A blind guess gets ${prior.toFixed(2)} (the tick).` : "."}`;
  return `<span class="gbar" ${dataTip(esc(tip))} tabindex="0"><span class="gfill" style="width:${100 * v}%"></span>${mark}</span><span class="rbar-n">${v.toFixed(2)}</span>`;
}

const legend = `<p class="r-legend"><span class="key right"></span>right <span class="key unsure"></span>unsure <span class="key wrong"></span>wrong <span class="faint">· each read scores how likely a violation is, 0–100; unsure is 31–69</span></p>`;

/* A panel folds: its question and answer stay visible, the evidence opens underneath. */
function panel(id, title, answer, note, body) {
  const open = location.hash.includes(`/${id}`) ? " open" : "";
  return `<details class="r-panel" id="${id}"${open}><summary class="r-head"><h2>${title}</h2>${answer ? `<p class="r-answer">${answer}</p>` : ""}</summary>
    <div class="r-body">${note ? `<p class="r-note">${note}</p>` : ""}${body}</div></details>`;
}

function polToggle(pol) {
  return `<div class="seg-toggle" role="group" aria-label="Policy">${["text_redaction", "text_pseudonym"].map((p) => `<button data-pol="${p}" aria-pressed="${p === pol}">${POLICY[p]}</button>`).join("")}</div>`;
}
const chosenPol = () => (query().get("pol") === "text_pseudonym" ? "text_pseudonym" : "text_redaction");

/* ---- 1. The prediction test ---------------------------------------------------------------- */

function studyShifts(pol) {
  const by = Object.fromEntries((SITE.studies || []).map((s) => [s.name, s]));
  return STUDY_JUDGE.map(([name, judge]) => ({ judge, report: by[name]?.report })).filter((j) => j.report)
    .map(({ judge, report }) => ({ judge, cells: Object.fromEntries(CELLS.map(([k]) => [k, report[k]?.[pol]]).filter(([, v]) => v?.shift)) }))
    .filter((j) => Object.keys(j.cells).length);
}

function predictionAnswer(js, pol) {
  if (!js.length) return "";
  const broken = CELLS.filter(([, , d]) => d !== 0), flat = CELLS.filter(([, , d]) => d === 0);
  const held = (j) => broken.filter(([k, , d]) => { const s = j.cells[k]?.shift; return s && (d > 0 ? s.low > 0 : s.high < 0); }).length;
  const all = js.every((j) => held(j) === broken.length);
  const moved = js.flatMap((j) => flat.map(([k, name]) => ({ j: j.judge, k, name, s: j.cells[k]?.shift, n: j.cells[k]?.cases })))
    .filter((x) => x.s && (x.s.low > 0 || x.s.high < 0));
  const most = Math.max(...js.flatMap((j) => flat.map(([k]) => Math.abs(j.cells[k]?.shift?.estimate ?? 0))));
  if (pol === "text_pseudonym") {
    const big = Math.max(...js.flatMap((j) => CELLS.map(([k]) => Math.abs(j.cells[k]?.shift?.estimate ?? 0))));
    const red = studyShifts("text_redaction");
    const redBig = Math.max(...red.flatMap((j) => CELLS.map(([k]) => Math.abs(j.cells[k]?.shift?.estimate ?? 0))));
    return `Pseudonyms move every cell far less than text redaction: at most ${Math.round(big)} points for any judge, against up to ${Math.round(redBig)}. The checker predicts this: pseudonyms keep the connections these labels need.`;
  }
  const lead = all
    ? `<b>Yes.</b> All ${broken.length} cells the checker said text redaction breaks moved the predicted way for ${js.length === 3 ? "all three" : js.length} judges, every 95% interval clear of zero.`
    : `<b>Mostly.</b> ${js.map((j) => `${j.judge} ${held(j)} of ${broken.length}`).join(", ")} broken cells moved the predicted way with the interval clear of zero.`;
  const rest = moved.length
    ? ` The cells it said stay decidable moved at most ${Math.round(most)} points; ${moved.length === 1 ? "one interval excludes zero" : `${moved.length} intervals exclude zero`}: ${moved.map((x) => `${x.j}, ${x.name.toLowerCase()} (${signed(x.s.estimate)}, ${x.n} cases)`).join("; ")}.`
    : ` The cells it said stay decidable moved at most ${Math.round(most)} points, every interval spanning zero.`;
  return lead + rest;
}

/* One row per cell: the predicted side shaded, each judge's shift as a mark with its interval. */
function shiftChart(js) {
  const LIM = 60, W = 520, LANE = 13, H = js.length * LANE + 10;
  const x = (v) => (W * (Math.max(-LIM, Math.min(LIM, v)) + LIM)) / (2 * LIM);
  const shape = (kind, cx, cy) => ({
    circle: `<circle cx="${cx}" cy="${cy}" r="4.2"/>`,
    square: `<rect x="${cx - 3.8}" y="${cy - 3.8}" width="7.6" height="7.6" rx="1"/>`,
    diamond: `<path d="M${cx} ${cy - 5}L${cx + 5} ${cy}L${cx} ${cy + 5}L${cx - 5} ${cy}Z"/>`,
    triangle: `<path d="M${cx} ${cy - 5}L${cx + 5} ${cy + 4}L${cx - 5} ${cy + 4}Z"/>`,
  }[kind]);
  const row = ([k, name, d]) => {
    const band = d === 0 ? "" : `<rect class="pc-band" x="${d > 0 ? x(0) : 0}" y="0" width="${W / 2}" height="${H}"/>`;
    const marks = js.map((j, i) => {
      const c = j.cells[k]; if (!c) return "";
      const s = c.shift, cy = 8 + i * LANE;
      const tip = `<b>${esc(j.judge)}</b><br>${esc(name)}<br>${signed(s.estimate)} points, 95% interval ${signed(s.low)} to ${signed(s.high)}<br>${c.cases} cases · ${c.reads} reads`;
      return `<g class="pc-j j${i + 1}" tabindex="0" ${dataTip(tip)}><rect class="pc-hit" x="0" y="${cy - LANE / 2}" width="${W}" height="${LANE}"/><line x1="${x(s.low)}" x2="${x(s.high)}" y1="${cy}" y2="${cy}"/>${shape(MARK[j.judge], x(s.estimate), cy)}</g>`;
    }).join("");
    return `<tr><td>${esc(name)}</td><td class="pc-way way${d}">${WAY[String(d)]}</td><td class="pc-cell"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="${esc(name)}: score shift per judge">${band}<line class="pc-zero" x1="${x(0)}" x2="${x(0)}" y1="0" y2="${H}"/>${marks}</svg></td></tr>`;
  };
  const body = ["permission", "prohibition"].map((shape) => `<tr class="group-row"><td colspan="3">${SHAPE[shape]}</td></tr>` + CELLS.filter(([k]) => k.startsWith(shape)).map(row).join("")).join("");
  const axis = `<tr class="pc-axis"><td></td><td></td><td><span>−${LIM}</span><span>← toward cleared · 0 · toward guilty →</span><span>+${LIM}</span></td></tr>`;
  const key = js.map((j, i) => `<span class="pc-key j${i + 1}"><svg viewBox="-6 -6 12 12" width="12" height="12">${shape(MARK[j.judge], 0, 0)}</svg>${esc(j.judge)} <span class="faint">${Math.max(...Object.values(j.cells).map((c) => c.cases))} per cell</span></span>`).join("");
  return `<div class="pc-legend">${key}<span class="pc-key"><span class="pc-swatch"></span>predicted side</span></div>
    <div class="scroll"><table class="left r-table pc"><thead><tr><th>Case</th><th>Checker predicts</th><th>Change in the judge's violation score after the edit (points, 95% interval)</th></tr></thead><tbody>${body}${axis}</tbody></table></div>`;
}

/* ---- Answers: one sentence per question, shared with the Overview ------------------------------ */

const brokenCells = CELLS.filter(([, , d]) => d !== 0).map(([k]) => k);
const judgeRows = (rows, j) => rows.filter((e) => e.judge === j);
const right = (t) => share(t?.right, t?.reads);
/* The judge whose policy rows cover the most policies and cases. */
function policyJudge(R, asked) {
  const by = R.tradeoffs || {};
  const judges = JUDGE_ORDER.filter((j) => by[j]?.length);
  const most = (j) => by[j].filter((t) => t.policy !== "unedited").length * 1000 + Math.max(...by[j].map((t) => t.cases));
  return { judges, judge: judges.includes(asked) ? asked : [...judges].sort((a, b) => most(b) - most(a))[0] };
}
const ordered = (rows) => [...rows].sort((a, b) => POLICY_ORDER.indexOf(a.policy) - POLICY_ORDER.indexOf(b.policy));

export function predictionAnswerFor(pol = "text_redaction") {
  return predictionAnswer(studyShifts(pol), pol);
}

function unsureAnswer(R, pol) {
  const rows = R.errs.filter((e) => e.policy === pol);
  const judges = JUDGE_ORDER.filter((j) => rows.some((e) => e.judge === j));
  if (!judges.length) return "";
  if (pol !== "text_redaction") return "Under pseudonyms the judges stay right on almost every case; the few wrong reads are spread across cells.";
  const sum = (j) => judgeRows(rows, j).filter((e) => brokenCells.includes(e.cell)).reduce((a, e) => ({ reads: a.reads + e.edited.reads, wrong: a.wrong + e.edited.wrong, unsure: a.unsure + e.edited.unsure }), { reads: 0, wrong: 0, unsure: 0 });
  const t = Object.fromEntries(judges.map((j) => [j, sum(j)]));
  const committer = judges.filter((j) => share(t[j].wrong, t[j].reads) >= 20);
  const hedgers = judges.filter((j) => !committer.includes(j));
  const hedge = hedgers.length ? `${list(hedgers)} ${hedgers.length > 1 ? "are" : "is"} mostly unsure (${list(hedgers.map((j) => pct(t[j].unsure, t[j].reads)))} of reads unsure, ${list(hedgers.map((j) => pct(t[j].wrong, t[j].reads)))} wrong)` : "";
  const commit = committer.length ? `${list(committer)} commits instead and is wrong on ${list(committer.map((j) => pct(t[j].wrong, t[j].reads)))} of reads, mostly calling innocent labs guilty` : "";
  return `<b>It depends on the judge.</b> On the four broken kinds of case, ${[hedge, commit].filter(Boolean).join("; ")}.`;
}

function costAnswer(R, asked) {
  const { judge } = policyJudge(R, asked);
  if (!judge) return "";
  const rows = ordered(R.tradeoffs[judge]);
  const base = rows.find((t) => t.policy === "unedited");
  const edits = rows.filter((t) => t.policy !== "unedited" && t.policy !== "text_generalize" && right(t.edited) != null);
  const cheap = base ? edits.filter((t) => right(base.edited) - right(t.edited) <= 5) : [];
  const worst = [...edits].sort((a, b) => right(a.edited) - right(b.edited))[0];
  if (!base || !worst) return "";
  const names = list(cheap.map((t, i) => (i ? policyName(t.policy).toLowerCase() : policyName(t.policy))));
  return `${cheap.length ? `<b>${names} ${cheap.length > 1 ? "cost" : "costs"} almost nothing</b> for ${esc(judge)}: ${list(cheap.map((t) => `${right(t.edited)}%`))} of reads right, against ${right(base.edited)}% unedited. ` : ""}${policyName(worst.policy)} costs most: ${right(worst.edited)}% right, most of the rest unsure.`;
}

function leakAnswer(R) {
  const by = R.tradeoffs || {};
  const judges = JUDGE_ORDER.filter((j) => by[j]?.some((t) => t.policy !== "unedited" && t.guess_edited != null));
  if (!judges.length) return "";
  const range = (j) => {
    const gs = by[j].filter((t) => t.policy !== "unedited" && t.policy !== "text_generalize" && t.guess_edited != null).map((t) => t.guess_edited);
    return [Math.min(...gs), Math.max(...gs)];
  };
  const prior = by[judges[0]].find((t) => t.guess_prior != null)?.guess_prior;
  const base = (j) => by[j].find((t) => t.policy === "unedited")?.guess_edited;
  const leakiest = (j) => [...by[j].filter((t) => t.policy !== "unedited" && t.guess_edited != null)].sort((a, b) => b.guess_edited - a.guess_edited)[0];
  const r = Object.fromEntries(judges.map((j) => [j, range(j)]));
  const f = (v) => v.toFixed(2);
  const lead = `<b>Every policy hides most of it.</b> Unedited, the judge is near certain of each secret (${list(judges.map((j) => `${esc(j)} ${f(base(j))}`))}); after any policy its guess falls close to a blind guess (${f(prior)}).`;
  const reader = judges.length > 1 ? ` What is left depends on the reader: ${list(judges.map((j) => `${esc(j)} ${f(r[j][0])}–${f(r[j][1])}`))}.` : "";
  const worst = ` ${list([...new Set(judges.map((j) => policyName(leakiest(j).policy)))])} ${judges.length > 1 ? "leaks" : "leaks"} the most.`;
  return lead + reader + worst;
}

function adversaryParts(R) {
  const lab = R.adversary.filter((a) => a.stance !== "honest");
  const judge = lab.length ? [...lab].sort((a, b) => b.cases - a.cases)[0].judge : null;
  const mine = R.adversary.filter((a) => !judge || a.judge === judge);
  const find = (stance, policy) => mine.find((a) => a.stance === stance && a.policy === policy);
  const stances = lab.filter((a) => a.judge === judge).map((a) => a.stance).filter((s, i, xs) => xs.indexOf(s) === i);
  const parts = stances.map((s) => {
    const w = find(s, "contextual_rewrite"), wo = find(s, "self_redaction"), hw = find("honest", "contextual_rewrite"), hwo = find("honest", "self_redaction");
    return w && wo && hw && hwo ? { s, w, wo, hw, hwo, held: right(hw.edited) - right(w.edited) <= 3 } : null;
  }).filter(Boolean);
  return { lab, judge, mine, parts };
}

function adversaryAnswer(R) {
  const { lab, judge, parts } = adversaryParts(R);
  if (!parts.length) return "";
  const say = (x) => `against the ${esc((STANCE[x.s] || x.s).replace(/^Scripted: /, "").toLowerCase())} attack, verdicts go from ${right(x.hw.edited)}% to ${right(x.w.edited)}% right with an executor (${x.w.cases} cases so far) and from ${right(x.hwo.edited)}% to ${right(x.wo.edited)}% without one (${x.wo.cases} cases)`;
  const lead = parts.every((x) => x.held) ? "<b>Only without an executor.</b>" : "<b>Partly.</b>";
  const terra = judge !== "Terra" && !lab.some((a) => a.judge === "Terra") ? " Terra hasn't read the adversarial runs yet." : "";
  return `${lead} Read by ${esc(judge)}: ${parts.map(say).join("; ")}.${terra}`;
}

function judgesAnswer(R) {
  const rows = [...R.judges].sort((a, b) => JUDGE_ORDER.indexOf(a.judge) - JUDGE_ORDER.indexOf(b.judge));
  const w = (t) => share(t?.wrong, t?.reads) ?? 0;
  const top = [...rows].sort((a, b) => w(b.flagged) - w(a.flagged))[0];
  const others = rows.filter((j) => j !== top);
  return top && others.length
    ? `<b>No.</b> After text redaction ${esc(top.judge)} calls innocent labs guilty on ${w(top.flagged)}% of reads, against ${list(others.map((j) => `${w(j.flagged)}% for ${esc(j.judge)}`))}. On unedited evidence: ${list(rows.map((j) => `${w(j.unedited)}%`))} wrong.`
    : "";
}

/* Every answer, keyed by panel id, for the Overview. */
export function answers() {
  const R = SITE.results;
  if (!R || !R.reads) return {};
  return {
    "a-predict": predictionAnswerFor("text_redaction"),
    "a-unsure": unsureAnswer(R, "text_redaction"),
    "a-cost": costAnswer(R),
    "a-adversary": adversaryAnswer(R),
    "a-judges": judgesAnswer(R),
    "a-leak": leakAnswer(R),
  };
}

/* ---- Panels ------------------------------------------------------------------------------------- */

function predictionPanel() {
  const pol = chosenPol();
  const js = studyShifts(pol);
  if (!js.length) return "";
  return panel("a-predict", "Can a checker tell in advance which cases break?", predictionAnswer(js, pol),
    `192 cases, 24 per kind, drawn by the checker's call alone before any judge read them. The checker reads each case's proof; it runs no model.`,
    `<div class="r-tools">${polToggle(pol)}</div>${shiftChart(js)}`);
}

function unsurePanel(R) {
  const pol = chosenPol();
  const rows = R.errs.filter((e) => e.policy === pol);
  const judges = JUDGE_ORDER.filter((j) => rows.some((e) => e.judge === j));
  if (!rows.length) return "";
  const cases = (j, cell) => rows.find((e) => e.judge === j && e.cell === cell);
  const body = ["permission", "prohibition"].map((shape) => {
    const cells = CELLS.map(([k]) => k).filter((c) => c.startsWith(shape) && rows.some((e) => e.cell === c));
    return `<tr class="group-row"><td colspan="${1 + judges.length}">${SHAPE[shape]}</td></tr>`
      + cells.map((c) => `<tr><td>${CELL[c]}</td>${judges.map((j) => { const e = cases(j, c); return `<td>${e ? bar(e.edited) : `<span class="faint">—</span>`}</td>`; }).join("")}</tr>`).join("");
  }).join("");
  const n = judges.map((j) => `${j} ${Math.max(...judgeRows(rows, j).map((e) => e.cases))}`).join(", ");
  return panel("a-unsure", "When a case breaks, is the judge wrong or just unsure?", unsureAnswer(R, pol),
    `Honest lab. Share of reads wrong, with the share unsure beside it. Cases per row: ${esc(n)}.`,
    `<div class="r-tools">${polToggle(pol)}</div><div class="scroll"><table class="left r-table"><thead><tr><th>Case, after ${esc(POLICY[pol].toLowerCase())}</th>${judges.map((j) => `<th>${esc(j)}</th>`).join("")}</tr></thead><tbody>${body}</tbody></table></div>`);
}

function judgeToggle(judges, judge) {
  return judges.length > 1 ? `<div class="r-tools"><div class="seg-toggle" role="group" aria-label="Judge">${judges.map((j) => `<button data-judge="${esc(j)}" aria-pressed="${j === judge}">${esc(j)}</button>`).join("")}</div></div>` : "";
}

function costPanel(R) {
  const { judges, judge } = policyJudge(R, query().get("judge"));
  if (!judge) return "";
  const rows = ordered(R.tradeoffs[judge]);
  const changed = (c) => (c ? `<span ${dataTip("Cases right unedited but not after the edit (−), and the other way round (+)")} tabindex="0">−${c.lost} <span class="faint">/</span> +${c.gained}</span>` : `<span class="faint">baseline</span>`);
  const body = rows.map((t) => `<tr${t.policy === "unedited" ? ' class="r-base"' : ""}><td>${esc(policyName(t.policy))}${t.policy === "text_generalize" ? '<sup class="faint">*</sup>' : ""}</td><td>${bar(t.edited, "right")}</td><td class="num">${changed(t.changed)}</td></tr>`).join("");
  const n = Math.max(...rows.map((t) => t.cases));
  return panel("a-cost", "What does each policy cost the verdict?", costAnswer(R, judge),
    `Honest lab, the same ${n} cases for every policy. Verdict: share of reads right. Cases −/+: right before the edit and not after, or the other way.`,
    `${judgeToggle(judges, judge)}<div class="scroll"><table class="left r-table"><thead><tr><th>Policy</th><th>Verdict</th><th class="num">Cases −/+</th></tr></thead><tbody>${body}</tbody></table></div>
    ${rows.some((t) => t.policy === "text_generalize") ? `<p class="r-foot faint">* On simulated data generalize edits exactly as pseudonyms do (no numbers or dates to keep), so it ran once and was dropped.</p>` : ""}`);
}

function adversaryPanel(R) {
  const { judge, mine } = adversaryParts(R);
  const rows = mine.filter((a) => a.stance !== "honest");
  const honest = mine.filter((a) => a.stance === "honest");
  const note = `The lab's advocate asks for edits. Under contextual rewrite an executor rules on each; under self-redaction nothing does. Granted: requests applied as asked or rewritten. Verdict: share of reads right.`;
  if (!rows.length) return panel("a-adversary", "Does a lab redacting in bad faith get through?", "", note, `<p class="empty">No adversarial runs on the validated data yet.</p>`);
  const order = ["honest", "red_team", "scripted_link", "scripted_blatant"];
  const body = [...honest, ...rows].sort((a, b) => order.indexOf(a.stance) - order.indexOf(b.stance) || a.policy.localeCompare(b.policy))
    .map((a) => `<tr${a.stance === "honest" ? ' class="r-base"' : ""}><td>${esc(STANCE[a.stance] || a.stance)}</td><td>${esc(POLICY[a.policy] || a.policy)}</td><td class="num">${a.cases}</td><td class="num">${pct(a.granted, a.requests)} <span class="faint">of ${a.requests}</span></td><td>${bar(a.edited, "right")}</td></tr>`).join("");
  return panel("a-adversary", "Does a lab redacting in bad faith get through?", adversaryAnswer(R), `${note} Judge: ${esc(judge)}.`,
    `<div class="scroll"><table class="left r-table"><thead><tr><th>Lab</th><th>Policy</th><th class="num">Cases</th><th class="num">Granted</th><th>Verdict</th></tr></thead><tbody>${body}</tbody></table></div>`);
}

function judgesPanel(R) {
  const rows = [...R.judges].sort((a, b) => JUDGE_ORDER.indexOf(a.judge) - JUDGE_ORDER.indexOf(b.judge));
  if (!rows.length) return "";
  const body = rows.map((j) => `<tr><td>${esc(j.judge)}</td><td class="num">${j.cases}</td><td>${bar(j.unedited)}</td><td>${bar(j.flagged)}</td><td>${bar(j.cleared)}</td></tr>`).join("");
  return panel("a-judges", "Do other judges read it the same way?", judgesAnswer(R),
    "Honest lab. Share of reads wrong: unedited, then after text redaction on red herrings (flagged as violations) and on violations (cleared).",
    `<div class="scroll"><table class="left r-table"><thead><tr><th>Judge</th><th class="num">Cases</th><th>Unedited</th><th>Innocent labs flagged</th><th>Violations cleared</th></tr></thead><tbody>${body}</tbody></table></div>`);
}

/* Leakage: each judge's probability on the secret's true value, per policy, on its own cases. */
function leakPanel(R) {
  const by = R.tradeoffs || {};
  const judges = JUDGE_ORDER.filter((j) => by[j]?.length);
  if (!judges.length) return "";
  const pols = POLICY_ORDER.filter((p) => p !== "text_generalize" && judges.some((j) => by[j].some((t) => t.policy === p)));
  const cell = (j, p) => { const t = by[j].find((x) => x.policy === p); return `<td>${t ? guessBar(t.guess_edited, t.guess_prior) : `<span class="faint">—</span>`}</td>`; };
  const body = pols.map((p) => `<tr${p === "unedited" ? ' class="r-base"' : ""}><td>${esc(policyName(p))}</td>${judges.map((j) => cell(j, p)).join("")}</tr>`).join("");
  const n = judges.map((j) => `${esc(j)} ${Math.max(...by[j].map((t) => t.cases))} cases`).join(", ");
  return panel("a-leak", "How much of the secret still gets out?", leakAnswer(R),
    `Honest lab. The judge's probability on each secret's true value after the edit; the tick is a blind guess, 1.00 is certain. ${n}.`,
    `<div class="scroll"><table class="left r-table"><thead><tr><th>Policy</th>${judges.map((j) => `<th>${esc(j)}</th>`).join("")}</tr></thead><tbody>${body}</tbody></table></div>`);
}

function status(R) {
  const open = R.coverage.filter((c) => c.planned && c.cases < c.planned).length;
  return `<p class="r-status"><span class="badge warn">Preliminary</span> <span class="muted">${R.reads.toLocaleString()} judge reads${open ? `; ${open} experiment${open > 1 ? "s" : ""} still running (<a href="#/experiments">progress</a>)` : ""}. Open a question for its evidence.</span></p>`;
}

const part = (title, sub) => `<header class="r-part"><h2>${title}</h2><p class="muted">${sub}</p></header>`;

/* The page's top half: null when the site has no results payload. */
export function resultsBlock() {
  const R = SITE.results;
  if (!R || !R.reads) return null;
  return status(R) + legend
    + part("Signal loss", "Does the audit still reach the right verdict after redaction?")
    + predictionPanel() + unsurePanel(R) + costPanel(R) + adversaryPanel(R) + judgesPanel(R)
    + part("Secret leakage", "Does the redacted secret get out anyway?")
    + leakPanel(R);
}

export function wireResults(root) {
  root.querySelectorAll(".seg-toggle button[data-pol]").forEach((b) => { b.onclick = () => setQuery({ pol: b.dataset.pol === "text_redaction" ? null : b.dataset.pol }); });
  root.querySelectorAll(".seg-toggle button[data-judge]").forEach((b) => { b.onclick = () => setQuery({ judge: b.dataset.judge }); });
}
