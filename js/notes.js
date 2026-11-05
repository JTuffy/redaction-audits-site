/* Notes: the markdown pages under docs/notes, and the renderer other tabs use for theirs
   (Protocol and Pipeline on Method). */

import { $, esc, pageHead, SITE } from "./core.js?v=2e746ab46e";
import { markdown, slugify } from "./markdown.js?v=2e746ab46e";

/* Notes shown on another tab, by slug: where each lives now. */
export const NOTE_HOME = { findings: "#/findings", protocol: "#/method/protocol", pipeline: "#/method/cases" };
export const notePages = () => (Array.isArray(SITE.notes) ? SITE.notes : []);
const sections = (p) => [...p.markdown.matchAll(/^##\s+(.*)$/gm)].map((m) => m[1]);

/* One note as an article, with a side list of its sections (or of several notes) linking under `base`. */
export function noteArticle(page, base, anchor, side = "", opts = {}) {
  const subs = sections(page);
  const list = side || (subs.length > 2 ? `<nav class="side" aria-label="${esc(page.title)}"><a href="${base}" aria-current="page">${esc(page.title)}</a><div class="side-sub">${subs.map((s) => `<a href="${base}/${slugify(s)}">${esc(s.replace(/[`*]/g, ""))}</a>`).join("")}</div></nav>` : "");
  const html = `<div class="notes">${list}<article class="prose"><h1>${esc(page.title)}</h1>${markdown(page.markdown, opts)}</article></div>`;
  return { html, scroll: () => { if (anchor) document.getElementById(anchor)?.scrollIntoView({ block: "start" }); } };
}

/* ---------- Page: notes ---------- */

export function pageNotes(arg) {
  // Archived notes stay in the repo (docs/notes/archive/), not on the site.
  const pages = notePages().filter((p) => !NOTE_HOME[p.slug] && !p.archived);
  const [slug, anchor] = String(arg || "").split("/");
  const entry = (current) => (p) => {
    const link = `<a href="#/notes/${p.slug}" ${p.slug === current ? 'aria-current="page"' : ""}>${esc(p.title)}</a>`;
    const subs = p.slug === current ? sections(p) : [];
    return subs.length > 2 ? link + `<div class="side-sub">${subs.map((s) => `<a href="#/notes/${p.slug}/${slugify(s)}">${esc(s.replace(/[`*]/g, ""))}</a>`).join("")}</div>` : link;
  };
  const live = pages;
  const side = (current) => `<nav class="side" aria-label="Notes">${live.map(entry(current)).join("")}</nav>`;
  if (!pages.length) { $("view").innerHTML = pageHead({ title: "Notes" }) + `<p class="empty">No notes. Add pages under <code>docs/notes/</code>.</p>`; return; }
  const page = pages.find((p) => p.slug === slug) || live[0] || pages[0];
  const { html, scroll } = noteArticle(page, `#/notes/${page.slug}`, anchor, side(page.slug));
  $("view").innerHTML = html;
  scroll();
}
