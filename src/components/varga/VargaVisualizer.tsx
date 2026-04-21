"use client";

import React, { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  computeVargaAnalysis,
  buildEdges,
  getCounts,
  getPeakAndTrough,
  getSpanInfo,
  getHeatmapData,
  SIGN_NAMES,
  SIGN_COLORS,
  N_VARGA,
  VARGA_NAMES,
  COL_ODD, COL_EVEN,
  COL_CARDINAL, COL_FIXED, COL_MUTABLE,
  COL_FIRE, COL_EARTH, COL_AIR, COL_WATER,
  COL_FIRE_EARTH, COL_FIRE_AIR, COL_OVERLAP, COL_NEITHER,
} from "@/lib/varga-engine";
import HeatmapCanvas from "@/components/varga/HeatmapCanvas";
import StepChartCanvas from "@/components/varga/StepChartCanvas";
import DegreeInspector from "@/components/varga/DegreeInspector";
import PeakTroughTable from "@/components/varga/PeakTroughTable";
import VargaReferenceCard from "@/components/varga/VargaReferenceCard";
import VargaComparison from "@/components/varga/VargaComparison";
import VargaSignFrequency from "@/components/varga/VargaSignFrequency";
import KeyboardHelpOverlay from "@/components/varga/KeyboardHelpOverlay";
import ScrollToTop from "@/components/varga/ScrollToTop";
import RadarChart from "@/components/varga/RadarChart";
import VargaFilter from "@/components/varga/VargaFilter";
import SignCompatibilityMatrix from "@/components/varga/SignCompatibilityMatrix";
import VargaGroupSummaryCards from "@/components/varga/VargaGroupSummaryCards";
import PlanetaryRulers from "@/components/varga/PlanetaryRulers";
import VargaStrengthScore from "@/components/varga/VargaStrengthScore";

// Varga Coverage Matrix with enhanced hover effects
const MATRIX_COLS = [
  { key: "parity.odd", label: "Odd", color: COL_ODD },
  { key: "parity.even", label: "Even", color: COL_EVEN },
  { key: "modality.cardinal", label: "Card", color: COL_CARDINAL },
  { key: "modality.fixed", label: "Fix", color: COL_FIXED },
  { key: "modality.mutable", label: "Mut", color: COL_MUTABLE },
  { key: "element.fire", label: "Fire", color: COL_FIRE },
  { key: "element.earth", label: "Earth", color: COL_EARTH },
  { key: "element.air", label: "Air", color: COL_AIR },
  { key: "element.water", label: "Water", color: COL_WATER },
] as const;

function getNestedValue(obj: Record<string, unknown>, path: string): number {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current && typeof current === "object" && part in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return 0;
    }
  }
  return typeof current === "number" ? current : 0;
}

function VargaCoverageMatrixTable({ data }: { data: { name: string; parity: { odd: number; even: number }; modality: { cardinal: number; fixed: number; mutable: number }; element: { fire: number; earth: number; air: number; water: number } }[] }) {
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [hoveredCol, setHoveredCol] = useState<number | null>(null);
  const [tooltipInfo, setTooltipInfo] = useState<{ row: number; col: number; value: number; pct: number } | null>(null);

  return (
    <div className="rounded-xl glass-card glass-card-inner-shadow border border-[var(--v-border)] p-5 card-glow mb-4 print-no-break">
      <h3 style={{ color: "var(--v-text)" }} className="text-sm font-semibold mb-2">Varga Coverage Matrix</h3>
      <p style={{ color: "var(--v-text-muted)" }} className="text-xs mb-4">
        Shows how many intervals each varga spends in each category across the full 360° zodiac. Percentages show relative distribution.
      </p>
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-xs coverage-matrix">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--v-border)" }}>
              <th style={{ color: "var(--v-text-muted)" }} className="text-left py-1.5 px-1.5 font-medium sticky left-0 z-10" colSpan={1}>Varga</th>
              <th style={{ color: COL_ODD }} className="text-center py-1.5 px-1.5 font-medium" colSpan={2}>Parity</th>
              <th style={{ color: COL_CARDINAL }} className="text-center py-1.5 px-1.5 font-medium" colSpan={3}>Modality</th>
              <th style={{ color: COL_FIRE }} className="text-center py-1.5 px-1.5 font-medium" colSpan={4}>Element</th>
            </tr>
            <tr style={{ borderBottom: "1px solid var(--v-border)" }}>
              <th style={{ color: "var(--v-text-muted)" }} className="text-left py-1 px-1.5 font-medium sticky left-0 z-10" />
              {MATRIX_COLS.map((col, ci) => (
                <th
                  key={col.key}
                  style={{ color: col.color, backgroundColor: hoveredCol === ci ? `${col.color}10` : undefined }}
                  className="text-center py-1 px-1.5 font-medium text-[9px] transition-colors"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, ri) => {
              const total = row.parity.odd + row.parity.even;
              const isAltRow = ri % 2 === 1;
              return (
                <tr
                  key={row.name}
                  style={{ borderBottom: "1px solid var(--v-border)" }}
                  className="transition-colors"
                  onMouseEnter={() => setHoveredRow(ri)}
                  onMouseLeave={() => { setHoveredRow(null); setTooltipInfo(null); }}
                >
                  <td
                    className="py-1 px-1.5 font-mono font-medium sticky left-0 z-10"
                    style={{
                      color: "var(--v-accent-purple)",
                      backgroundColor: hoveredRow === ri ? "var(--v-hover-bg)" : "var(--v-card)",
                    }}
                  >
                    {row.name}
                  </td>
                  {MATRIX_COLS.map((col, ci) => {
                    const count = getNestedValue(row as unknown as Record<string, unknown>, col.key);
                    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                    const isHighlighted = hoveredRow === ri || hoveredCol === ci;
                    const isBoth = hoveredRow === ri && hoveredCol === ci;
                    return (
                      <td
                        key={col.key}
                        className="py-1 px-1.5 text-center relative transition-colors"
                        style={{
                          backgroundColor: isBoth
                            ? `${col.color}18`
                            : isAltRow
                              ? `rgba(var(--v-text-muted-rgb, 74, 72, 96), 0.03)`
                              : undefined,
                        }}
                        onMouseEnter={() => { setHoveredCol(ci); setTooltipInfo({ row: ri, col: ci, value: count, pct }); }}
                        onMouseLeave={() => { setHoveredCol(null); setTooltipInfo(null); }}
                      >
                        <div className="flex items-center justify-center gap-0.5">
                          <div
                            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                            style={{
                              backgroundColor: count > 0 ? col.color : "var(--v-border)",
                              opacity: count > 0 ? 0.85 : 0.3,
                            }}
                          />
                          <span className="font-mono text-[9px]" style={{ color: count > 0 ? (isHighlighted ? col.color : col.color) : "var(--v-text-muted)", opacity: count > 0 ? (isHighlighted ? 1 : 0.85) : 0.4 }}>
                            {pct}%
                          </span>
                        </div>
                        {/* Mini tooltip on cell hover */}
                        {tooltipInfo && tooltipInfo.row === ri && tooltipInfo.col === ci && (
                          <div
                            className="absolute z-30 px-2 py-1 rounded text-[9px] font-mono whitespace-nowrap pointer-events-none"
                            style={{
                              bottom: "100%",
                              left: "50%",
                              transform: "translateX(-50%)",
                              backgroundColor: "var(--v-card)",
                              border: `1px solid ${col.color}40`,
                              color: col.color,
                              boxShadow: `0 2px 8px ${col.color}20`,
                            }}
                          >
                            {col.label}: {count} intervals ({pct}%)
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center gap-3 mt-3 pt-2" style={{ borderTop: "1px solid var(--v-border)" }}>
        <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: COL_ODD }} /><span style={{ color: "var(--v-text-muted)" }} className="text-[9px]">Parity</span></div>
        <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: COL_CARDINAL }} /><span style={{ color: "var(--v-text-muted)" }} className="text-[9px]">Modality</span></div>
        <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: COL_FIRE }} /><span style={{ color: "var(--v-text-muted)" }} className="text-[9px]">Element</span></div>
      </div>
    </div>
  );
}

interface CategoryChartProps {
  categories: {
    name: string;
    color: string;
    augList: ReturnType<typeof computeVargaAnalysis>["oddIvs"];
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

function CategoryCharts({
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

function SignCharts({ data, activeVargas }: { data: ReturnType<typeof computeVargaAnalysis>; activeVargas?: Set<number> }) {
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
              } as React.CSSProperties}
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

// Tab category color dots for visual identification
const TAB_COLORS: Record<string, string> = {
  inspector: "#9b7fe8",
  comparison: "#f0c060",
  rulers: "#e0c05c",
  analysis: "#e07a5c",
  parity: "#e07a5c",
  modality: "#e05c5c",
  element: "#e0622a",
  combo: "#c8a840",
  signs: "#9b7fe8",
  summary: "#5cb8e0",
  reference: "#5ce07a",
};

const TABS = [
  { id: "inspector", label: "🔭 Inspector", shortLabel: "🔭" },
  { id: "comparison", label: "⚡ Compare", shortLabel: "⚡" },
  { id: "rulers", label: "🪐 Rulers", shortLabel: "🪐" },
  { id: "analysis", label: "🧮 Analysis", shortLabel: "🧮" },
  { id: "parity", label: "⚖️ Odd / Even", shortLabel: "⚖️" },
  { id: "modality", label: "🔄 Modality", shortLabel: "🔄" },
  { id: "element", label: "🔥 Element", shortLabel: "🔥" },
  { id: "combo", label: "✨ Combos", shortLabel: "✨" },
  { id: "signs", label: "♈ Signs", shortLabel: "♈" },
  { id: "summary", label: "📊 Summary", shortLabel: "📊" },
  { id: "reference", label: "📖 Reference", shortLabel: "📖" },
] as const;

type TabId = typeof TABS[number]["id"];

const VALID_TAB_IDS = new Set<string>(TABS.map(t => t.id));

// Framer-motion tab content transition variants
const tabContentVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

const tabContentTransition = {
  type: "tween",
  ease: "easeInOut",
  duration: 0.25,
};

// Staggered fade-in for sub-elements within tab content
const staggerContainerVariants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const staggerItemVariants = {
  initial: { opacity: 0, y: 8 },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      type: "tween",
      ease: "easeOut",
      duration: 0.2,
    },
  },
};

// Wrapper component that reads the degree from URL params for the VargaStrengthScore
function InspectorDegreeWrapper({ data }: { data: ReturnType<typeof computeVargaAnalysis> }) {
  const [degree, setDegree] = React.useState(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const degParam = params.get("deg");
      if (degParam !== null) {
        const parsed = parseFloat(degParam);
        if (!isNaN(parsed) && parsed >= 0 && parsed < 360) return parsed;
      }
    }
    return 0;
  });

  // Listen for URL changes (when DegreeInspector updates the URL)
  React.useEffect(() => {
    const handlePopState = () => {
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        const degParam = params.get("deg");
        if (degParam !== null) {
          const parsed = parseFloat(degParam);
          if (!isNaN(parsed) && parsed >= 0 && parsed < 360 && Math.abs(parsed - degree) > 0.01) {
            setDegree(parsed);
          }
        }
      }
    };

    // Also poll for changes since replaceState doesn't trigger popstate
    const interval = setInterval(() => {
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        const degParam = params.get("deg");
        if (degParam !== null) {
          const parsed = parseFloat(degParam);
          if (!isNaN(parsed) && parsed >= 0 && parsed < 360 && Math.abs(parsed - degree) > 0.05) {
            setDegree(parsed);
          }
        }
      }
    }, 200);

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      clearInterval(interval);
    };
  }, [degree]);

  return <VargaStrengthScore data={data} degree={degree} />;
}

export default function VargaVisualizer() {
  const result = useMemo(() => computeVargaAnalysis(), []);
  const [activeTab, setActiveTab] = useState<TabId>(() => {
    if (typeof window !== "undefined") {
      // Check URL hash first
      const hash = window.location.hash.slice(1);
      if (VALID_TAB_IDS.has(hash)) return hash as TabId;
      // Check URL search params to auto-switch to correct tab
      const params = new URLSearchParams(window.location.search);
      if (params.has("degA") || params.has("degB")) return "comparison";
      if (params.has("deg")) return "inspector";
    }
    return "inspector";
  });
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [radarDegree, setRadarDegree] = useState<number | null>(null);
  const [activeVargas, setActiveVargas] = useState<Set<number>>(() => new Set(Array.from({ length: 16 }, (_, i) => i)));
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const tabScrollRef = useRef<HTMLDivElement>(null);
  const mobileTabScrollRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  const [scrollState, setScrollState] = useState<"start" | "middle" | "end">("start");

  // Toggle varga filter
  const toggleVarga = useCallback((idx: number) => {
    setActiveVargas(prev => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  }, []);

  const selectAllVargas = useCallback(() => {
    setActiveVargas(new Set(Array.from({ length: 16 }, (_, i) => i)));
  }, []);

  const selectNoneVargas = useCallback(() => {
    setActiveVargas(new Set());
  }, []);

  // Sync tab to URL hash (preserve search params)
  const handleTabChange = useCallback((tabId: TabId) => {
    setActiveTab(tabId);
    if (typeof window !== "undefined") {
      try {
        const url = new URL(window.location.href);
        url.hash = tabId;
        window.history.replaceState(null, "", url.pathname + url.search + url.hash);
      } catch {
        // Silently fail in sandboxed iframes where history.replaceState is blocked
      }
    }
  }, []);

  // Update scroll state for fade indicators
  const updateScrollState = useCallback((container: HTMLElement | null) => {
    if (!container) return;
    const { scrollLeft, scrollWidth, clientWidth } = container;
    const atStart = scrollLeft <= 4;
    const atEnd = scrollLeft + clientWidth >= scrollWidth - 4;
    if (atStart) setScrollState("start");
    else if (atEnd) setScrollState("end");
    else setScrollState("middle");
  }, []);

  // Update sliding indicator position and auto-scroll active tab into view
  useEffect(() => {
    const activeIdx = TABS.findIndex(t => t.id === activeTab);
    const btn = tabRefs.current[activeIdx];
    const scrollContainer = tabScrollRef.current;
    if (btn && scrollContainer) {
      // Auto-scroll active tab into view
      btn.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      // Update indicator position (relative to scroll container content area)
      const rect = btn.getBoundingClientRect();
      const containerRect = scrollContainer.getBoundingClientRect();
      setIndicatorStyle({
        left: rect.left - containerRect.left + scrollContainer.scrollLeft,
        width: rect.width,
      });
    }
  }, [activeTab]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't capture when typing in inputs
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const num = parseInt(e.key);
      if (num >= 1 && num <= 9 && num <= TABS.length) {
        handleTabChange(TABS[num - 1].id);
        return;
      }
      // Shift+1 and Shift+2 for tabs 10 and 11
      if (e.shiftKey && e.key === "!" && TABS.length >= 10) {
        handleTabChange(TABS[9].id);
        return;
      }
      if (e.shiftKey && e.key === "@" && TABS.length >= 11) {
        handleTabChange(TABS[10].id);
        return;
      }

      if (e.key === "?" || (e.key === "/" && e.shiftKey)) {
        e.preventDefault();
        setShowKeyboardHelp(prev => !prev);
      }

      if (e.key === "Escape") {
        setShowKeyboardHelp(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleTabChange]);

  // Export data as JSON
  const handleExportJSON = useCallback(() => {
    const exportData = {
      metadata: {
        title: "Varga Sign Analysis Export",
        totalBoundaries: result.totalBoundaries,
        totalIntervals: result.totalIntervals,
        nVarga: N_VARGA,
        exportedAt: new Date().toISOString(),
      },
      categorySummary: [
        { name: "Odd", color: COL_ODD, ...getPeakAndTrough(result.oddIvs) },
        { name: "Even", color: COL_EVEN, ...getPeakAndTrough(result.evenIvs) },
        { name: "Cardinal", color: COL_CARDINAL, ...getPeakAndTrough(result.cardIvs) },
        { name: "Fixed", color: COL_FIXED, ...getPeakAndTrough(result.fixIvs) },
        { name: "Mutable", color: COL_MUTABLE, ...getPeakAndTrough(result.mutIvs) },
        { name: "Fire", color: COL_FIRE, ...getPeakAndTrough(result.fireIvs) },
        { name: "Earth", color: COL_EARTH, ...getPeakAndTrough(result.earthIvs) },
        { name: "Air", color: COL_AIR, ...getPeakAndTrough(result.airIvs) },
        { name: "Water", color: COL_WATER, ...getPeakAndTrough(result.waterIvs) },
        { name: "Fire+Earth", color: COL_FIRE_EARTH, ...getPeakAndTrough(result.fireEarthIvs) },
        { name: "Fire+Air", color: COL_FIRE_AIR, ...getPeakAndTrough(result.fireAirIvs) },
      ],
      signSummary: Array.from({ length: 12 }, (_, i) => {
        const snum = i + 1;
        return {
          sign: SIGN_NAMES[snum],
          number: snum,
          color: SIGN_COLORS[i],
          ...getPeakAndTrough(result.signIvs[snum]),
        };
      }),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `varga-analysis-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [result]);

  // Export data as CSV
  const handleExportCSV = useCallback(() => {
    const rows: string[][] = [];

    // Category section
    rows.push(["Category", "Peak", "Trough", "Range", "Peak Spans", "Trough Spans"]);
    const categories: { name: string; aug: ReturnType<typeof computeVargaAnalysis>["oddIvs"] }[] = [
      { name: "Odd", aug: result.oddIvs },
      { name: "Even", aug: result.evenIvs },
      { name: "Cardinal", aug: result.cardIvs },
      { name: "Fixed", aug: result.fixIvs },
      { name: "Mutable", aug: result.mutIvs },
      { name: "Fire", aug: result.fireIvs },
      { name: "Earth", aug: result.earthIvs },
      { name: "Air", aug: result.airIvs },
      { name: "Water", aug: result.waterIvs },
      { name: "Fire+Earth", aug: result.fireEarthIvs },
      { name: "Fire+Air", aug: result.fireAirIvs },
    ];
    for (const { name, aug } of categories) {
      const { peak, trough } = getPeakAndTrough(aug);
      const spanInfo = getSpanInfo(aug);
      rows.push([
        name,
        peak.toString(),
        trough.toString(),
        (peak - trough).toString(),
        spanInfo.peak.map(([a, b]) => `${a.toFixed(2)}-${b.toFixed(2)}`).join("; "),
        spanInfo.trough.map(([a, b]) => `${a.toFixed(2)}-${b.toFixed(2)}`).join("; "),
      ]);
    }

    // Sign section
    rows.push([]); // blank row
    rows.push(["Sign", "Peak", "Trough", "Range", "Peak Spans", "Trough Spans"]);
    for (let i = 1; i <= 12; i++) {
      const { peak, trough } = getPeakAndTrough(result.signIvs[i]);
      const spanInfo = getSpanInfo(result.signIvs[i]);
      rows.push([
        SIGN_NAMES[i],
        peak.toString(),
        trough.toString(),
        (peak - trough).toString(),
        spanInfo.peak.map(([a, b]) => `${a.toFixed(2)}-${b.toFixed(2)}`).join("; "),
        spanInfo.trough.map(([a, b]) => `${a.toFixed(2)}-${b.toFixed(2)}`).join("; "),
      ]);
    }

    const csvContent = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `varga-analysis-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [result]);

  // Export data as self-contained HTML report
  const handleExportHTML = useCallback(() => {
    const categories: { name: string; color: string; aug: ReturnType<typeof computeVargaAnalysis>["oddIvs"] }[] = [
      { name: "Odd", color: COL_ODD, aug: result.oddIvs },
      { name: "Even", color: COL_EVEN, aug: result.evenIvs },
      { name: "Cardinal", color: COL_CARDINAL, aug: result.cardIvs },
      { name: "Fixed", color: COL_FIXED, aug: result.fixIvs },
      { name: "Mutable", color: COL_MUTABLE, aug: result.mutIvs },
      { name: "Fire", color: COL_FIRE, aug: result.fireIvs },
      { name: "Earth", color: COL_EARTH, aug: result.earthIvs },
      { name: "Air", color: COL_AIR, aug: result.airIvs },
      { name: "Water", color: COL_WATER, aug: result.waterIvs },
      { name: "Fire+Earth", color: COL_FIRE_EARTH, aug: result.fireEarthIvs },
      { name: "Fire+Air", color: COL_FIRE_AIR, aug: result.fireAirIvs },
    ];

    const catRows = categories.map(({ name, color, aug }) => {
      const { peak, trough } = getPeakAndTrough(aug);
      return `<tr><td style="color:${color};font-weight:600">${name}</td><td>${peak}</td><td>${trough}</td><td>${peak - trough}</td></tr>`;
    }).join("");

    const signRows = Array.from({ length: 12 }, (_, i) => {
      const snum = i + 1;
      const { peak, trough } = getPeakAndTrough(result.signIvs[snum]);
      return `<tr><td style="color:${SIGN_COLORS[i]};font-weight:600">${SIGN_NAMES[snum]}</td><td>${peak}</td><td>${trough}</td><td>${peak - trough}</td></tr>`;
    }).join("");

    const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Varga Sign Analysis Report</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:system-ui,-apple-system,sans-serif;background:#0e0e14;color:#dcd8f0;padding:2rem;max-width:900px;margin:0 auto}
h1{font-size:1.5rem;background:linear-gradient(135deg,#9b7fe8,#f0c060);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:0.5rem}
h2{font-size:1.1rem;color:#9b7fe8;margin:1.5rem 0 0.5rem;border-bottom:1px solid #4a4860;padding-bottom:0.3rem}
table{width:100%;border-collapse:collapse;margin:0.5rem 0}
th,td{padding:0.4rem 0.6rem;text-align:left;border-bottom:1px solid rgba(74,72,96,0.3)}
th{color:#9b7fe8;font-size:0.8rem;text-transform:uppercase}
td{font-size:0.85rem}
.meta{color:#4a4860;font-size:0.75rem;margin-bottom:2rem}
.bar{height:8px;border-radius:4px;background:rgba(74,72,96,0.2);margin:2px 0}
.bar-fill{height:100%;border-radius:4px;opacity:0.85}
</style>
</head>
<body>
<h1>Varga Sign Analysis Report</h1>
<p class="meta">Generated ${new Date().toISOString()} | 1,801 boundaries | 1,800 intervals | 16 vargas | 12 signs</p>

<h2>Category Peak &amp; Trough</h2>
<table><tr><th>Category</th><th>Peak</th><th>Trough</th><th>Range</th></tr>${catRows}</table>

<h2>Sign Peak &amp; Trough</h2>
<table><tr><th>Sign</th><th>Peak</th><th>Trough</th><th>Range</th></tr>${signRows}</table>

<p style="color:#4a4860;font-size:0.7rem;margin-top:2rem;text-align:center">
Varga Sign Analysis — Exact boundary computation using fractional arithmetic
</p>
</body></html>`;

    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `varga-report-${Date.now()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }, [result]);

  const parityHeatmapData = useMemo(() => getHeatmapData(result.intervals, "parRow"), [result.intervals]);
  const modalityHeatmapData = useMemo(() => getHeatmapData(result.intervals, "modRow"), [result.intervals]);
  const elementHeatmapData = useMemo(() => getHeatmapData(result.intervals, "eleRow"), [result.intervals]);

  const oddSpan = useMemo(() => getSpanInfo(result.oddIvs), [result.oddIvs]);
  const cardSpan = useMemo(() => getSpanInfo(result.cardIvs), [result.cardIvs]);
  const fireSpan = useMemo(() => getSpanInfo(result.fireIvs), [result.fireIvs]);
  const fireEarthSpan = useMemo(() => getSpanInfo(result.fireEarthIvs), [result.fireEarthIvs]);

  // Memoize Varga Coverage Matrix computation (parity, modality, element)
  const vargaCoverageMatrix = useMemo(() => {
    return VARGA_NAMES.map((vname) => {
      const oddCount = result.oddIvs.filter(iv => iv.vargaNames.includes(vname)).length;
      const evenCount = result.evenIvs.filter(iv => iv.vargaNames.includes(vname)).length;
      const cardCount = result.cardIvs.filter(iv => iv.vargaNames.includes(vname)).length;
      const fixCount = result.fixIvs.filter(iv => iv.vargaNames.includes(vname)).length;
      const mutCount = result.mutIvs.filter(iv => iv.vargaNames.includes(vname)).length;
      const fireCount = result.fireIvs.filter(iv => iv.vargaNames.includes(vname)).length;
      const earthCount = result.earthIvs.filter(iv => iv.vargaNames.includes(vname)).length;
      const airCount = result.airIvs.filter(iv => iv.vargaNames.includes(vname)).length;
      const waterCount = result.waterIvs.filter(iv => iv.vargaNames.includes(vname)).length;
      return {
        name: vname,
        parity: { odd: oddCount, even: evenCount },
        modality: { cardinal: cardCount, fixed: fixCount, mutable: mutCount },
        element: { fire: fireCount, earth: earthCount, air: airCount, water: waterCount },
      };
    });
  }, [result]);

  const renderTabContent = (tabId: TabId) => {
    switch (tabId) {
      case "inspector":
        return (
          <section>
            <motion.div variants={staggerContainerVariants} initial="initial" animate="animate">
              <motion.div variants={staggerItemVariants} className="gradient-header rounded-t-xl -mt-5 -mx-5 mb-4">
                <h2 style={{ color: "var(--v-text)" }} className="text-lg font-bold flex items-center gap-2 section-header-spacing">
                  🔭 Degree Inspector
                </h2>
                <p style={{ color: "var(--v-text-muted)" }} className="text-sm mt-1">
                  Slide along the zodiac to see all 16 varga sign placements at any degree position.
                </p>
              </motion.div>
              <motion.div variants={staggerItemVariants}>
                <DegreeInspector data={result} />
              </motion.div>
              {/* Varga Strength Score section */}
              <motion.div variants={staggerItemVariants} className="mt-5">
                <div className="rounded-xl glass-card border border-[var(--v-border)] p-5 card-glow">
                  <h3 style={{ color: "var(--v-text)" }} className="text-sm font-semibold mb-1 flex items-center gap-2">
                    💪 Varga Strength Score
                  </h3>
                  <p style={{ color: "var(--v-text-muted)" }} className="text-xs mb-4">
                    Composite score measuring sign concentration, parity balance, modality/element concentration, and positional stability.
                  </p>
                  <InspectorDegreeWrapper data={result} />
                </div>
              </motion.div>
            </motion.div>
          </section>
        );

      case "rulers":
        return (
          <section>
            <motion.div variants={staggerContainerVariants} initial="initial" animate="animate">
              <motion.div variants={staggerItemVariants} className="gradient-header rounded-t-xl -mt-5 -mx-5 mb-4">
                <h2 style={{ color: "var(--v-text)" }} className="text-lg font-bold flex items-center gap-2 section-header-spacing">
                  <span className="tab-dot" style={{ backgroundColor: TAB_COLORS.rulers }} />
                  🪐 Planetary Rulers
                </h2>
                <p style={{ color: "var(--v-text-muted)" }} className="text-sm mt-1">
                  Analyze which planetary rulers govern each varga at any degree position, with friendship analysis and ruler distribution.
                </p>
              </motion.div>
              <motion.div variants={staggerItemVariants}>
                <PlanetaryRulers data={result} />
              </motion.div>
            </motion.div>
          </section>
        );

      case "comparison":
        return (
          <section>
            <motion.div variants={staggerContainerVariants} initial="initial" animate="animate">
              <motion.div variants={staggerItemVariants} className="gradient-header rounded-t-xl -mt-5 -mx-5 mb-4">
                <h2 style={{ color: "var(--v-text)" }} className="text-lg font-bold flex items-center gap-2 section-header-spacing">
                  ⚡ Varga Comparison
                </h2>
                <p style={{ color: "var(--v-text-muted)" }} className="text-sm mt-1">
                  Compare varga sign placements at two zodiac positions side by side.
                </p>
              </motion.div>
              <motion.div variants={staggerItemVariants}>
                <VargaComparison data={result} />
              </motion.div>
            </motion.div>
          </section>
        );

      case "analysis":
        return (
          <section>
            <motion.div variants={staggerContainerVariants} initial="initial" animate="animate">
              <motion.div variants={staggerItemVariants} className="gradient-header rounded-t-xl -mt-5 -mx-5 mb-4">
                <h2 style={{ color: "var(--v-text)" }} className="text-lg font-bold flex items-center gap-2 section-header-spacing">
                  🧮 Varga Sign Frequency Analysis
                </h2>
                <p style={{ color: "var(--v-text-muted)" }} className="text-sm mt-1">
                  Heatmap showing the total degree span each varga maps to each zodiac sign across the full 360°.
                  Click any cell for detailed segment information.
                </p>
              </motion.div>
              <motion.div variants={staggerItemVariants}>
                <VargaSignFrequency data={result} />
              </motion.div>
            </motion.div>
          </section>
        );

      case "parity":
        return (
          <section>
            <motion.div variants={staggerContainerVariants} initial="initial" animate="animate">
              <motion.div variants={staggerItemVariants} className="gradient-header rounded-t-xl -mt-5 -mx-5 mb-4">
                <h2 style={{ color: "var(--v-text)" }} className="text-lg font-bold flex items-center gap-2 section-header-spacing">
                  <span className="tab-dot" style={{ backgroundColor: TAB_COLORS.parity }} />
                  Group 1 — Odd / Even
                </h2>
              </motion.div>
              <motion.div variants={staggerItemVariants}>
                <VargaFilter
                  activeVargas={activeVargas}
                  onToggle={toggleVarga}
                  onSelectAll={selectAllVargas}
                  onSelectNone={selectNoneVargas}
                />
              </motion.div>
              <motion.div variants={staggerItemVariants}>
                <CategoryCharts
                  categories={[
                    { name: "Odd", color: COL_ODD, augList: result.oddIvs },
                    { name: "Even", color: COL_EVEN, augList: result.evenIvs },
                  ]}
                  heatmapData={parityHeatmapData}
                  heatmapColors={["#000000", COL_EVEN, COL_ODD]}
                  heatmapTitle="Varga Parity Map — Even / Odd"
                  heatmapLegend={[
                    { color: COL_EVEN, label: "Even sign" },
                    { color: COL_ODD, label: "Odd sign" },
                    { color: "#f0c060", label: "Peak interval" },
                    { color: "#60b8f0", label: "Trough interval" },
                  ]}
                  heatmapPeakSpans={oddSpan.peak}
                  heatmapTroughSpans={oddSpan.trough}
                  tooltipContent={(vargaIdx, _intIdx, value) => {
                    const label = value === 1 ? "Odd" : "Even";
                    return `${VARGA_NAMES[vargaIdx]} → ${label}`;
                  }}
                  activeVargas={activeVargas}
                />
              </motion.div>
              <motion.div variants={staggerItemVariants}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                  <PeakTroughTable title="Odd" color={COL_ODD} augList={result.oddIvs} />
                  <PeakTroughTable title="Even" color={COL_EVEN} augList={result.evenIvs} />
                </div>
              </motion.div>
            </motion.div>
          </section>
        );

      case "modality":
        return (
          <section>
            <motion.div variants={staggerContainerVariants} initial="initial" animate="animate">
              <motion.div variants={staggerItemVariants} className="gradient-header rounded-t-xl -mt-5 -mx-5 mb-4">
                <h2 style={{ color: "var(--v-text)" }} className="text-lg font-bold flex items-center gap-2 section-header-spacing">
                  <span className="tab-dot" style={{ backgroundColor: TAB_COLORS.modality }} />
                  Group 2 — Cardinal / Fixed / Mutable
                </h2>
              </motion.div>
              <motion.div variants={staggerItemVariants}>
                <VargaFilter
                  activeVargas={activeVargas}
                  onToggle={toggleVarga}
                  onSelectAll={selectAllVargas}
                  onSelectNone={selectNoneVargas}
                />
              </motion.div>
              <motion.div variants={staggerItemVariants}>
                <CategoryCharts
                  categories={[
                    { name: "Cardinal", color: COL_CARDINAL, augList: result.cardIvs },
                    { name: "Fixed", color: COL_FIXED, augList: result.fixIvs },
                    { name: "Mutable", color: COL_MUTABLE, augList: result.mutIvs },
                  ]}
                  heatmapData={modalityHeatmapData}
                  heatmapColors={["#000000", COL_MUTABLE, COL_CARDINAL, COL_FIXED]}
                  heatmapTitle="Varga Modality Map — Cardinal / Fixed / Mutable"
                  heatmapLegend={[
                    { color: COL_CARDINAL, label: "Cardinal (sign%3==1)" },
                    { color: COL_FIXED, label: "Fixed (sign%3==2)" },
                    { color: COL_MUTABLE, label: "Mutable (sign%3==0)" },
                    { color: "#f0c060", label: "Cardinal peak" },
                  ]}
                  heatmapPeakSpans={cardSpan.peak}
                  tooltipContent={(vargaIdx, _intIdx, value) => {
                    const labels = ["Mutable", "Cardinal", "Fixed"];
                    return `${VARGA_NAMES[vargaIdx]} → ${labels[value] || "?"}`;
                  }}
                  activeVargas={activeVargas}
                />
              </motion.div>
              <motion.div variants={staggerItemVariants}>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
                  <PeakTroughTable title="Cardinal" color={COL_CARDINAL} augList={result.cardIvs} />
                  <PeakTroughTable title="Fixed" color={COL_FIXED} augList={result.fixIvs} />
                  <PeakTroughTable title="Mutable" color={COL_MUTABLE} augList={result.mutIvs} />
                </div>
              </motion.div>
            </motion.div>
          </section>
        );

      case "element":
        return (
          <section>
            <motion.div variants={staggerContainerVariants} initial="initial" animate="animate">
              <motion.div variants={staggerItemVariants} className="gradient-header rounded-t-xl -mt-5 -mx-5 mb-4">
                <h2 style={{ color: "var(--v-text)" }} className="text-lg font-bold flex items-center gap-2 section-header-spacing">
                  <span className="tab-dot" style={{ backgroundColor: TAB_COLORS.element }} />
                  Group 3 — Fire / Earth / Air / Water
                </h2>
              </motion.div>
              <motion.div variants={staggerItemVariants}>
                <VargaFilter
                  activeVargas={activeVargas}
                  onToggle={toggleVarga}
                  onSelectAll={selectAllVargas}
                  onSelectNone={selectNoneVargas}
                />
              </motion.div>
              <motion.div variants={staggerItemVariants}>
                <CategoryCharts
                  categories={[
                    { name: "Fire", color: COL_FIRE, augList: result.fireIvs },
                    { name: "Earth", color: COL_EARTH, augList: result.earthIvs },
                    { name: "Air", color: COL_AIR, augList: result.airIvs },
                    { name: "Water", color: COL_WATER, augList: result.waterIvs },
                  ]}
                  heatmapData={elementHeatmapData}
                  heatmapColors={["#000000", COL_WATER, COL_FIRE, COL_EARTH, COL_AIR]}
                  heatmapTitle="Varga Element Map — Fire / Earth / Air / Water"
                  heatmapLegend={[
                    { color: COL_FIRE, label: "Fire (sign%4==1)" },
                    { color: COL_EARTH, label: "Earth (sign%4==2)" },
                    { color: COL_AIR, label: "Air (sign%4==3)" },
                    { color: COL_WATER, label: "Water (sign%4==0)" },
                    { color: "#f0c060", label: "Fire peak interval" },
                  ]}
                  heatmapPeakSpans={fireSpan.peak}
                  tooltipContent={(vargaIdx, _intIdx, value) => {
                    const labels = ["Water", "Fire", "Earth", "Air"];
                    return `${VARGA_NAMES[vargaIdx]} → ${labels[value] || "?"}`;
                  }}
                  activeVargas={activeVargas}
                />
              </motion.div>
              <motion.div variants={staggerItemVariants}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                  <PeakTroughTable title="Fire" color={COL_FIRE} augList={result.fireIvs} />
                  <PeakTroughTable title="Earth" color={COL_EARTH} augList={result.earthIvs} />
                  <PeakTroughTable title="Air" color={COL_AIR} augList={result.airIvs} />
                  <PeakTroughTable title="Water" color={COL_WATER} augList={result.waterIvs} />
                </div>
              </motion.div>
            </motion.div>
          </section>
        );

      case "combo":
        return (
          <section>
            <motion.div variants={staggerContainerVariants} initial="initial" animate="animate">
              <motion.div variants={staggerItemVariants} className="gradient-header rounded-t-xl -mt-5 -mx-5 mb-4">
                <h2 style={{ color: "var(--v-text)" }} className="text-lg font-bold flex items-center gap-2 section-header-spacing">
                  <span className="tab-dot" style={{ backgroundColor: TAB_COLORS.combo }} />
                  Group 4 — Fire+Earth / Fire+Air
                </h2>
              </motion.div>
              <motion.div variants={staggerItemVariants}>
                <VargaFilter
                  activeVargas={activeVargas}
                  onToggle={toggleVarga}
                  onSelectAll={selectAllVargas}
                  onSelectNone={selectNoneVargas}
                />
              </motion.div>
              <motion.div variants={staggerItemVariants}>
                <CategoryCharts
                  categories={[
                    { name: "Fire+Earth", color: COL_FIRE_EARTH, augList: result.fireEarthIvs },
                    { name: "Fire+Air", color: COL_FIRE_AIR, augList: result.fireAirIvs },
                  ]}
                  heatmapData={elementHeatmapData}
                  heatmapColors={["#000000", COL_NEITHER, COL_OVERLAP, COL_FIRE_EARTH, COL_FIRE_AIR]}
                  heatmapTitle="Varga Element Map — Fire+Earth / Fire+Air Combos"
                  heatmapLegend={[
                    { color: COL_OVERLAP, label: "Fire (in both combos)" },
                    { color: COL_FIRE_EARTH, label: "Earth (Fire+Earth only)" },
                    { color: COL_FIRE_AIR, label: "Air (Fire+Air only)" },
                    { color: COL_NEITHER, label: "Water (in neither)" },
                  ]}
                  heatmapPeakSpans={fireEarthSpan.peak}
                  tooltipContent={(vargaIdx, _intIdx, value) => {
                    const labels = ["Water (neither)", "Fire (both)", "Earth (FE)", "Air (FA)"];
                    return `${VARGA_NAMES[vargaIdx]} → ${labels[value] || "?"}`;
                  }}
                  activeVargas={activeVargas}
                />
              </motion.div>
              <motion.div variants={staggerItemVariants}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                  <PeakTroughTable title="Fire+Earth" color={COL_FIRE_EARTH} augList={result.fireEarthIvs} />
                  <PeakTroughTable title="Fire+Air" color={COL_FIRE_AIR} augList={result.fireAirIvs} />
                </div>
              </motion.div>
            </motion.div>
          </section>
        );

      case "signs":
        return (
          <section>
            <motion.div variants={staggerContainerVariants} initial="initial" animate="animate">
              <motion.div variants={staggerItemVariants} className="gradient-header rounded-t-xl -mt-5 -mx-5 mb-4">
                <h2 style={{ color: "var(--v-text)" }} className="text-lg font-bold flex items-center gap-2 section-header-spacing">
                  <span className="tab-dot" style={{ backgroundColor: TAB_COLORS.signs }} />
                  Group 5 — Individual Signs (Aries … Pisces)
                </h2>
              </motion.div>
              <motion.div variants={staggerItemVariants}>
                <VargaFilter
                  activeVargas={activeVargas}
                  onToggle={toggleVarga}
                  onSelectAll={selectAllVargas}
                  onSelectNone={selectNoneVargas}
                />
              </motion.div>
              <motion.div variants={staggerItemVariants}>
                <SignCharts data={result} activeVargas={activeVargas} />
              </motion.div>
              <motion.div variants={staggerItemVariants}>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-3 mt-4">
                  {Array.from({ length: 12 }, (_, i) => {
                    const snum = i + 1;
                    return (
                      <PeakTroughTable
                        key={snum}
                        title={SIGN_NAMES[snum]}
                        color={SIGN_COLORS[i]}
                        augList={result.signIvs[snum]}
                      />
                    );
                  })}
                </div>
              </motion.div>
            </motion.div>
          </section>
        );

      case "summary":
        return (
          <section>
            <motion.div variants={staggerContainerVariants} initial="initial" animate="animate">
              <motion.div variants={staggerItemVariants} className="gradient-header rounded-t-xl -mt-5 -mx-5 mb-4 flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h2 style={{ color: "var(--v-text)" }} className="text-lg font-bold flex items-center gap-2 section-header-spacing">
                    📊 Summary — All Peak & Trough Data
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => window.print()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors btn-micro"
                    style={{
                      backgroundColor: "rgba(96, 184, 240, 0.15)",
                      border: "1px solid rgba(96, 184, 240, 0.3)",
                      color: "#60b8f0",
                    }}
                    title="Print this report"
                  >
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 1h6l3 3v9a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h2z" />
                      <path d="M5 1v4h6V1" />
                      <path d="M4 10h8" />
                    </svg>
                    Print Report
                  </button>
                  <button
                    onClick={handleExportJSON}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors btn-pulse btn-micro"
                    style={{
                      backgroundColor: "rgba(155, 127, 232, 0.15)",
                      border: "1px solid rgba(155, 127, 232, 0.3)",
                      color: "var(--v-accent-purple)",
                    }}
                    title="Export analysis data as JSON"
                  >
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 10v3a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-3M8 2v8M5 7l3 3 3-3" />
                    </svg>
                    Export JSON
                  </button>
                  <button
                    onClick={handleExportCSV}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors btn-micro"
                    style={{
                      backgroundColor: "rgba(94, 198, 122, 0.15)",
                      border: "1px solid rgba(94, 198, 122, 0.3)",
                      color: "#5ec67a",
                    }}
                    title="Export analysis data as CSV"
                  >
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 2h8v12H4z" />
                      <path d="M4 6h8" />
                      <path d="M4 10h8" />
                      <path d="M7 2v12" />
                    </svg>
                    Export CSV
                  </button>
                  <button
                    onClick={handleExportHTML}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors btn-micro"
                    style={{
                      backgroundColor: "rgba(240, 160, 80, 0.15)",
                      border: "1px solid rgba(240, 160, 80, 0.3)",
                      color: "#f0a050",
                    }}
                    title="Export report as self-contained HTML file"
                  >
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 1H2a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9" />
                      <path d="M9 1v5h5" />
                      <path d="M9 6l5-5" />
                    </svg>
                    Export HTML
                  </button>
                </div>
              </motion.div>

              {/* Varga Group Summary Cards - Quick overview of all 5 groups */}
              <motion.div variants={staggerItemVariants}>
                <VargaGroupSummaryCards data={result} onViewTab={handleTabChange} />
              </motion.div>

              {/* Category Balance Radar Chart */}
              <motion.div variants={staggerItemVariants} className="rounded-xl glass-card glass-card-inner-shadow border border-[var(--v-border)] p-5 card-glow mb-4 print-no-break">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 style={{ color: "var(--v-text)" }} className="text-sm font-semibold">Category Balance Radar</h3>
                    <p style={{ color: "var(--v-text-muted)" }} className="text-[10px] mt-0.5">
                      Spider chart showing varga count per category. Use the slider to explore degree positions.
                    </p>
                  </div>
                  <button
                    onClick={() => setRadarDegree(null)}
                    className="px-2 py-1 rounded text-[9px] font-medium transition-colors btn-micro"
                    style={{
                      backgroundColor: radarDegree === null ? "rgba(155, 127, 232, 0.2)" : "var(--v-card)",
                      border: radarDegree === null ? "1px solid rgba(155, 127, 232, 0.5)" : "1px solid var(--v-border)",
                      color: radarDegree === null ? "var(--v-accent-purple)" : "var(--v-text-muted)",
                    }}
                    title="Reset to overall average view"
                  >
                    Average
                  </button>
                </div>
                <div className="flex flex-col items-center gap-3">
                  <RadarChart data={result} degree={radarDegree ?? undefined} size={380} />
                  <div className="w-full max-w-[380px]">
                    <div className="flex items-center gap-2">
                      <span style={{ color: "var(--v-text-muted)" }} className="text-[10px] w-8 text-right flex-shrink-0">0°</span>
                      <input
                        type="range"
                        min={0}
                        max={359.99}
                        step={0.01}
                        value={radarDegree ?? 0}
                        onChange={(e) => setRadarDegree(parseFloat(e.target.value))}
                        className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer"
                        style={{ accentColor: "var(--v-accent-purple)" }}
                      />
                      <span style={{ color: "var(--v-text-muted)" }} className="text-[10px] w-12 flex-shrink-0">360°</span>
                    </div>
                    {radarDegree !== null && (
                      <div className="text-center mt-1">
                        <span style={{ color: "var(--v-accent-purple)" }} className="text-xs font-mono font-medium text-shadow-purple">
                          {radarDegree.toFixed(2)}°
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>

              {/* Section Divider: Radar → Peak/Trough */}
              <div className="section-divider print-page-break"><div className="section-divider-diamond" /></div>

              {/* Visual Bar Charts - Peak vs Trough */}
              <motion.div variants={staggerItemVariants} className="rounded-xl glass-card glass-card-inner-shadow border border-[var(--v-border)] p-5 card-glow mb-4 print-no-break print-page-break-after">
                <h3 style={{ color: "var(--v-text)" }} className="text-sm font-semibold mb-4">Category Peak vs Trough Visualization</h3>
                <div className="space-y-3">
                  {[
                    { name: "Odd", color: COL_ODD, aug: result.oddIvs },
                    { name: "Even", color: COL_EVEN, aug: result.evenIvs },
                    { name: "Cardinal", color: COL_CARDINAL, aug: result.cardIvs },
                    { name: "Fixed", color: COL_FIXED, aug: result.fixIvs },
                    { name: "Mutable", color: COL_MUTABLE, aug: result.mutIvs },
                    { name: "Fire", color: COL_FIRE, aug: result.fireIvs },
                    { name: "Earth", color: COL_EARTH, aug: result.earthIvs },
                    { name: "Air", color: COL_AIR, aug: result.airIvs },
                    { name: "Water", color: COL_WATER, aug: result.waterIvs },
                    { name: "Fire+Earth", color: COL_FIRE_EARTH, aug: result.fireEarthIvs },
                    { name: "Fire+Air", color: COL_FIRE_AIR, aug: result.fireAirIvs },
                  ].map(({ name, color, aug }) => {
                    const { peak, trough } = getPeakAndTrough(aug);
                    const maxVal = N_VARGA;
                    const peakPct = (peak / maxVal) * 100;
                    const troughPct = (trough / maxVal) * 100;
                    return (
                      <div key={name} className="flex items-center gap-3">
                        <span className="text-xs font-medium w-20 text-right flex-shrink-0" style={{ color }}>{name}</span>
                        <div className="flex-1 space-y-0.5">
                          {/* Peak bar */}
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ backgroundColor: "var(--v-card)" }}>
                              <div
                                className="h-full rounded-full transition-all duration-500 relative"
                                style={{ width: `${peakPct}%`, backgroundColor: color, opacity: 0.9 }}
                              >
                                <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[8px] font-mono text-white/90">
                                  {peak} ({Math.round(peakPct)}%)
                                </span>
                              </div>
                            </div>
                          </div>
                          {/* Trough bar */}
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--v-card)" }}>
                              <div
                                className="h-full rounded-full transition-all duration-500 relative"
                                style={{ width: `${troughPct}%`, backgroundColor: color, opacity: 0.4 }}
                              >
                                {troughPct > 12 && (
                                  <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[7px] font-mono text-white/70">
                                    {trough}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        <span style={{ color: "var(--v-text-muted)" }} className="text-[10px] font-mono w-12 text-right flex-shrink-0">
                          Δ{peak - trough}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center gap-4 mt-3 pt-2" style={{ borderTop: "1px solid var(--v-border)" }}>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#e07a5c", opacity: 0.9 }} />
                    <span style={{ color: "var(--v-text-muted)" }} className="text-[10px]">Peak (top bar)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-2 rounded-sm" style={{ backgroundColor: "#e07a5c", opacity: 0.4 }} />
                    <span style={{ color: "var(--v-text-muted)" }} className="text-[10px]">Trough (bottom bar)</span>
                  </div>
                </div>
              </motion.div>

              {/* Section Divider: Peak/Trough → Coverage Matrix */}
              <div className="section-divider print-page-break"><div className="section-divider-diamond" /></div>

              {/* Varga Coverage Matrix - 16×9 grid (Parity + Modality + Element) */}
              <motion.div variants={staggerItemVariants}>
                <VargaCoverageMatrixTable data={vargaCoverageMatrix} />
              </motion.div>

              {/* Section Divider: Coverage Matrix → Co-occurrence Matrix */}
              <div className="section-divider print-page-break"><div className="section-divider-diamond" /></div>

              {/* Sign Compatibility Matrix - 12×12 Canvas heatmap */}
              <motion.div variants={staggerItemVariants} className="rounded-xl glass-card glass-card-inner-shadow border border-[var(--v-border)] p-5 card-glow print-no-break">
                <h3 style={{ color: "var(--v-text)" }} className="text-sm font-semibold mb-2">Sign Co-occurrence Matrix</h3>
                <p style={{ color: "var(--v-text-muted)" }} className="text-xs mb-4">
                  12×12 heatmap showing how often each pair of zodiac signs co-occurs across all 16 vargas. Diagonal shows total sign presence. Click a cell for details.
                </p>
                <SignCompatibilityMatrix data={result} />
              </motion.div>

              {/* Data Tables */}
              <motion.div variants={staggerItemVariants} className="rounded-xl glass-card glass-card-inner-shadow border border-[var(--v-border)] p-5 card-glow print-page-break">
                <h3 style={{ color: "var(--v-text)" }} className="text-sm font-semibold mb-4">Category Peak/Trough Overview</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--v-border)" }}>
                        <th style={{ color: "var(--v-text-muted)" }} className="text-left py-2 px-3 font-medium">Category</th>
                        <th style={{ color: "var(--v-accent-gold)" }} className="text-center py-2 px-3 font-medium">Peak</th>
                        <th style={{ color: "#60b8f0" }} className="text-center py-2 px-3 font-medium">Trough</th>
                        <th style={{ color: "var(--v-text-muted)" }} className="text-center py-2 px-3 font-medium">Range</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { name: "Odd", color: COL_ODD, aug: result.oddIvs },
                        { name: "Even", color: COL_EVEN, aug: result.evenIvs },
                        { name: "Cardinal", color: COL_CARDINAL, aug: result.cardIvs },
                        { name: "Fixed", color: COL_FIXED, aug: result.fixIvs },
                        { name: "Mutable", color: COL_MUTABLE, aug: result.mutIvs },
                        { name: "Fire", color: COL_FIRE, aug: result.fireIvs },
                        { name: "Earth", color: COL_EARTH, aug: result.earthIvs },
                        { name: "Air", color: COL_AIR, aug: result.airIvs },
                        { name: "Water", color: COL_WATER, aug: result.waterIvs },
                        { name: "Fire+Earth", color: COL_FIRE_EARTH, aug: result.fireEarthIvs },
                        { name: "Fire+Air", color: COL_FIRE_AIR, aug: result.fireAirIvs },
                      ].map(({ name, color, aug }) => {
                        const { peak, trough } = getPeakAndTrough(aug);
                        return (
                          <tr key={name} className="hover:bg-[var(--v-hover-bg)]" style={{ borderBottom: "1px solid var(--v-border)" }}>
                            <td className="py-2 px-3 font-medium" style={{ color }}>{name}</td>
                            <td className="py-2 px-3 text-center font-mono text-shadow-data" style={{ color: "var(--v-accent-gold)" }}>{peak}</td>
                            <td className="py-2 px-3 text-center font-mono" style={{ color: "#60b8f0" }}>{trough}</td>
                            <td className="py-2 px-3 text-center font-mono" style={{ color: "var(--v-text-muted)" }}>{peak - trough}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <h3 style={{ color: "var(--v-text)" }} className="text-sm font-semibold mt-6 mb-4">Individual Sign Peak/Trough</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--v-border)" }}>
                        <th style={{ color: "var(--v-text-muted)" }} className="text-left py-2 px-3 font-medium">Sign</th>
                        <th style={{ color: "var(--v-accent-gold)" }} className="text-center py-2 px-3 font-medium">Peak</th>
                        <th style={{ color: "#60b8f0" }} className="text-center py-2 px-3 font-medium">Trough</th>
                        <th style={{ color: "var(--v-text-muted)" }} className="text-center py-2 px-3 font-medium">Range</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: 12 }, (_, i) => {
                        const snum = i + 1;
                        const { peak, trough } = getPeakAndTrough(result.signIvs[snum]);
                        return (
                          <tr key={snum} className="hover:bg-[var(--v-hover-bg)]" style={{ borderBottom: "1px solid var(--v-border)" }}>
                            <td className="py-2 px-3 font-medium" style={{ color: SIGN_COLORS[i] }}>
                              {SIGN_NAMES[snum]}
                            </td>
                            <td className="py-2 px-3 text-center font-mono text-shadow-data" style={{ color: "var(--v-accent-gold)" }}>{peak}</td>
                            <td className="py-2 px-3 text-center font-mono" style={{ color: "#60b8f0" }}>{trough}</td>
                            <td className="py-2 px-3 text-center font-mono" style={{ color: "var(--v-text-muted)" }}>{peak - trough}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            </motion.div>
          </section>
        );

      case "reference":
        return (
          <section>
            <motion.div variants={staggerContainerVariants} initial="initial" animate="animate">
              <motion.div variants={staggerItemVariants} className="gradient-header rounded-t-xl -mt-5 -mx-5 mb-4">
                <h2 style={{ color: "var(--v-text)" }} className="text-lg font-bold flex items-center gap-2 section-header-spacing">
                  📖 Reference — Varga Rules & Sign Properties
                </h2>
                <p style={{ color: "var(--v-text-muted)" }} className="text-sm mt-1">
                  Comprehensive reference for all 16 Varga computation rules, sign properties, and element-modality relationships.
                </p>
              </motion.div>
              <motion.div variants={staggerItemVariants}>
                <VargaReferenceCard />
              </motion.div>
            </motion.div>
          </section>
        );
    }
  };

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      {/* Stats bar */}
      <div className="flex flex-wrap gap-4 text-sm" style={{ color: "var(--v-text)", opacity: 0.7 }}>
        <span>📊 Boundaries: <strong className="text-shadow-data" style={{ color: "var(--v-accent-gold)" }}>{result.totalBoundaries.toLocaleString()}</strong></span>
        <span>📐 Intervals: <strong className="text-shadow-data" style={{ color: "var(--v-accent-gold)" }}>{result.totalIntervals.toLocaleString()}</strong></span>
        <span>🔮 Vargas: <strong className="text-shadow-purple" style={{ color: "var(--v-accent-purple)" }}>{N_VARGA}</strong></span>
      </div>

      {/* Desktop tab navigation (scrollable) */}
      <div>
        <div className={`tab-scroll-wrapper ${scrollState === "start" ? "" : "scrolled-start"} ${scrollState === "end" ? "scrolled-end" : ""}`}>
          <div
            ref={tabScrollRef}
            className="tab-scroll-container tab-container relative"
            onScroll={() => updateScrollState(tabScrollRef.current)}
          >
            <div className="flex gap-1 px-6 pb-2">
              {TABS.map((tab, idx) => (
                <button
                  key={tab.id}
                  ref={(el) => { tabRefs.current[idx] = el; }}
                  onClick={() => handleTabChange(tab.id)}
                  className={`
                    px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-200 relative btn-micro
                    ${activeTab === tab.id
                      ? "tab-active-gradient border"
                      : "border"
                    }
                  `}
                  style={{
                    color: activeTab === tab.id ? "var(--v-accent-purple)" : "var(--v-text-muted)",
                    backgroundColor: activeTab === tab.id ? undefined : "var(--v-card)",
                    borderColor: activeTab === tab.id ? "var(--v-accent-purple)" : "var(--v-border)",
                    opacity: activeTab === tab.id ? 1 : 0.7,
                  }}
                >
                  <span className="flex items-center gap-1.5">
                    <span
                      className="tab-dot"
                      style={{ backgroundColor: activeTab === tab.id ? TAB_COLORS[tab.id] : `${TAB_COLORS[tab.id]}60` }}
                    />
                    {tab.label}
                    <span className="ml-1 text-[9px] opacity-40 hidden sm:inline">[{idx < 9 ? idx + 1 : idx === 9 ? "⇧1" : "⇧2"}]</span>
                  </span>
                </button>
              ))}
            </div>
            {/* Sliding indicator */}
            <div
              className="tab-indicator"
              style={{ left: indicatorStyle.left, width: indicatorStyle.width }}
            />
          </div>
        </div>
        <div className="flex justify-end mt-1">
          <button
            onClick={() => setShowKeyboardHelp(true)}
            className="px-2 py-1.5 rounded-lg text-[10px] border transition-colors btn-micro"
            style={{ color: "var(--v-text-muted)", borderColor: "var(--v-border)" }}
            title="Keyboard shortcuts"
          >
            ⌨️ ?
          </button>
        </div>
      </div>

      {/* Tab content with framer-motion transitions */}
      <div className="relative rounded-xl glass-card p-5" style={{ border: "1px solid var(--v-border)" }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            variants={tabContentVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={tabContentTransition}
          >
            {renderTabContent(activeTab)}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Mobile bottom tab bar (scrollable) */}
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden mobile-tab-bar-wrapper">
        <div
          ref={mobileTabScrollRef}
          className="mobile-tab-bar"
        >
          <div className="flex items-center gap-1 px-3 py-1">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`
                  flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-lg text-[10px] transition-all duration-200 min-w-[48px] flex-shrink-0 mobile-tap-feedback relative
                  ${activeTab === tab.id
                    ? "bg-[var(--v-accent-purple)]/15"
                    : ""
                  }
                `}
                style={{
                  color: activeTab === tab.id ? "var(--v-accent-purple)" : "var(--v-text-muted)",
                }}
              >
                <span className="text-base">{tab.shortLabel}</span>
                <span className="truncate max-w-[52px]">{tab.label.split(" ").slice(-1)[0]}</span>
                {/* Active underline indicator */}
                <span
                  className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full transition-all duration-200"
                  style={{
                    backgroundColor: activeTab === tab.id ? TAB_COLORS[tab.id] : "transparent",
                    opacity: activeTab === tab.id ? 1 : 0,
                  }}
                />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Keyboard help overlay */}
      <KeyboardHelpOverlay
        isOpen={showKeyboardHelp}
        onClose={() => setShowKeyboardHelp(false)}
        activeTab={activeTab}
      />

      {/* Scroll to top button */}
      <ScrollToTop />
    </div>
  );
}
