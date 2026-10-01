"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  NAKSHATRA_NAMES,
  NAKSHATRA_DEGREES,
  getNakshatraIndex,
  getNakshatraInfo,
  SIGN_COLORS,
  SIGN_NAMES,
  SIGN_SYMBOLS,
} from "@/lib/varga-engine";
import SignWheel, { annularSegmentPath, polarPoint, signIndexFor } from "@/components/varga/SignWheel";

interface NakshatraWheelProps {
  degree: number;
  size?: number;
}

// Abbreviate nakshatra names for the small ring segments
function abbreviateNakshatra(name: string): string {
  if (name.length <= 4) return name;
  // Use first 3-4 chars based on word boundaries
  const words = name.split(" ");
  if (words.length === 1) return name.slice(0, 4);
  return words.map(w => w.slice(0, 2)).join("");
}

// Nakshatra color: HSL cycle from purple to gold
function nakshatraColor(i: number): string {
  // Cycle hue: start at purple (270) through gold (45)
  const hue = (i / 27) * 360;
  return `hsl(${hue}, 50%, 50%)`;
}

export default function NakshatraWheel({ degree, size = 240 }: NakshatraWheelProps) {
  const cx = size / 2;
  const cy = size / 2;

  // Progress ring: outermost ring showing degree position
  const progressR = size / 2 - 2;
  const progressStroke = 4;
  const progressCircumference = 2 * Math.PI * progressR;
  const progressOffset = progressCircumference - ((degree % 360) / 360) * progressCircumference;

  // Outer ring: Nakshatra ring
  const outerR = size / 2 - 8;
  const nakshatraInnerR = outerR - 20;
  const nakshatraTextR = (outerR + nakshatraInnerR) / 2;

  // Inner ring: Zodiac sign ring
  const signOuterR = nakshatraInnerR - 4; // small gap between rings
  const signInnerR = signOuterR - 20;

  const signIdx = signIndexFor(degree);
  const nakshatraIdx = getNakshatraIndex(degree);
  const nakshatraInfo = useMemo(() => getNakshatraInfo(degree), [degree]);

  const nakshatraSegments = useMemo(
    () =>
      Array.from({ length: 27 }, (_, i) => {
        const startDeg = i * NAKSHATRA_DEGREES;
        const startAngle = (startDeg - 90) * (Math.PI / 180);
        const endAngle = (startDeg + NAKSHATRA_DEGREES - 90) * (Math.PI / 180);
        const midAngle = ((startDeg + NAKSHATRA_DEGREES / 2 - 90) * Math.PI) / 180;
        return {
          i,
          d: annularSegmentPath(cx, cy, nakshatraInnerR, outerR, startAngle, endAngle),
          text: polarPoint(cx, cy, nakshatraTextR, midAngle),
        };
      }),
    [cx, cy, nakshatraInnerR, outerR, nakshatraTextR],
  );

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="mx-auto">
      {/* Degree progress ring - outermost arc showing 0-360° position */}
      <defs>
        <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#9b7fe8" />
          <stop offset="50%" stopColor="#c09ef0" />
          <stop offset="100%" stopColor="#f0c060" />
        </linearGradient>
      </defs>
      {/* Background track */}
      <circle
        cx={cx}
        cy={cy}
        r={progressR}
        fill="none"
        stroke="var(--v-border)"
        strokeWidth={progressStroke}
        opacity={0.3}
      />
      {/* Progress arc */}
      <motion.circle
        cx={cx}
        cy={cy}
        r={progressR}
        fill="none"
        stroke="url(#progressGradient)"
        strokeWidth={progressStroke}
        strokeLinecap="round"
        strokeDasharray={progressCircumference}
        initial={{ strokeDashoffset: progressCircumference }}
        animate={{ strokeDashoffset: progressOffset }}
        transition={{ type: "spring", stiffness: 100, damping: 20, mass: 0.5 }}
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{ filter: "drop-shadow(0 0 3px rgba(155, 127, 232, 0.4))" }}
      />

      {/* Nakshatra outer ring - 27 segments */}
      {nakshatraSegments.map(({ i, d, text }) => {
        const isActive = i === nakshatraIdx;
        const color = nakshatraColor(i);
        return (
          <g key={`nak-${i}`}>
            <path
              d={d}
              fill={color}
              fillOpacity={isActive ? 0.55 : 0.12}
              stroke={isActive ? color : "var(--v-border)"}
              strokeWidth={isActive ? 1.5 : 0.3}
            />
            {/* Label - only on larger sizes, skip every other on small */}
            {(size >= 220 || i % 2 === 0) && (
              <text
                x={text.x}
                y={text.y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={size < 260 ? 5 : 6}
                fill={isActive ? "#ffffff" : "var(--v-text-muted)"}
                fontWeight={isActive ? "bold" : "normal"}
                style={{ userSelect: "none" }}
              >
                {abbreviateNakshatra(NAKSHATRA_NAMES[i])}
              </text>
            )}
          </g>
        );
      })}

      {/* Zodiac sign ring + centre disc + pointer (shared wheel) */}
      <SignWheel
        degree={degree}
        cx={cx}
        cy={cy}
        outerR={signOuterR}
        innerR={signInnerR}
        pointerR={signInnerR - 10}
        centerRadius={signInnerR - 14}
        hubRadius={3}
        pointerStrokeWidth={1.5}
        symbolFontSize={size < 260 ? 9 : 11}
        activeStrokeWidth={1.5}
      >
        {/* Centre readout - Nakshatra name */}
        <text
          x={cx}
          y={cy - 16}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={9}
          fill={nakshatraColor(nakshatraIdx)}
          fontWeight="bold"
          style={{ userSelect: "none" }}
        >
          {nakshatraInfo.name}
        </text>

        {/* Centre readout - Sign symbol + name */}
        <text
          x={cx}
          y={cy - 4}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={10}
          fill={SIGN_COLORS[signIdx]}
          fontWeight="bold"
          style={{ userSelect: "none" }}
        >
          {SIGN_SYMBOLS[signIdx + 1]} {SIGN_NAMES[signIdx + 1]}
        </text>

        {/* Centre readout - Degree */}
        <text
          x={cx}
          y={cy + 8}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={8}
          fill="var(--v-text)"
          fontFamily="monospace"
          style={{ userSelect: "none" }}
        >
          {(degree % 30).toFixed(2)}°
        </text>

        {/* Centre readout - Nakshatra Lord & Pada */}
        <text
          x={cx}
          y={cy + 19}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={7}
          fill="var(--v-text-muted)"
          style={{ userSelect: "none" }}
        >
          {nakshatraInfo.lord} · P{nakshatraInfo.pada}
        </text>
      </SignWheel>
    </svg>
  );
}
