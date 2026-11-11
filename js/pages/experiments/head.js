/* The Experiments tab's title and sub-tabs: experiments, run log, coverage, reading results. */

import { subnav } from "../../components/blocks.js?v=2275844be3";
import { pageHead } from "../../components/page.js?v=2275844be3";

const TABS = [["#/experiments", "Experiments", "experiments"], ["#/runs", "Run log", "runs"], ["#/coverage", "Coverage status", "coverage"], ["#/reading", "Reading results", "reading"]];

/* The tab's head with `current` marked. */
export const experimentsHead = (current) => `<div>${pageHead({ title: "Experiments" })}${subnav(TABS, current, "Experiments")}</div>`;
