/**
 * Regression check for the varga engine.
 *
 * The engine is pure and deterministic, so a full snapshot of its output is a
 * cheap and very strong invariant. Any refactor that changes a single boundary,
 * interval, or category count will change the digest and fail this script.
 *
 * Usage:
 *   bun run scripts/verify-engine.ts           # verify against EXPECTED
 *   bun run scripts/verify-engine.ts --print   # dump the current snapshot
 */

import { createHash } from "node:crypto";
import {
  computeVargaAnalysis,
  getPeakAndTrough,
  getSpanInfo,
  VARGA_NAMES,
  N_VARGA,
  type ComputationResult,
} from "../src/lib/varga-engine";

function digest(input: string): string {
  return createHash("sha256").update(input).digest("hex").slice(0, 16);
}

const CATEGORY_KEYS = [
  "odd",
  "even",
  "cardinal",
  "fixed",
  "mutable",
  "fire",
  "earth",
  "air",
  "water",
  "fireEarth",
  "fireAir",
] as const;

type CategoryKey = (typeof CATEGORY_KEYS)[number];

function categoryLists(r: ComputationResult): Record<CategoryKey, ComputationResult["oddIvs"]> {
  return {
    odd: r.oddIvs,
    even: r.evenIvs,
    cardinal: r.cardIvs,
    fixed: r.fixIvs,
    mutable: r.mutIvs,
    fire: r.fireIvs,
    earth: r.earthIvs,
    air: r.airIvs,
    water: r.waterIvs,
    fireEarth: r.fireEarthIvs,
    fireAir: r.fireAirIvs,
  };
}

function buildSnapshot() {
  const r = computeVargaAnalysis();

  // Compact, order-stable serialisation of every interval row.
  const rows = r.intervals.map(
    (iv) =>
      `${iv.b0.toString()}|${iv.b1.toString()}|${iv.parRow.join(",")}|${iv.modRow.join(",")}|${iv.eleRow.join(",")}|${iv.signRow.join(",")}`
  );

  const categories: Record<string, [number, number, number]> = {};
  for (const [key, list] of Object.entries(categoryLists(r))) {
    const { peak, trough } = getPeakAndTrough(list);
    categories[key] = [peak, trough, getSpanInfo(list).peak.length];
  }

  const signs = Array.from({ length: 12 }, (_, i) => {
    const { peak, trough } = getPeakAndTrough(r.signIvs[i + 1]);
    return [i + 1, peak, trough] as [number, number, number];
  });

  return {
    totalBoundaries: r.totalBoundaries,
    totalIntervals: r.totalIntervals,
    nVarga: N_VARGA,
    vargaNames: VARGA_NAMES.join(","),
    categories,
    signs,
    rowsDigest: digest(rows.join("\n")),
  };
}

const EXPECTED = {
  totalBoundaries: 1801,
  totalIntervals: 1800,
  nVarga: 16,
  vargaNames: "D1,D2,D3,D4,D7,D9,D10,D12,D16,D20,D24,D27,D30,D40,D45,D60",
  rowsDigest: "5a858ec23eb201ce",
  categories: {
    odd: [16, 1, 6],
    even: [15, 0, 6],
    cardinal: [14, 0, 4],
    fixed: [12, 1, 2],
    mutable: [12, 0, 2],
    fire: [16, 0, 3],
    earth: [11, 0, 3],
    air: [10, 0, 3],
    water: [11, 0, 3],
    fireEarth: [16, 1, 3],
    fireAir: [16, 1, 6],
  },
  signs: [
    [1, 14, 0], [2, 6, 0], [3, 8, 0], [4, 8, 0],
    [5, 11, 0], [6, 6, 0], [7, 9, 0], [8, 6, 0],
    [9, 9, 0], [10, 6, 0], [11, 7, 0], [12, 7, 0],
  ],
};

const snapshot = buildSnapshot();

if (process.argv.includes("--print")) {
  console.log(JSON.stringify(snapshot, null, 2));
  process.exit(0);
}

const failures: string[] = [];

function compare(label: string, actual: unknown, expected: unknown): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    failures.push(`  ${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

compare("totalBoundaries", snapshot.totalBoundaries, EXPECTED.totalBoundaries);
compare("totalIntervals", snapshot.totalIntervals, EXPECTED.totalIntervals);
compare("nVarga", snapshot.nVarga, EXPECTED.nVarga);
compare("vargaNames", snapshot.vargaNames, EXPECTED.vargaNames);
compare("rowsDigest", snapshot.rowsDigest, EXPECTED.rowsDigest);

for (const key of CATEGORY_KEYS) {
  compare(`categories.${key}`, snapshot.categories[key], EXPECTED.categories[key]);
}
compare("signs", snapshot.signs, EXPECTED.signs);

if (failures.length > 0) {
  console.error("Engine regression detected:\n" + failures.join("\n"));
  process.exit(1);
}

console.log("Engine OK — snapshot matches expected values.");
console.log(
  `  boundaries=${snapshot.totalBoundaries} intervals=${snapshot.totalIntervals} rowsDigest=${snapshot.rowsDigest}`
);
