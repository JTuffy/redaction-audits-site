/* The Experiments tab's first sub-tab: the experiments list, or one experiment's page. The other
   sub-tabs (run log, coverage, reading results) are routed to their own modules. */

import { $, esc } from "../../lib/dom.js?v=0cb80a196f";
import { experimentNamed } from "../../data/experiments.js?v=0cb80a196f";
import { pageHead } from "../../components/page.js?v=0cb80a196f";
import { experimentsHead } from "./head.js?v=0cb80a196f";
import { experimentList } from "./list.js?v=0cb80a196f";
import { experimentPage } from "./detail.js?v=0cb80a196f";

export function pageExperiments(id) {
  const name = decodeURIComponent(id || "");
  const x = name ? experimentNamed(name) : null;
  if (name && !x) { $("view").innerHTML = pageHead({ title: "Experiments" }) + `<p class="empty">No experiment <code>${esc(name)}</code>. <a href="#/experiments">All experiments</a></p>`; return; }
  $("view").innerHTML = x ? experimentPage(x) : experimentsHead("experiments") + experimentList();
}
