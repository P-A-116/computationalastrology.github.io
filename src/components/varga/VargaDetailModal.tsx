"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  type ComputationResult,
  SIGN_NAMES,
  SIGN_SYMBOLS,
  SIGN_COLORS,
  VARGA_NAMES,
} from "@/lib/varga-engine";

interface VargaDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  vargaIndex: number;
  data: ComputationResult;
}

export default function VargaDetailModal({
  isOpen,
  onClose,
  vargaIndex,
  data,
}: VargaDetailModalProps) {
  const vargaName = VARGA_NAMES[vargaIndex];

  // Build the full 360° sign mapping for this varga
  const signMapping = useMemo(() => {
    const mapping: {
      signNum: number;
      signName: string;
      signSymbol: string;
      color: string;
      startDeg: number;
      endDeg: number;
      parity: string;
      modality: string;
      element: string;
    }[] = [];

    // Collect sign segments from intervals
    let currentSign = -1;
    let segmentStart = 0;

    for (const iv of data.intervals) {
      const signVal = iv.signRow[vargaIndex];
      if (signVal !== currentSign) {
        if (currentSign >= 0) {
          const parity = currentSign % 2 === 1 ? "Odd" : "Even";
          const mod = currentSign % 3;
          const ele = currentSign % 4;
          const modalityLabel = mod === 1 ? "Cardinal" : mod === 2 ? "Fixed" : "Mutable";
          const elementLabel = ele === 1 ? "Fire" : ele === 2 ? "Earth" : ele === 3 ? "Air" : "Water";

          mapping.push({
            signNum: currentSign,
            signName: SIGN_NAMES[currentSign],
            signSymbol: SIGN_SYMBOLS[currentSign],
            color: SIGN_COLORS[currentSign - 1],
            startDeg: segmentStart,
            endDeg: iv.b0.toNumber(),
            parity,
            modality: modalityLabel,
            element: elementLabel,
          });
        }
        currentSign = signVal;
        segmentStart = iv.b0.toNumber();
      }
    }

    // Final segment
    if (currentSign >= 0) {
      const parity = currentSign % 2 === 1 ? "Odd" : "Even";
      const mod = currentSign % 3;
      const ele = currentSign % 4;
      const modalityLabel = mod === 1 ? "Cardinal" : mod === 2 ? "Fixed" : "Mutable";
      const elementLabel = ele === 1 ? "Fire" : ele === 2 ? "Earth" : ele === 3 ? "Air" : "Water";

      mapping.push({
        signNum: currentSign,
        signName: SIGN_NAMES[currentSign],
        signSymbol: SIGN_SYMBOLS[currentSign],
        color: SIGN_COLORS[currentSign - 1],
        startDeg: segmentStart,
        endDeg: 360,
        parity,
        modality: modalityLabel,
        element: elementLabel,
      });
    }

    return mapping;
  }, [vargaIndex, data.intervals]);

  // Count sign distribution
  const signCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    for (const seg of signMapping) {
      const span = seg.endDeg - seg.startDeg;
      counts[seg.signNum] = (counts[seg.signNum] || 0) + span;
    }
    return counts;
  }, [signMapping]);

  const totalSegments = signMapping.length;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-4"
          onClick={onClose}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          {/* Modal - full-screen on mobile, centered card on desktop */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="relative z-10 w-full max-w-2xl sm:max-h-[85vh] max-h-[100vh] sm:rounded-xl glass-card border border-[var(--v-border)] shadow-2xl overflow-hidden sm:mx-0 fixed inset-0 sm:relative sm:inset-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header - with safe area padding on mobile */}
            <div className="gradient-header flex items-center justify-between" style={{ paddingTop: "calc(12px + env(safe-area-inset-top, 0px))" }}>
              <div className="flex items-center gap-3">
                <div className="text-lg font-bold text-[var(--v-accent-purple)]">{vargaName}</div>
                <div className="text-xs text-[var(--v-text-muted)]">
                  Full 360° Sign Mapping
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-[var(--v-text-muted)] hover:text-[var(--v-text)] hover:bg-[var(--v-hover-bg)] transition-colors text-base sm:w-7 sm:h-7 sm:text-sm"
                style={{ marginRight: "env(safe-area-inset-right, 0px)" }}
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="p-5 overflow-y-auto sm:max-h-[calc(85vh-60px)] max-h-[calc(100vh-80px)] custom-scrollbar" style={{ paddingBottom: "calc(20px + env(safe-area-inset-bottom, 0px))" }}>
              {/* Visual sign strip */}
              <div className="mb-5">
                <h4 className="text-xs text-[var(--v-text-muted)] uppercase tracking-wider mb-2">
                  Sign Distribution Across 360°
                </h4>
                <div className="flex h-8 rounded-lg overflow-hidden border border-[var(--v-border)]">
                  {signMapping.map((seg, i) => {
                    const widthPct = ((seg.endDeg - seg.startDeg) / 360) * 100;
                    return (
                      <div
                        key={i}
                        className="relative group/strip flex items-center justify-center overflow-hidden"
                        style={{
                          width: `${widthPct}%`,
                          backgroundColor: seg.color,
                          minWidth: widthPct > 1 ? undefined : "2px",
                        }}
                      >
                        {widthPct > 4 && (
                          <span className="text-[8px] font-bold text-white drop-shadow-md">
                            {seg.signSymbol}
                          </span>
                        )}
                        {/* Tooltip on hover */}
                        <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 pointer-events-none opacity-0 group-hover/strip:opacity-100 transition-opacity tooltip-glass text-[var(--v-text)] text-[10px] px-2 py-1 whitespace-nowrap z-10">
                          {seg.signSymbol} {seg.signName} ({seg.startDeg.toFixed(1)}°–{seg.endDeg.toFixed(1)}°)
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* Degree markers */}
                <div className="flex justify-between mt-1 px-0">
                  {Array.from({ length: 13 }, (_, i) => (
                    <span key={i} className="text-[8px] text-[var(--v-text-muted)] font-mono">
                      {i * 30}°
                    </span>
                  ))}
                </div>
              </div>

              {/* Sign count summary */}
              <div className="mb-5">
                <h4 className="text-xs text-[var(--v-text-muted)] uppercase tracking-wider mb-2">
                  Sign Coverage (by degree span)
                </h4>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {Array.from({ length: 12 }, (_, i) => {
                    const snum = i + 1;
                    const span = signCounts[snum] || 0;
                    const pct = (span / 360 * 100).toFixed(1);
                    return (
                      <div
                        key={snum}
                        className="rounded-lg bg-[var(--v-bg)] p-2 text-center border border-[var(--v-border)]"
                      >
                        <div className="text-sm" style={{ color: SIGN_COLORS[i] }}>
                          {SIGN_SYMBOLS[snum]}
                        </div>
                        <div className="text-[10px] font-mono" style={{ color: SIGN_COLORS[i] }}>
                          {pct}%
                        </div>
                        <div className="text-[8px] text-[var(--v-text-muted)]">
                          {span.toFixed(0)}°
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Detailed segment table */}
              <div>
                <h4 className="text-xs text-[var(--v-text-muted)] uppercase tracking-wider mb-2">
                  {totalSegments} Sign Segments
                </h4>
                <div className="overflow-x-auto custom-scrollbar max-h-64 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-[var(--v-card)] z-10">
                      <tr className="border-b border-[var(--v-border)]">
                        <th className="text-left py-1.5 px-2 text-[var(--v-text-muted)] font-medium">Sign</th>
                        <th className="text-left py-1.5 px-2 text-[var(--v-text-muted)] font-medium">Start</th>
                        <th className="text-left py-1.5 px-2 text-[var(--v-text-muted)] font-medium">End</th>
                        <th className="text-left py-1.5 px-2 text-[var(--v-text-muted)] font-medium">Span</th>
                        <th className="text-center py-1.5 px-2 text-[var(--v-text-muted)] font-medium">Parity</th>
                        <th className="text-center py-1.5 px-2 text-[var(--v-text-muted)] font-medium">Modality</th>
                        <th className="text-center py-1.5 px-2 text-[var(--v-text-muted)] font-medium">Element</th>
                      </tr>
                    </thead>
                    <tbody>
                      {signMapping.map((seg, i) => {
                        const span = seg.endDeg - seg.startDeg;
                        return (
                          <tr
                            key={i}
                            className="border-b border-[var(--v-border)] hover:bg-[var(--v-hover-bg)] transition-colors"
                          >
                            <td className="py-1.5 px-2">
                              <span className="flex items-center gap-1.5">
                                <span
                                  className="w-2 h-2 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: seg.color }}
                                />
                                <span style={{ color: seg.color }}>
                                  {seg.signSymbol} {seg.signName}
                                </span>
                              </span>
                            </td>
                            <td className="py-1.5 px-2 font-mono text-[var(--v-text-muted)]">
                              {seg.startDeg.toFixed(2)}°
                            </td>
                            <td className="py-1.5 px-2 font-mono text-[var(--v-text-muted)]">
                              {seg.endDeg.toFixed(2)}°
                            </td>
                            <td className="py-1.5 px-2 font-mono text-[#f0c060]">
                              {span.toFixed(2)}°
                            </td>
                            <td className="py-1.5 px-2 text-center">
                              <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] ${
                                seg.parity === "Odd"
                                  ? "bg-[#e07a5c]/15 text-[#e07a5c]"
                                  : "bg-[#5cb8e0]/15 text-[#5cb8e0]"
                              }`}>
                                {seg.parity}
                              </span>
                            </td>
                            <td className="py-1.5 px-2 text-center">
                              <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] ${
                                seg.modality === "Cardinal"
                                  ? "bg-[#e05c5c]/15 text-[#e05c5c]"
                                  : seg.modality === "Fixed"
                                  ? "bg-[#5c8ee0]/15 text-[#5c8ee0]"
                                  : "bg-[#5ce07a]/15 text-[#5ce07a]"
                              }`}>
                                {seg.modality.slice(0, 3)}
                              </span>
                            </td>
                            <td className="py-1.5 px-2 text-center">
                              <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] ${
                                seg.element === "Fire"
                                  ? "bg-[#e0622a]/15 text-[#e0622a]"
                                  : seg.element === "Earth"
                                  ? "bg-[#8ec06c]/15 text-[#8ec06c]"
                                  : seg.element === "Air"
                                  ? "bg-[#a8d8ea]/15 text-[#a8d8ea]"
                                  : "bg-[#6080e0]/15 text-[#6080e0]"
                              }`}>
                                {seg.element.slice(0, 3)}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
