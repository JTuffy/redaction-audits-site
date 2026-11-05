/* Markdown for the notes and set cards: headings, lists, tables, status lines, folded blocks
   ("+++ Title" … "+++"), and code spans that link when they name a run, a build, a simulated set
   or a study. */

import { datasetHref, datasetNamed, datasetOfSet, datasetOfVersion, esc, SITE } from "./core.js?v=2e746ab46e";

export const STATUS_CLASS = { open: "warn", settled: "pass", superseded: "", planned: "info", running: "warn", blocked: "fail" };

export const slugify = (t) => String(t).toLowerCase().replace(/[`*]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/* Where a code span that names something on the site points: a recorded run, a dataset or one
   of its versions, a simulated set's folder, or a study. Null for anything else. */
function codeHref(c) {
  if ((SITE.ledger || []).some((e) => e.name === c)) return c.startsWith("ablation") ? `#/ablation/${c}` : `#/run/${c}`;
  const named = datasetNamed(c) || datasetOfSet(c.replace(/^sim-/, ""));
  if (named) return datasetHref(named);
  const d = datasetOfVersion(c);
  if (d) return datasetHref(d, "cases", { version: c === d.current ? null : c });
  if ((SITE.studies || []).some((st) => st.name === c)) return `#/experiments/${encodeURIComponent(c)}`;
  return null;
}

/* `block(line)` may return the HTML a whole line stands for (Findings: question and figure lines). */
export function markdown(src, { block } = {}) {
  const inline = (t) => esc(t)
    .replace(/`([^`]+)`/g, (_, c) => { const href = codeHref(c); return href ? `<a class="code-link" href="${href}"><code>${c}</code></a>` : `<code>${c}</code>`; })
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[\s(])\*([^*]+)\*/g, "$1<em>$2</em>");
  const cells = (row) => row.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
  const out = [];
  let para = [], list = null, table = null;
  const flush = () => {
    if (para.length) { out.push(`<p>${inline(para.join(" "))}</p>`); para = []; }
    if (list) { out.push(`<${list.tag}>${list.items.map((li) => `<li>${inline(li)}</li>`).join("")}</${list.tag}>`); list = null; }
    if (table) {
      const [head, ...rows] = table;
      out.push(`<div class="panel"><div class="scroll"><table class="left prose-table"><thead><tr>${head.map((h) => `<th>${inline(h)}</th>`).join("")}</tr></thead>
        <tbody>${rows.map((r) => `<tr>${r.map((c) => `<td class="wrap">${inline(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div></div>`);
      table = null;
    }
  };
  for (const line of src.split(/\r?\n/)) {
    if (/^#\s/.test(line)) { flush(); continue; } // the page title comes from the sidebar entry
    const fold = line.match(/^\+\+\+\s*(.*)$/); // "+++ Title" opens a folded block, "+++" closes it
    if (fold) { flush(); out.push(fold[1] ? `<details class="fold"><summary>${inline(fold[1])}</summary>` : "</details>"); continue; }
    const special = block ? block(line.trim()) : null;
    if (special != null) { flush(); out.push(special); continue; }
    if (/^\s*\|/.test(line)) {
      if (!table) { flush(); table = []; }
      if (!/^\s*\|[\s:|-]+\|\s*$/.test(line)) table.push(cells(line));
      continue;
    }
    if (table) flush();
    const h = line.match(/^(#{2,3})\s+(.*)/);
    if (h) { flush(); out.push(`<h${h[1].length} id="${slugify(h[2])}">${inline(h[2])}</h${h[1].length}>`); continue; }
    const st = line.match(/^Status:\s*(\w+)\s*(?:—\s*(.*))?$/);
    if (st) {
      flush();
      const k = st[1].toLowerCase();
      out.push(`<p class="status"><span class="badge ${STATUS_CLASS[k] ?? ""}">${esc(k)}</span>${st[2] ? `<span class="muted">${inline(st[2])}</span>` : ""}</p>`);
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
  return out.join("");
}
