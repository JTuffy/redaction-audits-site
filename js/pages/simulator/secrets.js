/* The secret registry every case plants from: each secret type, its tier and its options. */

import { esc } from "../../lib/dom.js?v=2275844be3";
import { human } from "../../lib/format.js?v=2275844be3";
import { SITE } from "../../data/site.js?v=2275844be3";
import { table } from "../../components/blocks.js?v=2275844be3";
import { section } from "../../components/page.js?v=2275844be3";

export function secretRegistry() {
  const rows = (SITE.registry || []).map((r) => [esc(r.label), esc(human(r.tier)), esc(r.sensitivity), { html: r.options.map(esc).join("<br>"), cls: "wrap mono-cell" }]);
  return section("Secret registry", `<p class="muted small">Each case draws its secrets' true values from these options. Always-redact secrets are removed under every policy; context secrets are ruled on case by case.</p>`
    + table(["Secret", "Tier", "Sensitivity", "Options"], rows, { cls: "left" }));
}
