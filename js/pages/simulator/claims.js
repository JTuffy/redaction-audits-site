/* The claim library: one card per rule file, with what decides it, its distractors and variants,
   sample records, and the sets built from it. */

import { esc } from "../../lib/dom.js?v=863af23878";
import { datasetHref, datasetOfSet } from "../../data/datasets.js?v=863af23878";
import { SITE } from "../../data/site.js?v=863af23878";
import { badge, fold } from "../../components/blocks.js?v=863af23878";
import { logLines } from "../../components/logs.js?v=863af23878";

const SET_NAME = { checker: "Classifier coverage: checker pilot" };
const TIER = { hard: "Hard set", calibration: "Calibration set" };
const TIER_LONG = { calibration: "calibration (small worlds)", hard: "hard (large worlds, many distractors)" };
// A set's name: its tier, else its claim and tier (the classifier's one set, the pilot, by name).
const setName = (b) => TIER[b.tier] || SET_NAME[b.key] || `${b.title}: ${TIER_LONG[b.tier] || b.tier || "template"}${b.renderer && b.renderer !== "template" ? ", model text" : ""}`;

const list = (xs) => (xs.length ? `<ul class="plain claim-list">${xs.map((x) => `<li>${x}</li>`).join("")}</ul>` : `<span class="faint">none</span>`);

function card(c, sets) {
  const mine = sets.filter((b) => b.claim === c.id && datasetOfSet(b.key)?.status !== "superseded");
  const decide = c.deciding.map((d) => `<p class="claim-record"><b>${esc(d.record)}</b> that</p>${list(d.needs.map(esc))}<p class="claim-short">Falls short: ${esc(d.falls_short.join("; "))}</p>`).join("");
  const role = c.deciding.some((d) => d.role === "convicts") ? "Convicted by" : "Excused by";
  const cols = [
    ["Applies to", `<p>${esc(c.trigger)}</p>${c.excused_by_itself.length ? `<p class="claim-sub">Exempt when it is</p>${list(c.excused_by_itself.map((x) => esc(x.split(":")[0])))}` : ""}`],
    [role, decide],
    ["Distractors", list(c.distractors.map(esc))],
    ["Variants change", `<span class="claim-chips">${c.varies.map((v) => badge(esc(v))).join(" ")}</span>`],
  ];
  const records = (c.examples || []).map((x) => ({ log_id: x.record.replace(/_/g, " "), source: x.source, text: x.text, kind: "evidence" }));
  const setLinks = mine.map((b) => { const d = datasetOfSet(b.key); return d ? `<a class="claim-set" href="${datasetHref(d)}">${esc(setName(b))} <span class="faint">${b.kept} cases</span></a>` : ""; }).join("");
  return `<article class="claim-card" id="claim-${esc(c.id)}">
    <header><h2>${esc(c.title)}</h2><code class="faint">${esc(c.id)}</code></header>
    <blockquote class="claim-statement">${esc(c.statement)}</blockquote>
    <div class="claim-grid">${cols.map(([h, body]) => `<div><h3>${h}</h3>${body}</div>`).join("")}</div>
    ${records.length ? fold("Sample records", logLines(records), { note: `${records.length}` }) : ""}
    <footer><span class="claim-sets">${setLinks || `<span class="faint">No sets built</span>`}</span><span class="faint small">Rule file <code>${esc(c.file.split("/").slice(-2).join("/"))}</code> · second checker <code>${esc(c.second_checker)}</code></span></footer>
  </article>`;
}

export function claimCards() {
  const claims = SITE.claims || [];
  if (!claims.length) return `<p class="empty">No claims in the library.</p>`;
  return `<div class="claim-cards">${claims.map((c) => card(c, SITE.sim || [])).join("")}</div>`;
}
