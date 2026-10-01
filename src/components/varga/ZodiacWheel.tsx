"use client";

import { SIGN_NAMES, SIGN_SYMBOLS, SIGN_COLORS } from "@/lib/varga-engine";
import SignWheel, { signIndexFor } from "@/components/varga/SignWheel";

interface ZodiacWheelProps {
  degree: number;
  size?: number;
}

export default function ZodiacWheel({ degree, size = 200 }: ZodiacWheelProps) {
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - 4;
  const innerR = outerR - 22;
  const signIdx = signIndexFor(degree);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="mx-auto">
      <SignWheel
        degree={degree}
        cx={cx}
        cy={cy}
        outerR={outerR}
        innerR={innerR}
        pointerR={innerR - 10}
        centerRadius={innerR - 14}
        hubRadius={4}
        pointerStrokeWidth={2}
        symbolFontSize={size < 180 ? 9 : 12}
        activeStrokeWidth={2}
      >
        {/* Centre readout */}
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
      </SignWheel>
    </svg>
  );
}
