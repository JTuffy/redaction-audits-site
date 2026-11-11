/* stale: a line under hand-written text (a note, the paper's prose) saying how many counted runs
   were recorded after it was last edited (`data/runs.countedSince`), so a reader knows to check it
   against Findings. Nothing when no counted run is newer, or when git couldn't date the text. */

import { esc } from "../lib/dom.js?v=863af23878";

export function staleNote(editedIso, since, what) {
  if (!editedIso || !since) return "";
  const day = new Date(editedIso).toISOString().slice(0, 10);
  return `<p class="stale small">${esc(what)} was last edited ${esc(day)}; ${since} counted run${since === 1 ? "" : "s"} recorded since. Check it against <a href="#/findings">Findings</a>.</p>`;
}
