/* One set's page: a simulated set's fields and card, then its case explorer; or an archived
   benchmark set's head and tabs. */

import { $, esc } from "../../lib/dom.js?v=2275844be3";
import { SOURCE } from "../../lib/labels.js?v=2275844be3";
import { term } from "../../lib/tips.js?v=2275844be3";
import { query, withQuery } from "../../lib/view-state.js?v=2275844be3";
import { pct } from "../../lib/format.js?v=2275844be3";
import { judgeName, reviewMin, shortcutMax } from "../../data/constants.js?v=2275844be3";
import { currentOf, datasetHref, gateStatus } from "../../data/datasets.js?v=2275844be3";
import { codeHref } from "../../data/links.js?v=2275844be3";
import { ledgerEntry } from "../../data/runs.js?v=2275844be3";
import { SITE } from "../../data/site.js?v=2275844be3";
import { badge, fields, fold, subnav } from "../../components/blocks.js?v=2275844be3";
import { markdown } from "../../components/markdown.js?v=2275844be3";
import { pageHead } from "../../components/page.js?v=2275844be3";
import { BENCH_TABS, benchPage } from "../../archive/benchmark-set.js?v=2275844be3";
import { explorer, holdView } from "./explorer.js?v=2275844be3";

const shownVersion = (d) => d.versions.find((v) => v.version === query().get("version")) || currentOf(d);

function leakageBadge(v) {
  const c = v?.leakage;
  if (!c || c.valid == null) return badge("not checked");
  const share = c.several_share == null ? "" : `${pct(c.several_share, 1)} of scored secrets have 2+ candidates named`;
  return badge(c.valid ? "valid" : "not valid", c.valid ? "pass" : "warn", `title="${esc(share)}"`);
}

function setHead(d, tab) {
  const v = shownVersion(d);
  const crumbs = [{ text: "Simulator", href: "#/simulator" }, { text: "Sets", href: "#/simulator/sets" }, { text: d.name, href: datasetHref(d), mono: true }];
  const failing = (v?.gate_failures || []).length ? `<p class="small">${badge("fails a quality check", "fail")} ${v.gate_failures.map(esc).join("; ")}</p>` : "";
  if (d.source !== "benchmark") return `<div>${pageHead({ crumbs, title: esc(d.title) })}${failing}</div>`;
  const status = d.status === "current" ? "" : badge(esc(d.status));
  const which = v ? `<span class="mono">${esc(v.version)}</span>${v.version === d.current ? "<span>current</span>" : ""}${v.version === d.latest ? "<span>latest</span>" : ""}` : "";
  const built = (v?.renderer && v.renderer !== "template" ? `<span>renderer ${esc(v.renderer)}</span>` : "") + (v?.built_at ? `<span>${esc(v.built_at.replace("T", " ").slice(0, 16))} UTC</span>` : "");
  const counted = (v?.runs || []).filter((n) => ledgerEntry(n)?.counted);
  const runs = counted.length ? `<span>read by <a href="#/runs?runs=${counted.map(encodeURIComponent).join(",")}">${counted.length} run${counted.length > 1 ? "s" : ""}</a></span>` : "<span>no runs on this version</span>";
  const sub = `<span>${esc(SOURCE[d.source] || d.source)}</span>${status}${which}${built}${runs}<span>${term("data_leakage", "leakage")} ${leakageBadge(v)}</span>`;
  const tabs = subnav(BENCH_TABS.map(([k, t]) => [withQuery(datasetHref(d, k)), t, k]), tab, d.title);
  return `<div>${pageHead({ crumbs, title: esc(d.title), sub })}${d.note ? `<p class="purpose muted">${esc(d.note)}</p>` : ""}${failing}${tabs}</div>`;
}

/* A simulated set's identity and difficulty as labelled fields, and its card folded. */
function setFields(b, d) {
  const dd = b.difficulty || {}, m = dd.medians || {}, c = dd.connections || {}, n = dd.labels || {};
  const v = currentOf(d) || {};
  const claim = (SITE.claims || []).find((x) => x.id === b.claim);
  const two = c["2"] == null ? null : c["2"] + c["3+"];
  const nolink = dd.label_without_connections;
  const gates = { pass: badge("pass", "pass"), fail: badge("failing", "fail") }[gateStatus(b)] || "not run";
  const r = b.reviews;
  const review = !r ? "not run" : `${badge(`${r.agreed} of ${r.reviewed} agree`, r.share >= reviewMin() ? "pass" : "fail")} <span class="faint">${esc(r.reviewers.map((x) => judgeName(x)).join(", "))}</span>`;
  const exps = [...new Set((b.runs || []).map((r) => ledgerEntry(r.run)?.experiment).filter(Boolean))];
  const main = exps.filter((x) => !/^pilot/.test(x)), pilots = exps.length - main.length;
  const f = [
    ["Claim", claim ? `<a href="#/simulator/claims">${esc(claim.title)}</a>` : esc(b.title)],
    ["Shape", claim ? term(claim.shape, claim.shape) : "—"],
    ["Tier", esc(b.tier === "hard" ? "hard: large worlds" : b.tier === "calibration" ? "calibration: small worlds" : b.tier || "—")],
    ["Version", `<span class="mono">${esc(b.version || d.current || "")}</span>${v.built_at ? ` <span class="faint">${esc(v.built_at.slice(0, 10))}</span>` : ""}`],
    ["Cases", `${b.kept} <span class="faint">${n.violation || 0} violations, ${n.red_herring || 0} red herrings</span>`],
    [term("sim_lines", "Log lines per case"), m.lines == null ? "—" : Math.round(m.lines)],
    [term("sim_two", "Two or more connections"), two == null ? "—" : `${pct(two, 1)} of cases`],
    [term("sim_nolink", "Shortcut check"), nolink == null ? "—" : `${nolink.toFixed(2)} <span class="faint">${nolink <= shortcutMax() ? "no shortcut" : "a shortcut exists"}</span>`],
    [term("sim_gates", "Automated gates"), gates],
    [term("blind_reviewer", "Blind reviewer"), review],
    ["Read by", exps.length ? `${main.map((x) => `<a href="#/experiments/${encodeURIComponent(x)}">${esc(x)}</a>`).join(", ")}${pilots ? ` <span class="faint">and ${pilots} pilot${pilots > 1 ? "s" : ""}</span>` : ""}` : `<span class="faint">no experiment yet</span>`],
  ];
  const card = b.card || d.note ? fold("Set card: how it was made, its gates and limits", `${d.note ? `<p class="muted">${esc(d.note)}</p>` : ""}${b.card ? `<div class="prose">${markdown(b.card, { link: codeHref, level: 3 })}</div>` : ""}`, { cls: "quiet writeup" }) : "";
  return fields(f) + card;
}

export function setPage(d, rest) {
  const [tab = "cases", ...more] = rest;
  const arg = more.join("/");
  if (d.source === "benchmark") { benchPage(d, BENCH_TABS.some(([k]) => k === tab) ? tab : "cases", arg, setHead(d, tab)); return; }
  const b = (SITE.sim || []).find((x) => x.key === d.sim_key);
  const head = setHead(d, "cases");
  if (!b) { $("view").innerHTML = head + `<p class="empty">This set's files aren't on this machine. Rebuild it with <code>uv run redaction simulator build</code>.</p>`; return; }
  const family = tab === "cases" ? arg : "";
  holdView(b, () => head + setFields(b, d) + explorer(b, family), family);
}
