"use client";

import React, { useState } from "react";
import { SIGN_NAMES } from "@/lib/varga-engine";

interface DegreePresetsProps {
  onPresetSelect: (degree: number) => void;
  currentDegree: number;
}

interface Preset {
  label: string;
  degree: number;
  description: string;
  category: string;
}

const PRESETS: Preset[] = [
  // Seasonal Points
  { label: "Vernal Point", degree: 0, description: "0° Aries — Spring Equinox", category: "Seasonal" },
  { label: "Summer Solstice", degree: 90, description: "0° Cancer — Summer Solstice", category: "Seasonal" },
  { label: "Autumnal Equinox", degree: 180, description: "0° Libra — Autumn Equinox", category: "Seasonal" },
  { label: "Winter Solstice", degree: 270, description: "0° Capricorn — Winter Solstice", category: "Seasonal" },
  // Gandanta Points (Water-Fire junction nakshatras)
  { label: "Gandanta: Aries↔Pisces", degree: 0, description: "0° Aries — Revati/Ashwini junction", category: "Gandanta" },
  { label: "Gandanta: Cancer↔Gemini", degree: 90, description: "0° Cancer — Punarvasu/Pushya junction", category: "Gandanta" },
  { label: "Gandanta: Scorpio↔Libra", degree: 210, description: "0° Scorpio — Vishakha/Anuradha junction", category: "Gandanta" },
  { label: "Gandanta: Pisces↔Aquarius", degree: 330, description: "0° Pisces — Shatabhisha/Revati junction", category: "Gandanta" },
  // Bhava Sandhis (house cusp midpoints)
  { label: `Sandhi: ${SIGN_NAMES[1]} mid`, degree: 15, description: "15° Aries — 1st house midpoint", category: "Bhava Sandhi" },
  { label: `Sandhi: ${SIGN_NAMES[2]} mid`, degree: 45, description: "15° Taurus — 2nd house midpoint", category: "Bhava Sandhi" },
  { label: `Sandhi: ${SIGN_NAMES[3]} mid`, degree: 75, description: "15° Gemini — 3rd house midpoint", category: "Bhava Sandhi" },
  { label: `Sandhi: ${SIGN_NAMES[4]} mid`, degree: 105, description: "15° Cancer — 4th house midpoint", category: "Bhava Sandhi" },
  { label: `Sandhi: ${SIGN_NAMES[5]} mid`, degree: 135, description: "15° Leo — 5th house midpoint", category: "Bhava Sandhi" },
  { label: `Sandhi: ${SIGN_NAMES[6]} mid`, degree: 165, description: "15° Virgo — 6th house midpoint", category: "Bhava Sandhi" },
  { label: `Sandhi: ${SIGN_NAMES[7]} mid`, degree: 195, description: "15° Libra — 7th house midpoint", category: "Bhava Sandhi" },
  { label: `Sandhi: ${SIGN_NAMES[8]} mid`, degree: 225, description: "15° Scorpio — 8th house midpoint", category: "Bhava Sandhi" },
  { label: `Sandhi: ${SIGN_NAMES[9]} mid`, degree: 255, description: "15° Sagittarius — 9th house midpoint", category: "Bhava Sandhi" },
  { label: `Sandhi: ${SIGN_NAMES[10]} mid`, degree: 285, description: "15° Capricorn — 10th house midpoint", category: "Bhava Sandhi" },
  { label: `Sandhi: ${SIGN_NAMES[11]} mid`, degree: 315, description: "15° Aquarius — 11th house midpoint", category: "Bhava Sandhi" },
  { label: `Sandhi: ${SIGN_NAMES[12]} mid`, degree: 345, description: "15° Pisces — 12th house midpoint", category: "Bhava Sandhi" },
  // Pushkara Navamsha degrees (auspicious degrees within each sign)
  { label: "Pushkara: Aries 3.33°", degree: 3.33, description: "Pushkara Navamsha in Aries (1st navamsha of Leo)", category: "Pushkara" },
  { label: "Pushkara: Aries 10°", degree: 10, description: "Pushkara Navamsha in Aries", category: "Pushkara" },
  { label: "Pushkara: Aries 16.67°", degree: 16.67, description: "Pushkara Navamsha in Aries", category: "Pushkara" },
  { label: "Pushkara: Aries 23.33°", degree: 23.33, description: "Pushkara Navamsha in Aries", category: "Pushkara" },
  { label: "Pushkara: Taurus 3.33°", degree: 33.33, description: "Pushkara Navamsha in Taurus", category: "Pushkara" },
  { label: "Pushkara: Gemini 3.33°", degree: 63.33, description: "Pushkara Navamsha in Gemini", category: "Pushkara" },
  { label: "Pushkara: Cancer 3.33°", degree: 93.33, description: "Pushkara Navamsha in Cancer", category: "Pushkara" },
  { label: "Pushkara: Leo 3.33°", degree: 123.33, description: "Pushkara Navamsha in Leo", category: "Pushkara" },
  { label: "Pushkara: Virgo 3.33°", degree: 153.33, description: "Pushkara Navamsha in Virgo", category: "Pushkara" },
  { label: "Pushkara: Libra 3.33°", degree: 183.33, description: "Pushkara Navamsha in Libra", category: "Pushkara" },
  { label: "Pushkara: Scorpio 3.33°", degree: 213.33, description: "Pushkara Navamsha in Scorpio", category: "Pushkara" },
  { label: "Pushkara: Sagittarius 3.33°", degree: 243.33, description: "Pushkara Navamsha in Sagittarius", category: "Pushkara" },
  { label: "Pushkara: Capricorn 3.33°", degree: 273.33, description: "Pushkara Navamsha in Capricorn", category: "Pushkara" },
  { label: "Pushkara: Aquarius 3.33°", degree: 303.33, description: "Pushkara Navamsha in Aquarius", category: "Pushkara" },
  { label: "Pushkara: Pisces 3.33°", degree: 333.33, description: "Pushkara Navamsha in Pisces", category: "Pushkara" },
];

const CATEGORIES = ["Seasonal", "Gandanta", "Bhava Sandhi", "Pushkara"] as const;

const CATEGORY_COLORS: Record<string, string> = {
  Seasonal: "#f0c060",
  Gandanta: "#e05252",
  "Bhava Sandhi": "#5cb8e0",
  Pushkara: "#5ce07a",
};

const CATEGORY_ICONS: Record<string, string> = {
  Seasonal: "☀️",
  Gandanta: "🔥",
  "Bhava Sandhi": "🏠",
  Pushkara: "⭐",
};

export default function DegreePresets({ onPresetSelect, currentDegree }: DegreePresetsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const filteredPresets = activeCategory
    ? PRESETS.filter(p => p.category === activeCategory)
    : PRESETS;

  return (
    <div className="mb-4">
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors w-full"
        style={{
          backgroundColor: isOpen ? "rgba(155, 127, 232, 0.15)" : "var(--v-card)",
          color: isOpen ? "var(--v-accent-purple)" : "var(--v-text-muted)",
          border: `1px solid ${isOpen ? "rgba(155, 127, 232, 0.4)" : "var(--v-border)"}`,
        }}
      >
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 6l4 4 4-4" />
        </svg>
        <span>Degree Presets</span>
        <span style={{ color: "var(--v-text-muted)", opacity: 0.6 }} className="text-[9px] ml-auto">
          Astrologically significant positions
        </span>
      </button>

      {isOpen && (
        <div
          className="mt-2 rounded-xl glass-card border p-3 space-y-3"
          style={{ borderColor: "var(--v-border)" }}
        >
          {/* Category filter tabs */}
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setActiveCategory(null)}
              className="px-2 py-1 rounded text-[10px] font-medium transition-colors"
              style={{
                backgroundColor: !activeCategory ? "rgba(155, 127, 232, 0.2)" : "transparent",
                color: !activeCategory ? "var(--v-accent-purple)" : "var(--v-text-muted)",
                border: `1px solid ${!activeCategory ? "rgba(155, 127, 232, 0.4)" : "transparent"}`,
              }}
            >
              All ({PRESETS.length})
            </button>
            {CATEGORIES.map(cat => {
              const count = PRESETS.filter(p => p.category === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                  className="px-2 py-1 rounded text-[10px] font-medium transition-colors flex items-center gap-1"
                  style={{
                    backgroundColor: activeCategory === cat ? `${CATEGORY_COLORS[cat]}20` : "transparent",
                    color: activeCategory === cat ? CATEGORY_COLORS[cat] : "var(--v-text-muted)",
                    border: `1px solid ${activeCategory === cat ? `${CATEGORY_COLORS[cat]}40` : "transparent"}`,
                  }}
                >
                  <span>{CATEGORY_ICONS[cat]}</span>
                  {cat} ({count})
                </button>
              );
            })}
          </div>

          {/* Preset grid */}
          <div className="max-h-48 overflow-y-auto custom-scrollbar">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {filteredPresets.map((preset, idx) => {
                const isCurrent = Math.abs(preset.degree - currentDegree) < 0.05;
                const catColor = CATEGORY_COLORS[preset.category];
                return (
                  <button
                    key={`${preset.label}-${idx}`}
                    onClick={() => {
                      onPresetSelect(preset.degree);
                    }}
                    className="flex items-start gap-2 px-2.5 py-2 rounded-lg text-left transition-colors group"
                    style={{
                      backgroundColor: isCurrent ? `${catColor}15` : "transparent",
                      border: `1px solid ${isCurrent ? `${catColor}30` : "transparent"}`,
                    }}
                    onMouseEnter={(e) => {
                      if (!isCurrent) {
                        e.currentTarget.style.backgroundColor = `${catColor}08`;
                        e.currentTarget.style.borderColor = `${catColor}20`;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isCurrent) {
                        e.currentTarget.style.backgroundColor = "transparent";
                        e.currentTarget.style.borderColor = "transparent";
                      }
                    }}
                  >
                    {/* Category dot */}
                    <div
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5"
                      style={{ backgroundColor: catColor }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="text-[11px] font-medium truncate"
                          style={{ color: isCurrent ? catColor : "var(--v-text)" }}
                        >
                          {preset.label}
                        </span>
                        {isCurrent && (
                          <span
                            className="px-1 rounded text-[7px] font-bold uppercase tracking-wider"
                            style={{
                              color: catColor,
                              backgroundColor: `${catColor}20`,
                            }}
                          >
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <div
                        className="text-[9px] mt-0.5 leading-tight"
                        style={{ color: "var(--v-text-muted)" }}
                      >
                        {preset.description}
                      </div>
                    </div>
                    <span
                      className="text-[10px] font-mono flex-shrink-0 mt-0.5"
                      style={{ color: "var(--v-accent-gold)" }}
                    >
                      {preset.degree.toFixed(2)}°
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
