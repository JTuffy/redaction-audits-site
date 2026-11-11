/* The markdown pages under docs/notes, as the build sends them (SITE.notes). */

import { SITE } from "./site.js?v=863af23878";

export const notePages = () => (Array.isArray(SITE.notes) ? SITE.notes : []);
export const noteNamed = (slug) => notePages().find((p) => p.slug === slug) || null;
