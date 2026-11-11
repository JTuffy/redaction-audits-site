/* The site's data: data/site.json, set once when it arrives (setSite), and the files loaded on
   demand (a set's families, a run's reasons, a benchmark build). */

import { rerender } from "../lib/view-state.js?v=863af23878";

export let SITE = null;
export function setSite(site) { SITE = site; }

/* A JSON file loaded once, when first asked for: null while loading (the page redraws when it
   lands), then the data, or { error } if it could not be read. */
const loaded = {};
export function lazyJson(path) {
  if (loaded[path]) return loaded[path] === "loading" ? null : loaded[path];
  loaded[path] = "loading";
  fetch(path, { cache: "no-cache" })
    .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
    .then((d) => { loaded[path] = d; rerender(); })
    .catch((err) => { loaded[path] = { error: err.message }; rerender(); });
  return null;
}
