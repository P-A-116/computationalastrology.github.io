"use client";

import {
  AugmentedInterval,
  SIGN_SYMBOLS,
  N_VARGA,
  getPeakAndTrough,
  spansFor,
} from "@/lib/varga-engine";

interface PeakTroughTableProps {
  title: string;
  color: string;
  augList: AugmentedInterval[];
}

export default function PeakTroughTable({
  title,
  color,
  augList,
}: PeakTroughTableProps) {
  const { peak, trough } = getPeakAndTrough(augList);
  const peakSpans = spansFor(augList, peak);
  const troughSpans = spansFor(augList, trough);

  const peakCount = augList.filter(iv => iv.count === peak).length;
  const troughCount = augList.filter(iv => iv.count === trough).length;

  const formatDegSpan = (start: number): string => {
    const sSign = Math.floor(start / 30);
    const sDeg = start - sSign * 30;
    return `${SIGN_SYMBOLS[sSign + 1]} ${sDeg.toFixed(2)}°`;
  };

  return (
    <div className="rounded-xl glass-card micro-interactive p-4" style={{ border: "1px solid var(--v-border)" }}>
      <h3 className="text-sm font-semibold mb-3" style={{ color }}>
        {title}
      </h3>

      <div className="grid grid-cols-2 gap-3">
        {/* Peak */}
        <div>
          <div className="text-xs text-[#f0c060] mb-1 font-medium">
            Peak: {peak}/{N_VARGA} ({peakCount} intervals)
          </div>
          <div className="space-y-0.5 max-h-40 overflow-y-auto custom-scrollbar">
            {peakSpans.slice(0, 10).map(([s, e], i) => (
              <div key={i} className="text-[10px] font-mono flex gap-2" style={{ color: "var(--v-text-muted)" }}>
                <span style={{ color: "var(--v-accent-gold)", opacity: 0.8 }}>{formatDegSpan(s)}</span>
                <span>({(e - s).toFixed(2)}°)</span>
              </div>
            ))}
            {peakSpans.length > 10 && (
              <div className="text-[10px]" style={{ color: "var(--v-text-muted)" }}>
                +{peakSpans.length - 10} more...
              </div>
            )}
          </div>
        </div>

        {/* Trough */}
        <div>
          <div className="text-xs text-[#60b8f0] mb-1 font-medium">
            Trough: {trough}/{N_VARGA} ({troughCount} intervals)
          </div>
          <div className="space-y-0.5 max-h-40 overflow-y-auto custom-scrollbar">
            {troughSpans.slice(0, 10).map(([s, e], i) => (
              <div key={i} className="text-[10px] font-mono flex gap-2" style={{ color: "var(--v-text-muted)" }}>
                <span style={{ color: "#60b8f0", opacity: 0.8 }}>{formatDegSpan(s)}</span>
                <span>({(e - s).toFixed(2)}°)</span>
              </div>
            ))}
            {troughSpans.length > 10 && (
              <div className="text-[10px]" style={{ color: "var(--v-text-muted)" }}>
                +{troughSpans.length - 10} more...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
