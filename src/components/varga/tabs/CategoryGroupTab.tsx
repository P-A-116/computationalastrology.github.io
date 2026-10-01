"use client";

import {
  type CategoryGroup,
  type ComputationResult,
  CATEGORIES,
  VARGA_NAMES,
} from "@/lib/varga-engine";
import { TabBlock, TabSection } from "@/components/varga/tabs/TabShell";
import CategoryCharts from "@/components/varga/tabs/CategoryCharts";
import PeakTroughTable from "@/components/varga/PeakTroughTable";
import VargaFilter from "@/components/varga/VargaFilter";

/** Grid columns used by each group's row of peak/trough tables. */
const GROUP_GRID_COLS: Record<CategoryGroup, string> = {
  parity: "sm:grid-cols-2",
  modality: "sm:grid-cols-3",
  element: "sm:grid-cols-2",
  combo: "sm:grid-cols-2",
};

export interface CategoryGroupTabProps {
  data: ComputationResult;
  group: CategoryGroup;
  title: string;
  /** Tab accent colour for the heading dot. */
  accentColor: string;
  heatmapData: number[][];
  heatmapColors: string[];
  heatmapTitle: string;
  heatmapLegend: { color: string; label: string }[];
  heatmapPeakSpans: [number, number][];
  heatmapTroughSpans?: [number, number][];
  /** Category label indexed by the heatmap's raw value, e.g. `["Even", "Odd"]`. */
  tooltipLabels: string[];
  activeVargas: Set<number>;
  onToggleVarga: (idx: number) => void;
  onSelectAll: () => void;
  onSelectNone: () => void;
}

/**
 * One of the four "group" tabs (parity / modality / element / combo). They share
 * an identical layout — filter bar, per-category step charts, heatmap, and a row
 * of peak/trough tables — so they differ only by the data wired in here.
 */
export default function CategoryGroupTab({
  data,
  group,
  title,
  accentColor,
  heatmapData,
  heatmapColors,
  heatmapTitle,
  heatmapLegend,
  heatmapPeakSpans,
  heatmapTroughSpans,
  tooltipLabels,
  activeVargas,
  onToggleVarga,
  onSelectAll,
  onSelectNone,
}: CategoryGroupTabProps) {
  const categories = CATEGORIES.filter((c) => c.group === group);

  return (
    <TabSection
      title={
        <>
          <span className="tab-dot" style={{ backgroundColor: accentColor }} />
          {title}
        </>
      }
    >
      <TabBlock>
        <VargaFilter
          activeVargas={activeVargas}
          onToggle={onToggleVarga}
          onSelectAll={onSelectAll}
          onSelectNone={onSelectNone}
        />
      </TabBlock>
      <TabBlock>
        <CategoryCharts
          categories={categories.map(({ name, color, key }) => ({ name, color, augList: data[key] }))}
          heatmapData={heatmapData}
          heatmapColors={heatmapColors}
          heatmapTitle={heatmapTitle}
          heatmapLegend={heatmapLegend}
          heatmapPeakSpans={heatmapPeakSpans}
          heatmapTroughSpans={heatmapTroughSpans}
          tooltipContent={(vargaIdx, _intervalIdx, value) =>
            `${VARGA_NAMES[vargaIdx]} → ${tooltipLabels[value] ?? "?"}`
          }
          activeVargas={activeVargas}
        />
      </TabBlock>
      <TabBlock>
        <div className={`grid grid-cols-1 ${GROUP_GRID_COLS[group]} gap-3 mt-4`}>
          {categories.map(({ key, name, color }) => (
            <PeakTroughTable key={key} title={name} color={color} augList={data[key]} />
          ))}
        </div>
      </TabBlock>
    </TabSection>
  );
}
