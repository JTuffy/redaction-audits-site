/* Breadcrumbs: where a page sits along question › experiment › run › case. One component for every
   page that has them; each crumb links to its page, the last marked as the current one.

   An item is { text, href, mono }; `text` is plain text and is escaped here. Falsy items are
   skipped, so a caller can leave out a level it doesn't have. */

import { esc } from "../lib/dom.js?v=863af23878";

export function crumbs(items) {
  const shown = items.filter(Boolean);
  if (!shown.length) return "";
  const li = ({ text, href, mono }, i) => `<li><a href="${href}"${mono ? ' class="mono"' : ""}${i === shown.length - 1 ? ' aria-current="page"' : ""}>${esc(text)}</a></li>`;
  return `<nav class="crumbs" aria-label="Breadcrumb"><ol>${shown.map(li).join("")}</ol></nav>`;
}
