"use client";

import {
  SIGN_NAMES,
  SIGN_SYMBOLS,
  SIGN_COLORS,
  SIGN_RULERS,
  PLANET_COLORS,
  VARGA_SANSKRIT,
  VARGA_PURPOSES,
} from "@/lib/varga-engine";

// Planet emojis for visual association
const PLANET_EMOJIS: Record<string, string> = {
  "Sun": "☉",
  "Moon": "☽",
  "Mars": "♂",
  "Mercury": "☿",
  "Jupiter": "♃",
  "Venus": "♀",
  "Saturn": "♄",
  "Rahu": "☊",
  "Ketu": "☋",
};

// Traditional Vedic astrology planet colors (per task spec)
const VEDIC_PLANET_COLORS: Record<string, string> = {
  "Sun": "#FFD700",     // gold
  "Moon": "#C0C0C0",     // silver/white
  "Mars": "#FF0000",     // red
  "Mercury": "#00C853",   // green
  "Jupiter": "#FFEB3B",   // yellow
  "Venus": "#FF69B4",     // pink
  "Saturn": "#1A237E",    // dark blue
  "Rahu": "#9E9E9E",     // gray
  "Ketu": "#795548",     // brown
};

// Planet accent border colors (per task spec)
const PLANET_BORDER_COLORS: Record<string, string> = {
  "Sun": "#f0c060",       // gold
  "Moon": "#c0c0d0",      // silver/white
  "Mars": "#e05c5c",      // red
  "Mercury": "#e0a040",   // orange
  "Jupiter": "#e0c05c",   // yellow
  "Venus": "#5ce07a",     // green
  "Saturn": "#4a5a8a",    // dark blue/indigo
  "Rahu": "#6a5acd",     // purple
  "Ketu": "#cd5c5c",     // dark red
};

const VARGA_DESCRIPTIONS: { name: string; number: number; title: string; rules: string }[] = [
  { name: "D1", number: 1, title: "Rāśi", rules: "Same sign as natal position" },
  { name: "D2", number: 2, title: "Hora", rules: "Odd signs: 0-15°→Leo, 15-30°→Cancer; Even signs: reverse" },
  { name: "D3", number: 3, title: "Drekkāṇa", rules: "1st/2nd/3rd third → advance sign by 0/4/8 signs" },
  { name: "D4", number: 4, title: "Caturthāṃśa", rules: "Each quarter advances 3 signs from natal" },
  { name: "D7", number: 7, title: "Saptāṃśa", rules: "7 parts; even signs start 7 signs later" },
  { name: "D9", number: 9, title: "Navāṃśa", rules: "Start signs cycle 1,10,7,4 per modality group" },
  { name: "D10", number: 10, title: "Daśāṃśa", rules: "10 parts; even signs advance 8 from natal" },
  { name: "D12", number: 12, title: "Dvādaśāṃśa", rules: "Each 2.5° part advances 1 sign from natal" },
  { name: "D16", number: 16, title: "Ṣoḍaśāṃśa", rules: "Start signs: Cardinal→1, Fixed→5, Mutable→9" },
  { name: "D20", number: 20, title: "Viṃśāṃśa", rules: "Start signs: Cardinal→1, Fixed→9, Mutable→5" },
  { name: "D24", number: 24, title: "Siddhāṃśa", rules: "Odd signs start Leo(5), Even start Cancer(4)" },
  { name: "D27", number: 27, title: "Nakṣatrāṃśa", rules: "Start sign determined by element: Fire→1, Earth→4, Air→7, Water→10" },
  { name: "D30", number: 30, title: "Triṃśāṃśa", rules: "Odd/Even signs use different segment mappings" },
  { name: "D40", number: 40, title: "Khavedāṃśa", rules: "Odd signs start Aries(1), Even start Libra(7)" },
  { name: "D45", number: 45, title: "Akṣavedāṃśa", rules: "Start signs: Cardinal→1, Fixed→5, Mutable→9" },
  { name: "D60", number: 60, title: "Ṣaṣṭyāṃśa", rules: "Each 0.5° advances 1 sign from natal (doubled degree)" },
];

const ELEMENT_LABELS: Record<number, { name: string; color: string }> = {
  1: { name: "Fire", color: "#e0622a" },
  2: { name: "Earth", color: "#8ec06c" },
  3: { name: "Air", color: "#a8d8ea" },
  0: { name: "Water", color: "#6080e0" },
};

const MODALITY_LABELS: Record<number, { name: string; color: string }> = {
  1: { name: "Cardinal", color: "#e05c5c" },
  2: { name: "Fixed", color: "#5c8ee0" },
  0: { name: "Mutable", color: "#5ce07a" },
};

// Planetary rulership data: planet → { ruled signs, exaltation, debilitation }
const PLANETARY_RULERSHIPS: {
  planet: string;
  ruledSigns: number[];
  exaltation: number;
  debilitation: number;
  exaltationNote?: string;
}[] = [
  { planet: "Sun", ruledSigns: [5], exaltation: 1, debilitation: 7 },
  { planet: "Moon", ruledSigns: [4], exaltation: 2, debilitation: 8 },
  { planet: "Mars", ruledSigns: [1, 8], exaltation: 10, debilitation: 4 },
  { planet: "Mercury", ruledSigns: [3, 6], exaltation: 6, debilitation: 12 },
  { planet: "Jupiter", ruledSigns: [9, 12], exaltation: 4, debilitation: 10 },
  { planet: "Venus", ruledSigns: [2, 7], exaltation: 12, debilitation: 6 },
  { planet: "Saturn", ruledSigns: [10, 11], exaltation: 7, debilitation: 1 },
  { planet: "Rahu", ruledSigns: [], exaltation: 3, debilitation: 9, exaltationNote: "Gemini/Sagittarius per some texts" },
  { planet: "Ketu", ruledSigns: [], exaltation: 9, debilitation: 3, exaltationNote: "Sagittarius/Gemini per some texts" },
];

export default function VargaReferenceCard() {
  return (
    <div className="space-y-6">
      {/* Sign properties table */}
      <div className="rounded-xl glass-card border border-[var(--v-border)] p-5">
        <h3 className="text-sm font-semibold text-[var(--v-text)] mb-4">
          🌟 Sign Properties Reference
        </h3>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--v-border)]">
                <th className="text-left py-2 px-2 text-[var(--v-text-muted)] font-medium">#</th>
                <th className="text-left py-2 px-2 text-[var(--v-text-muted)] font-medium">Sign</th>
                <th className="text-left py-2 px-2 text-[var(--v-text-muted)] font-medium">Element</th>
                <th className="text-left py-2 px-2 text-[var(--v-text-muted)] font-medium">Modality</th>
                <th className="text-left py-2 px-2 text-[var(--v-text-muted)] font-medium">Parity</th>
                <th className="text-left py-2 px-2 text-[var(--v-text-muted)] font-medium">Ruler</th>
              </tr>
            </thead>
            <tbody>
              {[
                { sign: 1, parity: "Odd" },
                { sign: 2, parity: "Even" },
                { sign: 3, parity: "Odd" },
                { sign: 4, parity: "Even" },
                { sign: 5, parity: "Odd" },
                { sign: 6, parity: "Even" },
                { sign: 7, parity: "Odd" },
                { sign: 8, parity: "Even" },
                { sign: 9, parity: "Odd" },
                { sign: 10, parity: "Even" },
                { sign: 11, parity: "Odd" },
                { sign: 12, parity: "Even" },
              ].map(({ sign, parity }) => {
                const elem = sign % 4;
                const mod = sign % 3;
                const ruler = SIGN_RULERS[sign];
                const rulerColor = PLANET_COLORS[ruler] || "var(--v-text-muted)";
                const borderAccentColor = PLANET_BORDER_COLORS[ruler] || rulerColor;
                const planetEmoji = PLANET_EMOJIS[ruler] || "";
                return (
                  <tr
                    key={sign}
                    className="border-b border-[var(--v-border)] hover:bg-[var(--v-hover-bg)] transition-colors"
                    style={{ borderLeft: `3px solid ${borderAccentColor}` }}
                  >
                    <td className="py-1.5 px-2 text-[var(--v-text-muted)] font-mono">{sign}</td>
                    <td className="py-1.5 px-2" style={{ color: SIGN_COLORS[sign - 1] }}>
                      {SIGN_SYMBOLS[sign]} {SIGN_NAMES[sign]}
                    </td>
                    <td className="py-1.5 px-2" style={{ color: ELEMENT_LABELS[elem].color }}>
                      {ELEMENT_LABELS[elem].name}
                    </td>
                    <td className="py-1.5 px-2" style={{ color: MODALITY_LABELS[mod].color }}>
                      {MODALITY_LABELS[mod].name}
                    </td>
                    <td className="py-1.5 px-2" style={{ color: parity === "Odd" ? "#e07a5c" : "#5cb8e0" }}>
                      {parity}
                    </td>
                    <td className="py-1.5 px-2" style={{ minWidth: "90px" }}>
                      <span className="flex items-center gap-1.5">
                        <span
                          className="text-sm flex-shrink-0"
                          style={{ color: borderAccentColor }}
                          title={ruler}
                        >
                          {planetEmoji}
                        </span>
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: VEDIC_PLANET_COLORS[ruler] || rulerColor }}
                        />
                        <span style={{ color: rulerColor }}>{ruler}</span>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Varga rules table */}
      <div className="rounded-xl glass-card border border-[var(--v-border)] p-5">
        <h3 className="text-sm font-semibold text-[var(--v-text)] mb-4">
          🔮 Varga Division Rules
        </h3>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--v-border)]">
                <th className="text-left py-2 px-2 text-[var(--v-text-muted)] font-medium">Varga</th>
                <th className="text-left py-2 px-2 text-[var(--v-text-muted)] font-medium">Sanskrit</th>
                <th className="text-left py-2 px-2 text-[var(--v-text-muted)] font-medium">Parts</th>
                <th className="text-left py-2 px-2 text-[var(--v-text-muted)] font-medium">Rule</th>
                <th className="text-left py-2 px-2 text-[var(--v-text-muted)] font-medium">Purpose</th>
              </tr>
            </thead>
            <tbody>
              {VARGA_DESCRIPTIONS.map((v) => (
                <tr key={v.name} className="border-b border-[var(--v-border)] hover:bg-[var(--v-hover-bg)]">
                  <td className="py-1.5 px-2 font-mono text-[var(--v-accent-purple)] font-medium">{v.name}</td>
                  <td className="py-1.5 px-2 text-[var(--v-text)] italic">{VARGA_SANSKRIT[v.name] || v.title}</td>
                  <td className="py-1.5 px-2 text-[#f0c060] font-mono">{v.number}</td>
                  <td className="py-1.5 px-2 text-[var(--v-text-muted)]">{v.rules}</td>
                  <td className="py-1.5 px-2 text-[var(--v-text-muted)]" style={{ opacity: 0.75 }}>
                    {VARGA_PURPOSES[v.name] || ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Element/Modality grid */}
      <div className="rounded-xl glass-card border border-[var(--v-border)] p-5">
        <h3 className="text-sm font-semibold text-[var(--v-text)] mb-4">
          📐 Element × Modality Matrix
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--v-border)]">
                <th className="py-2 px-3 text-[var(--v-text-muted)] font-medium" />
                <th className="py-2 px-3 text-[#e05c5c] font-medium">Cardinal</th>
                <th className="py-2 px-3 text-[#5c8ee0] font-medium">Fixed</th>
                <th className="py-2 px-3 text-[#5ce07a] font-medium">Mutable</th>
              </tr>
            </thead>
            <tbody>
              {[
                { elem: 1, signs: [1, 5, 9] },
                { elem: 2, signs: [2, 6, 10] },
                { elem: 3, signs: [3, 7, 11] },
                { elem: 0, signs: [4, 8, 12] },
              ].map(({ elem, signs }) => (
                <tr key={elem} className="border-b border-[var(--v-border)]">
                  <td className="py-2 px-3 font-medium" style={{ color: ELEMENT_LABELS[elem].color }}>
                    {ELEMENT_LABELS[elem].name}
                  </td>
                  {signs.map((s) => (
                    <td key={s} className="py-2 px-3" style={{ color: SIGN_COLORS[s - 1] }}>
                      {SIGN_SYMBOLS[s]} {SIGN_NAMES[s]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Planetary Rulerships */}
      <div className="rounded-xl glass-card border border-[var(--v-border)] p-5">
        <h3 className="text-sm font-semibold text-[var(--v-text)] mb-4">
          🪐 Planetary Rulerships
        </h3>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--v-border)]">
                <th className="text-left py-2 px-2 text-[var(--v-text-muted)] font-medium">Planet</th>
                <th className="text-left py-2 px-2 text-[var(--v-text-muted)] font-medium">Ruled Signs</th>
                <th className="text-left py-2 px-2 text-[var(--v-text-muted)] font-medium">Exaltation</th>
                <th className="text-left py-2 px-2 text-[var(--v-text-muted)] font-medium">Debilitation</th>
              </tr>
            </thead>
            <tbody>
              {PLANETARY_RULERSHIPS.map(({ planet, ruledSigns, exaltation, debilitation, exaltationNote }) => {
                const planetColor = PLANET_COLORS[planet] || "var(--v-text-muted)";
                return (
                  <tr key={planet} className="border-b border-[var(--v-border)] hover:bg-[var(--v-hover-bg)]">
                    <td className="py-1.5 px-2">
                      <span className="flex items-center gap-1.5">
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: planetColor }}
                        />
                        <span className="font-medium" style={{ color: planetColor }}>{planet}</span>
                      </span>
                    </td>
                    <td className="py-1.5 px-2">
                      {ruledSigns.length > 0 ? (
                        <span className="flex flex-wrap gap-1">
                          {ruledSigns.map((s) => (
                            <span
                              key={s}
                              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px]"
                              style={{
                                backgroundColor: `${SIGN_COLORS[s - 1]}18`,
                                color: SIGN_COLORS[s - 1],
                                border: `1px solid ${SIGN_COLORS[s - 1]}30`,
                              }}
                            >
                              {SIGN_SYMBOLS[s]} {SIGN_NAMES[s]}
                            </span>
                          ))}
                        </span>
                      ) : (
                        <span className="text-[var(--v-text-muted)] italic text-[10px]">No sign rulership</span>
                      )}
                    </td>
                    <td className="py-1.5 px-2">
                      <span className="flex items-center gap-1">
                        <span
                          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px]"
                          style={{
                            backgroundColor: `rgba(92, 224, 122, 0.12)`,
                            color: "#5ce07a",
                            border: "1px solid rgba(92, 224, 122, 0.25)",
                          }}
                        >
                          ↑ {SIGN_SYMBOLS[exaltation]} {SIGN_NAMES[exaltation]}
                        </span>
                        {exaltationNote && (
                          <span className="text-[9px] text-[var(--v-text-muted)]" style={{ opacity: 0.6 }}>*{exaltationNote}</span>
                        )}
                      </span>
                    </td>
                    <td className="py-1.5 px-2">
                      <span
                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px]"
                        style={{
                          backgroundColor: "rgba(224, 92, 92, 0.12)",
                          color: "#e05c5c",
                          border: "1px solid rgba(224, 92, 92, 0.25)",
                        }}
                      >
                        ↓ {SIGN_SYMBOLS[debilitation]} {SIGN_NAMES[debilitation]}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[10px] text-[var(--v-text-muted)]" style={{ opacity: 0.6 }}>
          * Rahu and Ketu exaltation/debilitation signs vary across classical texts.
        </p>
      </div>
    </div>
  );
}
