/* The prompt templates as files, grouped by the role that receives it (read from the name). Each
   shows its id (its file name) and a version (a hash of its text). They are the templates at this
   site's commit: a run records the ones it used, and a new variant is one more file. */

import { esc } from "../../lib/dom.js?v=0cb80a196f";
import { ROLE, ROLES } from "../../lib/labels.js?v=0cb80a196f";
import { promptRole } from "../../data/prompts.js?v=0cb80a196f";
import { SITE } from "../../data/site.js?v=0cb80a196f";
import { badge, fold } from "../../components/blocks.js?v=0cb80a196f";
import { section } from "../../components/page.js?v=0cb80a196f";

/* A template's kind: a variant of another template (its name extends that one's), or its family. */
function kindOf(n, all) {
  const base = Object.keys(all).filter((m) => m !== n && n.startsWith(`${m}_`)).sort((a, b) => b.length - a.length)[0];
  if (base) return badge(esc(`variant of ${base}`), "info");
  const family = (n.match(/^(stance|process|context)_/) || [])[1];
  return badge(family || "base");
}

function hash(text) { // FNV-1a, 6 hex digits: enough to tell two versions apart
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16).padStart(8, "0").slice(0, 6);
}

export function prompts() {
  const all = SITE.prompts || {};
  if (!Object.keys(all).length) return `<p class="empty">No prompts in this build.</p>`;
  const files = (role) => Object.keys(all).sort().filter((n) => promptRole(n) === role).map((n) => {
    const title = `<span class="mono">${esc(n)}</span>${kindOf(n, all)}<span class="faint mono">v ${hash(all[n])}</span><span class="faint">${all[n].split("\n").length} lines</span>`;
    return fold(title, `<pre class="prompt">${esc(all[n])}</pre>`, { cls: "quiet bare prompt-file" });
  }).join("");
  return [...ROLES, null].map((role) => { const r = files(role); return r ? section(role ? ROLE[role] : "Other", r) : ""; }).join("")
    + `<p class="small faint">Templates in <code>harness/roles/prompts/</code> at this site's commit. Each run records which templates it used and a fingerprint of the judge's.</p>`;
}
