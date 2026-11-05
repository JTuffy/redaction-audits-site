/* The questions (H1–H4, E1, E2) from docs/direction.toml: the one place each status and answer
   lives. Findings opens each section with a question block (a `Question: ID` line); the Overview
   lists them in one line each; experiments name the question they bear on. */

import { dataTip, dayOf, esc, f2, SITE, themeNow } from "./core.js?v=2e746ab46e";

export const Q_STATUS = { supported: "pass", partial: "warn", untested: "", refuted: "fail", rerun: "info" };
const Q_TEXT = { rerun: "re-running" };
/* Evidence archived on 2 Nov (it rested on data the final product doesn't): re-running on the
   validated simulator sets; the archived status and answer stay visible, marked as such. */
export const rerunning = (q) => q.status === "rerun";
export const questions = () => SITE.questions || [];
export const questionById = (id) => questions().find((q) => q.id === id) || null;
export const questionHref = (id) => `#/findings/q-${String(id).toLowerCase()}`;
export const questionBadge = (q) => `<span class="badge ${Q_STATUS[q.status] ?? ""}">${esc(Q_TEXT[q.status] || q.status)}</span>`;
export const questionChip = (id) => { const q = questionById(id); return q ? `<a class="q-chip" href="${questionHref(id)}" ${dataTip(esc(q.title))}>${esc(id)}</a>` : ""; };

const pct = (v) => `${Math.round(v * 100)}%`;
const METRIC_FMT = { grant_rate: pct, as_asked: pct, rewritten: pct, denied: pct, integrity_flags: pct, fnr: f2, fpr: f2, leakage: f2, persistence: f2 };
export const fmtMeasure = (m) => (m.value == null ? "—" : (METRIC_FMT[m.metric] || f2)(m.value));
const runsHref = (runs) => (runs.length === 1 ? `#/run/${encodeURIComponent(runs[0])}` : `#/runs?runs=${runs.map(encodeURIComponent).join(",")}`);

/* The one number the Overview shows: the headline measure, else the key sentence. */
export function headline(q) {
  const m = (q.measure || []).find((x) => x.label === q.headline) || (q.key ? null : (q.measure || [])[0]);
  return m ? { label: m.label, value: fmtMeasure(m), runs: m.runs || [], n: m.n } : q.key ? { text: q.key } : null;
}

function spark(trend) {
  const pts = trend.filter((t) => t.value != null);
  if (pts.length < 2) return "";
  const w = 64, h = 18, top = Math.max(1.2, ...pts.map((t) => t.value)), bot = Math.min(0, ...pts.map((t) => t.value));
  const x = (i) => 4 + (i * (w - 8)) / (pts.length - 1);
  const y = (v) => h - 3 - ((v - bot) / (top - bot || 1)) * (h - 6);
  const tip = pts.map((t) => `${dayOf(t.run).split(",")[0]} ${f2(t.value)} (n ${t.n})`).join("<br>");
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="per-run values" ${dataTip(tip)} tabindex="0"><polyline points="${pts.map((t, i) => `${x(i).toFixed(1)},${y(t.value).toFixed(1)}`).join(" ")}" />${pts.map((t, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(t.value).toFixed(1)}" r="2" />`).join("")}</svg>`;
}

function measureRow(m) {
  const ci = m.low != null ? `${fmtMeasure({ ...m, value: m.low })}–${fmtMeasure({ ...m, value: m.high })}` : "";
  const runs = m.runs?.length ? `<a href="${runsHref(m.runs)}" ${dataTip(m.runs.map(esc).join("<br>"))}>${m.runs.length} run${m.runs.length > 1 ? "s" : ""}</a>` : `<span class="faint">no runs</span>`;
  const left = m.other_setup?.length ? `<div class="small faint">${m.other_setup.length} run${m.other_setup.length > 1 ? "s" : ""} with another judge setup left out</div>` : "";
  return `<tr><td>${esc(m.label)}${left}</td><td class="num"><b>${fmtMeasure(m)}</b><span class="ci faint">${ci}</span></td>
    <td class="num" ${m.clusters ? dataTip(`${m.n} samples from ${m.clusters} evidence skeletons; the interval resamples skeletons`) : ""}>${m.n || "—"}</td><td>${runs}${spark(m.trend || [])}</td></tr>`;
}

/* A question as it opens its Findings section: status, answer, how sure, and the pooled numbers. */
export function questionBlock(q) {
  const rows = (q.measure || []).map(measureRow).join("");
  const over1 = (q.measure || []).some((m) => m.metric === "persistence" && m.value > 1);
  const pool = SITE.direction?.pooling || {};
  const basis = q.basis === "written first" ? `<span class="badge pass">expectations written first</span>` : `<span class="badge">exploratory</span>`;
  const old = rerunning(q);
  return `<div class="q-block panel${old ? " archived" : ""}" id="q-${esc(q.id.toLowerCase())}"><p class="q-line"><span class="q-id">${esc(q.id)}</span>${questionBadge(q)}${old ? "" : basis}<span class="q-title">${esc(q.title)}</span></p>
    ${old ? `<p class="q-rerun small">Re-running on the validated simulator sets. Below: what the archived evidence said (${esc(q.archived_status || "")}).</p>` : ""}
    <p class="q-answer">${esc(q.answer || "")}</p>
    ${q.key ? `<p class="q-key">${esc(q.key)}</p>` : ""}
    ${q.caveat ? `<p class="q-caveat small"><b>Keep in mind:</b> ${esc(q.caveat)}</p>` : ""}
    ${rows ? `<div class="scroll"><table class="q-table"><thead><tr><th>${old ? "Archived: pooled " : "Pooled "}measure <span class="faint">(${esc(pool.split || "any split")}, judge ${esc(String(pool.judge || "any").split("/").pop())})</span></th><th class="num">Value <span class="faint">95% CI</span></th><th class="num">n</th><th>Runs</th></tr></thead><tbody>${rows}</tbody></table></div>
    ${over1 ? `<p class="small faint">Persistence above 1 is noise around 1: the edited evidence separated a little better than the unedited by chance.</p>` : ""}` : ""}</div>`;
}

/* A drawn figure: light and dark versions when listed in paper/figures/figures.json, else the one file. */
export function figureBlock(id) {
  const f = (SITE.figures || []).find((x) => x.id === id);
  const src = f ? `figures/${esc(id)}-${themeNow()}.svg` : `figures/${esc(id)}.svg`;
  return `<figure class="result-fig solo"><img src="${src}" alt="${esc(f?.title || id)}" loading="lazy">${f ? `<figcaption><b>${esc(f.title)}.</b> <span class="muted small">${esc(f.caption)}</span></figcaption>` : ""}</figure>`;
}

/* Lines in a markdown note that stand for a block: `Question: E1, H1` and `Figure: id`. */
export function findingsBlock(line) {
  const q = line.match(/^Question:\s*(.+)$/);
  if (q) return q[1].split(",").map((s) => questionById(s.trim())).filter(Boolean).map(questionBlock).join("");
  const f = line.match(/^Figure:\s*([\w-]+)\s*$/);
  if (f) return figureBlock(f[1]);
  return null;
}
