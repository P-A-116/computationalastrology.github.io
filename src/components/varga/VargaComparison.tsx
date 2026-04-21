"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  computeVargaAnalysis,
  SIGN_NAMES,
  SIGN_SYMBOLS,
  SIGN_COLORS,
  VARGA_NAMES,
  N_VARGA,
} from "@/lib/varga-engine";
import ZodiacWheel from "@/components/varga/ZodiacWheel";

interface VargaComparisonProps {
  data: ReturnType<typeof computeVargaAnalysis>;
}

interface VargaDiff {
  name: string;
  signA: number;
  signB: number;
  sameSign: boolean;
  sameParity: boolean;
  sameModality: boolean;
  sameElement: boolean;
  matchScore: number; // 0-4
}

export default function VargaComparison({ data }: VargaComparisonProps) {
  const [copied, setCopied] = useState(false);

  // Read initial positions from URL search params
  const [degA, setDegA] = useState(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const param = params.get("degA");
      if (param !== null) {
        const parsed = parseFloat(param);
        if (!isNaN(parsed) && parsed >= 0 && parsed < 360) return parsed;
      }
    }
    return 0;
  });

  const [degB, setDegB] = useState(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const param = params.get("degB");
      if (param !== null) {
        const parsed = parseFloat(param);
        if (!isNaN(parsed) && parsed >= 0 && parsed < 360) return parsed;
      }
    }
    return 180;
  });

  // Sync positions to URL search params (clean up other component params)
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const url = new URL(window.location.href);
        url.searchParams.set("degA", degA.toFixed(2));
        url.searchParams.set("degB", degB.toFixed(2));
        // Remove inspector param when comparison is active
        url.searchParams.delete("deg");
        window.history.replaceState(null, "", url.pathname + url.search + url.hash);
      } catch {
        // Silently fail in sandboxed iframes where history.replaceState is blocked
      }
    }
  }, [degA, degB]);

  // Share comparison handler
  const handleShareComparison = useCallback(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("degA", degA.toFixed(2));
    url.searchParams.set("degB", degB.toFixed(2));
    url.hash = "#comparison";
    navigator.clipboard.writeText(url.toString()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [degA, degB]);

  const infoA = useMemo(() => {
    for (const iv of data.intervals) {
      if (degA >= iv.b0.toNumber() && degA < iv.b1.toNumber()) return iv;
    }
    return null;
  }, [degA, data.intervals]);

  const infoB = useMemo(() => {
    for (const iv of data.intervals) {
      if (degB >= iv.b0.toNumber() && degB < iv.b1.toNumber()) return iv;
    }
    return null;
  }, [degB, data.intervals]);

  const diffs = useMemo((): VargaDiff[] => {
    if (!infoA || !infoB) return [];
    return VARGA_NAMES.map((name, j) => {
      const signA = infoA.signRow[j];
      const signB = infoB.signRow[j];
      const sameSign = signA === signB;
      const sameParity = infoA.parRow[j] === infoB.parRow[j];
      const sameModality = infoA.modRow[j] === infoB.modRow[j];
      const sameElement = infoA.eleRow[j] === infoB.eleRow[j];
      const matchScore = [sameSign, sameParity, sameModality, sameElement].filter(Boolean).length;
      return { name, signA, signB, sameSign, sameParity, sameModality, sameElement, matchScore };
    });
  }, [infoA, infoB]);

  const matchCounts = useMemo(() => {
    const counts = { sign: 0, parity: 0, modality: 0, element: 0 };
    for (const d of diffs) {
      if (d.sameSign) counts.sign++;
      if (d.sameParity) counts.parity++;
      if (d.sameModality) counts.modality++;
      if (d.sameElement) counts.element++;
    }
    return counts;
  }, [diffs]);

  const overallScore = useMemo(() => {
    if (diffs.length === 0) return 0;
    return diffs.reduce((sum, d) => sum + d.matchScore, 0) / (diffs.length * 4) * 100;
  }, [diffs]);

  const signIdxA = Math.floor(degA / 30);
  const signIdxB = Math.floor(degB / 30);

  return (
    <div className="space-y-5">
      {/* Two degree selectors side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Position A */}
        <div className="rounded-xl glass-card gradient-border-hover border border-[#f0c060]/30 p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-bold text-[#f0c060] bg-[#f0c060]/15 px-2 py-0.5 rounded">A</span>
            <span className="text-sm font-semibold" style={{ color: SIGN_COLORS[signIdxA] }}>
              {SIGN_SYMBOLS[signIdxA + 1]} {SIGN_NAMES[signIdxA + 1]} {(degA % 30).toFixed(2)}°
            </span>
          </div>
          <div className="flex flex-col sm:flex-row items-start gap-3">
            <div className="flex-shrink-0 mx-auto sm:mx-0">
              <ZodiacWheel degree={degA} size={140} />
            </div>
            <div className="flex-1 min-w-0 w-full">
              <input
                type="range"
                min={0}
                max={359.99}
                step={0.01}
                value={degA}
                onChange={(e) => setDegA(parseFloat(e.target.value))}
                className="w-full h-2.5 rounded-full appearance-none cursor-pointer mb-2"
                style={{
                  background: `linear-gradient(to right, ${SIGN_COLORS.map((c, i) =>
                    `${c} ${(i / 12) * 100}%, ${c} ${((i + 1) / 12) * 100}%`
                  ).join(", ")})`,
                }}
              />
              <div className="flex flex-wrap gap-1">
                {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
                  <button
                    key={deg}
                    onClick={() => setDegA(deg + 0.01)}
                    className="px-1.5 py-0.5 rounded text-[9px] font-mono"
                    style={{
                      backgroundColor: Math.floor(deg / 30) === signIdxA ? `${SIGN_COLORS[Math.floor(deg / 30)]}20` : "transparent",
                      color: Math.floor(deg / 30) === signIdxA ? SIGN_COLORS[Math.floor(deg / 30)] : "var(--v-text-muted)",
                    }}
                  >
                    {deg}°
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Position B */}
        <div className="rounded-xl glass-card gradient-border-hover border border-[#9b7fe8]/30 p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-bold text-[#9b7fe8] bg-[#9b7fe8]/15 px-2 py-0.5 rounded">B</span>
            <span className="text-sm font-semibold" style={{ color: SIGN_COLORS[signIdxB] }}>
              {SIGN_SYMBOLS[signIdxB + 1]} {SIGN_NAMES[signIdxB + 1]} {(degB % 30).toFixed(2)}°
            </span>
          </div>
          <div className="flex flex-col sm:flex-row items-start gap-3">
            <div className="flex-shrink-0 mx-auto sm:mx-0">
              <ZodiacWheel degree={degB} size={140} />
            </div>
            <div className="flex-1 min-w-0 w-full">
              <input
                type="range"
                min={0}
                max={359.99}
                step={0.01}
                value={degB}
                onChange={(e) => setDegB(parseFloat(e.target.value))}
                className="w-full h-2.5 rounded-full appearance-none cursor-pointer mb-2"
                style={{
                  background: `linear-gradient(to right, ${SIGN_COLORS.map((c, i) =>
                    `${c} ${(i / 12) * 100}%, ${c} ${((i + 1) / 12) * 100}%`
                  ).join(", ")})`,
                }}
              />
              <div className="flex flex-wrap gap-1">
                {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
                  <button
                    key={deg}
                    onClick={() => setDegB(deg + 0.01)}
                    className="px-1.5 py-0.5 rounded text-[9px] font-mono"
                    style={{
                      backgroundColor: Math.floor(deg / 30) === signIdxB ? `${SIGN_COLORS[Math.floor(deg / 30)]}20` : "transparent",
                      color: Math.floor(deg / 30) === signIdxB ? SIGN_COLORS[Math.floor(deg / 30)] : "var(--v-text-muted)",
                    }}
                  >
                    {deg}°
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Share comparison button */}
      <div className="flex justify-end">
        <button
          onClick={handleShareComparison}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
          style={{
            backgroundColor: copied ? "rgba(92, 224, 122, 0.15)" : "rgba(155, 127, 232, 0.15)",
            color: copied ? "#5ce07a" : "#9b7fe8",
            border: `1px solid ${copied ? "rgba(92, 224, 122, 0.3)" : "rgba(155, 127, 232, 0.3)"}`,
          }}
          title="Copy shareable link for this comparison"
        >
          {copied ? (
            <>
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 8l3.5 3.5L13 4" />
              </svg>
              Link Copied!
            </>
          ) : (
            <>
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 8a3 3 0 0 1 3-3h4a3 3 0 0 1 0 6H7a3 3 0 0 1-3-3z" />
                <path d="M12 8a3 3 0 0 1-3 3H5a3 3 0 0 1 0-6h4a3 3 0 0 1 3 3z" />
              </svg>
              Share Comparison
            </>
          )}
        </button>
      </div>

      {/* Overall compatibility score */}
      <div className="rounded-xl glass-card p-4" style={{ border: "1px solid var(--v-border)" }}>
        <div className="flex items-center gap-4 mb-3">
          <h3 className="text-sm font-semibold" style={{ color: "var(--v-text)" }}>Compatibility Score</h3>
          <div className="flex-1 h-3 rounded-full overflow-hidden relative" style={{ backgroundColor: "var(--v-bg)", border: "1px solid var(--v-border)" }}>
            {/* Tick marks at 25%, 50%, 75% */}
            <div className="absolute inset-0 flex items-center pointer-events-none">
              {[25, 50, 75].map((pct) => (
                <div
                  key={pct}
                  className="absolute top-0 bottom-0"
                  style={{ left: `${pct}%`, width: "1px", backgroundColor: "var(--v-text-muted)", opacity: 0.3 }}
                />
              ))}
            </div>
            {/* Progress bar with gradient */}
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${overallScore}%`,
                background: `linear-gradient(to right, #e05c5c 0%, #f0c060 50%, #5ce07a 100%)`,
              }}
            />
          </div>
          {/* Score with emoji indicator and optional pulse */}
          <div className="flex items-center gap-1.5">
            <span className="text-sm">
              {overallScore < 25 ? "🔴" : overallScore < 50 ? "🟡" : overallScore < 75 ? "🟠" : "🟢"}
            </span>
            <span
              className={`text-lg font-bold font-mono ${overallScore > 75 ? "compatibility-pulse" : ""}`}
              style={{
                color: overallScore > 75 ? "#5ce07a" : overallScore > 50 ? "#f0c060" : overallScore > 25 ? "#e07a5c" : "#e05c5c"
              }}
            >
              {overallScore.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Category match bars */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Same Sign", count: matchCounts.sign, color: "#f0c060" },
            { label: "Same Parity", count: matchCounts.parity, color: "#e07a5c" },
            { label: "Same Modality", count: matchCounts.modality, color: "#5c8ee0" },
            { label: "Same Element", count: matchCounts.element, color: "#e0622a" },
          ].map(({ label, count, color }) => (
            <div key={label} className="rounded-lg p-2.5" style={{ backgroundColor: "var(--v-bg)", border: "1px solid var(--v-border)" }}>
              <div className="text-[10px] mb-1" style={{ color: "var(--v-text-muted)" }}>{label}</div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--v-card)" }}>
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${(count / N_VARGA) * 100}%`, backgroundColor: color }}
                  />
                </div>
                <span className="text-xs font-mono" style={{ color }}>{count}/{N_VARGA}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Varga-by-varga comparison table */}
      <div className="rounded-xl glass-card p-4" style={{ border: "1px solid var(--v-border)" }}>
        <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--v-text)" }}>Varga-by-Varga Comparison</h3>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--v-border)" }}>
                <th className="text-left py-2 px-2 font-medium" style={{ color: "var(--v-text-muted)" }}>Varga</th>
                <th className="text-center py-2 px-2 font-medium" style={{ color: "var(--v-accent-gold)", opacity: 0.6 }}>A</th>
                <th className="text-center py-2 px-2 font-medium" style={{ color: "var(--v-accent-purple)", opacity: 0.6 }}>B</th>
                <th className="text-center py-2 px-2 font-medium" style={{ color: "var(--v-text-muted)" }}>Sign</th>
                <th className="text-center py-2 px-2 font-medium" style={{ color: "var(--v-text-muted)" }}>Parity</th>
                <th className="text-center py-2 px-2 font-medium" style={{ color: "var(--v-text-muted)" }}>Modality</th>
                <th className="text-center py-2 px-2 font-medium" style={{ color: "var(--v-text-muted)" }}>Element</th>
                <th className="text-center py-2 px-2 font-medium" style={{ color: "var(--v-text-muted)" }}>Score</th>
              </tr>
            </thead>
            <tbody>
              {diffs.map((d) => (
                <tr key={d.name} style={{ borderBottom: "1px solid var(--v-border)" }} className={`
                  ${d.sameSign ? "bg-[#f0c060]/5" : ""}
                } hover:bg-[var(--v-hover-bg)] transition-colors`}>
                  <td className="py-1.5 px-2 font-mono text-[var(--v-accent-purple)] font-medium">{d.name}</td>
                  <td className="py-1.5 px-2 text-center">
                    <span style={{ color: SIGN_COLORS[d.signA - 1] }}>
                      {SIGN_SYMBOLS[d.signA]}
                    </span>
                  </td>
                  <td className="py-1.5 px-2 text-center">
                    <span style={{ color: SIGN_COLORS[d.signB - 1] }}>
                      {SIGN_SYMBOLS[d.signB]}
                    </span>
                  </td>
                  <td className="py-1.5 px-2 text-center">
                    {d.sameSign ? <span className="text-[#f0c060]">✓</span> : <span style={{ color: "var(--v-text-muted)" }}>✗</span>}
                  </td>
                  <td className="py-1.5 px-2 text-center">
                    {d.sameParity ? <span className="text-[#5ce07a]">✓</span> : <span style={{ color: "var(--v-text-muted)" }}>✗</span>}
                  </td>
                  <td className="py-1.5 px-2 text-center">
                    {d.sameModality ? <span className="text-[#5ce07a]">✓</span> : <span style={{ color: "var(--v-text-muted)" }}>✗</span>}
                  </td>
                  <td className="py-1.5 px-2 text-center">
                    {d.sameElement ? <span className="text-[#5ce07a]">✓</span> : <span style={{ color: "var(--v-text-muted)" }}>✗</span>}
                  </td>
                  <td className="py-1.5 px-2 text-center">
                    <div className="flex gap-0.5 justify-center">
                      {[0, 1, 2, 3].map(i => (
                        <div
                          key={i}
                          className="w-2 h-2 rounded-sm"
                          style={{
                            backgroundColor: i < d.matchScore
                              ? d.matchScore >= 3 ? "#5ce07a" : d.matchScore >= 2 ? "#f0c060" : "#e07a5c"
                              : "var(--v-border)"
                          }}
                        />
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
