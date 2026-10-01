"use client";

import { useMemo } from "react";
import {
  type AugmentedInterval,
  buildEdges,
  getCounts,
  getPeakAndTrough,
  getSpanInfo,
  N_VARGA,
} from "@/lib/varga-engine";
import StepChartCanvas from "@/components/varga/StepChartCanvas";
import HeatmapCanvas from "@/components/varga/HeatmapCanvas";

export interface CategoryChartProps {
  categories: {
    name: string;
    color: string;
    augList: AugmentedInterval[];
  }[];
  heatmapData: number[][];
  heatmapColors: string[];
  heatmapTitle: string;
  heatmapLegend: { color: string; label: string }[];
  heatmapPeakSpans: [number, number][];
  heatmapTroughSpans?: [number, number][];
  tooltipContent?: (vargaIdx: number, intervalIdx: number, value: number) => string;
  activeVargas?: Set<number>;
}

/**
 * A stack of step charts (one per category in a group) above the group's
 * varga heatmap.
 */
export default function CategoryCharts({
  categories,
  heatmapData,
  heatmapColors,
  heatmapTitle,
  heatmapLegend,
  heatmapPeakSpans,
  heatmapTroughSpans,
  tooltipContent,
  activeVargas,
}: CategoryChartProps) {
  const edges = useMemo(() => buildEdges(categories[0].augList), [categories]);

  return (
    <div className="space-y-2">
      {categories.map((cat) => {
        const counts = getCounts(cat.augList);
        const { peak, trough } = getPeakAndTrough(cat.augList);
        const spanInfo = getSpanInfo(cat.augList);

        return (
          <StepChartCanvas
            key={cat.name}
            edges={edges}
            counts={counts}
            color={cat.color}
            title={`${cat.name} Count (peak=${peak}, trough=${trough})`}
            peakSpans={spanInfo.peak}
            troughSpans={spanInfo.trough}
            height={120}
            yDomain={[0, N_VARGA]}
          />
        );
      })}

      <HeatmapCanvas
        data={heatmapData}
        edges={edges}
        colors={heatmapColors}
        title={heatmapTitle}
        peakSpans={heatmapPeakSpans}
        troughSpans={heatmapTroughSpans || []}
        height={320}
        legendItems={heatmapLegend}
        tooltipContent={tooltipContent}
        activeVargas={activeVargas}
      />
    </div>
  );
}
