/* DOM helpers: find an element, escape text for HTML, make a non-button clickable by key, and wire
   a list of options. */

export const $ = (id) => document.getElementById(id);

export const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/* Click and Enter/Space both run `fn`: list rows and table rows act as buttons. */

/* An option's markup in a listbox: only the chosen one is in the tab order (the arrows move). */
export const optionAttrs = (id, chosen) => `role="option" data-id="${esc(id)}" aria-selected="${chosen}" tabindex="${chosen ? 0 : -1}"`;

/* A listbox (`role="listbox"` with an id, its items `optionAttrs`): a click, Enter or Space picks
   an option; the arrows, Home and End pick the next one. `pick(id)` redraws the page, so while
   the focus was in the list, the chosen option takes it back each time the list is wired again
   (a detail that loads later redraws the page once more). */
let focused = null; // the id of the listbox the reader was in
let byKey = false; // the last pick came from the keyboard: scroll the option into view
export function wireListbox(list, pick) {
  if (!list) return;
  const items = [...list.querySelectorAll('[role="option"]:not([aria-disabled="true"])')];
  const go = (li, key) => { focused = list.id; byKey = key; pick(li.dataset.id); };
  list.addEventListener("focusout", (e) => { if (e.relatedTarget && !list.contains(e.relatedTarget)) focused = null; });
  items.forEach((li, i) => {
    li.onclick = () => go(li, false);
    li.onkeydown = (e) => {
      const to = { ArrowDown: i + 1, ArrowUp: i - 1, Home: 0, End: items.length - 1 }[e.key];
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(li, true); }
      else if (to != null && items[to]) { e.preventDefault(); go(items[to], true); }
    };
  });
  const lost = !document.activeElement || document.activeElement === document.body;
  if (focused === list.id && lost) { list.querySelector('[aria-selected="true"]')?.focus({ preventScroll: !byKey }); byKey = false; }
}
