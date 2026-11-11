/* A case's log lines, each with its kind's colour at the edge, key evidence marked, background
   lines hidden until the reader shows them; and the marks inside a line: redaction markers, the
   details that give a secret away, and secret values. */

import { esc } from "../lib/dom.js?v=2275844be3";
import { human } from "../lib/format.js?v=2275844be3";
import { term } from "../lib/tips.js?v=2275844be3";
import { rerender, state } from "../lib/view-state.js?v=2275844be3";

const pattern = (s) => new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");

/* A redaction marker ("[REDACTED: name]") as a small black bar naming what was removed. */
export const markers = (html) => html.replace(/\[REDACTED: ([^\]<]+)\]/g, (_, k) => `<span class="log-bar" title="redacted: ${k}">${k}</span>`);

/* `text` as HTML with its marks: redaction markers, `leaks` ({ snippet, type }: a detail that gives
   a secret away) and `secrets` (values). Overlaps keep the first, longest mark. */
export function markLine(text, { secrets = [], leaks = [] } = {}) {
  const spans = [];
  const find = (needle, kind, extra) => {
    if (!needle) return;
    const re = pattern(needle);
    let m;
    while ((m = re.exec(text))) spans.push([m.index, m.index + m[0].length, kind, extra]);
  };
  const bars = /\[REDACTED: ([^\]]+)\]/g;
  let m;
  while ((m = bars.exec(text))) spans.push([m.index, m.index + m[0].length, "bar", m[1]]);
  for (const l of leaks) find(l.snippet, "leak", l.type);
  for (const s of secrets) find(s, "secret");
  spans.sort((a, b) => a[0] - b[0] || b[1] - a[1]);
  let out = "", at = 0;
  for (const [s, e, kind, extra] of spans) {
    if (s < at) continue;
    const t = esc(text.slice(s, e));
    out += esc(text.slice(at, s)) + (kind === "bar" ? `<span class="log-bar" title="redacted: ${esc(extra)}">${esc(extra)}</span>`
      : kind === "leak" ? `<mark class="log-leak" title="${extra ? `gives away the ${esc(human(extra))}` : "gives a secret away"}">${t}</mark>`
      : `<mark class="log-secret" title="confidential">${t}</mark>`);
    at = e;
  }
  return out + esc(text.slice(at));
}

/* Log lines ({ log_id, source, text, kind }) under a heading, with the toggle that shows the
   background. `keys` are the key evidence's ids; `secrets` the values to mark; `leakOf(line)` the
   detail in a line that gives a secret away ({ snippet, type }), or null. */
export function logLines(lines, { heading = "", keys = [], secrets = [], leakOf = () => null } = {}) {
  const key = new Set(keys);
  const hidden = lines.filter((e) => e.kind === "background").length;
  const rows = lines.filter((e) => state.showBackground || e.kind !== "background").map((e) => {
    const leak = leakOf(e);
    return `<div class="${e.kind === "background" ? "background" : ""}${key.has(e.log_id) ? " key" : ""}"><i class="kind-${e.kind || "background"}"></i><span class="id">${esc(e.log_id)}</span><span class="src">${esc(e.source)}</span><span class="txt">${markLine(e.text, { secrets, leaks: leak ? [leak] : [] })}</span></div>`;
  }).join("");
  const toggle = hidden ? `<label class="toggle"><input type="checkbox" data-show-background ${state.showBackground ? "checked" : ""}> ${hidden} ${term("background", "background lines")}</label>` : "";
  return `${heading || toggle ? `<div class="row-head">${heading || "<span></span>"}${toggle}</div>` : ""}<div class="logs">${rows}</div>`;
}

/* Wire the background toggles under `root`: a change redraws the page. */
export function wireLogs(root) {
  root.querySelectorAll("[data-show-background]").forEach((x) => { x.onchange = (e) => { state.showBackground = e.target.checked; rerender(); }; });
}
