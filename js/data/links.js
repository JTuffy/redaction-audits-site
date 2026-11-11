/* Where a name written in a note or a set card points on the site: a recorded run, a dataset or
   one of its versions, a simulated set's folder, or a study. */

import { datasetHref, datasetNamed, datasetOfSet, datasetOfVersion } from "./datasets.js?v=2275844be3";
import { experimentHref } from "./experiments.js?v=2275844be3";
import { runHref } from "./runs.js?v=2275844be3";
import { SITE } from "./site.js?v=2275844be3";

/* The page a code span names, or null. Pages pass it to `markdown` as `link`. */
export function codeHref(c) {
  if ((SITE.ledger || []).some((e) => e.name === c)) return runHref(c);
  const named = datasetNamed(c) || datasetOfSet(c.replace(/^sim-/, ""));
  if (named) return datasetHref(named);
  const d = datasetOfVersion(c);
  if (d) return datasetHref(d, "cases", { version: c === d.current ? null : c });
  if ((SITE.studies || []).some((st) => st.name === c)) return experimentHref(c);
  return null;
}

/* A dataset version ("name@version") as a source line links it: the dataset's page, at that
   version unless it is the current one; null when the site has no such dataset. */
export function datasetRefHref(ref) {
  const [name, version = ""] = String(ref).split("@");
  const d = datasetNamed(name);
  if (!d) return null;
  return datasetHref(d, "", { version: version === d.current ? null : version });
}
