"use client";

import { useCallback, useEffect, useState, type RefObject } from "react";
import { withAlpha } from "@/lib/theme-colors";

/** A hover tooltip anchored at a CSS-pixel position inside the canvas. */
export interface CanvasTooltip {
  x: number;
  y: number;
  text: string;
}

/**
 * Track the CSS-pixel width of a container, updating on resize. Replaces the
 * hand-rolled `ResizeObserver` block duplicated across the canvas charts.
 */
export function useCanvasWidth<T extends HTMLElement>(
  containerRef: RefObject<T | null>,
  initial = 800,
): number {
  const [width, setWidth] = useState(initial);

  useEffect(() => {
    const update = () => {
      if (containerRef.current) setWidth(containerRef.current.clientWidth);
    };
    update();
    const observer = new ResizeObserver(update);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [containerRef]);

  return width;
}

/**
 * Tooltip + crosshair state shared by the hover-enabled canvas charts.
 * `resetHover` clears both, e.g. on mouse-leave.
 */
export function useCanvasTooltip() {
  const [tooltip, setTooltip] = useState<CanvasTooltip | null>(null);
  const [crosshairX, setCrosshairX] = useState<number | null>(null);

  const resetHover = useCallback(() => {
    setTooltip(null);
    setCrosshairX(null);
  }, []);

  return { tooltip, setTooltip, crosshairX, setCrosshairX, resetHover };
}

/**
 * Size a canvas for the current devicePixelRatio and return a context already
 * scaled to CSS pixels, so callers draw in CSS-pixel coordinates. Returns
 * `null` if a 2D context cannot be obtained.
 */
export function prepareHiDPICanvas(
  canvas: HTMLCanvasElement,
  cssWidth: number,
  cssHeight: number,
  options: { setStyleSize?: boolean } = {},
): CanvasRenderingContext2D | null {
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const dpr = window.devicePixelRatio || 1;
  canvas.width = cssWidth * dpr;
  canvas.height = cssHeight * dpr;
  if (options.setStyleSize) {
    canvas.style.width = `${cssWidth}px`;
    canvas.style.height = `${cssHeight}px`;
  }
  ctx.scale(dpr, dpr);
  return ctx;
}

/** Mouse position relative to a canvas's top-left, in CSS pixels. */
export function canvasMousePos(
  canvas: HTMLCanvasElement,
  e: { clientX: number; clientY: number },
): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

/** Dashed vertical crosshair line at `x`, spanning the plot height. */
export function drawCrosshair(
  ctx: CanvasRenderingContext2D,
  x: number,
  margin: { left: number; right: number },
  plotTop: number,
  plotH: number,
  canvasWidth: number,
): void {
  if (x < margin.left || x > canvasWidth - margin.right) return;
  ctx.beginPath();
  ctx.moveTo(x, plotTop);
  ctx.lineTo(x, plotTop + plotH);
  ctx.strokeStyle = withAlpha("var(--v-accent-purple)", 0.35);
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 3]);
  ctx.stroke();
  ctx.setLineDash([]);
}
