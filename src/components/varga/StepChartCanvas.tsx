"use client";

import React, { useRef, useEffect, useCallback } from "react";
import { N_VARGA, SIGN_NAMES, SIGN_SYMBOLS } from "@/lib/varga-engine";
import { resolveCSSVar } from "@/lib/theme-colors";
import {
  useCanvasWidth,
  useCanvasTooltip,
  prepareHiDPICanvas,
  canvasMousePos,
  drawCrosshair,
} from "@/hooks/use-canvas-chart";

interface StepChartCanvasProps {
  edges: number[];
  counts: number[];
  color: string;
  title: string;
  peakSpans?: [number, number][];
  troughSpans?: [number, number][];
  height?: number;
  yDomain?: [number, number];
  showYLabel?: boolean;
}

const MARGIN_BASE = { top: 30, right: 20, bottom: 25, left: 45 };
const MARGIN_NO_LABEL = { top: 30, right: 20, bottom: 25, left: 20 };

export default function StepChartCanvas({
  edges,
  counts,
  color,
  title,
  peakSpans = [],
  troughSpans = [],
  height = 140,
  yDomain,
  showYLabel = true,
}: StepChartCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasWidth = useCanvasWidth(containerRef);
  const { tooltip, setTooltip, crosshairX, setCrosshairX, resetHover } = useCanvasTooltip();

  const MARGIN = showYLabel ? MARGIN_BASE : MARGIN_NO_LABEL;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = prepareHiDPICanvas(canvas, canvasWidth, height);
    if (!ctx) return;

    const plotW = canvasWidth - MARGIN.left - MARGIN.right;
    const plotH = height - MARGIN.top - MARGIN.bottom;

    const yMin = yDomain ? yDomain[0] : 0;
    const yMax = yDomain ? yDomain[1] : N_VARGA;

    // Background
    ctx.fillStyle = resolveCSSVar("var(--v-card)");
    ctx.fillRect(0, 0, canvasWidth, height);

    // Peak spans (gold highlight)
    ctx.fillStyle = "#f0c060";
    for (const [s, e] of peakSpans) {
      const x1 = MARGIN.left + (s / 360) * plotW;
      const x2 = MARGIN.left + (e / 360) * plotW;
      ctx.globalAlpha = 0.35;
      ctx.fillRect(x1, MARGIN.top, x2 - x1, plotH);
    }
    ctx.globalAlpha = 1;

    // Trough spans (blue highlight)
    ctx.fillStyle = "#60b8f0";
    for (const [s, e] of troughSpans) {
      const x1 = MARGIN.left + (s / 360) * plotW;
      const x2 = MARGIN.left + (e / 360) * plotW;
      ctx.globalAlpha = 0.15;
      ctx.fillRect(x1, MARGIN.top, x2 - x1, plotH);
    }
    ctx.globalAlpha = 1;

    // Sign boundary lines
    ctx.strokeStyle = resolveCSSVar("var(--v-border)");
    ctx.lineWidth = 0.3;
    ctx.setLineDash([2, 4]);
    for (let s = 0; s <= 12; s++) {
      const x = MARGIN.left + (s * 30 / 360) * plotW;
      ctx.beginPath();
      ctx.moveTo(x, MARGIN.top);
      ctx.lineTo(x, MARGIN.top + plotH);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Fill area under step line
    ctx.beginPath();
    ctx.moveTo(MARGIN.left + (edges[0] / 360) * plotW, MARGIN.top + plotH);
    for (let i = 0; i < counts.length; i++) {
      const x1 = MARGIN.left + (edges[i] / 360) * plotW;
      const x2 = MARGIN.left + (edges[i + 1] / 360) * plotW;
      const y = MARGIN.top + plotH - ((counts[i] - yMin) / (yMax - yMin)) * plotH;
      ctx.lineTo(x1, y);
      ctx.lineTo(x2, y);
    }
    ctx.lineTo(MARGIN.left + (edges[edges.length - 1] / 360) * plotW, MARGIN.top + plotH);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.15;
    ctx.fill();
    ctx.globalAlpha = 1;

    // Step line
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    for (let i = 0; i < counts.length; i++) {
      const x1 = MARGIN.left + (edges[i] / 360) * plotW;
      const x2 = MARGIN.left + (edges[i + 1] / 360) * plotW;
      const y = MARGIN.top + plotH - ((counts[i] - yMin) / (yMax - yMin)) * plotH;
      if (i === 0) ctx.moveTo(x1, y);
      else ctx.lineTo(x1, y);
      ctx.lineTo(x2, y);
    }
    ctx.stroke();

    // Y-axis
    if (showYLabel) {
      ctx.fillStyle = resolveCSSVar("var(--v-text)");
      ctx.font = "9px monospace";
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      const yTicks = 5;
      for (let t = 0; t <= yTicks; t++) {
        const val = yMin + (yMax - yMin) * (t / yTicks);
        const y = MARGIN.top + plotH - (t / yTicks) * plotH;
        ctx.fillText(Math.round(val).toString(), MARGIN.left - 5, y);
      }
    }

    // X-axis sign symbols
    ctx.fillStyle = resolveCSSVar("var(--v-text)");
    ctx.font = "10px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    for (let s = 0; s < 12; s++) {
      const x = MARGIN.left + ((s * 30 + 15) / 360) * plotW;
      ctx.fillText(SIGN_SYMBOLS[s + 1], x, MARGIN.top + plotH + 4);
    }

    // Title
    ctx.fillStyle = color;
    ctx.font = "bold 10px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(title, MARGIN.left, 12);

    // Vertical crosshair line
    if (crosshairX !== null) {
      drawCrosshair(ctx, crosshairX, MARGIN, MARGIN.top, plotH, canvasWidth);
    }

  }, [edges, counts, color, title, peakSpans, troughSpans, height, canvasWidth, yDomain, showYLabel, crosshairX]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { x: mx } = canvasMousePos(canvas, e);

    // Update crosshair position
    setCrosshairX(mx);

    const margin = showYLabel ? MARGIN_BASE : MARGIN_NO_LABEL;

    const plotW = canvasWidth - margin.left - margin.right;
    const xRatio = (mx - margin.left) / plotW;
    const degree = xRatio * 360;

    if (degree < 0 || degree > 360) {
      setTooltip(null);
      return;
    }

    const signIdx = Math.floor(degree / 30);
    const signDeg = degree - signIdx * 30;

    // Find interval
    let count = 0;
    for (let i = 0; i < edges.length - 1; i++) {
      if (degree >= edges[i] && degree < edges[i + 1]) {
        count = counts[i];
        break;
      }
    }

    setTooltip({
      x: mx,
      y: 10,
      text: `${SIGN_NAMES[signIdx + 1]} ${signDeg.toFixed(1)}° | count: ${count}`,
    });
  }, [canvasWidth, edges, counts, showYLabel, setTooltip, setCrosshairX]);

  const handleMouseLeave = useCallback(() => { resetHover(); }, [resetHover]);

  return (
    <div ref={containerRef} className="relative w-full">
      <canvas
        ref={canvasRef}
        style={{ width: canvasWidth, height }}
        className="rounded-lg cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      />
      {tooltip && (
        <div
          className="absolute pointer-events-none text-[var(--v-text)] text-xs px-3 py-2 whitespace-nowrap z-10 tooltip-glass tooltip-glass-gold tooltip-glass-arrow tooltip-animated"
          style={{ left: tooltip.x + 10, top: tooltip.y }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}
