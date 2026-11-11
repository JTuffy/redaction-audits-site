/* Reading results: the experiment template every experiment follows, and how Findings is laid out. */

import { $ } from "../../lib/dom.js?v=863af23878";
import { section } from "../../components/page.js?v=863af23878";
import { experimentsHead } from "./head.js?v=863af23878";

const TEMPLATE = ["Question", "Hypothesis", "Expectations", "Design", "Progress", "Result"];

export function pageReading() {
  $("view").innerHTML = experimentsHead("reading")
    + section("Experiment template", `<ol class="steps">${TEMPLATE.map((s) => `<li>${s}</li>`).join("")}</ol>
      <p class="lede">Each expectation is marked draft or approved. Results score each expectation against the runs; the prediction study's are scored automatically.</p>`, `<a href="#/experiments">Experiments</a>`)
    + section("Findings", `<p class="lede">One panel per question, under the two main questions. Each panel leads with its answer, computed from every counted run, then the chart or table behind it.</p>`, `<a href="#/findings">Findings</a>`);
}
