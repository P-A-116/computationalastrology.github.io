"use client";

import React, { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  computeVargaAnalysis,
  getHeatmapData,
  getPeakAndTrough,
  getSpanInfo,
  SIGN_NAMES,
  SIGN_COLORS,
  N_VARGA,
  VARGA_NAMES,
  CATEGORIES,
  type CategoryKey,
  type ComputationResult,
  COL_ODD, COL_EVEN,
  COL_CARDINAL, COL_FIXED, COL_MUTABLE,
  COL_FIRE, COL_EARTH, COL_AIR, COL_WATER,
  COL_FIRE_EARTH, COL_FIRE_AIR, COL_OVERLAP, COL_NEITHER,
} from "@/lib/varga-engine";
import { downloadText, timestampedFilename } from "@/lib/download";
import { buildVargaHtmlReport } from "@/lib/varga-report";
import { readDegreeParam, subscribeToUrlState, writeUrlState } from "@/lib/url-state";
import DegreeInspector from "@/components/varga/DegreeInspector";
import PeakTroughTable from "@/components/varga/PeakTroughTable";
import VargaReferenceCard from "@/components/varga/VargaReferenceCard";
import VargaComparison from "@/components/varga/VargaComparison";
import VargaSignFrequency from "@/components/varga/VargaSignFrequency";
import KeyboardHelpOverlay from "@/components/varga/KeyboardHelpOverlay";
import ScrollToTop from "@/components/varga/ScrollToTop";
import VargaFilter from "@/components/varga/VargaFilter";
import PlanetaryRulers from "@/components/varga/PlanetaryRulers";
import VargaStrengthScore from "@/components/varga/VargaStrengthScore";
import CategoryGroupTab from "@/components/varga/tabs/CategoryGroupTab";
import SignCharts from "@/components/varga/tabs/SignCharts";
import SummaryTab from "@/components/varga/tabs/SummaryTab";
import {
  TabBlock,
  TabSection,
  tabContentTransition,
  tabContentVariants,
} from "@/components/varga/tabs/TabShell";
import type { CoverageRow } from "@/components/varga/tabs/VargaCoverageMatrixTable";

// Tab registry: id, labels, and the accent dot colour used in nav and headers.
const TABS = [
  { id: "inspector", label: "🔭 Inspector", shortLabel: "🔭", color: "#9b7fe8" },
  { id: "comparison", label: "⚡ Compare", shortLabel: "⚡", color: "#f0c060" },
  { id: "rulers", label: "🪐 Rulers", shortLabel: "🪐", color: "#e0c05c" },
  { id: "analysis", label: "🧮 Analysis", shortLabel: "🧮", color: "#e07a5c" },
  { id: "parity", label: "⚖️ Odd / Even", shortLabel: "⚖️", color: "#e07a5c" },
  { id: "modality", label: "🔄 Modality", shortLabel: "🔄", color: "#e05c5c" },
  { id: "element", label: "🔥 Element", shortLabel: "🔥", color: "#e0622a" },
  { id: "combo", label: "✨ Combos", shortLabel: "✨", color: "#c8a840" },
  { id: "signs", label: "♈ Signs", shortLabel: "♈", color: "#9b7fe8" },
  { id: "summary", label: "📊 Summary", shortLabel: "📊", color: "#5cb8e0" },
  { id: "reference", label: "📖 Reference", shortLabel: "📖", color: "#5ce07a" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const TAB_COLORS = Object.fromEntries(TABS.map((t) => [t.id, t.color])) as Record<TabId, string>;

function isTabId(value: string): value is TabId {
  return TABS.some((t) => t.id === value);
}

// Wrapper component that reads the degree from URL params for the VargaStrengthScore
function InspectorDegreeWrapper({ data }: { data: ComputationResult }) {
  const [degree, setDegree] = React.useState(() => readDegreeParam("deg", 0));

  // Follow the URL as DegreeInspector writes the degree into it. Subscribing to
  // our own URL-state event replaces the previous 200 ms polling loop.
  React.useEffect(
    () =>
      subscribeToUrlState(() => {
        const parsed = readDegreeParam("deg", -1);
        if (parsed >= 0) setDegree(parsed);
      }),
    [],
  );

  return <VargaStrengthScore data={data} degree={degree} />;
}

export default function VargaVisualizer() {
  const result = useMemo(() => computeVargaAnalysis(), []);
  const [activeTab, setActiveTab] = useState<TabId>(() => {
    if (typeof window !== "undefined") {
      // Check URL hash first
      const hash = window.location.hash.slice(1);
      if (isTabId(hash)) return hash;
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
  const handleTabChange = useCallback((tabId: string) => {
    if (!isTabId(tabId)) return;
    setActiveTab(tabId);
    writeUrlState({}, { hash: tabId });
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
      categorySummary: CATEGORIES.map(({ name, color, key }) => ({
        name,
        color,
        ...getPeakAndTrough(result[key]),
      })),
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

    downloadText(
      timestampedFilename("varga-analysis", "json"),
      JSON.stringify(exportData, null, 2),
      "application/json",
    );
  }, [result]);

  // Export data as CSV
  const handleExportCSV = useCallback(() => {
    const rows: string[][] = [];

    // Category section
    rows.push(["Category", "Peak", "Trough", "Range", "Peak Spans", "Trough Spans"]);
    for (const { name, key } of CATEGORIES) {
      const aug = result[key];
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
    downloadText(timestampedFilename("varga-analysis", "csv"), csvContent, "text/csv");
  }, [result]);

  // Export data as self-contained HTML report
  const handleExportHTML = useCallback(() => {
    downloadText(
      timestampedFilename("varga-report", "html"),
      buildVargaHtmlReport(result),
      "text/html",
    );
  }, [result]);

  const parityHeatmapData = useMemo(() => getHeatmapData(result.intervals, "parRow"), [result.intervals]);
  const modalityHeatmapData = useMemo(() => getHeatmapData(result.intervals, "modRow"), [result.intervals]);
  const elementHeatmapData = useMemo(() => getHeatmapData(result.intervals, "eleRow"), [result.intervals]);

  const oddSpan = useMemo(() => getSpanInfo(result.oddIvs), [result.oddIvs]);
  const cardSpan = useMemo(() => getSpanInfo(result.cardIvs), [result.cardIvs]);
  const fireSpan = useMemo(() => getSpanInfo(result.fireIvs), [result.fireIvs]);
  const fireEarthSpan = useMemo(() => getSpanInfo(result.fireEarthIvs), [result.fireEarthIvs]);

  // Memoize Varga Coverage Matrix computation (parity, modality, element)
  const vargaCoverageMatrix = useMemo((): CoverageRow[] => {
    return VARGA_NAMES.map((vname) => {
      const countFor = (key: CategoryKey) =>
        result[key].filter(iv => iv.vargaNames.includes(vname)).length;
      return {
        name: vname,
        parity: { odd: countFor("oddIvs"), even: countFor("evenIvs") },
        modality: {
          cardinal: countFor("cardIvs"),
          fixed: countFor("fixIvs"),
          mutable: countFor("mutIvs"),
        },
        element: {
          fire: countFor("fireIvs"),
          earth: countFor("earthIvs"),
          air: countFor("airIvs"),
          water: countFor("waterIvs"),
        },
      };
    });
  }, [result]);

  const renderTabContent = (tabId: TabId) => {
    switch (tabId) {
      case "inspector":
        return (
          <TabSection
            title="🔭 Degree Inspector"
            subtitle="Slide along the zodiac to see all 16 varga sign placements at any degree position."
          >
            <TabBlock>
              <DegreeInspector data={result} />
            </TabBlock>
            {/* Varga Strength Score section */}
            <TabBlock className="mt-5">
              <div className="rounded-xl glass-card border border-[var(--v-border)] p-5 card-glow">
                <h3 style={{ color: "var(--v-text)" }} className="text-sm font-semibold mb-1 flex items-center gap-2">
                  💪 Varga Strength Score
                </h3>
                <p style={{ color: "var(--v-text-muted)" }} className="text-xs mb-4">
                  Composite score measuring sign concentration, parity balance, modality/element concentration, and positional stability.
                </p>
                <InspectorDegreeWrapper data={result} />
              </div>
            </TabBlock>
          </TabSection>
        );

      case "rulers":
        return (
          <TabSection
            title={
              <>
                <span className="tab-dot" style={{ backgroundColor: TAB_COLORS.rulers }} />
                🪐 Planetary Rulers
              </>
            }
            subtitle="Analyze which planetary rulers govern each varga at any degree position, with friendship analysis and ruler distribution."
          >
            <TabBlock>
              <PlanetaryRulers data={result} />
            </TabBlock>
          </TabSection>
        );

      case "comparison":
        return (
          <TabSection
            title="⚡ Varga Comparison"
            subtitle="Compare varga sign placements at two zodiac positions side by side."
          >
            <TabBlock>
              <VargaComparison data={result} />
            </TabBlock>
          </TabSection>
        );

      case "analysis":
        return (
          <TabSection
            title="🧮 Varga Sign Frequency Analysis"
            subtitle="Heatmap showing the total degree span each varga maps to each zodiac sign across the full 360°. Click any cell for detailed segment information."
          >
            <TabBlock>
              <VargaSignFrequency data={result} />
            </TabBlock>
          </TabSection>
        );

      case "parity":
        return (
          <CategoryGroupTab
            data={result}
            group="parity"
            title="Group 1 — Odd / Even"
            accentColor={TAB_COLORS.parity}
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
            tooltipLabels={["Even", "Odd"]}
            activeVargas={activeVargas}
            onToggleVarga={toggleVarga}
            onSelectAll={selectAllVargas}
            onSelectNone={selectNoneVargas}
          />
        );

      case "modality":
        return (
          <CategoryGroupTab
            data={result}
            group="modality"
            title="Group 2 — Cardinal / Fixed / Mutable"
            accentColor={TAB_COLORS.modality}
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
            tooltipLabels={["Mutable", "Cardinal", "Fixed"]}
            activeVargas={activeVargas}
            onToggleVarga={toggleVarga}
            onSelectAll={selectAllVargas}
            onSelectNone={selectNoneVargas}
          />
        );

      case "element":
        return (
          <CategoryGroupTab
            data={result}
            group="element"
            title="Group 3 — Fire / Earth / Air / Water"
            accentColor={TAB_COLORS.element}
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
            tooltipLabels={["Water", "Fire", "Earth", "Air"]}
            activeVargas={activeVargas}
            onToggleVarga={toggleVarga}
            onSelectAll={selectAllVargas}
            onSelectNone={selectNoneVargas}
          />
        );

      case "combo":
        return (
          <CategoryGroupTab
            data={result}
            group="combo"
            title="Group 4 — Fire+Earth / Fire+Air"
            accentColor={TAB_COLORS.combo}
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
            tooltipLabels={["Water (neither)", "Fire (both)", "Earth (FE)", "Air (FA)"]}
            activeVargas={activeVargas}
            onToggleVarga={toggleVarga}
            onSelectAll={selectAllVargas}
            onSelectNone={selectNoneVargas}
          />
        );

      case "signs":
        return (
          <TabSection
            title={
              <>
                <span className="tab-dot" style={{ backgroundColor: TAB_COLORS.signs }} />
                Group 5 — Individual Signs (Aries … Pisces)
              </>
            }
          >
            <TabBlock>
              <VargaFilter
                activeVargas={activeVargas}
                onToggle={toggleVarga}
                onSelectAll={selectAllVargas}
                onSelectNone={selectNoneVargas}
              />
            </TabBlock>
            <TabBlock>
              <SignCharts data={result} activeVargas={activeVargas} />
            </TabBlock>
            <TabBlock>
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
            </TabBlock>
          </TabSection>
        );

      case "summary":
        return (
          <SummaryTab
            data={result}
            coverageMatrix={vargaCoverageMatrix}
            onViewTab={handleTabChange}
            onExportJson={handleExportJSON}
            onExportCsv={handleExportCSV}
            onExportHtml={handleExportHTML}
            radarDegree={radarDegree}
            onRadarDegreeChange={setRadarDegree}
          />
        );

      case "reference":
        return (
          <TabSection
            title="📖 Reference — Varga Rules & Sign Properties"
            subtitle="Comprehensive reference for all 16 Varga computation rules, sign properties, and element-modality relationships."
          >
            <TabBlock>
              <VargaReferenceCard />
            </TabBlock>
          </TabSection>
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
