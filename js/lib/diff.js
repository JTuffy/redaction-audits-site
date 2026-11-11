/* Word-level diff of two strings: <del> for removed text, <ins> for added. Both sides escaped. */

import { esc } from "./dom.js?v=2275844be3";

export function wordDiff(a, b) {
  const split = (t) => t.match(/\s+|[^\s=]+|=/g) || [];
  const x = split(a), y = split(b), n = x.length, m = y.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--)
    dp[i][j] = x[i] === y[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  let i = 0, j = 0, out = "", del = "", ins = "";
  const flush = () => { if (del) out += `<del>${esc(del)}</del>`; if (ins) out += `<ins>${esc(ins)}</ins>`; del = ins = ""; };
  while (i < n || j < m) {
    if (i < n && j < m && x[i] === y[j] && !(/^\s+$/.test(x[i]) && (del || ins) && i + 1 < n && j + 1 < m && x[i + 1] !== y[j + 1])) { flush(); out += esc(x[i]); i++; j++; }
    else if (j < m && (i === n || dp[i][j + 1] >= dp[i + 1][j])) { ins += y[j]; j++; }
    else { del += x[i]; i++; }
  }
  flush();
  return out;
}
