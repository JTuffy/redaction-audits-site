/* AG Grid Community (MIT), vendored under static/vendor so the site needs no outside host. Loaded
   once, when a page first needs a large table. */

let loading = null;
export function loadGrid() {
  if (window.agGrid) return Promise.resolve(window.agGrid);
  loading ||= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "vendor/ag-grid-community.min.js";
    s.onload = () => resolve(window.agGrid);
    s.onerror = reject;
    document.head.appendChild(s);
  });
  return loading;
}
