/* A judge's mark in a chart. Its colour and shape follow the judge's place in the judge order
   (domain/roles.JUDGE_NAMES), never its place in one chart, so a judge looks the same everywhere. */

const SHAPES = ["circle", "triangle", "square", "diamond"];

/* The class that colours a judge's marks (`--j1`…`--j4` in tokens.css). */
export const judgeClass = (rank) => `judge-mark j${Math.min(rank, SHAPES.length - 1) + 1}`;

/* The judge's symbol centred on (cx, cy). */
export function judgeMark(rank, cx, cy) {
  const kind = SHAPES[Math.min(rank, SHAPES.length - 1)];
  return {
    circle: `<circle cx="${cx}" cy="${cy}" r="4.2"/>`,
    square: `<rect x="${cx - 3.8}" y="${cy - 3.8}" width="7.6" height="7.6" rx="1"/>`,
    diamond: `<path d="M${cx} ${cy - 5}L${cx + 5} ${cy}L${cx} ${cy + 5}L${cx - 5} ${cy}Z"/>`,
    triangle: `<path d="M${cx} ${cy - 5}L${cx + 5} ${cy + 4}L${cx - 5} ${cy + 4}Z"/>`,
  }[kind];
}

/* A judge's symbol on its own, for a legend. */
export const judgeSwatch = (rank) =>
  `<svg class="${judgeClass(rank)} judge-swatch" viewBox="0 0 12 12" aria-hidden="true">${judgeMark(rank, 6, 6.5)}</svg>`;
