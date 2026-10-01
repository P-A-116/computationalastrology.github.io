"use client";

import { useState } from "react";
import { COL_AIR, COL_CARDINAL, COL_EARTH, COL_EVEN, COL_FIRE, COL_FIXED, COL_MUTABLE, COL_ODD, COL_WATER } from "@/lib/varga-engine";

export interface CoverageRow {
  name: string;
  parity: { odd: number; even: number };
  modality: { cardinal: number; fixed: number; mutable: number };
  element: { fire: number; earth: number; air: number; water: number };
}

// Each column knows how to read its own count off a row, so the table never has
// to reach into rows by string path.
const MATRIX_COLS: { label: string; color: string; get: (row: CoverageRow) => number }[] = [
  { label: "Odd",   color: COL_ODD,      get: (r) => r.parity.odd },
  { label: "Even",  color: COL_EVEN,     get: (r) => r.parity.even },
  { label: "Card",  color: COL_CARDINAL, get: (r) => r.modality.cardinal },
  { label: "Fix",   color: COL_FIXED,    get: (r) => r.modality.fixed },
  { label: "Mut",   color: COL_MUTABLE,  get: (r) => r.modality.mutable },
  { label: "Fire",  color: COL_FIRE,     get: (r) => r.element.fire },
  { label: "Earth", color: COL_EARTH,    get: (r) => r.element.earth },
  { label: "Air",   color: COL_AIR,      get: (r) => r.element.air },
  { label: "Water", color: COL_WATER,    get: (r) => r.element.water },
];

/** 16 × 9 grid showing how many intervals each varga spends in each category. */
export default function VargaCoverageMatrixTable({ data }: { data: CoverageRow[] }) {
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [hoveredCol, setHoveredCol] = useState<number | null>(null);
  const [tooltipInfo, setTooltipInfo] = useState<{ row: number; col: number; value: number; pct: number } | null>(null);

  return (
    <div className="rounded-xl glass-card glass-card-inner-shadow border border-[var(--v-border)] p-5 card-glow mb-4 print-no-break">
      <h3 style={{ color: "var(--v-text)" }} className="text-sm font-semibold mb-2">Varga Coverage Matrix</h3>
      <p style={{ color: "var(--v-text-muted)" }} className="text-xs mb-4">
        Shows how many intervals each varga spends in each category across the full 360° zodiac. Percentages show relative distribution.
      </p>
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-xs coverage-matrix">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--v-border)" }}>
              <th style={{ color: "var(--v-text-muted)" }} className="text-left py-1.5 px-1.5 font-medium sticky left-0 z-10" colSpan={1}>Varga</th>
              <th style={{ color: COL_ODD }} className="text-center py-1.5 px-1.5 font-medium" colSpan={2}>Parity</th>
              <th style={{ color: COL_CARDINAL }} className="text-center py-1.5 px-1.5 font-medium" colSpan={3}>Modality</th>
              <th style={{ color: COL_FIRE }} className="text-center py-1.5 px-1.5 font-medium" colSpan={4}>Element</th>
            </tr>
            <tr style={{ borderBottom: "1px solid var(--v-border)" }}>
              <th style={{ color: "var(--v-text-muted)" }} className="text-left py-1 px-1.5 font-medium sticky left-0 z-10" />
              {MATRIX_COLS.map((col, ci) => (
                <th
                  key={col.label}
                  style={{ color: col.color, backgroundColor: hoveredCol === ci ? `${col.color}10` : undefined }}
                  className="text-center py-1 px-1.5 font-medium text-[9px] transition-colors"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, ri) => {
              const total = row.parity.odd + row.parity.even;
              const isAltRow = ri % 2 === 1;
              return (
                <tr
                  key={row.name}
                  style={{ borderBottom: "1px solid var(--v-border)" }}
                  className="transition-colors"
                  onMouseEnter={() => setHoveredRow(ri)}
                  onMouseLeave={() => { setHoveredRow(null); setTooltipInfo(null); }}
                >
                  <td
                    className="py-1 px-1.5 font-mono font-medium sticky left-0 z-10"
                    style={{
                      color: "var(--v-accent-purple)",
                      backgroundColor: hoveredRow === ri ? "var(--v-hover-bg)" : "var(--v-card)",
                    }}
                  >
                    {row.name}
                  </td>
                  {MATRIX_COLS.map((col, ci) => {
                    const count = col.get(row);
                    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                    const isHighlighted = hoveredRow === ri || hoveredCol === ci;
                    const isBoth = hoveredRow === ri && hoveredCol === ci;
                    return (
                      <td
                        key={col.label}
                        className="py-1 px-1.5 text-center relative transition-colors"
                        style={{
                          backgroundColor: isBoth
                            ? `${col.color}18`
                            : isAltRow
                              ? `rgba(var(--v-text-muted-rgb, 74, 72, 96), 0.03)`
                              : undefined,
                        }}
                        onMouseEnter={() => { setHoveredCol(ci); setTooltipInfo({ row: ri, col: ci, value: count, pct }); }}
                        onMouseLeave={() => { setHoveredCol(null); setTooltipInfo(null); }}
                      >
                        <div className="flex items-center justify-center gap-0.5">
                          <div
                            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                            style={{
                              backgroundColor: count > 0 ? col.color : "var(--v-border)",
                              opacity: count > 0 ? 0.85 : 0.3,
                            }}
                          />
                          <span className="font-mono text-[9px]" style={{ color: count > 0 ? (isHighlighted ? col.color : col.color) : "var(--v-text-muted)", opacity: count > 0 ? (isHighlighted ? 1 : 0.85) : 0.4 }}>
                            {pct}%
                          </span>
                        </div>
                        {/* Mini tooltip on cell hover */}
                        {tooltipInfo && tooltipInfo.row === ri && tooltipInfo.col === ci && (
                          <div
                            className="absolute z-30 px-2 py-1 rounded text-[9px] font-mono whitespace-nowrap pointer-events-none"
                            style={{
                              bottom: "100%",
                              left: "50%",
                              transform: "translateX(-50%)",
                              backgroundColor: "var(--v-card)",
                              border: `1px solid ${col.color}40`,
                              color: col.color,
                              boxShadow: `0 2px 8px ${col.color}20`,
                            }}
                          >
                            {col.label}: {count} intervals ({pct}%)
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center gap-3 mt-3 pt-2" style={{ borderTop: "1px solid var(--v-border)" }}>
        <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: COL_ODD }} /><span style={{ color: "var(--v-text-muted)" }} className="text-[9px]">Parity</span></div>
        <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: COL_CARDINAL }} /><span style={{ color: "var(--v-text-muted)" }} className="text-[9px]">Modality</span></div>
        <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: COL_FIRE }} /><span style={{ color: "var(--v-text-muted)" }} className="text-[9px]">Element</span></div>
      </div>
    </div>
  );
}
