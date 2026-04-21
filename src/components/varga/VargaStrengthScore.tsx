"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import {
  computeVargaAnalysis,
  SIGN_NAMES,
  SIGN_SYMBOLS,
  SIGN_COLORS,
  VARGA_NAMES,
  N_VARGA,
} from "@/lib/varga-engine";

interface VargaStrengthScoreProps {
  data: ReturnType<typeof computeVargaAnalysis>;
  degree: number;
}

/**
 * Computes a composite "Varga Strength Score" for a given degree position.
 * The score measures how concentrated (vs. dispersed) the varga placements are:
 * - Sign Concentration: How many vargas share the same sign
 * - Parity Balance: Balance between odd/even signs
 * - Modality Concentration: How concentrated modality is
 * - Element Concentration: How concentrated element is
 * - Varga Shift Intensity: How many vargas are shifting at boundaries nearby
 */
export default function VargaStrengthScore({ data, degree }: VargaStrengthScoreProps) {
  const analysis = useMemo(() => {
    // Find current interval
    let currentInterval = null;
    let currentIntervalIdx = -1;
    for (let i = 0; i < data.intervals.length; i++) {
      const iv = data.intervals[i];
      if (degree >= iv.b0.toNumber() && degree < iv.b1.toNumber()) {
        currentInterval = iv;
        currentIntervalIdx = i;
        break;
      }
    }

    if (!currentInterval) {
      return {
        signConcentration: 0,
        parityBalance: 0,
        modalityConcentration: 0,
        elementConcentration: 0,
        shiftIntensity: 0,
        overallScore: 0,
        dominantSign: null,
        dominantCount: 0,
        nearbyShifts: 0,
      };
    }

    // 1. Sign Concentration (0-100): How many vargas share the most common sign
    const signCounts: Record<number, number> = {};
    for (const s of currentInterval.signRow) {
      signCounts[s] = (signCounts[s] || 0) + 1;
    }
    let dominantSign = 0;
    let dominantCount = 0;
    for (const [sign, count] of Object.entries(signCounts)) {
      if (count > dominantCount) {
        dominantSign = parseInt(sign);
        dominantCount = count;
      }
    }
    // Max possible = 16 vargas in same sign = 100%
    const signConcentration = (dominantCount / N_VARGA) * 100;

    // 2. Parity Balance (0-100): How balanced odd/even is (50/50 = 100, all one = 0)
    const oddCount = currentInterval.parRow.filter(v => v === 1).length;
    const evenCount = currentInterval.parRow.filter(v => v === 0).length;
    // Perfect balance = 8 each → score 100. All one = score 0.
    const parityRatio = Math.min(oddCount, evenCount) / Math.max(oddCount, evenCount || 1);
    const parityBalance = parityRatio * 100;

    // 3. Modality Concentration (0-100)
    const modCounts = [0, 0, 0]; // Mutable, Cardinal, Fixed
    for (const m of currentInterval.modRow) {
      modCounts[m]++;
    }
    const maxMod = Math.max(...modCounts);
    const modalityConcentration = (maxMod / N_VARGA) * 100;

    // 4. Element Concentration (0-100)
    const eleCounts = [0, 0, 0, 0]; // Water, Fire, Earth, Air
    for (const e of currentInterval.eleRow) {
      eleCounts[e]++;
    }
    const maxEle = Math.max(...eleCounts);
    const elementConcentration = (maxEle / N_VARGA) * 100;

    // 5. Shift Intensity: How many vargas change sign within ±0.5° of current position
    let nearbyShifts = 0;
    for (let i = Math.max(0, currentIntervalIdx - 2); i <= Math.min(data.intervals.length - 1, currentIntervalIdx + 2); i++) {
      const iv = data.intervals[i];
      const midDeg = (iv.b0.toNumber() + iv.b1.toNumber()) / 2;
      if (Math.abs(midDeg - degree) < 1.0 && i > 0) {
        const prevIv = data.intervals[i - 1];
        for (let v = 0; v < N_VARGA; v++) {
          if (iv.signRow[v] !== prevIv.signRow[v]) nearbyShifts++;
        }
      }
    }
    const shiftIntensity = Math.min(100, (nearbyShifts / N_VARGA) * 100);

    // Overall Score: weighted combination
    // Higher concentration = stronger position, more balanced = more harmonious
    const overallScore = Math.round(
      signConcentration * 0.30 +
      parityBalance * 0.15 +
      modalityConcentration * 0.20 +
      elementConcentration * 0.20 +
      (100 - shiftIntensity) * 0.15 // Less shifting = more stable
    );

    return {
      signConcentration: Math.round(signConcentration),
      parityBalance: Math.round(parityBalance),
      modalityConcentration: Math.round(modalityConcentration),
      elementConcentration: Math.round(elementConcentration),
      shiftIntensity: Math.round(shiftIntensity),
      overallScore,
      dominantSign,
      dominantCount,
      nearbyShifts,
    };
  }, [degree, data.intervals]);

  const scoreColor = analysis.overallScore >= 70
    ? "#5ce07a"
    : analysis.overallScore >= 45
      ? "var(--v-accent-gold)"
      : "#e05c5c";

  const scoreLabel = analysis.overallScore >= 80
    ? "Excellent"
    : analysis.overallScore >= 65
      ? "Strong"
      : analysis.overallScore >= 45
        ? "Moderate"
        : analysis.overallScore >= 25
          ? "Weak"
          : "Very Weak";

  const metrics = [
    { label: "Sign Concentration", value: analysis.signConcentration, color: "#9b7fe8", tip: "How many vargas share the dominant sign" },
    { label: "Parity Balance", value: analysis.parityBalance, color: "#5cb8e0", tip: "Balance between odd and even sign placements" },
    { label: "Modality Concentration", value: analysis.modalityConcentration, color: "#e05c5c", tip: "How concentrated cardinal/fixed/mutable is" },
    { label: "Element Concentration", value: analysis.elementConcentration, color: "#e0622a", tip: "How concentrated fire/earth/air/water is" },
    { label: "Positional Stability", value: 100 - analysis.shiftIntensity, color: "#5ce07a", tip: "How stable the position is (few nearby boundary shifts)" },
  ];

  return (
    <div className="space-y-4">
      {/* Overall Score */}
      <div className="flex items-center gap-4">
        <div className="relative w-24 h-24 flex-shrink-0">
          {/* Circular progress */}
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle cx="50" cy="50" r="42" fill="none" stroke="var(--v-border)" strokeWidth="6" />
            <motion.circle
              cx="50" cy="50" r="42"
              fill="none"
              stroke={scoreColor}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 42}`}
              initial={{ strokeDashoffset: 2 * Math.PI * 42 }}
              animate={{ strokeDashoffset: 2 * Math.PI * 42 * (1 - analysis.overallScore / 100) }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold" style={{ color: scoreColor }}>{analysis.overallScore}</span>
            <span className="text-[8px] uppercase tracking-wider" style={{ color: "var(--v-text-muted)" }}>Score</span>
          </div>
        </div>
        <div>
          <div className="text-lg font-bold" style={{ color: scoreColor }}>{scoreLabel}</div>
          {analysis.dominantSign > 0 && (
            <div className="text-xs" style={{ color: "var(--v-text-muted)" }}>
              Dominant: <span style={{ color: SIGN_COLORS[analysis.dominantSign - 1] }}>
                {SIGN_SYMBOLS[analysis.dominantSign]} {SIGN_NAMES[analysis.dominantSign]}
              </span> ({analysis.dominantCount}/{N_VARGA})
            </div>
          )}
          {analysis.nearbyShifts > 0 && (
            <div className="text-xs" style={{ color: "var(--v-text-muted)" }}>
              {analysis.nearbyShifts} varga shift{analysis.nearbyShifts !== 1 ? "s" : ""} nearby
            </div>
          )}
        </div>
      </div>

      {/* Individual Metrics */}
      <div className="space-y-2">
        {metrics.map(({ label, value, color, tip }) => (
          <div key={label} title={tip}>
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[10px]" style={{ color: "var(--v-text-muted)" }}>{label}</span>
              <span className="text-[10px] font-mono font-bold" style={{ color }}>{value}%</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--v-card)", border: "1px solid var(--v-border)" }}>
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: color, opacity: 0.8 }}
                initial={{ width: 0 }}
                animate={{ width: `${value}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
