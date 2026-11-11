/* Notes: the markdown pages under docs/notes, then the glossary. The long write-ups other tabs fold
   under their pages (Simulator: pipeline.md; Harness: protocol.md) stay off this list. */

import { $, esc } from "../../lib/dom.js?v=0cb80a196f";
import { codeHref } from "../../data/links.js?v=0cb80a196f";
import { notePages } from "../../data/notes.js?v=0cb80a196f";
import { countedSince } from "../../data/runs.js?v=0cb80a196f";
import { staleNote } from "../../components/stale.js?v=0cb80a196f";
import { noteArticle, noteHeadings, sectionLinks } from "../../components/note.js?v=0cb80a196f";
import { pageHead } from "../../components/page.js?v=0cb80a196f";
import { glossary } from "./glossary.js?v=0cb80a196f";

/* Notes another tab shows; Notes leaves them out of its list. */
const SHOWN_ELSEWHERE = new Set(["protocol", "pipeline"]);

export function pageNotes(arg) {
  // In the build's order (publish/site/content.NOTES_PAGES). Archived notes stay in the repo
  // (docs/notes/archive/), not on the site.
  const pages = [
    ...notePages().filter((p) => !SHOWN_ELSEWHERE.has(p.slug) && !p.archived),
    { slug: "glossary", title: "Glossary", markdown: "", render: glossary },
  ];
  const [slug, anchor] = String(arg || "").split("/");
  const entry = (current) => (p) => {
    const link = `<a href="#/notes/${p.slug}" ${p.slug === current ? 'aria-current="page"' : ""}>${esc(p.title)}</a>`;
    const subs = p.slug === current ? noteHeadings(p) : [];
    return subs.length > 2 ? link + sectionLinks(`#/notes/${p.slug}`, subs) : link;
  };
  const side = (current) => `<nav class="note-side" aria-label="Notes">${pages.map(entry(current)).join("")}</nav>`;
  if (!pages.length) { $("view").innerHTML = pageHead({ title: "Notes" }) + `<p class="empty">No notes. Add pages under <code>docs/notes/</code>.</p>`; return; }
  const page = pages.find((p) => p.slug === slug) || pages[0];
  const { html, scroll } = noteArticle(page, { base: `#/notes/${page.slug}`, anchor, side: side(page.slug), link: codeHref });
  $("view").innerHTML = staleNote(page.edited, countedSince(page.edited), "This page") + html;
  scroll();
}
