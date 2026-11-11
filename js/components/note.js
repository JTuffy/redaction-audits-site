/* A note as an article, with a side list of its sections; and a note folded under another tab's
   page as its full write-up. A note is { slug, title, markdown } (data/notes.js), or a page with
   its own `render()` (the glossary). */

import { esc } from "../lib/dom.js?v=0cb80a196f";
import { fold } from "./blocks.js?v=0cb80a196f";
import { markdown, slugify } from "./markdown.js?v=0cb80a196f";

/* A note's "##" headings, in order. */
export const noteHeadings = (page) => [...(page.markdown || "").matchAll(/^##\s+(.*)$/gm)].map((m) => m[1]);

/* Links to a note's sections under `base`, for a side list. */
export const sectionLinks = (base, subs) =>
  `<div class="note-side-sub">${subs.map((s) => `<a href="${base}/${slugify(s)}">${esc(s.replace(/[`*]/g, ""))}</a>`).join("")}</div>`;

/* The note's article beside `side` (default: its own sections, when it has more than two), and a
   scroll to `anchor`. `level` is the title's heading level: 1 on its own page, 2 inside another;
   `link` resolves code spans (components/markdown.js). */
export function noteArticle(page, { base, anchor = "", side = "", link, level = 1 }) {
  const subs = noteHeadings(page);
  const list = side || (subs.length > 2 ? `<nav class="note-side" aria-label="${esc(page.title)}"><a href="${base}" aria-current="page">${esc(page.title)}</a>${sectionLinks(base, subs)}</nav>` : "");
  const body = page.render ? page.render() : markdown(page.markdown, { link, level: level + 1 });
  const html = `<div class="note${list ? " sided" : ""}">${list}<article class="prose"><h${level} class="note-title">${esc(page.title)}</h${level}>${body}</article></div>`;
  return { html, scroll: () => { if (anchor) document.getElementById(anchor)?.scrollIntoView({ block: "start" }); } };
}

/* A note folded under a page that has its own h1, open when the link names one of its sections;
   null when the note isn't in the build. */
export function writeUp(page, { base, anchor, link }) {
  if (!page) return null;
  const { html, scroll } = noteArticle(page, { base, anchor, link, level: 2 });
  return { html: fold("Full write-up", html, { cls: "quiet writeup", open: !!anchor }), scroll };
}
