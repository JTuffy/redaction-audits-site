/* A study's tables on its experiment page: the cells and the cases the validator's prediction drew
   into them, the blind reviewer's verdicts, and, once the runs are in, the judge's reads per cell and
   the expectations scored. Everything comes from site/experiments.py. */

import { esc } from "../../lib/dom.js?v=2275844be3";
import { NONE, pct, signed } from "../../lib/format.js?v=2275844be3";
import { LABELS } from "../../lib/labels.js?v=2275844be3";
import { term } from "../../lib/tips.js?v=2275844be3";
import { withQuery } from "../../lib/view-state.js?v=2275844be3";
import { reviewMin, viewName } from "../../data/constants.js?v=2275844be3";
import { datasetHref, datasetOfSet } from "../../data/datasets.js?v=2275844be3";
import { SITE } from "../../data/site.js?v=2275844be3";
import { SHAPES, shapeHead } from "../../data/studies.js?v=2275844be3";
import { readsBar } from "../../components/bars.js?v=2275844be3";
import { badge, fold, num, table } from "../../components/blocks.js?v=2275844be3";

/* What text redaction does to a cell's proof, in words: an excuse or a conviction, faked or cut. */
function damageText(c) {
  return { faked: `fakes the ${c.proof}`, cut: `cuts the ${c.proof}`, none: "leaves it decidable" }[c.damage] || c.damage;
}
const EXPECT = { faked: "wrong, toward the other label", cut: "unsure", none: "right" };

const caseOf = (s, id) => s.cells.flatMap((c) => c.cases).find((c) => c.id === id) || { id, set: "", family: "" };
const caseHref = (c) => withQuery(`${datasetHref(datasetOfSet(c.set), "cases")}/${encodeURIComponent(c.family)}`, { case: c.id });
/* A case's ID, linked into the explorer when its set is on the site (a superseded study's pools are not). */
const onSite = (c) => (SITE.sim || []).some((b) => b.key === c.set) && datasetOfSet(c.set) !== null;
function caseLink(c, text, cls = "") {
  const k = cls ? ` class="${cls}"` : "";
  return onSite(c) ? `<a${k} href="${caseHref(c)}">${esc(text)}</a>` : `<span${k}>${esc(text)}</span>`;
}

function reads(c) {
  if (!c?.reads) return NONE;
  return `<span class="study-read">${readsBar(c, { all: true, attrs: `title="right ${c.right}, unsure ${c.unsure}, wrong ${c.wrong} of ${c.reads} reads"` })}<span class="small">${c.right} · ${c.unsure} · ${c.wrong}</span></span>`;
}
const shiftText = (sh) => (sh ? `${signed(sh.estimate, 1)} <span class="faint">[${signed(sh.low, 1)}, ${signed(sh.high, 1)}]</span>` : NONE);

export function cellTable(s) {
  const views = s.report ? ["unedited", ...s.design.policies] : [];
  const head = ["Cell", term("study_predicted", "Text redaction, predicted"), "Expected read", num("Drawn"),
    ...views.map((v) => `${esc(viewName(v))}${v === "unedited" ? "" : `<div class="faint small">reads · shift</div>`}`)];
  const bySet = (cases) => {
    const sets = {};
    for (const c of cases) (sets[c.set] ||= []).push(c);
    return Object.entries(sets).map(([k, cs]) => `<div class="study-set"><span class="faint">${esc(k)}</span> ${cs.map((c) => caseLink(c, c.id.split("-")[1])).join(" ")}</div>`).join("");
  };
  const row = (c) => {
    const r = s.report?.[c.name] || {};
    return [`<b>${esc(LABELS[c.label] || c.label)}</b>${fold(`${c.cases.length} cases`, bySet(c.cases), { cls: "quiet study-cases" })}`,
      badge(esc(damageText(c)), c.damage), { html: esc(EXPECT[c.damage] || ""), cls: "muted" },
      num(`${c.chosen}<div class="faint small">of ${c.available}</div>`),
      ...views.map((v) => `${reads(r[v])}${v === "unedited" ? "" : `<div class="small">${shiftText(r[v]?.shift)}</div>`}`)];
  };
  const body = SHAPES.flatMap((shape) => {
    const cells = s.cells.filter((c) => c.shape === shape);
    return cells.length ? [{ group: shapeHead(shape), cls: "group" }, ...cells.map(row)] : [];
  });
  return table(head, body, { cls: "left study-cells" });
}

export function reviewBlock(s) {
  const r = s.reviews;
  if (!r) return `<p class="muted">No blind review of these cases in this build. The reviewer reads each drawn case before the judge does (<code>redaction simulator review --study ${esc(s.name)}</code>), and the runs wait if it disagrees on more than ${pct(1 - reviewMin(), 1)}.</p>`;
  const share = r.reviewed ? r.agree / r.reviewed : 0;
  const list = r.disagree.length ? `<ul class="plain study-disagree">${r.disagree.map((d) => `<li>${caseLink(caseOf(s, d.case), d.case, "mono")}<span class="muted">read as <b>${esc(d.verdict.replace("_", " "))}</b>: ${esc(d.reason)}</span></li>`).join("")}</ul>` : "";
  return `<p class="study-review">${badge(`${r.agree} of ${r.reviewed} agree`, share >= reviewMin() ? "pass" : "fail")} <span class="muted">${r.reviewed < r.of ? `${r.reviewed} of ${r.of} drawn cases reviewed · ` : ""}${esc(r.reviewers.join(", "))}</span></p>${list}`;
}

export function checksBlock(s) {
  if (!s.checks.length) return `<p class="muted">Scored when the runs are in (<code>redaction experiment report</code>), against the expectations above as written.</p>`;
  const held = s.checks.filter((c) => c.ok).length;
  const rows = s.checks.map((c) => [badge(c.ok ? "holds" : "fails", c.ok ? "holds" : "fails"),
    { html: `${esc(c.check)}${c.note ? ` <span class="faint">(${esc(c.note)})</span>` : ""}`, cls: "wrap" }, { html: esc(c.detail), cls: "wrap muted" }]);
  return `<p class="muted small">${held} of ${s.checks.length} hold.</p>${table(["Result", "Expectation", "Measured"], rows, { cls: "left study-checks" })}`;
}
