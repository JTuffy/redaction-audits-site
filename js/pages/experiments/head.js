/* The Experiments tab's title and sub-tabs: experiments, run log, coverage, reading results. */

import { subnav } from "../../components/blocks.js?v=0cb80a196f";
import { pageHead } from "../../components/page.js?v=0cb80a196f";

const TABS = [["#/experiments", "Experiments", "experiments"], ["#/runs", "Run log", "runs"], ["#/coverage", "Coverage status", "coverage"], ["#/reading", "Reading results", "reading"]];

/* The tab's head with `current` marked. */
export const experimentsHead = (current) => `<div>${pageHead({ title: "Experiments" })}${subnav(TABS, current, "Experiments")}</div>`;
