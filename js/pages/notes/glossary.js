/* Notes → Glossary: the terms in docs/glossary.toml that have a group, under their groups. The same
   text shows on hover wherever a term appears. */

import { esc } from "../../lib/dom.js?v=2275844be3";
import { glossaryEntry, glossaryKeys } from "../../lib/tips.js?v=2275844be3";
import { SITE } from "../../data/site.js?v=2275844be3";
import { section } from "../../components/page.js?v=2275844be3";

export function glossary() {
  const entries = glossaryKeys().map((k) => [k, glossaryEntry(k)]);
  const groups = SITE.glossary?.groups || [];
  if (!groups.length) return `<p class="empty">No glossary in this build. Add <code>docs/glossary.toml</code>.</p>`;
  return groups.map((group) => section(esc(group), `<dl class="glossary">${entries.filter(([, g]) => g.group === group).map(([k, g]) =>
    `<div id="g-${k}"><dt>${esc(g.name)}</dt><dd>${esc(g.text)}${g.formula ? ` <code>${esc(g.formula)}</code>` : ""}</dd></div>`).join("")}</dl>`)).join("");
}
