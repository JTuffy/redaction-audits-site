/* A page's head (crumbs, title, sub line, purpose) and its titled sections. */

import { crumbs as trail } from "./crumbs.js?v=2275844be3";

/* `crumbs` is a list of breadcrumb items (components/crumbs.js); `title`, `sub` and `purpose` are HTML. */
export function pageHead({ crumbs, title, sub, purpose }) {
  return `<div>
    ${crumbs ? trail(crumbs) : ""}
    <h1>${title}</h1>
    ${sub ? `<div class="sub">${sub}</div>` : ""}
    ${purpose ? `<p class="purpose">${purpose}</p>` : ""}
  </div>`;
}

export function section(title, body, aside = "") {
  return `<section><header><h2>${title}</h2>${aside ? `<div class="aside">${aside}</div>` : ""}</header>${body}</section>`;
}
