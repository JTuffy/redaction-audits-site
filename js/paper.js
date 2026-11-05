/* Paper: the PDF and its build status. */

import { $, esc, pageHead, SITE } from "./core.js?v=2e746ab46e";

/* ---------- Paper ---------- */

let paperTimer = null;
export function stopPaper() { clearInterval(paperTimer); }

function paperSide(st) {
  const total = st.outline.reduce((n, s) => n + s.words, 0);
  const items = st.outline.map((s) =>
    `<li><span>${esc(s.title)}</span><span class="${s.words ? "num" : "faint"}">${s.words ? s.words.toLocaleString() : "empty"}</span></li>`).join("");
  const built = new Date(st.built_at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const state = st.ok
    ? `<span class="badge pass">compiled</span><span class="muted">${built} · ${st.seconds}s</span>`
    : `<span class="badge fail">error</span><span class="muted">${built}</span>`;
  const errors = st.ok ? "" : `<pre class="paper-errors">${st.errors.map(esc).join("\n")}</pre>`;
  return `<p class="status">${state}</p>${errors}
    <ol class="outline">${items}</ol>
    <p class="muted small">${total.toLocaleString()} words written · auto-refreshes on save</p>`;
}

let pdfjsReady = null;
function loadPdfJs() {
  if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
  pdfjsReady = pdfjsReady || new Promise((resolve, reject) => {
    const tag = document.createElement("script");
    tag.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    tag.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      resolve(window.pdfjsLib);
    };
    tag.onerror = () => reject(new Error("could not load the PDF renderer"));
    document.head.appendChild(tag);
  });
  return pdfjsReady;
}

let paperBlobUrl = null;
async function renderPaper(stamp) {
  const box = $("paper-pdf");
  if (!box) return;
  try {
    const bytes = await (await fetch(`paper/main.pdf?v=${encodeURIComponent(stamp)}`, { cache: "no-store" })).arrayBuffer();
    if (paperBlobUrl) URL.revokeObjectURL(paperBlobUrl);
    paperBlobUrl = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
    const dl = $("paper-dl"), tab = $("paper-tab");
    if (dl) dl.href = paperBlobUrl;
    if (tab) tab.href = paperBlobUrl;
    const lib = await loadPdfJs();
    const doc = await lib.getDocument({ data: new Uint8Array(bytes) }).promise;
    const scroll = box.scrollTop;
    const width = box.clientWidth - 32;
    const frag = document.createDocumentFragment();
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const base = page.getViewport({ scale: 1 });
      const scale = width / base.width;
      const view = page.getViewport({ scale: scale * (window.devicePixelRatio || 1) });
      const canvas = document.createElement("canvas");
      canvas.width = view.width; canvas.height = view.height;
      canvas.style.width = `${width}px`; canvas.style.height = `${(view.height / view.width) * width}px`;
      await page.render({ canvasContext: canvas.getContext("2d"), viewport: view }).promise;
      frag.appendChild(canvas);
    }
    box.replaceChildren(frag);
    box.scrollTop = scroll;
  } catch (err) {
    box.innerHTML = `<p class="empty pad">Couldn't show the PDF here (${esc(err.message)}). Use Download.</p>`;
  }
}

export function pagePaper() {
  const st = SITE.paper;
  if (!st) {
    $("view").innerHTML = pageHead({ title: "Paper" }) + `<p class="empty">Not compiled yet. Run <code>uv run redaction paper watch</code>.</p>`;
    return;
  }
  let stamp = st.built_at;
  $("view").innerHTML = `<div class="paper"><aside class="paper-side" id="paper-side">${paperSide(st)}</aside>
    <div class="paper-view"><div class="paper-bar"><a class="btn" id="paper-dl" download="redaction-paper.pdf" href="#">Download PDF</a><a class="btn" id="paper-tab" target="_blank" rel="noopener" href="#">Open in new tab</a></div>
    <div class="paper-pdf" id="paper-pdf" role="document" aria-label="Paper PDF"><p class="empty pad">Rendering…</p></div></div></div>`;
  renderPaper(stamp);
  paperTimer = setInterval(() => {
    fetch(`paper/status.json?t=${Date.now()}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((next) => {
        if (!next || next.built_at === stamp) return;
        stamp = next.built_at;
        SITE.paper = next;
        $("paper-side").innerHTML = paperSide(next);
        if (next.ok) renderPaper(stamp);
      })
      .catch(() => {});
  }, 2000);
}
