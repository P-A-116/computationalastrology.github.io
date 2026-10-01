"use client";

import React, { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  type ComputationResult,
  SIGN_NAMES,
  SIGN_SYMBOLS,
  SIGN_COLORS,
  VARGA_NAMES,
  N_VARGA,
} from "@/lib/varga-engine";
import {
  resolveCSSVar,
  rgbString,
  sampleColorStops,
  PURPLE_GOLD_RAMP,
} from "@/lib/theme-colors";
import { downloadCanvasPng } from "@/lib/download";
import { prepareHiDPICanvas } from "@/hooks/use-canvas-chart";

interface SignCompatibilityMatrixProps {
  data: ComputationResult;
}

export default function SignCompatibilityMatrix({ data }: SignCompatibilityMatrixProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverCell, setHoverCell] = useState<{ i: number; j: number } | null>(null);
  const [selectedCell, setSelectedCell] = useState<{ i: number; j: number } | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 520, height: 520 });
  const [showExport, setShowExport] = useState(false);

  // Compute co-occurrence matrix: for each pair (i,j), count degree-width where
  // at least one varga maps to sign_i AND at least one varga maps to sign_j
  const { matrix, maxOverlap, selfMax } = useMemo(() => {
    const m: number[][] = Array.from({ length: 12 }, () => Array.from({ length: 12 }, () => 0));
    let maxOff = 0;
    let maxDiag = 0;

    for (const iv of data.intervals) {
      const width = iv.b1.toNumber() - iv.b0.toNumber();

      // Count how many vargas map to each sign at this interval
      const signCounts: number[] = Array.from({ length: 12 }, () => 0);

      for (let v = 0; v < N_VARGA; v++) {
        const sign = iv.signRow[v]; // 1-12
        signCounts[sign - 1]++;
      }

      // For each pair (i,j), the co-occurrence is min(counts_i, counts_j) * width
      for (let i = 0; i < 12; i++) {
        for (let j = 0; j < 12; j++) {
          const overlap = Math.min(signCounts[i], signCounts[j]) * width;
          m[i][j] += overlap;
          if (i === j && m[i][j] > maxDiag) maxDiag = m[i][j];
          if (i !== j && m[i][j] > maxOff) maxOff = m[i][j];
        }
      }
    }

    return { matrix: m, maxOverlap: maxOff, selfMax: maxDiag };
  }, [data.intervals]);

  // Resize observer
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.min(entry.contentRect.width, 600);
        setCanvasSize({ width: w, height: w });
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Canvas rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const { width, height } = canvasSize;
    const ctx = prepareHiDPICanvas(canvas, width, height, { setStyleSize: true });
    if (!ctx) return;

    const bgColor = resolveCSSVar("var(--v-card)");
    const borderColor = resolveCSSVar("var(--v-border)");
    const textColor = resolveCSSVar("var(--v-text-muted)");

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);

    const margin = { top: 32, right: 16, bottom: 16, left: 52 };
    const plotW = width - margin.left - margin.right;
    const plotH = height - margin.top - margin.bottom;
    const cellW = plotW / 12;
    const cellH = plotH / 12;

    // Column headers (sign symbols)
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.font = "10px sans-serif";
    for (let j = 0; j < 12; j++) {
      ctx.fillStyle = SIGN_COLORS[j];
      ctx.fillText(SIGN_SYMBOLS[j + 1], margin.left + j * cellW + cellW / 2, margin.top - 4);
    }

    // Row headers (sign symbols + short names)
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.font = "9px sans-serif";
    for (let i = 0; i < 12; i++) {
      ctx.fillStyle = SIGN_COLORS[i];
      ctx.fillText(
        `${SIGN_SYMBOLS[i + 1]} ${SIGN_NAMES[i + 1].slice(0, 3)}`,
        margin.left - 4,
        margin.top + i * cellH + cellH / 2
      );
    }

    // Draw cells
    for (let i = 0; i < 12; i++) {
      for (let j = 0; j < 12; j++) {
        const value = matrix[i][j];
        const isDiagonal = i === j;
        const x = margin.left + j * cellW;
        const y = margin.top + i * cellH;

        // Cell background color
        if (isDiagonal) {
          ctx.fillStyle = "rgba(155, 127, 232, 0.25)";
        } else if (value === 0) {
          ctx.fillStyle = "transparent";
        } else {
          const ratio = maxOverlap > 0 ? value / maxOverlap : 0;
          // Color scale: dark purple → bright purple → gold
          const alpha = ratio < 0.66 ? 0.75 : 0.85;
          ctx.fillStyle = rgbString(sampleColorStops(PURPLE_GOLD_RAMP, ratio), alpha);
        }

        ctx.fillRect(x + 0.5, y + 0.5, cellW - 1, cellH - 1);

        // Cell border
        const isHovered = hoverCell?.i === i && hoverCell?.j === j;
        const isRowCol = hoverCell && (hoverCell.i === i || hoverCell.j === j);
        const isSelected = selectedCell?.i === i && selectedCell?.j === j;

        if (isSelected) {
          ctx.strokeStyle = resolveCSSVar("var(--v-accent-gold)");
          ctx.lineWidth = 2;
          ctx.strokeRect(x, y, cellW, cellH);
        } else if (isHovered) {
          ctx.strokeStyle = "rgba(155, 127, 232, 0.6)";
          ctx.lineWidth = 1.5;
          ctx.strokeRect(x, y, cellW, cellH);
        } else if (isRowCol) {
          ctx.strokeStyle = "rgba(155, 127, 232, 0.2)";
          ctx.lineWidth = 1;
          ctx.strokeRect(x, y, cellW, cellH);
        } else {
          ctx.strokeStyle = borderColor;
          ctx.globalAlpha = 0.15;
          ctx.lineWidth = 0.5;
          ctx.strokeRect(x, y, cellW, cellH);
          ctx.globalAlpha = 1;
        }

        // Cell text
        if (isDiagonal || value > 0) {
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.font = isDiagonal ? "bold 9px monospace" : "8px monospace";

          if (isDiagonal) {
            ctx.fillStyle = resolveCSSVar("var(--v-accent-purple)");
          } else if (value > maxOverlap * 0.5) {
            ctx.fillStyle = resolveCSSVar("var(--v-bg)");
          } else {
            ctx.fillStyle = textColor;
          }

          const text = isDiagonal ? "16" : value.toFixed(0);
          ctx.fillText(text, x + cellW / 2, y + cellH / 2);
        }
      }
    }

    // Plot border
    ctx.strokeStyle = borderColor;
    ctx.globalAlpha = 0.4;
    ctx.lineWidth = 1;
    ctx.strokeRect(margin.left, margin.top, plotW, plotH);
    ctx.globalAlpha = 1;
  }, [canvasSize, matrix, maxOverlap, hoverCell, selectedCell]);

  // Mouse handling for Canvas
  const handleCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const margin = { top: 32, right: 16, bottom: 16, left: 52 };
    const plotW = canvasSize.width - margin.left - margin.right;
    const plotH = canvasSize.height - margin.top - margin.bottom;
    const cellW = plotW / 12;
    const cellH = plotH / 12;

    const col = Math.floor((x - margin.left) / cellW);
    const row = Math.floor((y - margin.top) / cellH);

    if (col >= 0 && col < 12 && row >= 0 && row < 12) {
      setHoverCell({ i: row, j: col });
    } else {
      setHoverCell(null);
    }
  }, [canvasSize]);

  const handleCanvasClick = useCallback(() => {
    if (!hoverCell) return;
    setSelectedCell(prev =>
      prev && prev.i === hoverCell.i && prev.j === hoverCell.j
        ? null
        : { i: hoverCell.i, j: hoverCell.j }
    );
  }, [hoverCell]);

  const handleCanvasMouseLeave = useCallback(() => {
    setHoverCell(null);
  }, []);

  // Export to PNG
  const handleExportPNG = useCallback(() => {
    downloadCanvasPng(canvasRef.current, "sign-compatibility-matrix.png");
  }, []);

  // Selected cell detail
  const selectedDetail = useMemo(() => {
    if (!selectedCell) return null;
    const { i, j } = selectedCell;
    const value = matrix[i][j];
    // Find which vargas contribute to each sign at the current selected cell
    // Sample from first interval where both signs appear
    const vargasI: string[] = [];
    const vargasJ: string[] = [];
    for (const iv of data.intervals) {
      const signCounts: number[] = Array.from({ length: 12 }, () => 0);
      const signVI: string[] = [];
      const signVJ: string[] = [];
      for (let v = 0; v < N_VARGA; v++) {
        const s = iv.signRow[v] - 1;
        signCounts[s]++;
        if (s === i) signVI.push(VARGA_NAMES[v]);
        if (s === j) signVJ.push(VARGA_NAMES[v]);
      }
      if (signCounts[i] > 0 && signCounts[j] > 0) {
        if (vargasI.length === 0) {
          vargasI.push(...signVI);
          vargasJ.push(...signVJ);
        }
      }
    }
    return { signI: i, signJ: j, overlap: value, vargasI, vargasJ };
  }, [selectedCell, matrix, data.intervals]);

  return (
    <div className="space-y-4">
      <div
        ref={containerRef}
        className="relative"
        onMouseEnter={() => setShowExport(true)}
        onMouseLeave={() => setShowExport(false)}
      >
        <canvas
          ref={canvasRef}
          className="w-full cursor-crosshair"
          style={{ maxWidth: 600 }}
          onMouseMove={handleCanvasMouseMove}
          onClick={handleCanvasClick}
          onMouseLeave={handleCanvasMouseLeave}
        />

        {/* Hover tooltip */}
        {hoverCell && (
          <div
            className="absolute z-20 px-3 py-2 rounded-lg text-[10px] font-mono pointer-events-none whitespace-nowrap"
            style={{
              left: "50%",
              top: 8,
              transform: "translateX(-50%)",
              backgroundColor: "var(--v-card)",
              border: "1px solid var(--v-border)",
              boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
              color: "var(--v-text)",
            }}
          >
            <span style={{ color: SIGN_COLORS[hoverCell.i] }}>
              {SIGN_SYMBOLS[hoverCell.i + 1]} {SIGN_NAMES[hoverCell.i + 1]}
            </span>
            <span style={{ color: "var(--v-text-muted)" }}> × </span>
            <span style={{ color: SIGN_COLORS[hoverCell.j] }}>
              {SIGN_SYMBOLS[hoverCell.j + 1]} {SIGN_NAMES[hoverCell.j + 1]}
            </span>
            <span style={{ color: "var(--v-accent-gold)" }} className="ml-2 font-bold">
              {matrix[hoverCell.i][hoverCell.j].toFixed(1)}°
            </span>
            {hoverCell.i === hoverCell.j && (
              <span style={{ color: "var(--v-accent-purple)" }} className="ml-1">(diagonal)</span>
            )}
          </div>
        )}

        {/* Export PNG button */}
        {showExport && (
          <button
            onClick={handleExportPNG}
            className="absolute top-2 right-2 px-2 py-1 rounded text-[9px] font-medium z-10 transition-opacity"
            style={{
              backgroundColor: "rgba(155, 127, 232, 0.15)",
              border: "1px solid rgba(155, 127, 232, 0.3)",
              color: "var(--v-accent-purple)",
            }}
            title="Export as PNG"
          >
            📷 PNG
          </button>
        )}
      </div>

      {/* Color scale legend */}
      <div className="flex items-center gap-3">
        <span style={{ color: "var(--v-text-muted)" }} className="text-[10px]">Overlap:</span>
        <div className="flex items-center gap-1">
          <div className="w-4 h-3 rounded-sm border border-[var(--v-border)]" style={{ backgroundColor: "transparent" }} />
          <span style={{ color: "var(--v-text-muted)" }} className="text-[9px]">0</span>
        </div>
        <div className="w-24 h-3 rounded-sm overflow-hidden flex">
          {[0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0].map((ratio, idx) => {
            const alpha = ratio < 0.66 ? 0.75 : 0.85;
            const bg = rgbString(sampleColorStops(PURPLE_GOLD_RAMP, ratio), alpha);
            return <div key={idx} className="flex-1 h-full" style={{ backgroundColor: bg }} />;
          })}
        </div>
        <span style={{ color: "var(--v-text-muted)" }} className="text-[9px]">{maxOverlap.toFixed(0)}°</span>
        <div className="flex items-center gap-1 ml-2">
          <div className="w-4 h-3 rounded-sm border border-[var(--v-border)]" style={{ backgroundColor: "rgba(155, 127, 232, 0.25)" }} />
          <span style={{ color: "var(--v-text-muted)" }} className="text-[9px]">Diagonal</span>
        </div>
      </div>

      {/* Selected cell detail */}
      <AnimatePresence>
        {selectedDetail && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="rounded-xl glass-card border p-4"
            style={{ borderColor: "rgba(240, 192, 96, 0.3)" }}
          >
            <div className="flex items-center justify-between mb-3">
              <h4 style={{ color: "var(--v-text)" }} className="text-sm font-semibold">
                {SIGN_SYMBOLS[selectedDetail.signI + 1]} {SIGN_NAMES[selectedDetail.signI + 1]} × {SIGN_SYMBOLS[selectedDetail.signJ + 1]} {SIGN_NAMES[selectedDetail.signJ + 1]}
              </h4>
              <div className="flex items-center gap-2">
                <span style={{ color: "var(--v-text-muted)" }} className="text-xs">Overlap:</span>
                <span style={{ color: "var(--v-accent-gold)" }} className="text-sm font-bold font-mono">
                  {selectedDetail.overlap.toFixed(1)}°
                </span>
                <button
                  onClick={() => setSelectedCell(null)}
                  className="ml-2 px-2 py-0.5 text-[10px] rounded border transition-colors"
                  style={{
                    borderColor: "var(--v-border)",
                    color: "var(--v-text-muted)",
                  }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Overlap bar */}
            <div className="mb-3">
              <div className="h-3 rounded-full overflow-hidden" style={{ backgroundColor: "var(--v-card)", border: "1px solid var(--v-border)" }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${(selectedDetail.overlap / selfMax) * 100}%`,
                    background: `linear-gradient(to right, ${SIGN_COLORS[selectedDetail.signI]}, ${SIGN_COLORS[selectedDetail.signJ]})`,
                    opacity: 0.8,
                  }}
                />
              </div>
              <div className="flex justify-between mt-1 text-[9px]" style={{ color: "var(--v-text-muted)" }}>
                <span>0°</span>
                <span>{((selectedDetail.overlap / (360 * N_VARGA)) * 100).toFixed(2)}% of total</span>
                <span>{(360 * N_VARGA).toFixed(0)}°</span>
              </div>
            </div>

            {/* Sign info boxes */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg p-3" style={{ backgroundColor: `${SIGN_COLORS[selectedDetail.signI]}15`, border: `1px solid ${SIGN_COLORS[selectedDetail.signI]}30` }}>
                <div className="text-xs font-medium mb-1" style={{ color: SIGN_COLORS[selectedDetail.signI] }}>
                  {SIGN_SYMBOLS[selectedDetail.signI + 1]} {SIGN_NAMES[selectedDetail.signI + 1]}
                </div>
                <div className="text-[9px]" style={{ color: "var(--v-text-muted)" }}>
                  Vargas: {selectedDetail.vargasI.length > 0 ? selectedDetail.vargasI.join(", ") : "varies by degree"}
                </div>
              </div>
              <div className="rounded-lg p-3" style={{ backgroundColor: `${SIGN_COLORS[selectedDetail.signJ]}15`, border: `1px solid ${SIGN_COLORS[selectedDetail.signJ]}30` }}>
                <div className="text-xs font-medium mb-1" style={{ color: SIGN_COLORS[selectedDetail.signJ] }}>
                  {SIGN_SYMBOLS[selectedDetail.signJ + 1]} {SIGN_NAMES[selectedDetail.signJ + 1]}
                </div>
                <div className="text-[9px]" style={{ color: "var(--v-text-muted)" }}>
                  Vargas: {selectedDetail.vargasJ.length > 0 ? selectedDetail.vargasJ.join(", ") : "varies by degree"}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
