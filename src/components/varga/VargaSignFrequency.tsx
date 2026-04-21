"use client";

import React, { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  computeVargaAnalysis,
  SIGN_NAMES,
  SIGN_SYMBOLS,
  SIGN_COLORS,
  VARGA_NAMES,
  N_VARGA,
} from "@/lib/varga-engine";

interface VargaSignFrequencyProps {
  data: ReturnType<typeof computeVargaAnalysis>;
}

interface CellInfo {
  vargaIdx: number;
  signIdx: number;
  span: number;
  segments: [number, number][];
}

const MARGIN = { top: 50, right: 20, bottom: 55, left: 55 };

/** Helper to resolve CSS variable to actual color for Canvas */
function resolveCSSVar(cssVar: string): string {
  if (cssVar.startsWith("var(")) {
    if (typeof window !== "undefined") {
      const varName = cssVar.slice(4, -1);
      return getComputedStyle(document.documentElement).getPropertyValue(varName).trim() || "#888888";
    }
    return "#888888";
  }
  return cssVar;
}

/** Resolve a CSS variable to an rgba() string with given alpha */
function resolveCSSVarAlpha(cssVar: string, alpha: number): string {
  const hex = resolveCSSVar(cssVar);
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// Helper: rgba string for canvas (canvas doesn't support #hex/alpha)
function rgba(r: number, g: number, b: number, a: number): string {
  return `rgba(${r},${g},${b},${a})`;
}

// Parse hex color to rgb components
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

export default function VargaSignFrequency({ data }: VargaSignFrequencyProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasWidth, setCanvasWidth] = useState(800);
  const [selectedCell, setSelectedCell] = useState<CellInfo | null>(null);
  const [hoverCell, setHoverCell] = useState<{ vargaIdx: number; signIdx: number } | null>(null);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    text: string;
  } | null>(null);

  // Compute the degree span for each (varga, sign) pair
  const matrix = useMemo(() => {
    // matrix[vargaIdx][signIdx] = total degree span
    const m: number[][] = Array.from({ length: N_VARGA }, () =>
      Array.from({ length: 12 }, () => 0)
    );
    // segments[vargaIdx][signIdx] = list of [start, end] degree ranges
    const segs: [number, number][][][] = Array.from({ length: N_VARGA }, () =>
      Array.from({ length: 12 }, (): [number, number][] => [])
    );

    for (const iv of data.intervals) {
      const startDeg = iv.b0.toNumber();
      const endDeg = iv.b1.toNumber();
      const width = endDeg - startDeg;
      for (let j = 0; j < N_VARGA; j++) {
        const signVal = iv.signRow[j];
        // signVal is 1-12, index is signVal-1
        const sIdx = signVal - 1;
        m[j][sIdx] += width;
        segs[j][sIdx].push([startDeg, endDeg]);
      }
    }
    return { spans: m, segments: segs };
  }, [data.intervals]);

  // Find max span for color scaling
  const maxSpan = useMemo(() => {
    let max = 0;
    for (const row of matrix.spans) {
      for (const val of row) {
        if (val > max) max = val;
      }
    }
    return max;
  }, [matrix.spans]);

  // Color interpolation: 0 → dark/empty, maxSpan → bright
  const getCellColor = useCallback(
    (span: number): string => {
      if (span === 0) return resolveCSSVar("var(--v-card)");
      const ratio = span / maxSpan;
      // Interpolate from dark purple to bright gold
      // Low: #1a1a2e → Mid: #9b7fe8 → High: #f0c060
      if (ratio < 0.5) {
        const t = ratio * 2;
        const r = Math.round(26 + (155 - 26) * t);
        const g = Math.round(26 + (127 - 26) * t);
        const b = Math.round(46 + (232 - 46) * t);
        return `rgb(${r},${g},${b})`;
      } else {
        const t = (ratio - 0.5) * 2;
        const r = Math.round(155 + (240 - 155) * t);
        const g = Math.round(127 + (192 - 127) * t);
        const b = Math.round(232 + (96 - 232) * t);
        return `rgb(${r},${g},${b})`;
      }
    },
    [maxSpan]
  );

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setCanvasWidth(containerRef.current.clientWidth);
      }
    };
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const height = 420;
    canvas.width = canvasWidth * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const plotW = canvasWidth - MARGIN.left - MARGIN.right;
    const plotH = height - MARGIN.top - MARGIN.bottom;
    const cw = plotW / 12;
    const ch = plotH / N_VARGA;

    // Background
    ctx.fillStyle = resolveCSSVar("var(--v-card)");
    ctx.fillRect(0, 0, canvasWidth, height);

    // Draw cells
    for (let j = 0; j < N_VARGA; j++) {
      for (let s = 0; s < 12; s++) {
        const span = matrix.spans[j][s];
        const x = MARGIN.left + s * cw;
        const y = MARGIN.top + j * ch;
        const color = getCellColor(span);

        ctx.fillStyle = color;
        ctx.fillRect(x, y, cw - 1, ch - 1);

        // Show span text for larger cells
        if (span > 0 && cw > 30 && ch > 16) {
          const ratio = span / maxSpan;
          ctx.fillStyle = ratio > 0.6 ? resolveCSSVar("var(--v-bg)") : resolveCSSVarAlpha("var(--v-text)", 0.85);
          ctx.font = `${Math.min(10, ch * 0.5)}px monospace`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(span.toFixed(1) + "°", x + cw / 2, y + ch / 2);
        }
      }
    }

    // Highlight selected cell
    if (selectedCell) {
      const x = MARGIN.left + selectedCell.signIdx * cw;
      const y = MARGIN.top + selectedCell.vargaIdx * ch;
      ctx.strokeStyle = "#f0c060";
      ctx.lineWidth = 2.5;
      ctx.strokeRect(x - 0.5, y - 0.5, cw, ch);
    }

    // Hover row highlight with purple edge
    if (hoverCell) {
      const hy = MARGIN.top + hoverCell.vargaIdx * ch;
      ctx.fillStyle = resolveCSSVarAlpha("var(--v-text)", 0.06);
      ctx.fillRect(MARGIN.left, hy, plotW, ch);
      ctx.strokeStyle = resolveCSSVarAlpha("var(--v-accent-purple)", 0.4);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(MARGIN.left, hy);
      ctx.lineTo(MARGIN.left + plotW, hy);
      ctx.moveTo(MARGIN.left, hy + ch);
      ctx.lineTo(MARGIN.left + plotW, hy + ch);
      ctx.stroke();

      // Hover cell highlight
      const hx = MARGIN.left + hoverCell.signIdx * cw;
      ctx.fillStyle = resolveCSSVarAlpha("var(--v-text)", 0.12);
      ctx.fillRect(hx, hy, cw - 1, ch - 1);
    }

    // Grid lines
    ctx.strokeStyle = resolveCSSVarAlpha("var(--v-border)", 0.25);
    ctx.lineWidth = 0.5;
    for (let s = 1; s < 12; s++) {
      const x = MARGIN.left + s * cw;
      ctx.beginPath();
      ctx.moveTo(x, MARGIN.top);
      ctx.lineTo(x, MARGIN.top + plotH);
      ctx.stroke();
    }
    for (let j = 1; j < N_VARGA; j++) {
      const y = MARGIN.top + j * ch;
      ctx.beginPath();
      ctx.moveTo(MARGIN.left, y);
      ctx.lineTo(MARGIN.left + plotW, y);
      ctx.stroke();
    }

    // Plot border
    ctx.strokeStyle = resolveCSSVarAlpha("var(--v-border)", 0.5);
    ctx.lineWidth = 1;
    ctx.strokeRect(MARGIN.left, MARGIN.top, plotW, plotH);

    // Y-axis labels (varga names)
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (let j = 0; j < N_VARGA; j++) {
      const y = MARGIN.top + (j + 0.5) * ch;
      const isHovered = hoverCell?.vargaIdx === j;
      ctx.fillStyle = isHovered ? resolveCSSVar("var(--v-accent-purple)") : resolveCSSVarAlpha("var(--v-text)", 0.85);
      ctx.font = isHovered ? "bold 11px monospace" : "11px monospace";
      ctx.fillText(VARGA_NAMES[j], MARGIN.left - 5, y);
    }

    // X-axis labels (sign symbols with colors)
    ctx.font = "14px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    for (let s = 0; s < 12; s++) {
      const x = MARGIN.left + (s + 0.5) * cw;
      ctx.fillStyle = SIGN_COLORS[s];
      ctx.fillText(SIGN_SYMBOLS[s + 1], x, MARGIN.top + plotH + 5);
    }

    // X-axis sign names below symbols
    ctx.font = "8px monospace";
    ctx.fillStyle = resolveCSSVarAlpha("var(--v-text-muted)", 0.5);
    for (let s = 0; s < 12; s++) {
      const x = MARGIN.left + (s + 0.5) * cw;
      ctx.fillText(SIGN_NAMES[s + 1], x, MARGIN.top + plotH + 22);
    }

    // Title
    ctx.fillStyle = resolveCSSVar("var(--v-text)");
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("Varga Sign Frequency — Degree Span per Varga × Sign", MARGIN.left, 14);

    // Color scale legend
    const legendX = MARGIN.left + plotW - 160;
    const legendY = 10;
    const legendW = 150;
    const legendH = 12;
    for (let i = 0; i < legendW; i++) {
      const ratio = i / legendW;
      const span = ratio * maxSpan;
      ctx.fillStyle = getCellColor(span);
      ctx.fillRect(legendX + i, legendY, 1, legendH);
    }
    ctx.strokeStyle = resolveCSSVarAlpha("var(--v-border)", 0.5);
    ctx.lineWidth = 0.5;
    ctx.strokeRect(legendX, legendY, legendW, legendH);
    ctx.fillStyle = resolveCSSVarAlpha("var(--v-text-muted)", 0.5);
    ctx.font = "8px monospace";
    ctx.textAlign = "left";
    ctx.fillText("0°", legendX, legendY + legendH + 8);
    ctx.textAlign = "right";
    ctx.fillText(`${maxSpan.toFixed(1)}°`, legendX + legendW, legendY + legendH + 8);
    ctx.textAlign = "center";
    ctx.fillText("span", legendX + legendW / 2, legendY + legendH + 8);
  }, [canvasWidth, matrix, maxSpan, getCellColor, selectedCell, hoverCell]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      const plotW = canvasWidth - MARGIN.left - MARGIN.right;
      const plotH = 420 - MARGIN.top - MARGIN.bottom;
      const cw = plotW / 12;
      const ch = plotH / N_VARGA;

      const signIdx = Math.floor((mx - MARGIN.left) / cw);
      const vargaIdx = Math.floor((my - MARGIN.top) / ch);

      if (
        signIdx >= 0 && signIdx < 12 &&
        vargaIdx >= 0 && vargaIdx < N_VARGA
      ) {
        setHoverCell({ vargaIdx, signIdx });
        const span = matrix.spans[vargaIdx][signIdx];
        const pct = ((span / 360) * 100).toFixed(1);
        const segCount = matrix.segments[vargaIdx][signIdx].length;
        setTooltip({
          x: mx,
          y: my,
          text: `${VARGA_NAMES[vargaIdx]} → ${SIGN_SYMBOLS[signIdx + 1]} ${SIGN_NAMES[signIdx + 1]}: ${span.toFixed(2)}° (${pct}%) · ${segCount} segment${segCount !== 1 ? "s" : ""}`,
        });
      } else {
        setHoverCell(null);
        setTooltip(null);
      }
    },
    [canvasWidth, matrix]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      const plotW = canvasWidth - MARGIN.left - MARGIN.right;
      const plotH = 420 - MARGIN.top - MARGIN.bottom;
      const cw = plotW / 12;
      const ch = plotH / N_VARGA;

      const signIdx = Math.floor((mx - MARGIN.left) / cw);
      const vargaIdx = Math.floor((my - MARGIN.top) / ch);

      if (
        signIdx >= 0 && signIdx < 12 &&
        vargaIdx >= 0 && vargaIdx < N_VARGA
      ) {
        const span = matrix.spans[vargaIdx][signIdx];
        const segments = matrix.segments[vargaIdx][signIdx];
        setSelectedCell({
          vargaIdx,
          signIdx,
          span,
          segments,
        });
      } else {
        setSelectedCell(null);
      }
    },
    [canvasWidth, matrix]
  );

  const handleMouseLeave = useCallback(() => {
    setHoverCell(null);
    setTooltip(null);
  }, []);

  const handleExportPng = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = "varga_sign_frequency_heatmap.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  }, []);

  return (
    <div className="space-y-4">
      <div ref={containerRef} className="relative w-full group/freq">
        <canvas
          ref={canvasRef}
          style={{ width: canvasWidth, height: 420 }}
          className="rounded-lg cursor-crosshair"
          onMouseMove={handleMouseMove}
          onClick={handleClick}
          onMouseLeave={handleMouseLeave}
        />
        {/* Tooltip */}
        {tooltip && (
          <div
            className="absolute pointer-events-none text-[var(--v-text)] text-xs px-3 py-2 whitespace-nowrap z-10 tooltip-glass tooltip-glass-arrow tooltip-animated"
            style={{ left: Math.min(tooltip.x + 12, canvasWidth - 280), top: tooltip.y - 36 }}
          >
            {tooltip.text}
          </div>
        )}
        {/* Export PNG button */}
        <button
          onClick={handleExportPng}
          className="absolute top-2 right-2 px-2 py-1 text-[10px] rounded border border-[var(--v-border)] text-[var(--v-text-muted)] hover:text-[var(--v-text)] hover:border-[var(--v-accent-purple)] transition-colors opacity-0 group-hover/freq:opacity-100"
          title="Export heatmap as PNG"
        >
          📷 PNG
        </button>
      </div>

      {/* Selected cell detail */}
      <AnimatePresence>
        {selectedCell && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="rounded-xl glass-card border border-[#f0c060]/30 p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-[var(--v-text)]">
                {VARGA_NAMES[selectedCell.vargaIdx]} → {SIGN_SYMBOLS[selectedCell.signIdx + 1]}{" "}
                {SIGN_NAMES[selectedCell.signIdx + 1]}
              </h4>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--v-text-muted)]">Total Span:</span>
                <span className="text-sm font-bold text-[#f0c060] font-mono">
                  {selectedCell.span.toFixed(2)}°
                </span>
                <button
                  onClick={() => setSelectedCell(null)}
                  className="ml-2 px-2 py-0.5 text-[10px] rounded border border-[var(--v-border)] text-[var(--v-text-muted)] hover:text-[var(--v-text)] hover:border-[var(--v-accent-purple)] transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Coverage bar */}
            <div className="mb-3">
              <div className="h-3 rounded-full bg-[var(--v-card)] overflow-hidden border border-[var(--v-border)]">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(selectedCell.span / 360) * 100}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="h-full rounded-full"
                  style={{
                    backgroundColor: SIGN_COLORS[selectedCell.signIdx],
                  }}
                />
              </div>
              <div className="flex justify-between mt-1 text-[10px] text-[var(--v-text-muted)]">
                <span>0°</span>
                <span>{((selectedCell.span / 360) * 100).toFixed(1)}% of zodiac</span>
                <span>360°</span>
              </div>
            </div>

            {/* Segments list */}
            {selectedCell.segments.length > 0 && (
              <div>
                <h5 className="text-[10px] text-[var(--v-text-muted)] uppercase tracking-wider mb-2">
                  Degree Segments ({selectedCell.segments.length})
                </h5>
                <div className="max-h-40 overflow-y-auto custom-scrollbar">
                  <div className="flex flex-wrap gap-1.5">
                    {selectedCell.segments.map(([start, end], i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.03 }}
                        className="px-2 py-1 rounded text-[10px] font-mono bg-[var(--v-card)] border border-[var(--v-border)]"
                        style={{ color: SIGN_COLORS[selectedCell.signIdx] }}
                      >
                        {start.toFixed(2)}°–{end.toFixed(2)}°
                        <span className="text-[var(--v-text-muted)] ml-1">
                          ({(end - start).toFixed(2)}°)
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Visual position strip */}
            <div className="mt-3">
              <h5 className="text-[10px] text-[var(--v-text-muted)] uppercase tracking-wider mb-2">
                Position in Zodiac
              </h5>
              <div className="relative h-5 rounded-full bg-[var(--v-card)] overflow-hidden border border-[var(--v-border)]">
                {/* Sign background colors */}
                {SIGN_COLORS.map((color, i) => (
                  <div
                    key={i}
                    className="absolute top-0 bottom-0"
                    style={{
                      left: `${(i / 12) * 100}%`,
                      width: `${100 / 12}%`,
                      backgroundColor: color,
                      opacity: 0.15,
                    }}
                  />
                ))}
                {/* Segments */}
                {selectedCell.segments.map(([start, end], i) => (
                  <div
                    key={i}
                    className="absolute top-0 bottom-0"
                    style={{
                      left: `${(start / 360) * 100}%`,
                      width: `${((end - start) / 360) * 100}%`,
                      backgroundColor: SIGN_COLORS[selectedCell.signIdx],
                      opacity: 0.8,
                      minWidth: "2px",
                    }}
                  />
                ))}
              </div>
              <div className="flex justify-between mt-0.5">
                {SIGN_SYMBOLS.slice(1).map((sym, i) => (
                  <span
                    key={i}
                    className="text-[8px]"
                    style={{ color: i === selectedCell.signIdx ? SIGN_COLORS[i] : "var(--v-text-muted)" }}
                  >
                    {sym}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Summary table */}
      <div className="rounded-xl glass-card border border-[var(--v-border)] p-4">
        <h4 className="text-sm font-semibold text-[var(--v-text)] mb-3">
          Varga Sign Coverage Summary
        </h4>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--v-border)]">
                <th className="text-left py-1.5 px-2 text-[var(--v-text-muted)] font-medium">Varga</th>
                {SIGN_SYMBOLS.slice(1).map((sym, i) => (
                  <th
                    key={i}
                    className="text-center py-1.5 px-1 font-medium"
                    style={{ color: SIGN_COLORS[i], fontSize: "12px" }}
                  >
                    {sym}
                  </th>
                ))}
                <th className="text-center py-1.5 px-2 text-[#f0c060]/60 font-medium">Max</th>
              </tr>
            </thead>
            <tbody>
              {VARGA_NAMES.map((name, j) => {
                const maxS = Math.max(...matrix.spans[j]);
                return (
                  <tr
                    key={name}
                    className={`border-b border-[var(--v-border)] hover:bg-[var(--v-hover-bg)] cursor-pointer transition-colors ${
                      selectedCell?.vargaIdx === j ? "bg-[#9b7fe8]/5" : ""
                    }`}
                    onClick={() => {
                      const span = matrix.spans[j];
                      const maxIdx = span.indexOf(maxS);
                      setSelectedCell({
                        vargaIdx: j,
                        signIdx: maxIdx,
                        span: maxS,
                        segments: matrix.segments[j][maxIdx],
                      });
                    }}
                  >
                    <td className="py-1 px-2 font-mono text-[var(--v-accent-purple)] font-medium">{name}</td>
                    {matrix.spans[j].map((span, s) => (
                      <td
                        key={s}
                        className="py-1 px-1 text-center font-mono"
                        style={{
                          color: span === 0
                            ? resolveCSSVarAlpha("var(--v-text-muted)", 0.3)
                            : span === maxS
                            ? SIGN_COLORS[s]
                            : resolveCSSVarAlpha("var(--v-text)", 0.55),
                        }}
                      >
                        {span > 0 ? span.toFixed(1) : "—"}
                      </td>
                    ))}
                    <td className="py-1 px-2 text-center font-mono text-[#f0c060]/70">
                      {maxS.toFixed(1)}°
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
