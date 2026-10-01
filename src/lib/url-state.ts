/**
 * Helpers for syncing component state with the URL query string.
 *
 * `history.replaceState` never fires `popstate`, so writers also emit a custom
 * event that in-page readers can subscribe to instead of polling the URL.
 */

const URL_STATE_EVENT = "varga:url-state";

/** Read a numeric query param constrained to [0, 360); returns `fallback` when absent or invalid. */
export function readDegreeParam(name: string, fallback = 0): number {
  if (typeof window === "undefined") return fallback;
  const raw = new URLSearchParams(window.location.search).get(name);
  if (raw === null) return fallback;
  const parsed = parseFloat(raw);
  return !isNaN(parsed) && parsed >= 0 && parsed < 360 ? parsed : fallback;
}

/**
 * Merge `updates` into the current query string, drop the `remove` keys, and
 * write the result into the address bar via `replaceState`. No-op outside the
 * browser or when `replaceState` is blocked (e.g. sandboxed iframes).
 */
export function writeUrlState(
  updates: Record<string, string>,
  options: { remove?: string[]; hash?: string } = {},
): void {
  if (typeof window === "undefined") return;
  try {
    const url = new URL(window.location.href);
    for (const [key, value] of Object.entries(updates)) {
      url.searchParams.set(key, value);
    }
    for (const key of options.remove ?? []) {
      url.searchParams.delete(key);
    }
    if (options.hash !== undefined) url.hash = options.hash;
    window.history.replaceState(null, "", url.pathname + url.search + url.hash);
    window.dispatchEvent(new Event(URL_STATE_EVENT));
  } catch {
    // Silently fail in sandboxed iframes where history.replaceState is blocked
  }
}

/**
 * Subscribe to in-page URL-state changes (both our own writes and browser
 * back/forward navigation). Returns an unsubscribe function.
 */
export function subscribeToUrlState(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(URL_STATE_EVENT, listener);
  window.addEventListener("popstate", listener);
  return () => {
    window.removeEventListener(URL_STATE_EVENT, listener);
    window.removeEventListener("popstate", listener);
  };
}

/** Absolute URL of the current page with `updates` applied, for share links. */
export function buildShareUrl(updates: Record<string, string>, hash?: string): string {
  const url = new URL(window.location.href);
  for (const [key, value] of Object.entries(updates)) {
    url.searchParams.set(key, value);
  }
  if (hash !== undefined) url.hash = hash;
  return url.toString();
}
