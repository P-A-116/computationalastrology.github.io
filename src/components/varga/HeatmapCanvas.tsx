"use client";

import React, { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { N_VARGA, VARGA_NAMES, SIGN_NAMES, SIGN_SYMBOLS } from "@/lib/varga-engine";
import { resolveCSSVar, withAlpha } from "@/lib/theme-colors";
import { downloadCanvasPng } from "@/lib/download";
import {
  useCanvasWidth,
  useCanvasTooltip,
  prepareHiDPICanvas,
  canvasMousePos,
  drawCrosshair,
} from "@/hooks/use-canvas-chart";

interface HeatmapCanvasProps {
  data: number[][];
  edges: number[];
  colors: string[];
  title: string;
  peakSpans?: [number, number][];
  troughSpans?: [number, number][];
  height?: number;
  legendItems?: { color: string; label: string }[];
  highlightSigns?: boolean;
  tooltipContent?: (vargaIdx: number, intervalIdx: number, value: number) => string;
  activeVargas?: Set<number>;
}

const HEATMAP_MARGIN = { top: 40, right: 20, bottom: 35, left: 55 };

export default function HeatmapCanvas({
  data,
  edges,
  colors,
  title,
  peakSpans = [],
  troughSpans = [],
  height = 300,
  legendItems = [],
  highlightSigns = true,
  tooltipContent,
  activeVargas,
}: HeatmapCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasWidth = useCanvasWidth(containerRef);
  const { tooltip, setTooltip, crosshairX, setCrosshairX, resetHover } = useCanvasTooltip();
  const [hoverRow, setHoverRow] = useState<number | null>(null);

  const MARGIN = HEATMAP_MARGIN;

  // Compute active row indices: maps display row (0..nActive-1) → original varga index
  const activeRowIndices = useMemo(() => {
    if (!activeVargas || activeVargas.size === N_VARGA) {
      return Array.from({ length: N_VARGA }, (_, i) => i);
    }
    return Array.from({ length: N_VARGA }, (_, i) => i).filter(i => activeVargas.has(i));
  }, [activeVargas]);

  const nActiveRows = activeRowIndices.length;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = prepareHiDPICanvas(canvas, canvasWidth, height);
    if (!ctx) return;

    const plotW = canvasWidth - MARGIN.left - MARGIN.right;
    const plotH = height - MARGIN.top - MARGIN.bottom;
    const nIntervals = edges.length - 1;
    // Use active row count for cell height — inactive rows are simply not drawn
    const cellH = nActiveRows > 0 ? plotH / nActiveRows : plotH;

    // Background
    ctx.fillStyle = resolveCSSVar("var(--v-card)");
    ctx.fillRect(0, 0, canvasWidth, height);

    // If no active rows, show a message
    if (nActiveRows === 0) {
      ctx.fillStyle = resolveCSSVar("var(--v-text-muted)");
      ctx.font = "13px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("No vargas selected — use the filter above to show vargas", canvasWidth / 2, height / 2);
      return;
    }

    // Peak/trough overlays
    const drawSpanOverlay = (spans: [number, number][], color: string, alpha: number) => {
      ctx.fillStyle = color;
      for (const [s, e] of spans) {
        const x1 = MARGIN.left + (s / 360) * plotW;
        const x2 = MARGIN.left + (e / 360) * plotW;
        ctx.globalAlpha = alpha;
        ctx.fillRect(x1, MARGIN.top, x2 - x1, plotH);
      }
      ctx.globalAlpha = 1;
    };

    drawSpanOverlay(troughSpans, "#60b8f0", 0.15);
    drawSpanOverlay(peakSpans, "#f0c060", 0.2);

    // Draw cells — only for active varga rows
    for (let r = 0; r < nActiveRows; r++) {
      const j = activeRowIndices[r]; // original varga index
      for (let i = 0; i < nIntervals; i++) {
        const value = data[j]?.[i];
        if (value === undefined) continue;

        const colorIdx = Math.round(value);
        const color = colors[colorIdx] || colors[0];

        const x1 = MARGIN.left + (edges[i] / 360) * plotW;
        const x2 = MARGIN.left + (edges[i + 1] / 360) * plotW;
        const y1 = MARGIN.top + r * cellH;

        ctx.fillStyle = color;
        ctx.fillRect(x1, y1, Math.max(x2 - x1, 0.5), cellH - 0.5);
      }
    }

    // Hover row highlight — using display row index
    if (hoverRow !== null && hoverRow >= 0 && hoverRow < nActiveRows) {
      const y1 = MARGIN.top + hoverRow * cellH;
      ctx.fillStyle = withAlpha("var(--v-text)", 0.08);
      ctx.fillRect(MARGIN.left, y1, plotW, cellH);
      // Top and bottom edge highlight
      ctx.strokeStyle = withAlpha("var(--v-accent-purple)", 0.4);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(MARGIN.left, y1);
      ctx.lineTo(MARGIN.left + plotW, y1);
      ctx.moveTo(MARGIN.left, y1 + cellH);
      ctx.lineTo(MARGIN.left + plotW, y1 + cellH);
      ctx.stroke();
    }

    // Horizontal grid lines between active varga rows
    ctx.strokeStyle = withAlpha("var(--v-border)", 0.35);
    ctx.lineWidth = 0.5;
    ctx.setLineDash([]);
    for (let r = 1; r < nActiveRows; r++) {
      const y = MARGIN.top + r * cellH;
      ctx.beginPath();
      ctx.moveTo(MARGIN.left, y);
      ctx.lineTo(MARGIN.left + plotW, y);
      ctx.stroke();
    }

    // Sign boundary lines (solid, more visible)
    if (highlightSigns) {
      ctx.strokeStyle = withAlpha("var(--v-border)", 0.6);
      ctx.lineWidth = 1;
      ctx.setLineDash([]);
      for (let s = 0; s <= 12; s++) {
        const x = MARGIN.left + (s * 30 / 360) * plotW;
        ctx.beginPath();
        ctx.moveTo(x, MARGIN.top);
        ctx.lineTo(x, MARGIN.top + plotH);
        ctx.stroke();
      }
    }

    // Plot border
    ctx.strokeStyle = withAlpha("var(--v-border)", 0.5);
    ctx.lineWidth = 1;
    ctx.strokeRect(MARGIN.left, MARGIN.top, plotW, plotH);

    // Y-axis labels — only for active rows with correct varga names
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (let r = 0; r < nActiveRows; r++) {
      const j = activeRowIndices[r]; // original varga index
      const isHovered = hoverRow === r;
      ctx.fillStyle = isHovered ? resolveCSSVar("var(--v-accent-purple)") : resolveCSSVar("var(--v-text)");
      ctx.font = isHovered ? "bold 11px monospace" : "11px monospace";
      const y = MARGIN.top + (r + 0.5) * cellH;
      ctx.fillText(VARGA_NAMES[j], MARGIN.left - 5, y);
    }

    // X-axis sign symbols
    ctx.fillStyle = resolveCSSVar("var(--v-text)");
    ctx.font = "13px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    for (let s = 0; s < 12; s++) {
      const x = MARGIN.left + ((s * 30 + 15) / 360) * plotW;
      ctx.fillText(SIGN_SYMBOLS[s + 1], x, MARGIN.top + plotH + 3);
    }

    // X-axis degree labels
    ctx.font = "8px monospace";
    const textMutedColor = resolveCSSVar("var(--v-text-muted)");
    ctx.fillStyle = textMutedColor;
    ctx.globalAlpha = 0.6;
    for (let s = 0; s <= 12; s++) {
      const x = MARGIN.left + (s * 30 / 360) * plotW;
      ctx.fillText(`${s * 30}°`, x, MARGIN.top + plotH + 20);
    }
    ctx.globalAlpha = 1;

    // Title
    ctx.fillStyle = resolveCSSVar("var(--v-text)");
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(title, MARGIN.left, 14);

    // Vertical crosshair line
    if (crosshairX !== null) {
      drawCrosshair(ctx, crosshairX, MARGIN, MARGIN.top, plotH, canvasWidth);
    }

  }, [data, edges, colors, title, peakSpans, troughSpans, height, canvasWidth, highlightSigns, hoverRow, activeRowIndices, nActiveRows, crosshairX]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { x: mx, y: my } = canvasMousePos(canvas, e);

    // Update crosshair position
    setCrosshairX(mx);

    const margin = HEATMAP_MARGIN;

    const plotW = canvasWidth - margin.left - margin.right;
    const plotH = height - margin.top - margin.bottom;
    const nIntervals = edges.length - 1;
    const cellH = nActiveRows > 0 ? plotH / nActiveRows : plotH;

    const xRatio = (mx - margin.left) / plotW;
    const degree = xRatio * 360;
    const displayRow = Math.floor((my - margin.top) / cellH); // display row index

    // Update hover row (using display row index)
    if (displayRow >= 0 && displayRow < nActiveRows && degree >= 0 && degree <= 360) {
      setHoverRow(displayRow);
    } else {
      setHoverRow(null);
    }

    if (degree < 0 || degree > 360 || displayRow < 0 || displayRow >= nActiveRows) {
      setTooltip(null);
      return;
    }

    // Map display row to original varga index
    const vargaIdx = activeRowIndices[displayRow];

    let intIdx = -1;
    for (let i = 0; i < nIntervals; i++) {
      if (degree >= edges[i] && degree < edges[i + 1]) {
        intIdx = i;
        break;
      }
    }

    if (intIdx >= 0 && displayRow >= 0) {
      const value = data[vargaIdx]?.[intIdx];
      const signIdx = Math.floor(degree / 30);
      const signDeg = degree - signIdx * 30;

      let text = `${VARGA_NAMES[vargaIdx]} | ${SIGN_NAMES[signIdx + 1]} ${signDeg.toFixed(2)}°`;
      if (tooltipContent) {
        text = tooltipContent(vargaIdx, intIdx, value);
      } else if (value !== undefined) {
        text += ` | value: ${value}`;
      }

      setTooltip({ x: mx, y: my, text });
    }
  }, [canvasWidth, height, edges, data, tooltipContent, activeRowIndices, nActiveRows, setTooltip, setCrosshairX]);

  const handleMouseLeave = useCallback(() => {
    resetHover();
    setHoverRow(null);
  }, [resetHover]);

  const handleExportPng = useCallback(() => {
    downloadCanvasPng(canvasRef.current, `${title.replace(/[^a-zA-Z0-9]/g, "_")}.png`);
  }, [title]);

  return (
    <div ref={containerRef} className="relative w-full group/heatmap">
      <canvas
        ref={canvasRef}
        style={{ width: canvasWidth, height }}
        className="rounded-lg cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      />
      {tooltip && (
        <div
          className="absolute pointer-events-none text-[var(--v-text)] text-xs px-3 py-2 whitespace-nowrap z-10 tooltip-glass tooltip-glass-arrow tooltip-animated"
          style={{ left: tooltip.x + 12, top: tooltip.y - 36 }}
        >
          {tooltip.text}
        </div>
      )}
      <div className="flex items-center justify-between mt-1">
        {legendItems.length > 0 && (
          <div className="flex flex-wrap gap-3 ml-14">
            {legendItems.map((item, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div
                  className="w-3 h-3 rounded-sm border border-white/10"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-xs text-[var(--v-text-muted)]">{item.label}</span>
              </div>
            ))}
          </div>
        )}
        <button
          onClick={handleExportPng}
          className="ml-auto px-2 py-1 text-[10px] rounded border border-[var(--v-border)] text-[var(--v-text-muted)] hover:text-[var(--v-text)] hover:border-[var(--v-accent-purple)] transition-colors opacity-0 group-hover/heatmap:opacity-100"
          title="Export as PNG"
        >
          📷 PNG
        </button>
      </div>
    </div>
  );
}
