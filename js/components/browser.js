/* A list and the chosen item's detail beside it: a set's families, a run's cases, the benchmark's
   cases. The list is a listbox: click, Enter or Space picks an item, the arrows, Home and End move
   the choice, and only the chosen item is in the tab order. */

import { $, esc, optionAttrs, wireListbox } from "../lib/dom.js?v=863af23878";

/* `items` are { id, html, chosen }; `detail` is the chosen item's markup. `listCls` and
   `detailCls` add the page's own classes. */
export function browser({ id, label, items, detail, empty = "Nothing matches.", listCls = "", detailCls = "" }) {
  const lis = items.map((x) => `<li ${optionAttrs(x.id, !!x.chosen)}>${x.html}</li>`).join("")
    || `<li role="option" aria-disabled="true" aria-selected="false"><span>${esc(empty)}</span></li>`;
  return `<div class="browser"><ol class="browser-list panel${listCls ? ` ${listCls}` : ""}" id="${esc(id)}" role="listbox" aria-label="${esc(label)}">${lis}</ol>`
    + `<article class="browser-detail${detailCls ? ` ${detailCls}` : ""}">${detail}</article></div>`;
}

/* Wire the browser's list: `pick(id)` shows that item (it redraws the page). */
export function wireBrowser(id, pick) {
  wireListbox($(id), pick);
}

/* The list's scroll, read before a redraw and put back after it: `const back = keepScroll(id);
   …redraw…; back();`. */
export function keepScroll(id) {
  const top = $(id)?.scrollTop;
  return () => { const el = $(id); if (el && top != null) el.scrollTop = top; };
}
