/* The shared building blocks every page uses, so the same kind of thing looks the same everywhere.
   Each returns an HTML string; callers escape their own text unless noted.

   fields     labelled fields in a grid (a run's identity, a set's details)
   stats      big-number boxes with a label and a note
   cards      small titled cards in a grid
   flow       numbered steps in a row
   fold       a collapsible block: boxed by default, `quiet` for a plain line
   table      a table, in a panel unless told otherwise
   subnav     the tabs under a page title
   badge      a pill; its tone from the status (lib/labels.js `tone`) or given
   labelBadge the case label (violation, red herring)
   choice     a row of selectable cards (policy variations, judges) */

import { esc } from "../lib/dom.js?v=863af23878";
import { LABELS, tone } from "../lib/labels.js?v=863af23878";

export const fields = (items, cls = "") =>
  `<dl class="fields${cls ? ` ${cls}` : ""}">${items.filter(Boolean).map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("")}</dl>`;

export const stats = (items) =>
  `<dl class="stats">${items.map(([k, v, note]) => `<div><dt>${k}</dt><dd>${v}${note ? `<span>${note}</span>` : ""}</dd></div>`).join("")}</dl>`;

export const cards = (items) =>
  `<div class="cards">${items.map(([h, b, extra]) => `<div class="card"><h3>${h}</h3><p>${b}</p>${extra || ""}</div>`).join("")}</div>`;

export const flow = (steps) =>
  `<ol class="flow">${steps.map(([h, b, where]) => `<li><h3>${h}</h3><p>${b}</p>${where ? `<code>${esc(where)}</code>` : ""}</li>`).join("")}</ol>`;

export const fold = (title, inner, { open = false, note = "", cls = "", attrs = "" } = {}) =>
  `<details class="fold${cls ? ` ${cls}` : ""}"${attrs ? ` ${attrs}` : ""}${open ? " open" : ""}><summary>${title}${note ? `<span class="fold-note">${note}</span>` : ""}</summary><div class="fold-body">${inner}</div></details>`;

/* A table. A cell is HTML, or { html, cls, attrs } (attrs is attribute text, e.g. a colspan). A row
   is a list of cells, { cells, cls, attrs }, or { group } for a full-width heading row. `head` is
   one row of header cells, or a list of rows. */
const cellHtml = (tag) => (c) => (c && typeof c === "object"
  ? `<${tag}${c.cls ? ` class="${c.cls}"` : ""}${c.attrs ? ` ${c.attrs}` : ""}>${c.html ?? ""}</${tag}>`
  : `<${tag}>${c ?? ""}</${tag}>`);
export const cell = (html, cls = "", attrs = "") => ({ html, cls, attrs });
export const num = (html) => ({ html, cls: "num" });
export function table(head, rows, { cls = "", panel = true, empty = "" } = {}) {
  const heads = Array.isArray(head[0]) ? head : [head];
  const width = heads[heads.length - 1].length;
  const row = (r) => {
    if (r.group != null) return `<tr class="${r.cls || "group-row"}"><td colspan="${width}">${r.group}</td></tr>`;
    const cells = Array.isArray(r) ? r : r.cells;
    return `<tr${r.cls ? ` class="${r.cls}"` : ""}${r.attrs ? ` ${r.attrs}` : ""}>${cells.map(cellHtml("td")).join("")}</tr>`;
  };
  const body = rows.length ? rows.map(row).join("") : empty ? `<tr><td colspan="${width}" class="muted">${empty}</td></tr>` : "";
  const t = `<div class="scroll"><table${cls ? ` class="${cls}"` : ""}><thead>${heads.map((h) => `<tr>${h.map(cellHtml("th")).join("")}</tr>`).join("")}</thead><tbody>${body}</tbody></table></div>`;
  return panel ? `<div class="panel">${t}</div>` : t;
}

/* Tabs under a page title: [href, text, key]; the one whose key is `current` is marked. `extra`
   goes at the end (a link out). */
export const subnav = (tabs, current, label = "Sections", extra = "") =>
  `<nav class="tabs" aria-label="${esc(label)}">${tabs.map(([href, t, key]) => `<a href="${href}" ${key === current ? 'aria-current="page"' : ""}>${esc(t)}</a>`).join("")}${extra}</nav>`;

/* A pill. `status` picks the tone through the one status map, unless a tone is given. */
export const badge = (text, status = "", attrs = "") => {
  const t = ["pass", "warn", "fail", "info"].includes(status) ? status : tone(status);
  return `<span class="badge${t ? ` ${t}` : ""}"${attrs ? ` ${attrs}` : ""}>${text}</span>`;
};

export const labelBadge = (label) => badge(esc(LABELS[label] || label), label === "violation" ? "fail" : "");

/* Selectable cards: items are [key, title, lines[]]; `attr` carries the key to the page's handler. */
export const choice = (items, selected, attr) =>
  `<div class="choice">${items.map(([key, title, lines]) => `<button type="button" class="choice-card" ${attr}="${esc(key)}" aria-pressed="${key === selected}"><b>${title}</b>${(lines || []).map((l) => `<span>${l}</span>`).join("")}</button>`).join("")}</div>`;
