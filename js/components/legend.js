/* A legend: each mark on a page and what it stands for, in a row; `stacked` lists them with a
   value each (lines by kind). A mark is any small markup: a colour swatch, a dot, a chart symbol. */

/* A colour swatch. Its tone is a read or a validator call (right, unsure, wrong), a line's kind
   (kind-evidence, …), or `predicted` (the side a prediction shades). */
export const swatch = (tone) => `<i class="legend-swatch ${tone}" aria-hidden="true"></i>`;

/* Items are [mark, label] or [mark, label, value]; `note` follows them as plain text. */
export function legend(items, { note = "", stacked = false, cls = "" } = {}) {
  const item = ([mark, label, value]) => `<span class="legend-item">${mark}<span>${label}</span>${value != null ? `<span class="legend-value">${value}</span>` : ""}</span>`;
  return `<div class="legend${stacked ? " stacked" : ""}${cls ? ` ${cls}` : ""}">${items.map(item).join("")}${note ? `<span class="legend-note">${note}</span>` : ""}</div>`;
}
