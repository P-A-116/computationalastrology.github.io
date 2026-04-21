"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { N_VARGA, VARGA_NAMES, SIGN_NAMES, SIGN_SYMBOLS } from "@/lib/varga-engine";

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

/** Helper to resolve CSS variable to rgba() string for Canvas */
function resolveCSSVarAlpha(cssVar: string, alpha: number): string {
  const hex = resolveCSSVar(cssVar);
  // Parse hex color to RGB
  let r = 0, g = 0, b = 0;
  if (hex.startsWith("#")) {
    const clean = hex.replace("#", "");
    if (clean.length >= 6) {
      r = parseInt(clean.slice(0, 2), 16);
      g = parseInt(clean.slice(2, 4), 16);
      b = parseInt(clean.slice(4, 6), 16);
    } else if (clean.length >= 3) {
      r = parseInt(clean[0] + clean[0], 16);
      g = parseInt(clean[1] + clean[1], 16);
      b = parseInt(clean[2] + clean[2], 16);
    }
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
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
  const [canvasWidth, setCanvasWidth] = useState(800);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    text: string;
  } | null>(null);
  const [crosshairX, setCrosshairX] = useState<number | null>(null);

  const MARGIN = showYLabel ? MARGIN_BASE : MARGIN_NO_LABEL;

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
    canvas.width = canvasWidth * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

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
    if (crosshairX !== null && crosshairX >= MARGIN.left && crosshairX <= canvasWidth - MARGIN.right) {
      ctx.beginPath();
      ctx.moveTo(crosshairX, MARGIN.top);
      ctx.lineTo(crosshairX, MARGIN.top + plotH);
      ctx.strokeStyle = resolveCSSVarAlpha("var(--v-accent-purple)", 0.35);
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

  }, [edges, counts, color, title, peakSpans, troughSpans, height, canvasWidth, yDomain, showYLabel, crosshairX]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;

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
  }, [canvasWidth, edges, counts, showYLabel]);

  const handleMouseLeave = useCallback(() => { setTooltip(null); setCrosshairX(null); }, []);

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
