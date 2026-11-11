/* The source line under a number: the experiments it rests on (linked), the dataset versions they
   read (linked), the judges, and how many runs and cases. `src` is a view's entry in the results'
   `sources` (analysis/reads.py `source`), or one built the same way: { experiments, datasets
   ("name@version"), judges, runs, cases }. `links` resolves the names: { experimentHref(id),
   datasetHref(ref) (null when the site has no such dataset), byJudge (a sort comparator) }. */

import { esc } from "../lib/dom.js?v=0cb80a196f";

function datasetLink(ref, datasetHref) {
  const [name, version = ""] = String(ref).split("@");
  const href = datasetHref(ref);
  const shown = version ? ` <span class="faint">${esc(version.slice(0, 7))}</span>` : "";
  if (!href) return `<span class="mono">${esc(name)}</span>${shown}`;
  return `<a class="mono" href="${href}">${esc(name)}</a>${shown}`;
}

export function sourceLine(src, links) {
  if (!src) return "";
  const part = (label, items) => (items?.length ? `<span><b>${label}</b> ${items.join(", ")}</span>` : "");
  const experimentLink = (id) => `<a class="mono" href="${links.experimentHref(id)}">${esc(id)}</a>`;
  const counts = [src.runs != null ? `${src.runs} run${src.runs === 1 ? "" : "s"}` : "", src.cases != null ? `${src.cases} cases` : ""].filter(Boolean);
  return `<p class="source">${[
    part("Experiments", (src.experiments || []).map(experimentLink)),
    part("Data", (src.datasets || []).map((ref) => datasetLink(ref, links.datasetHref))),
    part("Judges", [...(src.judges || [])].sort(links.byJudge).map(esc)),
    counts.length ? `<span>${counts.join(", ")}</span>` : "",
  ].filter(Boolean).join("")}</p>`;
}
