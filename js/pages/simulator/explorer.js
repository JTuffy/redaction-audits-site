/* A simulated set's case explorer. One idea runs it: a case's label rests on a chain of connections
   between log lines, and each redaction policy keeps, cuts or fakes some of them. The policy cards
   count what each policy leaves decidable; a family is one world's variants, each changing one
   fact; a case shows its chain under the chosen policy and, with a run chosen, what the judge
   scored and why. Sentences and states come from Python; the URL holds the view. */

import { $, esc } from "../../lib/dom.js?v=2275844be3";
import { wordDiff } from "../../lib/diff.js?v=2275844be3";
import { f0, human, pct } from "../../lib/format.js?v=2275844be3";
import { LABELS, LINK_STATE, READING, tone } from "../../lib/labels.js?v=2275844be3";
import { term } from "../../lib/tips.js?v=2275844be3";
import { onLeave, query, rerender } from "../../lib/view-state.js?v=2275844be3";
import { clearedAt, flaggedAt, readings, validatorViews, viewName } from "../../data/constants.js?v=2275844be3";
import { setHref } from "../../data/datasets.js?v=2275844be3";
import { experimentHref } from "../../data/experiments.js?v=2275844be3";
import { ledgerEntry, runJudge } from "../../data/runs.js?v=2275844be3";
import { lazyJson, SITE } from "../../data/site.js?v=2275844be3";
import { callItems, decidableShare, splitBar } from "../../components/bars.js?v=2275844be3";
import { badge, cell, choice, fields, fold, labelBadge, table } from "../../components/blocks.js?v=2275844be3";
import { browser, keepScroll, wireBrowser } from "../../components/browser.js?v=2275844be3";
import { legend } from "../../components/legend.js?v=2275844be3";
import { logLines, markers, markLine, wireLogs } from "../../components/logs.js?v=2275844be3";
import { section } from "../../components/page.js?v=2275844be3";

/* ---------- the view in the URL, and keeping the reader's place ---------- */

let exploring = null; // the set the explorer shows; its dataset's page holds the view
const familyHref = (family, changes = {}) => setHref(exploring, family ? `/${encodeURIComponent(family)}` : "", changes);
let holdY = null; // where the reader was when they clicked, kept until the new family has loaded
function go(family, changes) { holdY = window.scrollY; history.replaceState(null, "", familyHref(family, changes)); rerender(); }

/* Draw set `b`'s page with `render`, keeping the list's scroll and the page's height while the
   next family loads, then wire the explorer. */
export function holdView(b, render, family) {
  const same = exploring === b && $("sim-list"); // a redraw of this page: keep the reader where they were
  exploring = b;
  const view = $("view");
  const listBack = keepScroll("sim-list"), y = holdY ?? window.scrollY;
  if (same) view.style.minHeight = `${view.offsetHeight}px`; // no collapse while the next family loads
  onLeave(() => { view.style.minHeight = ""; });
  view.innerHTML = render();
  listBack();
  const loading = !!view.querySelector(".sim-detail > .empty");
  if (same || holdY != null) window.scrollTo(0, y);
  if (!loading) { holdY = null; view.style.minHeight = ""; }
  wire(family);
}

/* ---------- the judge evidence a set offers ---------- */

const ledgerOf = (name) => ledgerEntry(name) || {};
/* The studies that drew this case from this build of the set, with the cell it was drawn into. */
const studiesOf = (b, sid) => (SITE.studies || [])
  .filter((st) => st.design.sets.some((x) => x.set === b.key && x.version === b.version))
  .flatMap((st) => st.cells.filter((c) => c.cases.some((x) => x.id === sid && x.set === b.key)).map((c) => [st, c]));

/* A set's counted runs grouped by experiment and judge (an experiment's parts are disjoint cases):
   never a pilot, a smoke batch or a run replaced after stopping early; the main experiments first,
   most read first. */
function evidenceGroups(b) {
  const keep = (b.runs || []).filter((r) => ledgerOf(r.run).counted);
  const groups = new Map();
  for (const r of keep) {
    const e = ledgerOf(r.run);
    const judge = runJudge(e, "judge");
    const key = `${e.experiment || "unassigned"}|${judge}`;
    if (!groups.has(key)) groups.set(key, { key, experiment: e.experiment || "", judge, runs: [] });
    groups.get(key).runs.push(r);
  }
  return [...groups.values()].map((g) => {
    const cells = {}, reads = {};
    for (const r of g.runs) {
      for (const [v, byReading] of Object.entries(r.cells || {})) for (const [k, c] of Object.entries(byReading || {})) {
        const t = ((cells[v] ||= {})[k] ||= { cases: 0, reads: 0, right: 0, unsure: 0, wrong: 0 });
        for (const f of ["cases", "reads", "right", "unsure", "wrong"]) t[f] += c[f] || 0;
      }
      for (const [sid, byView] of Object.entries(r.reads || {})) Object.assign((reads[sid] ||= {}), byView);
    }
    const total = Object.values(cells).flatMap((x) => Object.values(x)).reduce((a, c) => a + c.reads, 0);
    return { ...g, cells, reads, total, pilot: /^pilot/.test(g.experiment) };
  }).sort((a, b) => a.pilot - b.pilot || b.total - a.total);
}
const groupLabel = (g) => `${g.experiment || "no experiment"} · ${g.judge}`;
const runFor = (g, sid, view) => g?.runs.find((r) => r.reads?.[sid]?.[view]) || null;

/* ---------- policy effects and the families ---------- */

export function explorer(set, arg) {
  const q = query();
  const lists = lazyJson(set.explorer); // the set's families and case rows
  if (!lists || lists.error) return `<p class="empty">${lists ? `Could not load ${esc(set.explorer)} (${esc(lists.error)}).` : "Loading the set…"}</p>`;
  const b = { ...set, ...lists };
  const views = validatorViews();
  const readingKeys = readings();
  const view = views.includes(q.get("view")) ? q.get("view") : "text_redaction";
  const groups = evidenceGroups(b);
  const readsView = (g) => Object.values(g.cells?.[view] || {}).some((c) => c.reads);
  const group = q.get("run") === "none" ? null : groups.find((g) => g.key === q.get("run")) || groups.find(readsView) || null;
  const reading = readingKeys.includes(q.get("reading")) ? q.get("reading") : "";
  const judge = group && ["wrong", "unsure"].includes(q.get("judge")) ? q.get("judge") : "";
  // A case's reads under the view, each [score, outcome] (stamped by the build).
  const readsOf = (sid) => group?.reads?.[sid]?.[view] || null;
  const wrongOnce = (sid) => (readsOf(sid)?.edited || []).some(([, said]) => said === "wrong");

  // Policy effects: one card per policy (the validator's split), then the three calls as filters.
  const split = (v) => ({ m: b.map[v] || {} });
  const cards = choice(views.map((v) => {
    const { m } = split(v);
    return [v, esc(viewName(v)), [splitBar(m, readingKeys), `<span class="faint">${decidableShare(m, readingKeys)} decidable</span>`]];
  }), view, "data-simview");
  const { m } = split(view);
  const judged = (r) => { const c = group?.cells?.[view]?.[r]; return c?.reads ? `<span class="small ${c.wrong ? "label-violation" : "faint"}">${pct(c.wrong, c.reads)} wrong reads</span>` : ""; };
  const filters = readingKeys.filter((r) => m[r]).map((r) => `<button type="button" class="sim-pick ${tone(r)}" data-cell="${view}|${r}" aria-pressed="${r === reading}"><span><b>${m[r]}</b> ${term(`read_${r}`, READING[r].toLowerCase())}</span>${judged(r)}</button>`).join("");
  const evidence = groups.length ? `<label class="small muted sim-run-pick">Judge reads <select id="sim-run"><option value="none" ${group ? "" : "selected"}>none</option>${groups.map((g) => `<option value="${esc(g.key)}" ${g === group ? "selected" : ""}>${esc(groupLabel(g))}</option>`).join("")}</select></label>` : "";
  const effects = section("Policy effects", `${cards}
    <div class="sim-picks">${filters}</div>
    <p class="small faint">The validator's call on each case, before any model reads it.${group ? ` Wrong reads: ${esc(groupLabel(group))}.` : ""}</p>`, evidence);

  // Cases: families on the left, one family's variants and the chosen case on the right.
  const fams = b.families.filter((f) => (!reading || f.cases.some((sid) => b.cases[sid].reading[view] === reading))
    && (!judge || f.cases.some((sid) => (judge === "wrong" ? wrongOnce(sid) : readsOf(sid)?.average === "unsure"))));
  // Unless one is chosen, open on a family the chosen run's judge read, so the first case isn't a dead end.
  const readFamily = fams.find((f) => f.cases.some(readsOf));
  const fam = fams.find((f) => f.id === arg) || readFamily || fams[0] || null;
  // A family as a row of dots, one per variant: filled for a violation, hollow for a red herring,
  // coloured by the validator's call under the chosen policy; a red ring where the judge was wrong.
  // Each dot names its label and call in text too, for screen readers.
  const item = (f) => {
    const dots = f.cases.map((sid) => {
      const c = b.cases[sid];
      const wrong = group && wrongOnce(sid);
      const said = `${LABELS[c.label]}, ${READING[c.reading[view]].toLowerCase()}${wrong ? ", judge wrong" : ""}`;
      return `${dot(c.label, c.reading[view], wrong)}<span class="vh">${esc(said)}; </span>`;
    }).join("");
    return { id: f.id, chosen: f === fam, html: `<span class="browser-id">${esc(f.id)}</span><span class="call-dots">${dots}</span>` };
  };
  const caseFilters = `${reading ? `<button type="button" class="link-btn" data-cell="${view}|${reading}">${esc(READING[reading])} only · show all</button>` : ""}
    ${group ? `<select id="sim-judge" aria-label="Filter by the judge"><option value="">All families</option><option value="wrong" ${judge === "wrong" ? "selected" : ""}>Judge wrong at least once</option><option value="unsure" ${judge === "unsure" ? "selected" : ""}>Judge unsure on average</option></select>` : ""}`;
  const d = fam ? lazyJson(`${b.detail}${encodeURIComponent(fam.id)}.json`) : null;
  let detail;
  if (!fam) detail = `<p class="empty">No family selected.</p>`;
  else if (!d) detail = `<p class="empty">Loading…</p>`;
  else if (d.error) detail = `<p class="empty">Could not load ${esc(`${b.detail}${fam.id}.json`)} (${esc(d.error)}).</p>`;
  else detail = family(b, fam, d, view, group, q.get("case"));
  const names = Object.fromEntries(readingKeys.map((r) => [r, READING[r].toLowerCase()]));
  const key = legend([
    [dot("violation", "decidable"), "violation"], [dot("red_herring", "decidable"), "red herring"],
    ...callItems(names),
    ...(group ? [[dot("violation", "decidable", true), "judge wrong"]] : []),
  ]);
  const list = browser({ id: "sim-list", label: "Families", items: fams.map(item), detail, empty: "No families match.", listCls: "fam-list", detailCls: "sim-detail" });
  return effects + section(`Cases <span class="count">${fams.length} of ${b.families.length} ${term("sim_family", "families")}</span>`, key + list, caseFilters);
}

/* A variant as a dot: filled for a violation, hollow for a red herring, in its call's colour, ringed
   red where the judge read it wrong. */
const dot = (label, reading, wrong = false) => `<i class="call-dot ${label} call-${reading}${wrong ? " judge-wrong" : ""}" title="${esc(`${LABELS[label]} · ${READING[reading]}${wrong ? " · judge wrong" : ""}`)}" aria-hidden="true"></i>`;

/* ---------- one family, one case ---------- */

function family(b, fam, d, view, group, chosen) {
  const read = fam.cases.find((x) => group?.reads?.[x]?.[view]);
  const sid = fam.cases.includes(chosen) ? chosen : read || fam.cases[0];
  const row = b.cases[sid], s = d[sid];
  const other = fam.cases.find((x) => x !== sid && b.cases[x].label !== row.label) || null;
  const pol = viewName(view).toLowerCase();
  // Each variant's row opens it; the link in it is what keyboards and screen readers use.
  const variants = table(["Label", "What this variant changes", `Under ${esc(pol)}`], fam.cases.map((x) => {
    const c = b.cases[x];
    const link = `<a href="${familyHref(fam.id, { case: x })}" data-simcase="${esc(x)}"${x === sid ? ' aria-current="true"' : ""}>${esc(c.variant || "as drawn")}</a>`;
    return { cls: `link${x === sid ? " on" : ""}`, attrs: `data-row-case="${esc(x)}"`,
      cells: [labelBadge(c.label), link, `<span class="call-${c.reading[view]}">${esc(READING[c.reading[view]])}</span>`] };
  }), { cls: "left labelled sim-variants" });
  const run = runFor(group, sid, view);
  const cases = run?.cases ? lazyJson(run.cases) : null;
  const judgeBlock = run ? judgeReads(sid, view, run, cases) : "";
  const studies = studiesOf(b, sid).map(([st, c]) => `<a href="${experimentHref(st.name)}">${esc(st.name)}</a> <span class="faint">${esc(c.name)}</span>`).join(", ");
  const review = row.review ? (row.review === (row.label === "violation" ? "violation" : "no_violation") ? "agrees" : `reads it as ${human(row.review)}`) : "";
  return `<div class="browser-head"><h3>Family ${esc(fam.id)}</h3><p class="small muted">${fam.cases.length} variants of one fictional lab, each changing one fact.</p></div>
    ${variants}
    <p class="sim-verdict">${labelBadge(row.label)} ${esc(s.story.reason || "")}</p>
    ${fold(`Proof under ${esc(pol)}`, chainList(b, row, s, view, other), { open: true, note: READING[row.reading[view]] })}
    ${judgeBlock ? fold("Judge", judgeBlock, { open: true, note: esc(groupLabel(group)) }) : group ? `<p class="small faint">${esc(groupLabel(group))} didn't read this case under ${esc(pol)}.</p>` : ""}
    ${fold("What the judge reads", judgeEvidence(sid, s, view, cases, other && d[other], other, run))}
    ${fold("The lab and what happened", `<div class="sim-two">
        <div class="sim-block"><h4>The lab</h4><ul class="sim-cast">${(s.story.cast || []).map((x) => `<li>${markLine(x, { secrets: s.story.secrets || [] })}</li>`).join("")}</ul></div>
        <div class="sim-block"><h4>What happened</h4><ol class="sim-events">${(s.story.timeline || []).map((e) => `<li><time>${esc(e.time.replace("T", " ").replace("Z", ""))}</time><span>${markLine(e.text, { secrets: s.story.secrets || [] })}</span></li>`).join("")}</ol></div>
      </div>`)}
    ${fold("Secrets", secrets(s, view))}
    ${fold("Full log", fullLog(s), { note: `${s.logs.length} lines` })}
    ${fields([["Case", `<span class="mono">${esc(sid)}</span>`], review && ["Blind reviewer", esc(review)], studies && ["Drawn into", studies]], "sim-meta")}`;
}

function via(links) {
  return links.map((m) => (m.secret ? `<span class="sim-tag" title="${esc(m.value)}">${esc(m.kind === "person" ? "name" : m.kind)}</span>` : `<span class="mono">${esc(m.value)}</span>`)).join(" ");
}

function chainList(b, row, s, view, other) {
  const head = `<p class="small muted">${term("sim_chain", "The connections the label rests on")}, and what the policy leaves of each.</p>`;
  if (!s.chain.length) return `<div class="sim-block">${head}<p class="faint small">One line decides: no connection is needed.</p></div>`;
  const like = row.reads_like_other.includes(view) && other
    ? `<p class="sim-like">Its evidence reads the same as the ${esc(LABELS[b.cases[other].label].toLowerCase())} variant's, so the fact that decides the label is gone.</p>` : "";
  const items = s.chain.map((l) => {
    const st = l.state[view];
    return `<li class="state-${st}"><span class="sim-st">${term(`st_${st}`, LINK_STATE[st])}</span><span class="sim-says">${esc(l.says)}</span><span class="sim-via">${via(l.via)}</span></li>`;
  }).join("");
  return `<div class="sim-block">${head}${like}<ol class="sim-chain">${items}</ol></div>`;
}

/* One case's reads ([score, outcome] each) on a 0–100 line, the unsure band unshaded: hollow as
   written, filled under the view. */
function strip(before, after) {
  const W = 300, H = 32, x = (v) => 8 + (v / 100) * (W - 16);
  const lanes = [0, -8, 8], placed = [];
  const dot = ([v, said], cls) => {
    const cx = x(v);
    const lane = lanes.find((dy) => !placed.some(([px, py]) => Math.abs(px - cx) < 9 && py === dy)) ?? 0;
    placed.push([cx, lane]);
    return `<circle class="${cls} ${said}" cx="${cx.toFixed(1)}" cy="${H / 2 + lane}" r="4.5"><title>${v}</title></circle>`;
  };
  const dots = [...after.map((r) => dot(r, "after")), ...before.map((r) => dot(r, "before"))].join("");
  const lo = x(clearedAt()), hi = x(flaggedAt());
  return `<svg viewBox="0 0 ${W} ${H}" class="sim-strip" role="img" aria-label="judge reads"><rect class="band" x="${x(0)}" y="3" width="${lo - x(0)}" height="${H - 6}"/><rect class="band" x="${hi}" y="3" width="${x(100) - hi}" height="${H - 6}"/><line x1="${x(0)}" x2="${x(100)}" y1="${H / 2}" y2="${H / 2}"/>${dots}</svg>`;
}

function judgeReads(sid, view, run, cases) {
  const reads = run.reads?.[sid]?.[view];
  if (!reads) return `<p class="faint small">Not read under ${esc(viewName(view).toLowerCase())}.</p>`;
  const { unedited: before, edited: after } = reads;
  const c = cases?.[sid];
  const said = view === "as_written" ? c?.unedited : c?.policies?.[view]?.edited;
  const reasons = said ? `<ol class="sim-reasons">${said.map(([v, why, outcome]) => `<li><span class="sim-score ${outcome}">${f0(v)}</span><p>${esc(why) || `<span class="faint">No reason recorded.</span>`}</p></li>`).join("")}</ol>`
    : `<p class="faint small">${run.cases ? "No reasons for this case." : "This run's reasons aren't in the build: run <code>uv run redaction p1 analyze</code> on its logs and rebuild."}</p>`;
  const scores = (rs) => rs.map(([v]) => f0(v)).join(" ");
  const nums = view === "as_written" ? scores(before) : `${scores(before)} → ${scores(after)}`;
  return `<div class="sim-block"><div class="sim-blockhead"><span class="small muted">${term("sim_judge", "Reads, unedited → edited")}</span><span class="mono small">${nums}</span></div>
    <div class="sim-stripwrap">${strip(before, view === "as_written" ? [] : after)}</div>${reasons}</div>`;
}

/* What the judge reads under the view, marked against the other variant. */
function judgeEvidence(sid, s, view, cases, o, otherId, run) {
  const fromRun = (id) => (view === "as_written" ? null : cases?.[id]?.policies?.[view]?.read);
  const lines = (run && fromRun(sid)) || s.evidence[view] || [];
  const theirs = Object.fromEntries(o ? (run && fromRun(otherId)) || o.evidence[view] || [] : []);
  const key = new Set(s.key);
  const rows = lines.map(([id, text]) => {
    const mine = theirs[id];
    const html = !o || mine == null || mine === text ? markers(esc(text))
      : markers(wordDiff(text, mine).replace(/<ins>[\s\S]*?<\/ins>/g, "").replace(/<del>([\s\S]*?)<\/del>/g, '<mark class="sim-diff">$1</mark>'));
    return `<div class="${key.has(id) ? "key" : "background"}${o && mine == null ? " only" : ""}"><span class="id">${esc(id)}</span><span class="txt">${html}</span></div>`;
  }).join("");
  return `<div class="sim-block"><div class="logs diff sim-quoted">${rows}</div></div>`;
}

function secrets(s, view) {
  const open = new Set((s.leaks[view] || []).map((r) => `${r.secret_type}|${r.value}|${r.snippet}`));
  const rowFor = (x, scored) => {
    const mine = s.routes.filter((r) => r.secret_type === x.secret_type && r.value === x.value);
    const stated = new Set(mine.filter((r) => r.level === "literal").flatMap((r) => r.lines));
    const leaks = mine.filter((r) => r.level !== "literal");
    return [`${esc(human(x.secret_type))}${scored ? "" : ` <span class="faint">not scored</span>`}`, cell(esc(x.value), "mono-cell"),
      cell(leaks.map((r) => `<mark class="log-leak">${esc(r.snippet)}</mark>${open.has(`${r.secret_type}|${r.value}|${r.snippet}`) && view !== "as_written" ? ` ${badge("still in the evidence", "fail")}` : ""}`).join("<br>") || "—", "mono-cell"),
      cell(stated.size || "—", "num", `title="${esc([...stated].join(" "))}"`)];
  };
  const rows = [...s.secrets.map((x) => rowFor(x, true)), ...s.confidential.map((x) => rowFor(x, false))];
  return `<div class="sim-block">${table(["Secret", "Value", term("sim_leak", "Given away by"), { html: "Lines stating it", cls: "num" }], rows, { cls: "left" })}</div>`;
}

function fullLog(s) {
  const corr = Object.fromEntries((s.correlates || []).map((c) => [c.log_id, c]));
  const leakOf = (e) => { const c = corr[e.log_id]; return c ? { snippet: c.snippet, type: c.secret_type } : null; };
  return `<div class="sim-block">${logLines(s.logs, { keys: s.key, secrets: s.story.secrets || [], leakOf })}</div>`;
}

function wire(arg) {
  const fam = (arg || "").split("?")[0];
  const view = $("view");
  wireBrowser("sim-list", (id) => go(id, { case: null }));
  view.querySelectorAll("[data-simview]").forEach((x) => { x.onclick = () => go(fam, { view: x.dataset.simview }); });
  view.querySelectorAll("[data-cell]").forEach((x) => {
    x.onclick = () => { const [v, r] = x.dataset.cell.split("|"); const same = x.getAttribute("aria-pressed") === "true"; go("", { view: v, reading: same ? null : r, case: null }); };
  });
  view.querySelectorAll("a[data-simcase]").forEach((a) => { a.onclick = (e) => { if (e.metaKey || e.ctrlKey || e.shiftKey) return; e.preventDefault(); go(fam, { case: a.dataset.simcase }); }; });
  view.querySelectorAll("tr[data-row-case]").forEach((tr) => { tr.onclick = (e) => { if (!e.target.closest("a")) go(fam, { case: tr.dataset.rowCase }); }; });
  const run = $("sim-run"); if (run) run.onchange = (e) => go(fam, { run: e.target.value, judge: null });
  const jd = $("sim-judge"); if (jd) jd.onchange = (e) => go("", { judge: e.target.value, case: null });
  wireLogs(view);
}
