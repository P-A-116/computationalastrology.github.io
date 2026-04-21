"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { SIGN_NAMES, SIGN_SYMBOLS, SIGN_COLORS } from "@/lib/varga-engine";

interface ZodiacWheelProps {
  degree: number;
  size?: number;
}

export default function ZodiacWheel({ degree, size = 200 }: ZodiacWheelProps) {
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - 4;
  const innerR = outerR - 22;
  const textR = (outerR + innerR) / 2;
  const pointerR = innerR - 10;

  const signAngle = useMemo(() => {
    return ((degree % 360) / 360) * 360 - 90; // -90 to start from top
  }, [degree]);

  const pointerX = cx + pointerR * Math.cos((signAngle * Math.PI) / 180);
  const pointerY = cy + pointerR * Math.sin((signAngle * Math.PI) / 180);

  const signIdx = Math.floor(degree / 30);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="mx-auto">
      {/* Sign segments */}
      {Array.from({ length: 12 }, (_, i) => {
        const startAngle = (i * 30 - 90) * (Math.PI / 180);
        const endAngle = ((i + 1) * 30 - 90) * (Math.PI / 180);
        const midAngle = ((i * 30 + 15 - 90) * Math.PI) / 180;

        const x1Outer = cx + outerR * Math.cos(startAngle);
        const y1Outer = cy + outerR * Math.sin(startAngle);
        const x2Outer = cx + outerR * Math.cos(endAngle);
        const y2Outer = cy + outerR * Math.sin(endAngle);
        const x1Inner = cx + innerR * Math.cos(startAngle);
        const y1Inner = cy + innerR * Math.sin(startAngle);

        const textX = cx + textR * Math.cos(midAngle);
        const textY = cy + textR * Math.sin(midAngle);

        const largeArc = 30 > 180 ? 1 : 0;

        return (
          <g key={i}>
            {/* Segment fill */}
            <path
              d={`M ${x1Inner} ${y1Inner} L ${x1Outer} ${y1Outer} A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2Outer} ${y2Outer} L ${cx + innerR * Math.cos(endAngle)} ${cy + innerR * Math.sin(endAngle)} A ${innerR} ${innerR} 0 ${largeArc} 0 ${x1Inner} ${y1Inner}`}
              fill={SIGN_COLORS[i]}
              fillOpacity={i === signIdx ? 0.5 : 0.15}
              stroke={i === signIdx ? SIGN_COLORS[i] : "var(--v-border)"}
              strokeWidth={i === signIdx ? 2 : 0.5}
            />
            {/* Sign symbol */}
            <text
              x={textX}
              y={textY}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={size < 180 ? 9 : 12}
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
      <circle cx={cx} cy={cy} r={innerR - 14} fill="var(--v-card)" stroke="var(--v-border)" strokeWidth={0.5} />

      {/* Center text */}
      <text
        x={cx}
        y={cy - 6}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={11}
        fill={SIGN_COLORS[signIdx]}
        fontWeight="bold"
      >
        {SIGN_SYMBOLS[signIdx + 1]} {SIGN_NAMES[signIdx + 1]}
      </text>
      <text
        x={cx}
        y={cy + 8}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={9}
        fill="var(--v-text)"
        fontFamily="monospace"
      >
        {(degree % 30).toFixed(2)}°
      </text>

      {/* Animated pointer line */}
      <motion.line
        x1={cx}
        y1={cy}
        x2={pointerX}
        y2={pointerY}
        stroke="#f0c060"
        strokeWidth={2}
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
      <circle cx={cx} cy={cy} r={4} fill="#f0c060" stroke="var(--v-bg)" strokeWidth={1} />
    </svg>
  );
}
