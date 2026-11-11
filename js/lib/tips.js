/* Hover tips. Two kinds, one floating element:
   - term(key, label): a glossary term (column header, label, legend). Dotted underline; its text
     comes from the glossary (docs/glossary.toml, sent as SITE.glossary).
   - dataTip(html): the values behind a mark or cell (chart rows, shaded cells). No underline.
   Shown after a short delay on hover or keyboard focus; tap toggles on touch; Escape hides. */

import { esc } from "./dom.js?v=2275844be3";

let terms = {};
let constants = {};

/* The glossary and the constants its text names ("{flagged_at}"): app.js sets them at boot. */
export function setGlossary(glossary, consts) { terms = glossary?.term || {}; constants = consts || {}; }

const fill = (text) => String(text ?? "").replace(/\{(\w+)\}/g, (m, k) => (k in constants ? String(constants[k]) : m));

/* One term's name, text, formula and rule (a claim shape's, in a phrase), with the constants
   filled in; null if undefined. */
export function glossaryEntry(key) {
  const t = terms[key];
  return t ? { name: t.name || key, text: fill(t.text), formula: t.formula ? fill(t.formula) : "", rule: t.rule ? fill(t.rule) : "", group: t.group || "" } : null;
}
export const glossaryKeys = () => Object.keys(terms);

export function term(key, label) {
  return terms[key] ? `<span class="term" tabindex="0" data-tip="${key}">${label}</span>` : label;
}
export function dataTip(html) {
  return `data-tip-html="${esc(html)}"`;
}
export const tipRows = (title, rows) =>
  `<b>${esc(title)}</b>${rows.map(([k, v]) => `<span class="tip-row"><span>${esc(k)}</span><span>${esc(v)}</span></span>`).join("")}`;

(function hoverTips() {
  const el = document.createElement("div");
  el.id = "tip"; el.className = "tip"; el.setAttribute("role", "tooltip"); el.hidden = true;
  document.body.appendChild(el);
  let target = null, timer = null, lastHide = 0;
  const content = (t) => {
    if (t.dataset.tipHtml) return t.dataset.tipHtml;
    const g = glossaryEntry(t.dataset.tip);
    return g ? `${esc(g.text)}${g.formula ? `<code>${esc(g.formula)}</code>` : ""}` : "";
  };
  function place() {
    const r = target.getBoundingClientRect(), pad = 8, gap = 8;
    el.style.left = "0px"; el.style.top = "0px";
    const w = el.offsetWidth, h = el.offsetHeight;
    const left = Math.min(Math.max(pad, r.left + r.width / 2 - w / 2), window.innerWidth - w - pad);
    let top = r.top - h - gap;
    if (top < 64) top = r.bottom + gap; // below the sticky header when there's no room above
    el.style.left = `${left}px`; el.style.top = `${top}px`;
  }
  function show(t) {
    const html = content(t);
    if (!html) return;
    target = t; el.innerHTML = html; el.hidden = false; el.classList.remove("in");
    place(); requestAnimationFrame(() => el.classList.add("in"));
    t.setAttribute("aria-describedby", "tip");
  }
  function hide() {
    clearTimeout(timer);
    if (!target) return;
    target.removeAttribute("aria-describedby");
    target = null; el.hidden = true; lastHide = Date.now();
  }
  function schedule(t) {
    clearTimeout(timer);
    if (t === target) return;
    const warm = Date.now() - lastHide < 400 || target;
    timer = setTimeout(() => show(t), warm ? 0 : 350);
  }
  const find = (e) => e.target.closest?.("[data-tip], [data-tip-html]");
  document.addEventListener("pointerover", (e) => { if (e.pointerType === "touch") return; const t = find(e); if (t) schedule(t); });
  document.addEventListener("pointerout", (e) => { if (e.pointerType === "touch") return; const t = find(e); if (t && !t.contains(e.relatedTarget)) hide(); });
  document.addEventListener("focusin", (e) => { const t = find(e); if (t) schedule(t); });
  document.addEventListener("focusout", hide);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") hide(); });
  document.addEventListener("pointerdown", (e) => {
    if (e.pointerType !== "touch") { hide(); return; }
    const t = e.target.closest?.(".term");
    if (t && t !== target) { hide(); show(t); } else hide();
  });
  window.addEventListener("scroll", hide, { passive: true });
  window.addEventListener("hashchange", hide);
})();
