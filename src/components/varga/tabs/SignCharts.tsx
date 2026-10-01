"use client";

import type { CSSProperties } from "react";
import { useMemo } from "react";
import {
  type ComputationResult,
  buildEdges,
  getCounts,
  getPeakAndTrough,
  getSpanInfo,
  getHeatmapData,
  N_VARGA,
  SIGN_COLORS,
  SIGN_NAMES,
  VARGA_NAMES,
} from "@/lib/varga-engine";
import StepChartCanvas from "@/components/varga/StepChartCanvas";
import HeatmapCanvas from "@/components/varga/HeatmapCanvas";

/** 12 per-sign step charts above the varga sign heatmap. */
export default function SignCharts({ data, activeVargas }: { data: ComputationResult; activeVargas?: Set<number> }) {
  const edges = useMemo(() => buildEdges(data.signIvs[1]), [data.signIvs]);
  const signHeatmapData = useMemo(() => getHeatmapData(data.intervals, "signRow"), [data.intervals]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {Array.from({ length: 12 }, (_, i) => {
          const snum = i + 1;
          const augList = data.signIvs[snum];
          const counts = getCounts(augList);
          const { peak, trough } = getPeakAndTrough(augList);
          const spanInfo = getSpanInfo(augList);
          const color = SIGN_COLORS[i];

          return (
            <div
              key={snum}
              className="rounded-lg glass-card-inner-shadow p-1 sign-card-glow"
              style={{
                backgroundColor: "var(--v-card)",
                border: "1px solid var(--v-border)",
                "--sign-color": color,
              } as CSSProperties}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = `0 8px 24px ${color}25, 0 0 0 1px ${color}40`;
                e.currentTarget.style.borderColor = `${color}60`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "";
                e.currentTarget.style.borderColor = "var(--v-border)";
              }}
            >
              <StepChartCanvas
                edges={edges}
                counts={counts}
                color={color}
                title={`${SIGN_NAMES[snum]} (peak=${peak}, trough=${trough})`}
                peakSpans={spanInfo.peak}
                troughSpans={spanInfo.trough}
                height={120}
                yDomain={[0, N_VARGA]}
                showYLabel={true}
              />
            </div>
          );
        })}
      </div>

      <HeatmapCanvas
        data={signHeatmapData}
        edges={edges}
        colors={SIGN_COLORS}
        title="Varga Sign Map — Aries (1) … Pisces (12)"
        height={320}
        legendItems={SIGN_NAMES.slice(1).map((name, i) => ({
          color: SIGN_COLORS[i],
          label: name,
        }))}
        tooltipContent={(vargaIdx, _intIdx, value) => {
          const signVal = Math.round(value);
          return `${VARGA_NAMES[vargaIdx]} → ${SIGN_NAMES[signVal] || "?"}`;
        }}
        activeVargas={activeVargas}
      />
    </div>
  );
}
