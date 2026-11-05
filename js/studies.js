/* Studies on the Results tab: each study's question, what it expected before any run, the cells
   and the cases the checker's prediction drew into them, the blind reviewer's verdicts on those
   cases, and, once the runs are in, the judge's reads per cell and the expectations scored.
   Everything comes from viewer/studies.py. */

import { datasetHref, datasetOfSet, esc, LABELS, POLICY, section, signed, SITE, term, withQuery } from "./core.js?v=2e746ab46e";
import { statusBadge } from "./direction.js?v=2e746ab46e";

const VIEW_NAME = { unedited: "Unedited", ...POLICY };

/* What text redaction does to a cell's proof, in words: an excuse or a conviction, faked or cut. */
function damageText(cell) {
  const record = cell.shape === "prohibition" ? "conviction" : "excuse";
  return { faked: `fakes the ${record}`, cut: `cuts the ${record}`, none: "leaves it decidable" }[cell.damage] || cell.damage;
}
const DAMAGE_CLASS = { faked: "fail", cut: "warn", none: "pass" };
const EXPECT = { faked: "wrong, toward the other label", cut: "unsure", none: "right" };

const caseOf = (s, id) => s.cells.flatMap((c) => c.cases).find((c) => c.id === id) || { id, set: "", family: "" };
const studyHref = (s) => `#/experiments/${encodeURIComponent(s.name)}`;
const caseHref = (c) => withQuery(`${datasetHref(datasetOfSet(c.set), "cases")}/${encodeURIComponent(c.family)}`, { case: c.id });
/* A case's ID, linked into the explorer when its set is on the site (a superseded study's pools are not). */
const onSite = (c) => (SITE.sim || []).some((b) => b.key === c.set) && datasetOfSet(c.set) !== null;
function caseLink(c, text, cls = "") {
  const k = cls ? ` class="${cls}"` : "";
  return onSite(c) ? `<a${k} href="${caseHref(c)}">${esc(text)}</a>` : `<span${k}>${esc(text)}</span>`;
}

const SHAPE_HEAD = {
  permission: "Permission claims: broken unless a record excuses the trigger",
  prohibition: "Prohibition claims: broken only when a record convicts it",
};
/* The judge a study names, or the one runs use by default (the direction file's pooling judge). */
export const judgeOf = (d) => String(d.judge_model || SITE.direction?.pooling?.judge || "default").split("/").pop();
export const policiesOf = (d) => (d.policies || []).map((p) => (POLICY[p] || p).toLowerCase()).join(" and ");

function designLine(s) {
  const d = s.design;
  const pols = policiesOf(d);
  const judge = judgeOf(d);
  return `${d.cases} cases in ${s.cells.length} cells · ${esc(pols)} · ${esc(judge)}, ${d.judge_samples} reads per question`;
}

function studyCard(s) {
  return `<a class="study-card panel" href="${studyHref(s)}"><header><h3>${esc(s.title)}</h3>${statusBadge(s.status)}</header>
    <p>${esc(s.question)}</p><p class="muted small">${designLine(s)}</p></a>`;
}

/* The expectation as written: the original text, then each amendment as its own paragraph. */
function expectation(text) {
  if (!text) return `<p class="muted">No expectation written.</p>`;
  return text.split(/\s(?=Amended \d{4}-\d{2}-\d{2})/).map((p, i) => `<p class="${i ? "study-amend" : ""}">${esc(p)}</p>`).join("");
}

function bar(c) {
  if (!c?.reads) return `<span class="faint">—</span>`;
  const w = (k) => ((c[k] / c.reads) * 100).toFixed(1);
  return `<span class="study-read"><span class="sim-bar3" title="right ${c.right}, unsure ${c.unsure}, wrong ${c.wrong} of ${c.reads} reads">${["right", "unsure", "wrong"].map((k) => `<i class="${k}" style="width:${w(k)}%"></i>`).join("")}</span><span class="small">${c.right} · ${c.unsure} · ${c.wrong}</span></span>`;
}
const shiftText = (sh) => (sh ? `${signed(sh.estimate, 1)} <span class="faint">[${signed(sh.low, 1)}, ${signed(sh.high, 1)}]</span>` : `<span class="faint">—</span>`);

export function cellTable(s) {
  const views = s.report ? ["unedited", ...s.design.policies] : [];
  const head = `<tr><th class="left">Cell</th><th class="left">${term("study_predicted", "Text redaction, predicted")}</th><th class="left">Expected read</th><th class="num">Drawn</th>
    ${views.map((v) => `<th class="left">${esc(VIEW_NAME[v] || v)}${v === "unedited" ? "" : `<div class="faint small">reads · shift</div>`}</th>`).join("")}</tr>`;
  const bySet = (cases) => {
    const sets = {};
    for (const c of cases) (sets[c.set] ||= []).push(c);
    return Object.entries(sets).map(([k, cs]) => `<div class="study-set"><span class="faint">${esc(k)}</span> ${cs.map((c) => caseLink(c, c.id.split("-")[1])).join(" ")}</div>`).join("");
  };
  const row = (cell) => {
    const r = s.report?.[cell.name] || {};
    return `<tr><td class="left"><b>${esc(LABELS[cell.label] || cell.label)}</b>
        <details class="study-cases"><summary>${cell.cases.length} cases</summary>${bySet(cell.cases)}</details></td>
      <td class="left"><span class="badge ${DAMAGE_CLASS[cell.damage] ?? ""}">${esc(damageText(cell))}</span></td>
      <td class="left muted">${esc(EXPECT[cell.damage] || "")}</td>
      <td class="num">${cell.chosen}<div class="faint small">of ${cell.available}</div></td>
      ${views.map((v) => `<td class="left">${bar(r[v])}${v === "unedited" ? "" : `<div class="small">${shiftText(r[v]?.shift)}</div>`}</td>`).join("")}</tr>`;
  };
  const span = 4 + views.length;
  const body = Object.keys(SHAPE_HEAD).map((shape) => {
    const cells = s.cells.filter((c) => c.shape === shape);
    return cells.length ? `<tr class="group"><th colspan="${span}" class="left">${esc(SHAPE_HEAD[shape])}</th></tr>${cells.map(row).join("")}` : "";
  }).join("");
  return `<div class="panel"><div class="scroll"><table class="left study-cells"><thead>${head}</thead><tbody>${body}</tbody></table></div></div>`;
}

export function reviewBlock(s) {
  const r = s.reviews;
  if (!r) return `<p class="muted">No blind review of these cases in this build. The reviewer reads each drawn case before the judge does (<code>redaction simulator review --study ${esc(s.name)}</code>), and the runs wait if it disagrees on more than 2%.</p>`;
  const share = r.reviewed ? r.agree / r.reviewed : 0;
  const list = r.disagree.length ? `<ul class="plain study-disagree">${r.disagree.map((d) => `<li>${caseLink(caseOf(s, d.case), d.case, "mono")}<span class="muted">read as <b>${esc(d.verdict.replace("_", " "))}</b>: ${esc(d.reason)}</span></li>`).join("")}</ul>` : "";
  return `<p class="study-review"><span class="badge ${share >= 0.98 ? "pass" : "fail"}">${r.agree} of ${r.reviewed} agree</span> <span class="muted">${r.reviewed < r.of ? `${r.reviewed} of ${r.of} drawn cases reviewed · ` : ""}${esc(r.reviewers.join(", "))}</span></p>${list}`;
}

export function checksBlock(s) {
  if (!s.checks.length) return `<p class="muted">Scored when the runs are in (<code>redaction simulator study-report &lt;runs&gt;</code>), against the expectations above as written.</p>`;
  const held = s.checks.filter((c) => c.ok).length;
  const rows = s.checks.map((c) => `<tr><td><span class="badge ${c.ok ? "pass" : "fail"}">${c.ok ? "holds" : "fails"}</span></td><td class="wrap">${esc(c.check)}${c.note ? ` <span class="faint">(${esc(c.note)})</span>` : ""}</td><td class="wrap muted">${esc(c.detail)}</td></tr>`).join("");
  return `<p class="muted small">${held} of ${s.checks.length} hold.</p><div class="panel"><div class="scroll"><table class="left study-checks"><thead><tr><th>Result</th><th>Expectation</th><th>Measured</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
}

function studyPage(s) {
  const d = s.design;
  const crumbs = `<a href="#/experiments">Experiments</a> / <span class="mono">${esc(s.name)}</span>`;
  const kv = (k, v) => `<div><dt>${k}</dt><dd>${v}</dd></div>`;
  const design = `<dl class="kv">${kv("Cases", `${d.cases} <span class="faint">one per world per cell</span>`)}${kv("Policies", esc(policiesOf(d)))}
    ${kv("Judge", `${esc(judgeOf(d))} <span class="faint">${d.judge_samples} reads per question</span>`)}${kv("Judge calls", (d.judge_calls || 0).toLocaleString())}
    ${kv("Sets", d.sets.map((x) => `${esc(x.set)} <span class="faint">${esc(x.version)} · ${x.cases}</span>`).join("<br>"))}</dl>`;
  const result = s.result ? section("Result", `<p>${esc(s.result)}</p>`) : "";
  return `<div class="study-head"><div class="crumbs">${crumbs}</div><h2>${esc(s.title)}</h2><p class="study-status">${statusBadge(s.status)} <span class="muted">${esc(s.question)}</span></p></div>`
    + section("Design", design)
    + section("Expected, before any run", `<div class="prose study-expect">${expectation(s.expectation)}</div>`, `<span>from docs/direction.toml</span>`)
    + section("Cells", `<p class="muted small">Cases are drawn by what the checker predicts text redaction does to each case's proof, never by a judge's read. ${s.report ? "Bars: the judge's reads, right · unsure · wrong; shift: mean change in its score after editing, with a 95% interval over cases." : "The judge's reads appear here once the runs are in."}</p>${cellTable(s)}`)
    + section("Blind review of the drawn cases", reviewBlock(s))
    + section("Expectations, scored", checksBlock(s))
    + result;
}

export function simStudies(name) {
  const all = SITE.studies || [];
  if (!all.length) return section("Studies", `<p class="empty">No study planned. <code>uv run redaction simulator study --name &lt;study&gt;</code> writes one to data/studies/.</p>`);
  const s = all.find((x) => x.name === name);
  if (s) return studyPage(s);
  return section("Studies", `<p class="muted sim-intro">A study asks one question of the simulator's cases, writes down what it expects before anything runs, and draws its cases by the checker's prediction alone. The judge's runs then test the prediction.</p><div class="study-list">${all.map(studyCard).join("")}</div>`);
}
