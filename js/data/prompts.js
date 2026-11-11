/* The prompt templates (harness/roles/prompts, sent as SITE.prompts), by the role each is written
   for, read from its name. */

import { SITE } from "./site.js?v=2275844be3";

/* Role -> the templates written for it, in display order (domain/roles names the roles). */
const OWNS = [
  ["advocate", /^(advocate|stance_|process_)/],
  ["executor", /^(executor|rules)/],
  ["judge", /^(judge_|context_)/],
  ["integrity_check", /^integrity_check$/],
];
/* Templates another role's prompt quotes: the advocate's process paragraph includes the rules. */
const QUOTES = { advocate: ["rules"] };

/* The role a template is written for, or null (a retry, any template no role owns). */
export const promptRole = (name) => OWNS.find(([, re]) => re.test(name))?.[0] ?? null;

/* The templates a role receives: its own (the one named after it first), then any it quotes. */
export function promptsFor(role) {
  const names = Object.keys(SITE.prompts || {});
  const own = names.filter((n) => promptRole(n) === role).sort((a, b) => (b === role) - (a === role) || a.localeCompare(b));
  return [...own, ...(QUOTES[role] || []).filter((n) => names.includes(n) && !own.includes(n))];
}
