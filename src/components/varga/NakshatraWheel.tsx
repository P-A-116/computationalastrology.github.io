"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import {
  SIGN_NAMES,
  SIGN_SYMBOLS,
  SIGN_COLORS,
  NAKSHATRA_NAMES,
  NAKSHATRA_LORDS,
  NAKSHATRA_DEGREES,
  getNakshatraIndex,
  getNakshatraInfo,
} from "@/lib/varga-engine";

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
  const signTextR = (signOuterR + signInnerR) / 2;

  // Pointer / center
  const pointerR = signInnerR - 10;
  const centerR = signInnerR - 14;

  const signAngle = useMemo(() => {
    return ((degree % 360) / 360) * 360 - 90;
  }, [degree]);

  const pointerX = cx + pointerR * Math.cos((signAngle * Math.PI) / 180);
  const pointerY = cy + pointerR * Math.sin((signAngle * Math.PI) / 180);

  const signIdx = Math.floor(degree / 30);
  const nakshatraIdx = getNakshatraIndex(degree);
  const nakshatraInfo = useMemo(() => getNakshatraInfo(degree), [degree]);

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
      {Array.from({ length: 27 }, (_, i) => {
        const startDeg = i * NAKSHATRA_DEGREES;
        const endDeg = (i + 1) * NAKSHATRA_DEGREES;
        const startAngle = (startDeg - 90) * (Math.PI / 180);
        const endAngle = (endDeg - 90) * (Math.PI / 180);
        const midAngle = ((startDeg + NAKSHATRA_DEGREES / 2 - 90) * Math.PI) / 180;

        const x1Outer = cx + outerR * Math.cos(startAngle);
        const y1Outer = cy + outerR * Math.sin(startAngle);
        const x2Outer = cx + outerR * Math.cos(endAngle);
        const y2Outer = cy + outerR * Math.sin(endAngle);
        const x1Inner = cx + nakshatraInnerR * Math.cos(startAngle);
        const y1Inner = cy + nakshatraInnerR * Math.sin(startAngle);
        const x2Inner = cx + nakshatraInnerR * Math.cos(endAngle);
        const y2Inner = cy + nakshatraInnerR * Math.sin(endAngle);

        const textX = cx + nakshatraTextR * Math.cos(midAngle);
        const textY = cy + nakshatraTextR * Math.sin(midAngle);

        const largeArc = NAKSHATRA_DEGREES > 180 ? 1 : 0;
        const isActive = i === nakshatraIdx;
        const color = nakshatraColor(i);

        return (
          <g key={`nak-${i}`}>
            {/* Nakshatra segment */}
            <path
              d={`M ${x1Inner} ${y1Inner} L ${x1Outer} ${y1Outer} A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2Outer} ${y2Outer} L ${x2Inner} ${y2Inner} A ${nakshatraInnerR} ${nakshatraInnerR} 0 ${largeArc} 0 ${x1Inner} ${y1Inner}`}
              fill={color}
              fillOpacity={isActive ? 0.55 : 0.12}
              stroke={isActive ? color : "var(--v-border)"}
              strokeWidth={isActive ? 1.5 : 0.3}
            />
            {/* Nakshatra label - only show abbreviated on larger sizes, skip every other on small */}
            {(size >= 220 || i % 2 === 0) && (
              <text
                x={textX}
                y={textY}
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

      {/* Zodiac sign inner ring - 12 segments */}
      {Array.from({ length: 12 }, (_, i) => {
        const startAngle = (i * 30 - 90) * (Math.PI / 180);
        const endAngle = ((i + 1) * 30 - 90) * (Math.PI / 180);
        const midAngle = ((i * 30 + 15 - 90) * Math.PI) / 180;

        const x1Outer = cx + signOuterR * Math.cos(startAngle);
        const y1Outer = cy + signOuterR * Math.sin(startAngle);
        const x2Outer = cx + signOuterR * Math.cos(endAngle);
        const y2Outer = cy + signOuterR * Math.sin(endAngle);
        const x1Inner = cx + signInnerR * Math.cos(startAngle);
        const y1Inner = cy + signInnerR * Math.sin(startAngle);

        const textX = cx + signTextR * Math.cos(midAngle);
        const textY = cy + signTextR * Math.sin(midAngle);

        const largeArc = 30 > 180 ? 1 : 0;

        return (
          <g key={`sign-${i}`}>
            {/* Sign segment fill */}
            <path
              d={`M ${x1Inner} ${y1Inner} L ${x1Outer} ${y1Outer} A ${signOuterR} ${signOuterR} 0 ${largeArc} 1 ${x2Outer} ${y2Outer} L ${cx + signInnerR * Math.cos(endAngle)} ${cy + signInnerR * Math.sin(endAngle)} A ${signInnerR} ${signInnerR} 0 ${largeArc} 0 ${x1Inner} ${y1Inner}`}
              fill={SIGN_COLORS[i]}
              fillOpacity={i === signIdx ? 0.5 : 0.15}
              stroke={i === signIdx ? SIGN_COLORS[i] : "var(--v-border)"}
              strokeWidth={i === signIdx ? 1.5 : 0.5}
            />
            {/* Sign symbol */}
            <text
              x={textX}
              y={textY}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={size < 260 ? 9 : 11}
              fill={i === signIdx ? "#ffffff" : SIGN_COLORS[i]}
              fontWeight={i === signIdx ? "bold" : "normal"}
              style={{ userSelect: "none" }}
            >
              {SIGN_SYMBOLS[i + 1]}
            </text>
          </g>
        );
      })}

      {/* Center circle */}
      <circle
        cx={cx}
        cy={cy}
        r={centerR}
        fill="var(--v-card)"
        stroke="var(--v-border)"
        strokeWidth={0.5}
      />

      {/* Center text - Nakshatra name */}
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

      {/* Center text - Sign symbol + name */}
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

      {/* Center text - Degree */}
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

      {/* Center text - Nakshatra Lord & Pada */}
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

      {/* Animated pointer line */}
      <motion.line
        x1={cx}
        y1={cy}
        x2={pointerX}
        y2={pointerY}
        stroke="#f0c060"
        strokeWidth={1.5}
        strokeLinecap="round"
        animate={{ x2: pointerX, y2: pointerY }}
        transition={{ type: "spring", stiffness: 120, damping: 20, mass: 0.5 }}
      />
      <motion.circle
        cx={pointerX}
        cy={pointerY}
        r={3}
        fill="#f0c060"
        animate={{ cx: pointerX, cy: pointerY }}
        transition={{ type: "spring", stiffness: 120, damping: 20, mass: 0.5 }}
      />
      <circle cx={cx} cy={cy} r={3} fill="#f0c060" stroke="var(--v-bg)" strokeWidth={1} />
    </svg>
  );
}
