/**
 * Browser file-download helpers.
 *
 * Every export path in the app funnels through these functions so the
 * object-URL lifetime, anchor wiring and revocation live in one place instead
 * of being copy-pasted at each call site.
 */

/** Trigger a download of `blob` as `filename`, revoking the object URL afterwards. */
export function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Trigger a download of in-memory text with the given MIME type. */
export function downloadText(filename: string, text: string, mime: string): void {
  downloadBlob(filename, new Blob([text], { type: mime }));
}

/** Download a data URL (e.g. from `canvas.toDataURL`) as `filename`. */
export function downloadDataUrl(filename: string, dataUrl: string): void {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  a.click();
}

/** Export a canvas as a PNG. No-op when the canvas is unavailable. */
export function downloadCanvasPng(canvas: HTMLCanvasElement | null, filename: string): void {
  if (!canvas) return;
  downloadDataUrl(filename, canvas.toDataURL("image/png"));
}

/** Build a timestamped filename, e.g. `varga-analysis-1759286400000.json`. */
export function timestampedFilename(base: string, ext: string): string {
  return `${base}-${Date.now()}.${ext}`;
}
