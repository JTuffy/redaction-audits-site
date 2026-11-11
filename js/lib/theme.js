/* The colour theme: auto (the system's), light or dark, chosen with the header button. */

const systemDark = window.matchMedia("(prefers-color-scheme: dark)");

/* The theme in effect: the one chosen, or the system's. */
export function themeNow() { const t = document.documentElement.dataset.theme; return t || (systemDark.matches ? "dark" : "light"); }

const THEMES = ["auto", "light", "dark"];
function themeChoice() { try { return localStorage.getItem("theme") || "auto"; } catch { return "auto"; } }
function applyTheme(choice, button) {
  if (choice === "auto") delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = choice;
  try { if (choice === "auto") localStorage.removeItem("theme"); else localStorage.setItem("theme", choice); } catch { /* private window */ }
  button.textContent = `Theme: ${choice}`;
}

/* Wire the theme button; `redraw` runs when the theme in effect changes (charts read it). */
export function wireTheme(button, redraw) {
  if (!button) return;
  applyTheme(themeChoice(), button);
  button.onclick = () => { applyTheme(THEMES[(THEMES.indexOf(themeChoice()) + 1) % THEMES.length], button); redraw(); };
  systemDark.addEventListener("change", () => { if (themeChoice() === "auto") redraw(); });
}
