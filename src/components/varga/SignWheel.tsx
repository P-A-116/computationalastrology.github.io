"use client";

import { useMemo, type ReactNode } from "react";
import { motion } from "framer-motion";
import { SIGN_COLORS, SIGN_SYMBOLS } from "@/lib/varga-engine";

/** Zodiac sign index (0–11) a degree falls in. */
export function signIndexFor(degree: number): number {
  return Math.floor(degree / 30);
}

/** Pointer angle in degrees for a zodiac degree; -90° puts 0° at the top. */
function signAngleFor(degree: number): number {
  return ((degree % 360) / 360) * 360 - 90;
}

/** Polar → cartesian. `angle` is in radians. */
export function polarPoint(cx: number, cy: number, r: number, angle: number) {
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
}

/**
 * SVG path for one annular ("donut") segment between two radii and two angles
 * (radians). Sweeps clockwise, matching the zodiac layout.
 */
export function annularSegmentPath(
  cx: number,
  cy: number,
  innerR: number,
  outerR: number,
  startAngle: number,
  endAngle: number,
): string {
  const o1 = polarPoint(cx, cy, outerR, startAngle);
  const o2 = polarPoint(cx, cy, outerR, endAngle);
  const i1 = polarPoint(cx, cy, innerR, startAngle);
  const i2 = polarPoint(cx, cy, innerR, endAngle);
  const largeArc = ((endAngle - startAngle) * 180) / Math.PI > 180 ? 1 : 0;
  return (
    `M ${i1.x} ${i1.y} L ${o1.x} ${o1.y} ` +
    `A ${outerR} ${outerR} 0 ${largeArc} 1 ${o2.x} ${o2.y} ` +
    `L ${i2.x} ${i2.y} A ${innerR} ${innerR} 0 ${largeArc} 0 ${i1.x} ${i1.y}`
  );
}

export interface SignWheelProps {
  /** Zodiac degree (0–360) the pointer points at. */
  degree: number;
  cx: number;
  cy: number;
  /** Radii of the 12-segment sign ring. */
  outerR: number;
  innerR: number;
  /** Radius of the animated pointer tip. */
  pointerR: number;
  /** Radius of the centre disc the readout sits on. */
  centerRadius: number;
  /** Radius of the hub circle at the very centre. */
  hubRadius: number;
  pointerStrokeWidth?: number;
  symbolFontSize?: number;
  activeStrokeWidth?: number;
  /** Readout drawn on top of the centre disc. */
  children?: ReactNode;
}

/**
 * The parts every zodiac wheel shares: the 12-segment sign ring, the centre
 * disc, the animated pointer and the hub. Rendered as an SVG fragment so a
 * caller can compose it inside its own `<svg>` (e.g. beneath a nakshatra ring).
 */
export default function SignWheel({
  degree,
  cx,
  cy,
  outerR,
  innerR,
  pointerR,
  centerRadius,
  hubRadius,
  pointerStrokeWidth = 2,
  symbolFontSize = 12,
  activeStrokeWidth = 2,
  children,
}: SignWheelProps) {
  const signIdx = signIndexFor(degree);

  const pointer = useMemo(() => {
    const rad = (signAngleFor(degree) * Math.PI) / 180;
    return { x: cx + pointerR * Math.cos(rad), y: cy + pointerR * Math.sin(rad) };
  }, [degree, cx, cy, pointerR]);

  const signSegments = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => {
        const startAngle = (i * 30 - 90) * (Math.PI / 180);
        const endAngle = ((i + 1) * 30 - 90) * (Math.PI / 180);
        const midAngle = ((i * 30 + 15 - 90) * Math.PI) / 180;
        return {
          i,
          d: annularSegmentPath(cx, cy, innerR, outerR, startAngle, endAngle),
          text: polarPoint(cx, cy, (outerR + innerR) / 2, midAngle),
        };
      }),
    [cx, cy, innerR, outerR],
  );

  return (
    <>
      {/* Sign segments */}
      {signSegments.map(({ i, d, text }) => (
        <g key={i}>
          <path
            d={d}
            fill={SIGN_COLORS[i]}
            fillOpacity={i === signIdx ? 0.5 : 0.15}
            stroke={i === signIdx ? SIGN_COLORS[i] : "var(--v-border)"}
            strokeWidth={i === signIdx ? activeStrokeWidth : 0.5}
          />
          <text
            x={text.x}
            y={text.y}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={symbolFontSize}
            fill={i === signIdx ? "#ffffff" : SIGN_COLORS[i]}
            fontWeight={i === signIdx ? "bold" : "normal"}
            style={{ userSelect: "none" }}
          >
            {SIGN_SYMBOLS[i + 1]}
          </text>
        </g>
      ))}

      {/* Centre disc + readout */}
      <circle cx={cx} cy={cy} r={centerRadius} fill="var(--v-card)" stroke="var(--v-border)" strokeWidth={0.5} />
      {children}

      {/* Animated pointer */}
      <motion.line
        x1={cx}
        y1={cy}
        x2={pointer.x}
        y2={pointer.y}
        stroke="#f0c060"
        strokeWidth={pointerStrokeWidth}
        strokeLinecap="round"
        animate={{ x2: pointer.x, y2: pointer.y }}
        transition={{ type: "spring", stiffness: 120, damping: 20, mass: 0.5 }}
      />
      <motion.circle
        cx={pointer.x}
        cy={pointer.y}
        r={3}
        fill="#f0c060"
        animate={{ cx: pointer.x, cy: pointer.y }}
        transition={{ type: "spring", stiffness: 120, damping: 20, mass: 0.5 }}
      />
      <circle cx={cx} cy={cy} r={hubRadius} fill="#f0c060" stroke="var(--v-bg)" strokeWidth={1} />
    </>
  );
}
