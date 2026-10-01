/**
 * Colour helpers shared by the canvas-based visualisations.
 *
 * Canvas cannot resolve CSS custom properties or hex-alpha shorthand, so these
 * utilities bridge the theme (defined as CSS variables in globals.css) into
 * concrete rgb/rgba strings.
 */

export const FALLBACK_COLOR = "#888888";

/**
 * Resolve `var(--name)` to its computed value.
 *
 * Non-`var()` inputs pass through untouched. During SSR, or when the variable
 * is not defined, `fallback` is returned — canvas would silently render nothing
 * if handed a raw `var(...)` string.
 */
export function resolveCSSVar(cssVar: string, fallback: string = FALLBACK_COLOR): string {
  if (!cssVar.startsWith("var(")) return cssVar;
  if (typeof document === "undefined") return fallback;
  const name = cssVar.slice(4, -1).trim();
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

/** Parse `#rgb`, `#rrggbb` (with or without `#`) into 0-255 components. */
export function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "").trim();
  if (clean.length >= 6) {
    return [
      parseInt(clean.slice(0, 2), 16),
      parseInt(clean.slice(2, 4), 16),
      parseInt(clean.slice(4, 6), 16),
    ];
  }
  if (clean.length >= 3) {
    return [
      parseInt(clean[0] + clean[0], 16),
      parseInt(clean[1] + clean[1], 16),
      parseInt(clean[2] + clean[2], 16),
    ];
  }
  return [136, 136, 136];
}

export function rgbString(rgb: [number, number, number], alpha?: number): string {
  const [r, g, b] = rgb;
  return alpha === undefined ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${alpha})`;
}

export function rgba(r: number, g: number, b: number, a: number): string {
  return `rgba(${r},${g},${b},${a})`;
}

/** Resolve a CSS variable (or literal colour) to an `rgba()` string. */
export function withAlpha(color: string, alpha: number): string {
  return rgbString(hexToRgb(resolveCSSVar(color)), alpha);
}

export interface ColorStop {
  /** Position along the ramp, 0-1. */
  at: number;
  rgb: [number, number, number];
}

/**
 * Sample a piecewise-linear colour ramp.
 *
 * Values below the first stop or above the last are clamped. Both ramps in the
 * app (varga frequency, sign compatibility) are expressed through this so their
 * interpolation maths lives in exactly one place.
 */
export function sampleColorStops(stops: ColorStop[], t: number): [number, number, number] {
  const first = stops[0];
  const last = stops[stops.length - 1];
  if (t <= first.at) return first.rgb;
  if (t >= last.at) return last.rgb;

  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i];
    const b = stops[i + 1];
    if (t >= a.at && t <= b.at) {
      const span = b.at - a.at;
      const local = span === 0 ? 0 : (t - a.at) / span;
      return [
        Math.round(a.rgb[0] + (b.rgb[0] - a.rgb[0]) * local),
        Math.round(a.rgb[1] + (b.rgb[1] - a.rgb[1]) * local),
        Math.round(a.rgb[2] + (b.rgb[2] - a.rgb[2]) * local),
      ];
    }
  }
  return last.rgb;
}

/** Dark purple → bright purple → gold. Used by the sign-compatibility matrix. */
export const PURPLE_GOLD_RAMP: ColorStop[] = [
  { at: 0, rgb: [30, 25, 50] },
  { at: 0.33, rgb: [80, 50, 110] },
  { at: 0.66, rgb: [155, 127, 232] },
  { at: 1, rgb: [240, 192, 96] },
];

/** Dark purple → bright purple → gold, with an even 0.5 midpoint. */
export const PURPLE_GOLD_RAMP_EVEN: ColorStop[] = [
  { at: 0, rgb: [26, 26, 46] },
  { at: 0.5, rgb: [155, 127, 232] },
  { at: 1, rgb: [240, 192, 96] },
];
