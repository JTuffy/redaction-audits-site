/* The view in the URL, the redraw hook, and what a page undoes when the reader leaves it.

   A page keeps what it shows (a filter, the chosen case or policy) in the hash's query, so a link
   or a reload opens the same view. Toggles that needn't survive a reload live in `state`. */

export const state = { allSecrets: false, showBackground: false };

export function query() { const h = location.hash, i = h.indexOf("?"); return new URLSearchParams(i < 0 ? "" : h.slice(i + 1)); }

/* `path` with the current query, changed: a key set to null or "" is dropped. */
export function withQuery(path, changes = {}) {
  const q = query();
  for (const [k, v] of Object.entries(changes)) { if (v == null || v === "") q.delete(k); else q.set(k, v); }
  const s = q.toString();
  return `${path}${s ? `?${s}` : ""}`;
}

/* Change the current view's query and redraw, without adding a history entry. */
export function setQuery(changes) { history.replaceState(null, "", withQuery(location.hash.split("?")[0] || "#/", changes)); rerender(); }

/* Re-render the current page: pages call this after changing a filter. app.js sets the router. */
let router = () => {};
export function setRouter(fn) { router = fn; }
export function rerender() { router(); }

/* What the page on screen must undo once the reader goes to another page (a timer, a held
   height). A redraw of the same page keeps it; the router calls `leavePage` on the way out. */
let teardown = null;
export function onLeave(fn) { teardown = fn; }
export function leavePage() { const fn = teardown; teardown = null; fn?.(); }
