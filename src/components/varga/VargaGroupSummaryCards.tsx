"use client";

import { useMemo } from "react";
import {
  type CategoryGroup,
  type ComputationResult,
  CATEGORIES,
  getPeakAndTrough,
  SIGN_NAMES,
  SIGN_COLORS,
  N_VARGA,
} from "@/lib/varga-engine";

interface VargaGroupSummaryCardsProps {
  data: ComputationResult;
  onViewTab: (tabId: string) => void;
}

interface SummaryCardData {
  title: string;
  tabId: string;
  icon: string;
  gradient: string;
  items: {
    label: string;
    peak: number;
    trough: number;
    color: string;
  }[];
  bottomItems?: {
    label: string;
    value: string;
    color: string;
  }[];
}

export default function VargaGroupSummaryCards({ data, onViewTab }: VargaGroupSummaryCardsProps) {
  const cards = useMemo((): SummaryCardData[] => {
    // Derive each card's rows from the shared category descriptors so the
    // label/color/interval mapping lives in exactly one place.
    const itemsFor = (group: CategoryGroup) =>
      CATEGORIES.filter((c) => c.group === group).map(({ name, color, key }) => ({
        label: name,
        ...getPeakAndTrough(data[key]),
        color,
      }));

    // Compute top/bottom signs
    const signPeaks: { sign: string; peak: number; color: string }[] = [];
    for (let i = 1; i <= 12; i++) {
      const pt = getPeakAndTrough(data.signIvs[i]);
      signPeaks.push({ sign: SIGN_NAMES[i], peak: pt.peak, color: SIGN_COLORS[i - 1] });
    }
    const sortedByPeak = [...signPeaks].sort((a, b) => b.peak - a.peak);
    const top3 = sortedByPeak.slice(0, 3);
    const bottom3 = sortedByPeak.slice(-3).reverse();

    return [
      {
        title: "Parity",
        tabId: "parity",
        icon: "⚖️",
        gradient: "linear-gradient(135deg, #e07a5c, #e07a5c88)",
        items: itemsFor("parity"),
      },
      {
        title: "Modality",
        tabId: "modality",
        icon: "🔄",
        gradient: "linear-gradient(135deg, #e05c5c, #5c8ee088)",
        items: itemsFor("modality"),
      },
      {
        title: "Element",
        tabId: "element",
        icon: "🔥",
        gradient: "linear-gradient(135deg, #e0622a, #6080e088)",
        items: itemsFor("element"),
      },
      {
        title: "Combos",
        tabId: "combo",
        icon: "✨",
        gradient: "linear-gradient(135deg, #c8a840, #9b7fe888)",
        items: itemsFor("combo"),
      },
      {
        title: "Signs",
        tabId: "signs",
        icon: "♈",
        gradient: "linear-gradient(135deg, #9b7fe8, #f0c06088)",
        items: [],
        bottomItems: [
          ...top3.map(s => ({ label: `▲ ${s.sign}`, value: `${s.peak}/${N_VARGA}`, color: s.color })),
          ...bottom3.map(s => ({ label: `▼ ${s.sign}`, value: `${s.peak}/${N_VARGA}`, color: s.color })),
        ],
      },
    ];
  }, [data]);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
      {cards.map((card) => (
        <div
          key={card.title}
          className="rounded-xl glass-card border overflow-hidden group transition-all duration-200"
          style={{
            borderColor: "var(--v-border)",
          }}
        >
          {/* Gradient header */}
          <div
            className="px-3 py-2.5 flex items-center justify-between"
            style={{ background: card.gradient }}
          >
            <div className="flex items-center gap-1.5">
              <span className="text-sm">{card.icon}</span>
              <span style={{ color: "var(--v-text)" }} className="text-xs font-bold">
                {card.title}
              </span>
            </div>
            <button
              onClick={() => onViewTab(card.tabId)}
              className="text-[10px] font-medium transition-colors opacity-60 group-hover:opacity-100"
              style={{ color: "var(--v-text-muted)" }}
              title={`View ${card.title} tab`}
            >
              View →
            </button>
          </div>

          {/* Card body */}
          <div className="px-3 py-2.5 space-y-2">
            {card.items.length > 0 ? (
              card.items.map((item) => {
                const peakPct = (item.peak / N_VARGA) * 100;
                const troughPct = (item.trough / N_VARGA) * 100;
                return (
                  <div key={item.label}>
                    <div className="flex items-center justify-between mb-0.5">
                      <span
                        className="text-[10px] font-medium"
                        style={{ color: item.color }}
                      >
                        {item.label}
                      </span>
                      <span
                        className="text-[9px] font-mono"
                        style={{ color: "var(--v-text-muted)" }}
                      >
                        {item.peak}/{item.trough}
                      </span>
                    </div>
                    {/* Sparkline-like bars */}
                    <div className="space-y-0.5">
                      <div
                        className="h-1.5 rounded-full overflow-hidden"
                        style={{ backgroundColor: "var(--v-card)" }}
                      >
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${peakPct}%`,
                            backgroundColor: item.color,
                            opacity: 0.85,
                          }}
                        />
                      </div>
                      <div
                        className="h-1 rounded-full overflow-hidden"
                        style={{ backgroundColor: "var(--v-card)" }}
                      >
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${troughPct}%`,
                            backgroundColor: item.color,
                            opacity: 0.35,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              /* Signs card - top/bottom 3 */
              <div className="space-y-1">
                {card.bottomItems?.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between"
                  >
                    <span
                      className="text-[9px] font-medium truncate"
                      style={{ color: item.color }}
                    >
                      {item.label}
                    </span>
                    <span
                      className="text-[9px] font-mono flex-shrink-0 ml-1"
                      style={{ color: "var(--v-text-muted)" }}
                    >
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
