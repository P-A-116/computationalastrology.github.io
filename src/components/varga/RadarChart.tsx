"use client";

import React, { useRef, useEffect, useCallback, useState } from "react";
import {
  computeVargaAnalysis,
  N_VARGA,
  COL_ODD, COL_EVEN,
  COL_CARDINAL, COL_FIXED, COL_MUTABLE,
  COL_FIRE, COL_EARTH, COL_AIR, COL_WATER,
  AugmentedInterval,
} from "@/lib/varga-engine";

// 9 radar axes: Odd, Even, Card, Fix, Mut, Fire, Earth, Air, Water
const RADAR_AXES = [
  { key: "odd",     label: "Odd",   color: COL_ODD },
  { key: "even",    label: "Even",  color: COL_EVEN },
  { key: "card",    label: "Card",  color: COL_CARDINAL },
  { key: "fix",     label: "Fix",   color: COL_FIXED },
  { key: "mut",     label: "Mut",   color: COL_MUTABLE },
  { key: "fire",    label: "Fire",  color: COL_FIRE },
  { key: "earth",   label: "Earth", color: COL_EARTH },
  { key: "air",     label: "Air",   color: COL_AIR },
  { key: "water",   label: "Water", color: COL_WATER },
] as const;

type RadarKey = typeof RADAR_AXES[number]["key"];

interface RadarChartProps {
  data: ReturnType<typeof computeVargaAnalysis>;
  degree?: number; // If provided, show analysis at this specific degree
  size?: number;
}

/** Get category count at a specific degree position */
function getCategoryCountsAtDegree(
  data: ReturnType<typeof computeVargaAnalysis>,
  degree: number
): Record<RadarKey, number> {
  // Find the interval that contains this degree
  const deg = ((degree % 360) + 360) % 360;
  const interval = data.intervals.find(
    iv => iv.b0.toNumber() <= deg && iv.b1.toNumber() > deg
  );
  if (!interval) {
    // Fallback: return zeros
    return { odd: 0, even: 0, card: 0, fix: 0, mut: 0, fire: 0, earth: 0, air: 0, water: 0 };
  }

  // Count vargas in each category
  const odd = interval.parRow.filter(v => v === 1).length;
  const even = interval.parRow.filter(v => v === 0).length;
  const card = interval.modRow.filter(v => v === 1).length;
  const fix = interval.modRow.filter(v => v === 2).length;
  const mut = interval.modRow.filter(v => v === 0).length;
  const fire = interval.eleRow.filter(v => v === 1).length;
  const earth = interval.eleRow.filter(v => v === 2).length;
  const air = interval.eleRow.filter(v => v === 3).length;
  const water = interval.eleRow.filter(v => v === 0).length;

  return { odd, even, card, fix, mut, fire, earth, air, water };
}

/** Get average category counts across all intervals */
function getAverageCategoryCounts(
  data: ReturnType<typeof computeVargaAnalysis>
): Record<RadarKey, number> {
  const n = data.intervals.length;
  if (n === 0) return { odd: 0, even: 0, card: 0, fix: 0, mut: 0, fire: 0, earth: 0, air: 0, water: 0 };

  let sumOdd = 0, sumEven = 0, sumCard = 0, sumFix = 0, sumMut = 0;
  let sumFire = 0, sumEarth = 0, sumAir = 0, sumWater = 0;

  for (const iv of data.intervals) {
    sumOdd += iv.parRow.filter(v => v === 1).length;
    sumEven += iv.parRow.filter(v => v === 0).length;
    sumCard += iv.modRow.filter(v => v === 1).length;
    sumFix += iv.modRow.filter(v => v === 2).length;
    sumMut += iv.modRow.filter(v => v === 0).length;
    sumFire += iv.eleRow.filter(v => v === 1).length;
    sumEarth += iv.eleRow.filter(v => v === 2).length;
    sumAir += iv.eleRow.filter(v => v === 3).length;
    sumWater += iv.eleRow.filter(v => v === 0).length;
  }

  return {
    odd: sumOdd / n,
    even: sumEven / n,
    card: sumCard / n,
    fix: sumFix / n,
    mut: sumMut / n,
    fire: sumFire / n,
    earth: sumEarth / n,
    air: sumAir / n,
    water: sumWater / n,
  };
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

export default function RadarChart({ data, degree, size = 400 }: RadarChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [responsiveSize, setResponsiveSize] = useState(size);

  // Detect screen size for responsive rendering
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const updateSize = () => {
      setResponsiveSize(mq.matches ? 300 : size);
    };
    updateSize();
    mq.addEventListener("change", updateSize);
    return () => mq.removeEventListener("change", updateSize);
  }, [size]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Handle devicePixelRatio for crisp rendering
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    const displaySize = responsiveSize;
    canvas.width = displaySize * dpr;
    canvas.height = displaySize * dpr;
    canvas.style.width = `${displaySize}px`;
    canvas.style.height = `${displaySize}px`;
    ctx.scale(dpr, dpr);

    // Resolve theme colors
    const bgColor = resolveCSSVar("var(--v-card)");
    const borderColor = resolveCSSVar("var(--v-border)");
    const textColor = resolveCSSVar("var(--v-text)");
    const mutedColor = resolveCSSVar("var(--v-text-muted)");

    // Get values
    const values = degree !== undefined
      ? getCategoryCountsAtDegree(data, degree)
      : getAverageCategoryCounts(data);

    const n = RADAR_AXES.length;
    const maxVal = N_VARGA; // 16
    const center = displaySize / 2;
    const radius = displaySize * 0.34; // radius for the outermost ring
    const isMobile = displaySize < 350;
    const labelRadius = radius + (isMobile ? 20 : 28);
    const axisLabelFont = isMobile ? "bold 9px sans-serif" : "bold 11px sans-serif";
    const valueLabelFont = isMobile ? "7px monospace" : "9px monospace";
    const refLabelFont = isMobile ? "7px monospace" : "9px monospace";
    const titleFont = isMobile ? "bold 10px sans-serif" : "bold 12px sans-serif";
    const modeFont = isMobile ? "8px sans-serif" : "10px sans-serif";

    // Clear canvas
    ctx.clearRect(0, 0, displaySize, displaySize);

    // Draw background circle
    ctx.beginPath();
    ctx.arc(center, center, radius + 8, 0, Math.PI * 2);
    ctx.fillStyle = bgColor;
    ctx.fill();

    // Draw concentric reference circles at 4, 8, 12, 16
    const refLevels = [4, 8, 12, 16];
    for (const level of refLevels) {
      const r = (level / maxVal) * radius;
      ctx.beginPath();
      ctx.arc(center, center, r, 0, Math.PI * 2);
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 0.5;
      ctx.setLineDash([3, 3]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Reference level label (small, at top-right)
      const labelAngle = -Math.PI / 2 + 0.15; // just right of 12 o'clock
      const lx = center + Math.cos(labelAngle) * r;
      const ly = center + Math.sin(labelAngle) * r;
      ctx.fillStyle = mutedColor;
      ctx.font = refLabelFont;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(`${level}`, lx + 2, ly);
    }

    // Draw axes
    for (let i = 0; i < n; i++) {
      const angle = (Math.PI * 2 * i) / n - Math.PI / 2; // start from top
      const x = center + Math.cos(angle) * radius;
      const y = center + Math.sin(angle) * radius;

      // Axis line
      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.lineTo(x, y);
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // Axis label
      const labelX = center + Math.cos(angle) * labelRadius;
      const labelY = center + Math.sin(angle) * labelRadius;
      ctx.fillStyle = RADAR_AXES[i].color;
      ctx.font = axisLabelFont;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // Adjust text alignment based on position
      if (Math.abs(Math.cos(angle)) > 0.8) {
        ctx.textAlign = Math.cos(angle) > 0 ? "left" : "right";
      }
      if (Math.abs(Math.sin(angle)) > 0.8) {
        ctx.textBaseline = Math.sin(angle) > 0 ? "top" : "bottom";
      }

      ctx.fillText(RADAR_AXES[i].label, labelX, labelY);

      // Value label (show count)
      const valKey = RADAR_AXES[i].key;
      const val = values[valKey];
      const valR = (val / maxVal) * radius;
      const valX = center + Math.cos(angle) * (valR + 8);
      const valY = center + Math.sin(angle) * (valR + 8);

      // Only show value if there's enough space
      if (val > 0) {
        ctx.fillStyle = textColor;
        ctx.font = valueLabelFont;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(
          Number.isInteger(val) ? val.toString() : val.toFixed(1),
          valX,
          valY
        );
      }
    }

    // Draw filled polygon
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
      const valKey = RADAR_AXES[i].key;
      const val = values[valKey];
      const r = (val / maxVal) * radius;
      const x = center + Math.cos(angle) * r;
      const y = center + Math.sin(angle) * r;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.closePath();

    // Fill with semi-transparent gradient
    const gradient = ctx.createRadialGradient(center, center, 0, center, center, radius);
    gradient.addColorStop(0, "rgba(155, 127, 232, 0.15)");
    gradient.addColorStop(1, "rgba(155, 127, 232, 0.30)");
    ctx.fillStyle = gradient;
    ctx.fill();

    // Stroke polygon
    ctx.strokeStyle = "rgba(155, 127, 232, 0.7)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw data points on each axis with category colors
    for (let i = 0; i < n; i++) {
      const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
      const valKey = RADAR_AXES[i].key;
      const val = values[valKey];
      const r = (val / maxVal) * radius;
      const x = center + Math.cos(angle) * r;
      const y = center + Math.sin(angle) * r;

      // Draw dot with category color
      ctx.beginPath();
      ctx.arc(x, y, isMobile ? 3 : 4, 0, Math.PI * 2);
      ctx.fillStyle = RADAR_AXES[i].color;
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Draw center point
    ctx.beginPath();
    ctx.arc(center, center, 2, 0, Math.PI * 2);
    ctx.fillStyle = borderColor;
    ctx.fill();

    // Title at the top
    const titleText = degree !== undefined
      ? `Category Balance at ${degree.toFixed(1)}°`
      : "Category Balance (Overall Average)";
    ctx.fillStyle = textColor;
    ctx.font = titleFont;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(titleText, center, 6);

    // Mode indicator at bottom
    const modeText = degree !== undefined
      ? `Degree mode: ${degree.toFixed(2)}°`
      : "Averaged across 1,800 intervals";
    ctx.fillStyle = mutedColor;
    ctx.font = modeFont;
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText(modeText, center, displaySize - 6);
  }, [data, degree, responsiveSize]);

  useEffect(() => {
    draw();
  }, [draw]);

  // Re-draw on resize / DPR change
  useEffect(() => {
    const handleResize = () => draw();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: responsiveSize, height: responsiveSize, maxWidth: "100%" }}
      className="mx-auto"
    />
  );
}
