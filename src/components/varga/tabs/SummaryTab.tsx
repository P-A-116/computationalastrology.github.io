"use client";

import type { ReactNode } from "react";
import {
  type ComputationResult,
  CATEGORIES,
  N_VARGA,
  SIGN_COLORS,
  SIGN_NAMES,
  getPeakAndTrough,
} from "@/lib/varga-engine";
import { TabBlock, TabSection } from "@/components/varga/tabs/TabShell";
import VargaCoverageMatrixTable, { type CoverageRow } from "@/components/varga/tabs/VargaCoverageMatrixTable";
import RadarChart from "@/components/varga/RadarChart";
import SignCompatibilityMatrix from "@/components/varga/SignCompatibilityMatrix";
import VargaGroupSummaryCards from "@/components/varga/VargaGroupSummaryCards";

interface ExportButtonProps {
  onClick: () => void;
  title: string;
  label: string;
  color: string;
  /** `rgba()` background tint behind the button. */
  tint: string;
  border: string;
  icon: ReactNode;
  pulse?: boolean;
}

function ExportButton({ onClick, title, label, color, tint, border, icon, pulse }: ExportButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors btn-micro${pulse ? " btn-pulse" : ""}`}
      style={{ backgroundColor: tint, border: `1px solid ${border}`, color }}
      title={title}
    >
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {icon}
      </svg>
      {label}
    </button>
  );
}

export interface SummaryTabProps {
  data: ComputationResult;
  coverageMatrix: CoverageRow[];
  onViewTab: (tabId: string) => void;
  onExportJson: () => void;
  onExportCsv: () => void;
  onExportHtml: () => void;
  radarDegree: number | null;
  onRadarDegreeChange: (degree: number | null) => void;
}

/** The summary tab: export actions, group cards, radar, coverage and data tables. */
export default function SummaryTab({
  data,
  coverageMatrix,
  onViewTab,
  onExportJson,
  onExportCsv,
  onExportHtml,
  radarDegree,
  onRadarDegreeChange,
}: SummaryTabProps) {
  return (
    <TabSection
      title="📊 Summary — All Peak & Trough Data"
      headerExtra={
        <div className="flex items-center gap-2">
          <ExportButton
            onClick={() => window.print()}
            title="Print this report"
            label="Print Report"
            color="#60b8f0"
            tint="rgba(96, 184, 240, 0.15)"
            border="rgba(96, 184, 240, 0.3)"
            icon={
              <>
                <path d="M5 1h6l3 3v9a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h2z" />
                <path d="M5 1v4h6V1" />
                <path d="M4 10h8" />
              </>
            }
          />
          <ExportButton
            onClick={onExportJson}
            title="Export analysis data as JSON"
            label="Export JSON"
            color="var(--v-accent-purple)"
            tint="rgba(155, 127, 232, 0.15)"
            border="rgba(155, 127, 232, 0.3)"
            pulse
            icon={<path d="M2 10v3a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-3M8 2v8M5 7l3 3 3-3" />}
          />
          <ExportButton
            onClick={onExportCsv}
            title="Export analysis data as CSV"
            label="Export CSV"
            color="#5ec67a"
            tint="rgba(94, 198, 122, 0.15)"
            border="rgba(94, 198, 122, 0.3)"
            icon={
              <>
                <path d="M4 2h8v12H4z" />
                <path d="M4 6h8" />
                <path d="M4 10h8" />
                <path d="M7 2v12" />
              </>
            }
          />
          <ExportButton
            onClick={onExportHtml}
            title="Export report as self-contained HTML file"
            label="Export HTML"
            color="#f0a050"
            tint="rgba(240, 160, 80, 0.15)"
            border="rgba(240, 160, 80, 0.3)"
            icon={
              <>
                <path d="M6 1H2a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9" />
                <path d="M9 1v5h5" />
                <path d="M9 6l5-5" />
              </>
            }
          />
        </div>
      }
    >
      {/* Varga Group Summary Cards - Quick overview of all 5 groups */}
      <TabBlock>
        <VargaGroupSummaryCards data={data} onViewTab={onViewTab} />
      </TabBlock>

      {/* Category Balance Radar Chart */}
      <TabBlock className="rounded-xl glass-card glass-card-inner-shadow border border-[var(--v-border)] p-5 card-glow mb-4 print-no-break">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 style={{ color: "var(--v-text)" }} className="text-sm font-semibold">Category Balance Radar</h3>
            <p style={{ color: "var(--v-text-muted)" }} className="text-[10px] mt-0.5">
              Spider chart showing varga count per category. Use the slider to explore degree positions.
            </p>
          </div>
          <button
            onClick={() => onRadarDegreeChange(null)}
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
          <RadarChart data={data} degree={radarDegree ?? undefined} size={380} />
          <div className="w-full max-w-[380px]">
            <div className="flex items-center gap-2">
              <span style={{ color: "var(--v-text-muted)" }} className="text-[10px] w-8 text-right flex-shrink-0">0°</span>
              <input
                type="range"
                min={0}
                max={359.99}
                step={0.01}
                value={radarDegree ?? 0}
                onChange={(e) => onRadarDegreeChange(parseFloat(e.target.value))}
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
      </TabBlock>

      {/* Section Divider: Radar → Peak/Trough */}
      <div className="section-divider print-page-break"><div className="section-divider-diamond" /></div>

      {/* Visual Bar Charts - Peak vs Trough */}
      <TabBlock className="rounded-xl glass-card glass-card-inner-shadow border border-[var(--v-border)] p-5 card-glow mb-4 print-no-break print-page-break-after">
        <h3 style={{ color: "var(--v-text)" }} className="text-sm font-semibold mb-4">Category Peak vs Trough Visualization</h3>
        <div className="space-y-3">
          {CATEGORIES.map(({ name, color, key }) => {
            const { peak, trough } = getPeakAndTrough(data[key]);
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
      </TabBlock>

      {/* Section Divider: Peak/Trough → Coverage Matrix */}
      <div className="section-divider print-page-break"><div className="section-divider-diamond" /></div>

      {/* Varga Coverage Matrix - 16×9 grid (Parity + Modality + Element) */}
      <TabBlock>
        <VargaCoverageMatrixTable data={coverageMatrix} />
      </TabBlock>

      {/* Section Divider: Coverage Matrix → Co-occurrence Matrix */}
      <div className="section-divider print-page-break"><div className="section-divider-diamond" /></div>

      {/* Sign Compatibility Matrix - 12×12 Canvas heatmap */}
      <TabBlock className="rounded-xl glass-card glass-card-inner-shadow border border-[var(--v-border)] p-5 card-glow print-no-break">
        <h3 style={{ color: "var(--v-text)" }} className="text-sm font-semibold mb-2">Sign Co-occurrence Matrix</h3>
        <p style={{ color: "var(--v-text-muted)" }} className="text-xs mb-4">
          12×12 heatmap showing how often each pair of zodiac signs co-occurs across all 16 vargas. Diagonal shows total sign presence. Click a cell for details.
        </p>
        <SignCompatibilityMatrix data={data} />
      </TabBlock>

      {/* Data Tables */}
      <TabBlock className="rounded-xl glass-card glass-card-inner-shadow border border-[var(--v-border)] p-5 card-glow print-page-break">
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
              {CATEGORIES.map(({ name, color, key }) => {
                const { peak, trough } = getPeakAndTrough(data[key]);
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
                const { peak, trough } = getPeakAndTrough(data.signIvs[snum]);
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
      </TabBlock>
    </TabSection>
  );
}
