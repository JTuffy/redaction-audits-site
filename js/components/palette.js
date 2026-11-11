/* palette: a search box over every place on the site, opened by its button or Ctrl K (Cmd K).
   Type to narrow, the arrows move the choice, Enter goes there, Escape closes. */

import { esc } from "../lib/dom.js?v=2275844be3";

const SHOWN = 12; // matches listed at once: a list to pick from, not to scroll

/* The entries every typed word appears in, those whose title starts with the first word first. */
function matching(entries, typed) {
  const words = typed.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return entries.slice(0, SHOWN);
  const text = (e) => `${e.title} ${e.detail} ${e.kind}`.toLowerCase();
  const opens = (e) => (e.title.toLowerCase().startsWith(words[0]) ? 0 : 1);
  return entries.filter((e) => words.every((w) => text(e).includes(w))).sort((a, b) => opens(a) - opens(b)).slice(0, SHOWN);
}

const row = (e, i, chosen) => `<li role="option" id="palette-${i}" data-i="${i}" aria-selected="${i === chosen}">`
  + `<span class="palette-kind">${esc(e.kind)}</span><span class="palette-title">${esc(e.title)}</span>`
  + `<span class="palette-detail">${esc(e.detail)}</span></li>`;

/* Wire `button` and the shortcut to open the palette. `entries()` returns { kind, title, detail,
   href } for every place; it is read each time the palette opens. */
export function wirePalette(button, entries) {
  const box = document.createElement("dialog");
  box.className = "palette";
  box.innerHTML = `<input type="text" id="palette-input" placeholder="Search experiments, runs, datasets, notes…" aria-label="Search the site" aria-controls="palette-list" autocomplete="off">`
    + `<ol id="palette-list" role="listbox" aria-label="Matches"></ol>`;
  document.body.append(box);
  const input = box.querySelector("input"), list = box.querySelector("ol");
  let all = [], shown = [], chosen = 0;

  const draw = () => {
    shown = matching(all, input.value);
    chosen = Math.min(chosen, Math.max(shown.length - 1, 0));
    list.innerHTML = shown.map((e, i) => row(e, i, chosen)).join("") || `<li class="palette-none">Nothing matches.</li>`;
    input.setAttribute("aria-activedescendant", shown.length ? `palette-${chosen}` : "");
  };
  const go = (e) => { if (!e) return; box.close(); location.hash = e.href; };
  const open = () => { all = entries(); input.value = ""; chosen = 0; draw(); box.showModal(); };

  input.oninput = () => { chosen = 0; draw(); };
  input.onkeydown = (ev) => {
    const step = { ArrowDown: 1, ArrowUp: -1 }[ev.key];
    if (step) { ev.preventDefault(); chosen = (chosen + step + shown.length) % Math.max(shown.length, 1); draw(); }
    else if (ev.key === "Enter") { ev.preventDefault(); go(shown[chosen]); }
  };
  list.onclick = (ev) => go(shown[ev.target.closest("li[data-i]")?.dataset.i]);
  box.onclick = (ev) => { if (ev.target === box) box.close(); }; // a click on the backdrop
  button.onclick = open;
  document.addEventListener("keydown", (ev) => {
    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "k") { ev.preventDefault(); if (box.open) box.close(); else open(); }
  });
}
