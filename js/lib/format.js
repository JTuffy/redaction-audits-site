/* Number, date and name formatting. Every function returns text; "—" stands for a missing value. */

export const human = (s) => String(s).replaceAll("_", " ");
/* A missing value in a table cell, as markup. */
export const NONE = `<span class="faint">—</span>`;
export const f2 = (v) => (v == null ? "—" : Number(v).toFixed(2));
export const f0 = (v) => (v == null ? "—" : Number(v).toFixed(0));
/* A judge score, possibly a k-read mean. */
export const sc = (v) => (v == null ? "—" : Number.isInteger(+v) ? String(v) : Number(v).toFixed(1));
/* A change with its sign: +5, −5, ±0. */
export const signed = (v, d = 0) => (v == null ? "—" : `${v > 0 ? "+" : v < 0 ? "−" : "±"}${Math.abs(v).toFixed(d)}`);
/* n of d as a whole percentage ("42%"), or as a number (42). */
export const pct = (n, d) => (d ? `${Math.round((100 * n) / d)}%` : "—");
export const share = (n, d) => (d ? Math.round((100 * n) / d) : null);
export const money = (v) => (v == null ? "no estimate" : `$${v.toFixed(2)}`);
export const kTokens = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n));
export const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
export const sd = (xs) => { const m = mean(xs); return xs.length > 1 ? Math.sqrt(mean(xs.map((x) => (x - m) ** 2))) : null; };
/* A small count in running text ("four"); digits from eleven up. */
const WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
export const inWords = (n) => WORDS[n] ?? String(n);
/* "a", "a and b", "a, b and c". */
export const listed = (xs) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

/* ---------- Run names carry their UTC start: p1-dev-honest-20261105T175530Z ---------- */

export const stampOf = (name) => (String(name).match(/(\d{8}T\d{6}Z)$/) || [])[1];
const stampDate = (name) => {
  const s = stampOf(name);
  return s ? new Date(`${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T${s.slice(9, 11)}:${s.slice(11, 13)}:${s.slice(13, 15)}Z`) : null;
};
/* "5 Nov, 13:25" in the reader's time zone. */
export const when = (name) => stampDate(name)?.toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) ?? "—";
/* "Nov 5, 13:25", for the run log's first column. */
export const shortWhen = (name) => {
  const d = stampDate(name);
  return d ? `${d.toLocaleDateString(undefined, { month: "short", day: "numeric" })}, ${d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false })}` : "";
};
export const dayOf = (name) => stampDate(name)?.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" }) ?? "Undated";
export const timeOf = (name) => stampDate(name)?.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }) ?? "—";

/* ---------- Case ids ---------- */

/* A case's short name: its scene, without the split prefix ("deploy approval"). */
export const sceneName = (id) => String(id).replace(/^[a-z]+-/, "").split("-").slice(0, 2).join(" ").replaceAll("_", " ");
/* A simulated case's family and variant (f014b), else its scene name. */
export const caseName = (id) => (String(id).match(/-(f\d+[a-z]?)-/) || [])[1] || sceneName(id);
