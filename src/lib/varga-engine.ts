// ─────────────────────────────────────────────
// Varga Sign Analysis Engine
// Ported from modality_visualizations_exact.py
// ─────────────────────────────────────────────

// Fraction class for exact arithmetic
export class Fraction {
  numerator: number;
  denominator: number;

  constructor(num: number, den: number = 1) {
    if (den === 0) throw new Error("Denominator cannot be zero");
    const g = gcd(Math.abs(num), Math.abs(den));
    const sign = den < 0 ? -1 : 1;
    this.numerator = (sign * num) / g;
    this.denominator = (sign * den) / g;
  }

  add(other: Fraction | number): Fraction {
    if (typeof other === "number") other = new Fraction(other);
    return new Fraction(
      this.numerator * other.denominator + other.numerator * this.denominator,
      this.denominator * other.denominator
    );
  }

  sub(other: Fraction | number): Fraction {
    if (typeof other === "number") other = new Fraction(other);
    return new Fraction(
      this.numerator * other.denominator - other.numerator * this.denominator,
      this.denominator * other.denominator
    );
  }

  mul(other: Fraction | number): Fraction {
    if (typeof other === "number") other = new Fraction(other);
    return new Fraction(
      this.numerator * other.numerator,
      this.denominator * other.denominator
    );
  }

  div(other: Fraction | number): Fraction {
    if (typeof other === "number") other = new Fraction(other);
    return new Fraction(
      this.numerator * other.denominator,
      this.denominator * other.numerator
    );
  }

  eq(other: Fraction | number): boolean {
    if (typeof other === "number") other = new Fraction(other);
    return this.numerator * other.denominator === other.numerator * this.denominator;
  }

  lt(other: Fraction | number): boolean {
    if (typeof other === "number") other = new Fraction(other);
    return this.numerator * other.denominator < other.numerator * this.denominator;
  }

  lte(other: Fraction | number): boolean {
    return this.eq(other) || this.lt(other);
  }

  gt(other: Fraction | number): boolean {
    if (typeof other === "number") other = new Fraction(other);
    return this.numerator * other.denominator > other.numerator * this.denominator;
  }

  toNumber(): number {
    return this.numerator / this.denominator;
  }

  toString(): string {
    if (this.denominator === 1) return this.numerator.toString();
    return `${this.numerator}/${this.denominator}`;
  }
}

function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) {
    [a, b] = [b, a % b];
  }
  return a;
}

// ─────────────────────────────────────────────
// Theme Colors
// ─────────────────────────────────────────────
export const THEME = {
  BG: "#0e0e14",
  PANEL: "#16161f",
  FG: "#dcd8f0",
  MUTED: "#4a4860",
  GOLD: "#f0c060",
  ACCENT: "#9b7fe8",
};

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────
const NAVAMSA_START_SIGNS = [1, 10, 7, 4, 1, 10, 7, 4, 1, 10, 7, 4];
const D3_OFFSETS = [0, 4, 8];
const ELEMENT_STARTS = [1, 4, 7, 10];

const MODALITY_STARTS: Record<string, number[]> = {
  d16: [1, 5, 9],
  d20: [1, 9, 5],
  d45: [1, 5, 9],
};

const D30_ODD: [number, number][] = [[5, 1], [10, 11], [18, 9], [25, 3], [30, 7]];
const D30_EVEN: [number, number][] = [[5, 2], [12, 6], [20, 12], [25, 10], [30, 8]];

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function modality(sign: number): number { return sign % 3; }   // 1=Cardinal, 2=Fixed, 0=Mutable
function element(sign: number): number { return sign % 4; }    // 1=Fire, 2=Earth, 3=Air, 0=Water
function parity(sign: number): number { return sign % 2; }     // 1=Odd, 0=Even

function getSignAndDeg(z: number): [number, number] {
  return [Math.floor(z / 30) + 1, z % 30];
}

function partIndex(deg: number, parts: number): number {
  return Math.floor(deg / (30 / parts));
}

function advanceSign(sign: number, offset: number): number {
  return ((sign - 1 + offset) % 12) + 1;
}

function isOdd(sign: number): boolean { return sign % 2 === 1; }

function startByModality(sign: number, starts: number[]): number {
  return starts[(sign - 1) % 3];
}

function startByElement(sign: number): number {
  return ELEMENT_STARTS[(sign - 1) % 4];
}

function segmentAdvance(deg: number, segments: [number, number][]): number {
  let prev = 0;
  for (const [limit, vsign] of segments) {
    if (deg < limit) {
      return advanceSign(vsign, Math.floor(deg - prev));
    }
    prev = limit;
  }
  return advanceSign(segments[segments.length - 1][1], Math.floor(deg - prev));
}

// ─────────────────────────────────────────────
// Varga functions
// ─────────────────────────────────────────────
function D1(s: number, d: number): number { return s; }
function D2(s: number, d: number): number {
  if (isOdd(s)) return d < 15 ? 5 : 4;
  return d < 15 ? 4 : 5;
}
function D3(s: number, d: number): number {
  return advanceSign(s, D3_OFFSETS[partIndex(d, 3)]);
}
function D4(s: number, d: number): number {
  return advanceSign(s, partIndex(d, 4) * 3);
}
function D7(s: number, d: number): number {
  return advanceSign(s, partIndex(d, 7) + (isOdd(s) ? 0 : 6));
}
function D9(s: number, d: number): number {
  return advanceSign(NAVAMSA_START_SIGNS[s - 1], partIndex(d, 9));
}
function D10(s: number, d: number): number {
  return advanceSign(s, partIndex(d, 10) + (isOdd(s) ? 0 : 8));
}
function D12(s: number, d: number): number {
  return advanceSign(s, partIndex(d, 12));
}
function D16(s: number, d: number): number {
  return advanceSign(startByModality(s, MODALITY_STARTS["d16"]), partIndex(d, 16));
}
function D20(s: number, d: number): number {
  return advanceSign(startByModality(s, MODALITY_STARTS["d20"]), partIndex(d, 20));
}
function D24(s: number, d: number): number {
  return advanceSign(isOdd(s) ? 5 : 4, partIndex(d, 24));
}
function D27(s: number, d: number): number {
  return advanceSign(startByElement(s), partIndex(d, 27));
}
function D30(s: number, d: number): number {
  return segmentAdvance(d, isOdd(s) ? D30_ODD : D30_EVEN);
}
function D40(s: number, d: number): number {
  return advanceSign(isOdd(s) ? 1 : 7, partIndex(d, 40));
}
function D45(s: number, d: number): number {
  return advanceSign(startByModality(s, MODALITY_STARTS["d45"]), partIndex(d, 45));
}
function D60(s: number, d: number): number {
  return advanceSign(s, Math.floor(d * 2) % 12);
}

type VargaFn = (s: number, d: number) => number;

const VARGAS: [string, VargaFn][] = [
  ["D1", D1], ["D2", D2], ["D3", D3], ["D4", D4],
  ["D7", D7], ["D9", D9], ["D10", D10], ["D12", D12],
  ["D16", D16], ["D20", D20], ["D24", D24], ["D27", D27],
  ["D30", D30], ["D40", D40], ["D45", D45], ["D60", D60],
];

export const SIGN_NAMES = [
  "", "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
];

export const SIGN_SYMBOLS = [
  "", "♈", "♉", "♊", "♋", "♌", "♍",
  "♎", "♏", "♐", "♑", "♒", "♓"
];

export const N_VARGA = VARGAS.length;
export const VARGA_NAMES = VARGAS.map(([name]) => name);

// ─────────────────────────────────────────────
// Sign Colors
// ─────────────────────────────────────────────
export const SIGN_COLORS = [
  "#e05050",  // 1  Aries        Fire/Cardinal
  "#b08040",  // 2  Taurus       Earth/Fixed
  "#60c8c0",  // 3  Gemini       Air/Mutable
  "#4870e0",  // 4  Cancer       Water/Cardinal
  "#e0a020",  // 5  Leo          Fire/Fixed
  "#80c040",  // 6  Virgo        Earth/Mutable
  "#c060c0",  // 7  Libra        Air/Cardinal
  "#3840b0",  // 8  Scorpio      Water/Fixed
  "#e07040",  // 9  Sagittarius  Fire/Mutable
  "#607880",  // 10 Capricorn    Earth/Cardinal
  "#40b8c8",  // 11 Aquarius     Air/Fixed
  "#6060c0",  // 12 Pisces       Water/Mutable
];

// Category colors
export const COL_ODD = "#e07a5c";
export const COL_EVEN = "#5cb8e0";
export const COL_CARDINAL = "#e05c5c";
export const COL_FIXED = "#5c8ee0";
export const COL_MUTABLE = "#5ce07a";
export const COL_FIRE = "#e0622a";
export const COL_EARTH = "#8ec06c";
export const COL_AIR = "#a8d8ea";
export const COL_WATER = "#6080e0";
export const COL_FIRE_EARTH = "#c8a840";
export const COL_FIRE_AIR = "#a060d8";
export const COL_OVERLAP = "#e07030";
export const COL_NEITHER = "#304060";

// ─────────────────────────────────────────────
// Boundary computation
// ─────────────────────────────────────────────
const VARGA_N: Record<string, number | null> = {
  D1: null, D2: 2, D3: 3, D4: 4, D7: 7, D9: 9,
  D10: 10, D12: 12, D16: 16, D20: 20, D24: 24,
  D27: 27, D30: null, D40: 40, D45: 45, D60: 60,
};

function computeBoundaries(): Fraction[] {
  const boundarySet = new Set<string>();

  const addFraction = (f: Fraction) => boundarySet.add(`${f.numerator}/${f.denominator}`);

  // Sign boundaries
  for (let s = 0; s <= 12; s++) {
    addFraction(new Fraction(s * 30));
  }

  // Varga boundaries within each sign
  for (let s = 1; s <= 12; s++) {
    const base = new Fraction((s - 1) * 30);
    for (const [name] of VARGAS) {
      const N = VARGA_N[name];
      if (name === "D30") {
        for (let k = 1; k < 30; k++) {
          addFraction(base.add(new Fraction(k)));
        }
      } else if (N !== null) {
        for (let k = 1; k < N; k++) {
          addFraction(base.add(new Fraction(k * 30, N)));
        }
      }
    }
  }

  const boundaries = Array.from(boundarySet).map(s => {
    const [num, den] = s.split("/").map(Number);
    return new Fraction(num, den);
  });

  boundaries.sort((a, b) => a.sub(b).toNumber());
  return boundaries;
}

// ─────────────────────────────────────────────
// Interval evaluation
// ─────────────────────────────────────────────
export interface Interval {
  b0: Fraction;
  b1: Fraction;
  parRow: number[];    // parity values for each varga
  modRow: number[];    // modality values for each varga
  eleRow: number[];    // element values for each varga
  signRow: number[];   // sign values for each varga
}

export interface AugmentedInterval {
  b0: Fraction;
  b1: Fraction;
  count: number;
  vargaNames: string[];
  row: number[];
}

function evaluateIntervals(boundaries: Fraction[]): Interval[] {
  const intervals: Interval[] = [];

  for (let i = 0; i < boundaries.length - 1; i++) {
    const b0 = boundaries[i];
    const b1 = boundaries[i + 1];
    const midF = b0.add(b1).div(2).toNumber();
    const [s, d] = getSignAndDeg(midF);

    const parRow: number[] = [];
    const modRow: number[] = [];
    const eleRow: number[] = [];
    const signRow: number[] = [];

    for (const [, fn] of VARGAS) {
      const vsign = fn(s, d);
      parRow.push(parity(vsign));
      modRow.push(modality(vsign));
      eleRow.push(element(vsign));
      signRow.push(vsign);
    }

    intervals.push({ b0, b1, parRow, modRow, eleRow, signRow });
  }

  return intervals;
}

// ─────────────────────────────────────────────
// Category analysis
// ─────────────────────────────────────────────
function analyseCategory(
  intervals: Interval[],
  rowIdx: "parRow" | "modRow" | "eleRow" | "signRow",
  valueFn: (v: number) => boolean
): AugmentedInterval[] {
  return intervals.map(iv => {
    const row = iv[rowIdx];
    const count = row.filter(v => valueFn(v)).length;
    const vargaNames = VARGAS.filter((_, j) => valueFn(row[j])).map(([name]) => name);
    return { b0: iv.b0, b1: iv.b1, count, vargaNames, row };
  });
}

// Merge consecutive intervals with same names
function mergeIvNames(ivList: [Fraction, Fraction, string[]][]): [Fraction, Fraction, string[]][] {
  if (ivList.length === 0) return ivList;
  const merged: [Fraction, Fraction, string[]][] = [];
  for (const [b0, b1, names] of ivList) {
    if (merged.length > 0) {
      const [prevB0, prevB1, prevNames] = merged[merged.length - 1];
      if (prevNames.join(",") === names.join(",") && prevB1.eq(b0)) {
        merged[merged.length - 1] = [prevB0, b1, names];
        continue;
      }
    }
    merged.push([b0, b1, names]);
  }
  return merged;
}

// ─────────────────────────────────────────────
// Main computation
// ─────────────────────────────────────────────
export interface ComputationResult {
  intervals: Interval[];
  boundaries: Fraction[];
  // Category analyses
  oddIvs: AugmentedInterval[];
  evenIvs: AugmentedInterval[];
  cardIvs: AugmentedInterval[];
  fixIvs: AugmentedInterval[];
  mutIvs: AugmentedInterval[];
  fireIvs: AugmentedInterval[];
  earthIvs: AugmentedInterval[];
  airIvs: AugmentedInterval[];
  waterIvs: AugmentedInterval[];
  fireEarthIvs: AugmentedInterval[];
  fireAirIvs: AugmentedInterval[];
  signIvs: Record<number, AugmentedInterval[]>;
  // Stats
  totalBoundaries: number;
  totalIntervals: number;
}

let cachedResult: ComputationResult | null = null;

export function computeVargaAnalysis(): ComputationResult {
  if (cachedResult) return cachedResult;

  const boundaries = computeBoundaries();
  const intervals = evaluateIntervals(boundaries);

  // Group 1: Odd/Even
  const oddIvs = analyseCategory(intervals, "parRow", v => v === 1);
  const evenIvs = analyseCategory(intervals, "parRow", v => v === 0);

  // Group 2: Cardinal/Fixed/Mutable
  const cardIvs = analyseCategory(intervals, "modRow", v => v === 1);
  const fixIvs = analyseCategory(intervals, "modRow", v => v === 2);
  const mutIvs = analyseCategory(intervals, "modRow", v => v === 0);

  // Group 3: Fire/Earth/Air/Water
  const fireIvs = analyseCategory(intervals, "eleRow", v => v === 1);
  const earthIvs = analyseCategory(intervals, "eleRow", v => v === 2);
  const airIvs = analyseCategory(intervals, "eleRow", v => v === 3);
  const waterIvs = analyseCategory(intervals, "eleRow", v => v === 0);

  // Group 4: Fire+Earth / Fire+Air
  const fireEarthIvs = analyseCategory(intervals, "eleRow", v => v === 1 || v === 2);
  const fireAirIvs = analyseCategory(intervals, "eleRow", v => v === 1 || v === 3);

  // Group 5: Individual signs
  const signIvs: Record<number, AugmentedInterval[]> = {};
  for (let snum = 1; snum <= 12; snum++) {
    signIvs[snum] = analyseCategory(intervals, "signRow", v => v === snum);
  }

  cachedResult = {
    intervals,
    boundaries,
    oddIvs, evenIvs,
    cardIvs, fixIvs, mutIvs,
    fireIvs, earthIvs, airIvs, waterIvs,
    fireEarthIvs, fireAirIvs,
    signIvs,
    totalBoundaries: boundaries.length,
    totalIntervals: intervals.length,
  };

  return cachedResult;
}

// ─────────────────────────────────────────────
// Visualization data helpers
// ─────────────────────────────────────────────
export function buildEdges(augList: AugmentedInterval[]): number[] {
  const edges: number[] = new Array(augList.length + 1);
  edges[0] = augList[0].b0.toNumber();
  for (let i = 0; i < augList.length; i++) {
    edges[i + 1] = augList[i].b1.toNumber();
  }
  return edges;
}

export function stepLineData(edges: number[], counts: number[]): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  for (let i = 0; i < counts.length; i++) {
    points.push({ x: edges[i], y: counts[i] });
    points.push({ x: edges[i + 1], y: counts[i] });
  }
  return points;
}

export function spansFor(augList: AugmentedInterval[], targetVal: number): [number, number][] {
  const raw: [number, number][] = augList
    .filter(iv => iv.count === targetVal)
    .map(iv => [iv.b0.toNumber(), iv.b1.toNumber()]);
  
  const merged: [number, number][] = [];
  for (const [s, e] of raw) {
    if (merged.length > 0 && merged[merged.length - 1][1] === s) {
      merged[merged.length - 1] = [merged[merged.length - 1][0], e];
    } else {
      merged.push([s, e]);
    }
  }
  return merged;
}

export function getCounts(augList: AugmentedInterval[]): number[] {
  return augList.map(iv => iv.count);
}

export function getPeakAndTrough(augList: AugmentedInterval[]): { peak: number; trough: number } {
  const counts = getCounts(augList);
  return {
    peak: Math.max(...counts),
    trough: Math.min(...counts),
  };
}

export function getHeatmapData(
  intervals: Interval[],
  rowKey: "parRow" | "modRow" | "eleRow" | "signRow"
): number[][] {
  return VARGAS.map((_, j) =>
    intervals.map(iv => iv[rowKey][j])
  );
}

// Peak/trough span info for overlay
export interface SpanInfo {
  peak: [number, number][];
  trough: [number, number][];
}

export function getSpanInfo(augList: AugmentedInterval[]): SpanInfo {
  const { peak, trough } = getPeakAndTrough(augList);
  return {
    peak: spansFor(augList, peak),
    trough: spansFor(augList, trough),
  };
}

// Sign boundary positions (for x-axis)
export const SIGN_BOUNDARIES = Array.from({ length: 13 }, (_, i) => i * 30);

// Degree to sign name
export function degreeToSignName(deg: number): string {
  const signIdx = Math.floor(deg / 30);
  return SIGN_NAMES[Math.min(signIdx + 1, 12)];
}

export function degreeToSignSymbol(deg: number): string {
  const signIdx = Math.floor(deg / 30);
  return SIGN_SYMBOLS[Math.min(signIdx + 1, 12)];
}

// ─────────────────────────────────────────────
// Nakshatra data - 27 lunar mansions
// ─────────────────────────────────────────────
export const NAKSHATRA_NAMES: string[] = [
  "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra",
  "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni",
  "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha",
  "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishta", "Shatabhisha",
  "Purva Bhadrapada", "Uttara Bhadrapada", "Revati"
];

export const NAKSHATRA_LORDS: string[] = [
  "Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu",
  "Jupiter", "Saturn", "Mercury", "Ketu", "Venus", "Sun",
  "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury",
  "Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu",
  "Jupiter", "Saturn", "Mercury"
];

// Each Nakshatra spans 360/27 = 13.333... degrees
export const NAKSHATRA_DEGREES = 360 / 27; // 13.333...

// Get nakshatra index from sidereal longitude (0-360)
export function getNakshatraIndex(degree: number): number {
  return Math.floor((((degree % 360) + 360) % 360) / NAKSHATRA_DEGREES);
}

// Get nakshatra info from degree
export function getNakshatraInfo(degree: number): { index: number; name: string; lord: string; pada: number; startDeg: number; endDeg: number } {
  const idx = getNakshatraIndex(degree);
  const startDeg = idx * NAKSHATRA_DEGREES;
  const endDeg = (idx + 1) * NAKSHATRA_DEGREES;
  const pada = Math.floor((degree - startDeg) / (NAKSHATRA_DEGREES / 4)) + 1; // 1-4
  return {
    index: idx,
    name: NAKSHATRA_NAMES[idx],
    lord: NAKSHATRA_LORDS[idx],
    pada: Math.min(pada, 4),
    startDeg,
    endDeg,
  };
}

// ─────────────────────────────────────────────
// Planetary Rulers & Varga Metadata
// ─────────────────────────────────────────────

// Sign rulers (traditional Vedic planetary rulers)
export const SIGN_RULERS: string[] = [
  "",         // 0 - unused (1-indexed)
  "Mars",     // 1 - Aries
  "Venus",    // 2 - Taurus
  "Mercury",  // 3 - Gemini
  "Moon",     // 4 - Cancer
  "Sun",      // 5 - Leo
  "Mercury",  // 6 - Virgo
  "Venus",    // 7 - Libra
  "Mars",     // 8 - Scorpio
  "Jupiter",  // 9 - Sagittarius
  "Saturn",   // 10 - Capricorn
  "Saturn",   // 11 - Aquarius
  "Jupiter",  // 12 - Pisces
];

// Planetary colors for visualization
export const PLANET_COLORS: Record<string, string> = {
  "Sun": "#f0c060",
  "Moon": "#c0c0d0",
  "Mars": "#e05c5c",
  "Mercury": "#5ce07a",
  "Jupiter": "#e0c05c",
  "Venus": "#e07a9c",
  "Saturn": "#8a7a6a",
  "Rahu": "#6a5acd",
  "Ketu": "#cd5c5c",
};

// Varga Sanskrit names and purposes
export const VARGA_SANSKRIT: Record<string, string> = {
  "D1":  "Rāśi",
  "D2":  "Hora",
  "D3":  "Drekkāṇa",
  "D4":  "Caturthāṃśa",
  "D7":  "Saptāṃśa",
  "D9":  "Navāṃśa",
  "D10": "Daśāṃśa",
  "D12": "Dvādaśāṃśa",
  "D16": "Ṣoḍaśāṃśa",
  "D20": "Viṃśāṃśa",
  "D24": "Siddhāṃśa",
  "D27": "Bhāṃśa",
  "D30": "Triṃśāṃśa",
  "D40": "Khavedāṃśa",
  "D45": "Akṣavedāṃśa",
  "D60": "Ṣaṣṭiāṃśa",
};

export const VARGA_PURPOSES: Record<string, string> = {
  "D1":  "Physical body & overall life",
  "D2":  "Wealth & resources",
  "D3":  "Siblings & courage",
  "D4":  "Home & property",
  "D7":  "Children & progeny",
  "D9":  "Marriage & dharma",
  "D10": "Career & profession",
  "D12": "Parents & ancestry",
  "D16": "Vehicles & pleasures",
  "D20": "Spiritual practice",
  "D24": "Education & learning",
  "D27": "Strengths & weaknesses",
  "D30": "Evils & misfortune",
  "D40": "Auspicious results",
  "D45": "Overall character",
  "D60": "Past karma & destiny",
};
