/* Markdown for the notes and set cards: headings, lists, tables, status lines, folded blocks
   ("+++ Title" … "+++"), and code spans that link when `link` names a page for them. */

import { esc } from "../lib/dom.js?v=2275844be3";
import { badge, fold, table } from "./blocks.js?v=2275844be3";

export const slugify = (t) => String(t).toLowerCase().replace(/[`*]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/* Options: `link(code)` returns the page a code span names, or null (data/links.js `codeHref`);
   `block(line)` may return the HTML a whole line stands for; `level` is the heading level "##"
   renders at (2, or 3 inside a page that has its own h2s). */
export function markdown(src, opts = {}) {
  const { block, link = () => null, level = 2 } = opts;
  const inline = (t) => esc(t)
    .replace(/`([^`]+)`/g, (_, c) => { const href = link(c); return href ? `<a class="code-link" href="${href}"><code>${c}</code></a>` : `<code>${c}</code>`; })
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[\s(])\*([^*]+)\*/g, "$1<em>$2</em>");
  const cells = (row) => row.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
  const out = [];
  let para = [], list = null, rows = null, folded = null;
  const flush = () => {
    if (para.length) { out.push(`<p>${inline(para.join(" "))}</p>`); para = []; }
    if (list) { out.push(`<${list.tag}>${list.items.map((li) => `<li>${inline(li)}</li>`).join("")}</${list.tag}>`); list = null; }
    if (rows) {
      const [head, ...body] = rows;
      out.push(table(head.map(inline), body.map((r) => r.map((c) => ({ html: inline(c), cls: "wrap" }))), { cls: "left prose-table" }));
      rows = null;
    }
  };
  for (const line of src.split(/\r?\n/)) {
    // "+++ Title" opens a folded block and "+++" closes it; the lines between render on their own.
    const fence = line.match(/^\+\+\+\s*(.*)$/);
    if (folded) {
      if (fence && !fence[1]) { out.push(fold(inline(folded.title), markdown(folded.lines.join("\n"), opts))); folded = null; }
      else folded.lines.push(line);
      continue;
    }
    if (fence && fence[1]) { flush(); folded = { title: fence[1], lines: [] }; continue; }
    if (/^#\s/.test(line)) { flush(); continue; } // the page title comes from the sidebar entry
    const special = block ? block(line.trim()) : null;
    if (special != null) { flush(); out.push(special); continue; }
    if (/^\s*\|/.test(line)) {
      if (!rows) { flush(); rows = []; }
      if (!/^\s*\|[\s:|-]+\|\s*$/.test(line)) rows.push(cells(line));
      continue;
    }
    if (rows) flush();
    const h = line.match(/^(#{2,3})\s+(.*)/);
    if (h) { flush(); const n = h[1].length + level - 2; out.push(`<h${n} id="${slugify(h[2])}">${inline(h[2])}</h${n}>`); continue; }
    const st = line.match(/^Status:\s*(\w+)\s*(?:—\s*(.*))?$/);
    if (st) {
      flush();
      const k = st[1].toLowerCase();
      out.push(`<p class="status">${badge(esc(k), k)}${st[2] ? `<span class="muted">${inline(st[2])}</span>` : ""}</p>`);
      continue;
    }
    const ul = line.match(/^\s*[-*]\s+(.*)/), ol = line.match(/^\s*\d+\.\s+(.*)/);
    if (ul || ol) {
      const tag = ul ? "ul" : "ol";
      if (para.length || (list && list.tag !== tag)) flush();
      list = list || { tag, items: [] };
      list.items.push((ul || ol)[1]);
      continue;
    }
    if (!line.trim()) { flush(); continue; }
    if (list) list.items[list.items.length - 1] += " " + line.trim(); else para.push(line.trim());
  }
  flush();
  if (folded) out.push(fold(inline(folded.title), markdown(folded.lines.join("\n"), opts)));
  return out.join("");
}
