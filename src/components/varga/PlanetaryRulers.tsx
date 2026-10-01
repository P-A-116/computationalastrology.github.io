"use client";

import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import {
  type ComputationResult,
  findInterval,
  SIGN_NAMES,
  SIGN_SYMBOLS,
  SIGN_COLORS,
  VARGA_NAMES,
  N_VARGA,
  SIGN_RULERS,
  PLANET_COLORS,
  VARGA_SANSKRIT,
  VARGA_PURPOSES,
  getNakshatraInfo,
} from "@/lib/varga-engine";
import { readDegreeParam, writeUrlState } from "@/lib/url-state";

interface PlanetaryRulersProps {
  data: ComputationResult;
}

// Planet symbols for display
const PLANET_SYMBOLS: Record<string, string> = {
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

// All 7 traditional Vedic planets (navagraha minus Rahu/Ketu which aren't sign rulers)
const PLANETS = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"];

export default function PlanetaryRulers({ data }: PlanetaryRulersProps) {
  const [degree, setDegree] = useState(() => readDegreeParam("deg", 0));

  const [isPlaying, setIsPlaying] = useState(false);
  const animFrameRef = useRef<number | null>(null);
  const animStartTimeRef = useRef<number | null>(null);
  const animStartDegreeRef = useRef<number>(0);

  // Find the interval for the current degree
  const intervalInfo = useMemo(() => findInterval(data, degree), [degree, data]);

  // Compute planetary ruler for each varga at current degree
  const vargaRulers = useMemo(() => {
    if (!intervalInfo) return [];
    return intervalInfo.signRow.map((signNum, vargaIdx) => ({
      vargaName: VARGA_NAMES[vargaIdx],
      vargaSanskrit: VARGA_SANSKRIT[VARGA_NAMES[vargaIdx]] || "",
      vargaPurpose: VARGA_PURPOSES[VARGA_NAMES[vargaIdx]] || "",
      signNum,
      signName: SIGN_NAMES[signNum],
      signSymbol: SIGN_SYMBOLS[signNum],
      signColor: SIGN_COLORS[signNum - 1],
      ruler: SIGN_RULERS[signNum] || "Unknown",
      rulerColor: PLANET_COLORS[SIGN_RULERS[signNum]] || "#888",
      rulerSymbol: PLANET_SYMBOLS[SIGN_RULERS[signNum]] || "?",
    }));
  }, [intervalInfo]);

  // Count rulers
  const rulerCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const vr of vargaRulers) {
      counts[vr.ruler] = (counts[vr.ruler] || 0) + 1;
    }
    return counts;
  }, [vargaRulers]);

  // Dominant ruler
  const dominantRuler = useMemo(() => {
    let maxPlanet = "";
    let maxCount = 0;
    for (const [planet, count] of Object.entries(rulerCounts)) {
      if (count > maxCount) {
        maxPlanet = planet;
        maxCount = count;
      }
    }
    return { planet: maxPlanet, count: maxCount };
  }, [rulerCounts]);

  // Planet affinity groups
  const planetAffinities = useMemo(() => {
    if (!intervalInfo) return null;

    // Check if any friendly planets co-occur
    // Friendship table (simplified Vedic planetary friendships)
    const friends: Record<string, string[]> = {
      "Sun": ["Moon", "Mars", "Jupiter"],
      "Moon": ["Sun", "Mercury"],
      "Mars": ["Sun", "Moon", "Jupiter"],
      "Mercury": ["Sun", "Venus"],
      "Jupiter": ["Sun", "Moon", "Mars"],
      "Venus": ["Mercury", "Saturn"],
      "Saturn": ["Mercury", "Venus"],
    };

    const activePlanets = Object.keys(rulerCounts);
    let friendlyPairs = 0;
    let totalPairs = 0;

    for (let i = 0; i < activePlanets.length; i++) {
      for (let j = i + 1; j < activePlanets.length; j++) {
        totalPairs++;
        const p1 = activePlanets[i];
        const p2 = activePlanets[j];
        if (friends[p1]?.includes(p2) || friends[p2]?.includes(p1)) {
          friendlyPairs++;
        }
      }
    }

    return {
      friendlyPairs,
      totalPairs,
      harmony: totalPairs > 0 ? friendlyPairs / totalPairs : 0,
    };
  }, [intervalInfo, rulerCounts]);

  // Ruler distribution across full 360°
  const ruler360Distribution = useMemo(() => {
    const dist: Record<string, { totalDeg: number; intervals: number }> = {};
    for (const planet of PLANETS) {
      dist[planet] = { totalDeg: 0, intervals: 0 };
    }

    for (const iv of data.intervals) {
      const width = iv.b1.toNumber() - iv.b0.toNumber();
      for (let v = 0; v < N_VARGA; v++) {
        const sign = iv.signRow[v];
        const ruler = SIGN_RULERS[sign];
        if (ruler && dist[ruler]) {
          dist[ruler].totalDeg += width;
          dist[ruler].intervals++;
        }
      }
    }

    return dist;
  }, [data.intervals]);

  // Animation
  const handleTogglePlay = useCallback(() => {
    if (isPlaying) {
      setIsPlaying(false);
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    } else {
      animStartTimeRef.current = null;
      animStartDegreeRef.current = degree;
      setIsPlaying(true);
    }
  }, [isPlaying, degree]);

  useEffect(() => {
    if (!isPlaying) return;
    const animate = (timestamp: number) => {
      if (animStartTimeRef.current === null) {
        animStartTimeRef.current = timestamp;
      }
      const elapsed = (timestamp - animStartTimeRef.current) / 1000;
      let newDeg = animStartDegreeRef.current + elapsed * 2;
      if (newDeg >= 360) newDeg = newDeg % 360;
      setDegree(newDeg);
      animFrameRef.current = requestAnimationFrame(animate);
    };
    animFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animFrameRef.current !== null) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying]);

  // Sync degree to URL
  useEffect(() => {
    writeUrlState({ deg: degree.toFixed(2) }, { hash: "#rulers" });
  }, [degree]);

  const signIdx = Math.floor(degree / 30);
  const signDeg = degree - signIdx * 30;
  const nakInfo = getNakshatraInfo(degree);

  return (
    <div className="space-y-5">
      {/* Degree Slider Section */}
      <div className="rounded-xl glass-card border border-[var(--v-border)] p-5 card-glow">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl" style={{ color: SIGN_COLORS[signIdx] }}>
              {SIGN_SYMBOLS[signIdx + 1]}
            </span>
            <div>
              <div className="text-lg font-bold" style={{ color: SIGN_COLORS[signIdx] }}>
                {SIGN_NAMES[signIdx + 1]} {signDeg.toFixed(1)}°
              </div>
              <div className="text-xs font-mono" style={{ color: "var(--v-accent-gold)" }}>
                {degree.toFixed(2)}° total
                {isPlaying && (
                  <span className="inline-block w-2 h-2 rounded-full animate-pulse ml-2" style={{ backgroundColor: "var(--v-accent-purple)" }} />
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleTogglePlay}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
              style={{
                backgroundColor: isPlaying ? "rgba(155,127,232,0.25)" : "rgba(155,127,232,0.15)",
                border: `1.5px solid ${isPlaying ? "rgba(155,127,232,0.6)" : "rgba(155,127,232,0.35)"}`,
                color: "var(--v-accent-purple)",
              }}
              title={isPlaying ? "Pause" : "Play animation"}
            >
              {isPlaying ? (
                <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><rect x="3" y="2" width="4" height="12" rx="1" /><rect x="9" y="2" width="4" height="12" rx="1" /></svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M4 2l10 6-10 6V2z" /></svg>
              )}
            </button>
          </div>
        </div>
        <input
          type="range"
          min={0}
          max={359.99}
          step={0.01}
          value={degree}
          onChange={(e) => {
            if (isPlaying) { setIsPlaying(false); if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); }
            setDegree(parseFloat(e.target.value));
          }}
          className="w-full h-3 rounded-full appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, ${SIGN_COLORS.map((c, i) =>
              `${c} ${(i / 12) * 100}%, ${c} ${((i + 1) / 12) * 100}%`
            ).join(", ")})`,
          }}
        />
        <div className="flex justify-between mt-1">
          {SIGN_SYMBOLS.slice(1).map((sym, i) => (
            <button key={i} onClick={() => setDegree(i * 30 + 0.01)} className="text-xs hover:scale-125 transition-transform" style={{ color: i === signIdx ? SIGN_COLORS[i] : "var(--v-text-muted)" }}>
              {sym}
            </button>
          ))}
        </div>
        {/* Nakshatra info */}
        <div className="flex items-center gap-2 mt-2">
          <span className="text-[10px]" style={{ color: "var(--v-text-muted)" }}>Nakshatra:</span>
          <span className="text-xs font-medium" style={{ color: `hsl(${(nakInfo.index / 27) * 360}, 60%, 65%)` }}>{nakInfo.name}</span>
          <span className="text-[10px]" style={{ color: "var(--v-text-muted)" }}>Lord:</span>
          <span className="text-xs font-medium" style={{ color: PLANET_COLORS[nakInfo.lord] || "var(--v-text)" }}>{PLANET_SYMBOLS[nakInfo.lord] || ""} {nakInfo.lord}</span>
        </div>
      </div>

      {/* Dominant Ruler Card */}
      {dominantRuler.planet && (
        <div className="rounded-xl glass-card border border-[var(--v-border)] p-5 card-glow">
          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl font-bold shadow-lg"
              style={{
                backgroundColor: `${PLANET_COLORS[dominantRuler.planet]}20`,
                border: `2px solid ${PLANET_COLORS[dominantRuler.planet]}50`,
                color: PLANET_COLORS[dominantRuler.planet],
                boxShadow: `0 4px 20px ${PLANET_COLORS[dominantRuler.planet]}30`,
              }}
            >
              {PLANET_SYMBOLS[dominantRuler.planet] || "?"}
            </div>
            <div>
              <div className="text-sm" style={{ color: "var(--v-text-muted)" }}>Dominant Ruler</div>
              <div className="text-xl font-bold" style={{ color: PLANET_COLORS[dominantRuler.planet] }}>
                {dominantRuler.planet}
              </div>
              <div className="text-xs" style={{ color: "var(--v-text-muted)" }}>
                Rules {dominantRuler.count} of {N_VARGA} vargas at this position
              </div>
            </div>
            {/* Harmony score */}
            {planetAffinities && (
              <div className="ml-auto text-center">
                <div className="text-sm" style={{ color: "var(--v-text-muted)" }}>Harmony</div>
                <div
                  className="text-2xl font-bold"
                  style={{
                    color: planetAffinities.harmony >= 0.6
                      ? "#5ce07a"
                      : planetAffinities.harmony >= 0.3
                        ? "var(--v-accent-gold)"
                        : "#e05c5c",
                  }}
                >
                  {Math.round(planetAffinities.harmony * 100)}%
                </div>
                <div className="text-[9px]" style={{ color: "var(--v-text-muted)" }}>
                  {planetAffinities.friendlyPairs}/{planetAffinities.totalPairs} friendly pairs
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Ruler Distribution Bar */}
      <div className="rounded-xl glass-card border border-[var(--v-border)] p-5 card-glow">
        <h3 style={{ color: "var(--v-text)" }} className="text-sm font-semibold mb-3">
          Planetary Ruler Distribution at {degree.toFixed(1)}°
        </h3>
        <div className="space-y-2">
          {PLANETS.map((planet) => {
            const count = rulerCounts[planet] || 0;
            const pct = (count / N_VARGA) * 100;
            const color = PLANET_COLORS[planet];
            return (
              <div key={planet} className="flex items-center gap-2">
                <span className="w-6 text-center text-sm" style={{ color }}>{PLANET_SYMBOLS[planet]}</span>
                <span className="w-16 text-xs font-medium" style={{ color }}>{planet}</span>
                <div className="flex-1 h-5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--v-card)", border: "1px solid var(--v-border)" }}>
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: color, opacity: 0.8 }}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                  />
                </div>
                <span className="w-8 text-right text-xs font-mono font-bold" style={{ color: count > 0 ? color : "var(--v-text-muted)" }}>
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Varga Ruler Detail Table */}
      <div className="rounded-xl glass-card border border-[var(--v-border)] p-5 card-glow">
        <h3 style={{ color: "var(--v-text)" }} className="text-sm font-semibold mb-3">
          Varga → Ruler Mapping
        </h3>
        <p style={{ color: "var(--v-text-muted)" }} className="text-xs mb-3">
          Shows the planetary ruler for each varga at {degree.toFixed(1)}°, along with the varga&apos;s Sanskrit name and astrological purpose.
        </p>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--v-border)" }}>
                <th style={{ color: "var(--v-text-muted)" }} className="text-left py-2 px-2 font-medium">Varga</th>
                <th style={{ color: "var(--v-text-muted)" }} className="text-left py-2 px-2 font-medium">Sanskrit</th>
                <th style={{ color: "var(--v-text-muted)" }} className="text-left py-2 px-2 font-medium">Sign</th>
                <th style={{ color: "var(--v-text-muted)" }} className="text-center py-2 px-2 font-medium">Ruler</th>
                <th style={{ color: "var(--v-text-muted)" }} className="text-left py-2 px-2 font-medium hidden sm:table-cell">Purpose</th>
              </tr>
            </thead>
            <tbody>
              {vargaRulers.map((vr, idx) => (
                <tr
                  key={idx}
                  className="transition-colors hover:bg-[var(--v-hover-bg)]"
                  style={{ borderBottom: "1px solid var(--v-border)" }}
                >
                  <td className="py-1.5 px-2 font-mono font-medium" style={{ color: "var(--v-accent-purple)" }}>{vr.vargaName}</td>
                  <td className="py-1.5 px-2 italic" style={{ color: "var(--v-text-muted)" }}>{vr.vargaSanskrit}</td>
                  <td className="py-1.5 px-2">
                    <span style={{ color: vr.signColor }}>{vr.signSymbol} {vr.signName}</span>
                  </td>
                  <td className="py-1.5 px-2 text-center">
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                      style={{
                        backgroundColor: `${vr.rulerColor}20`,
                        border: `1px solid ${vr.rulerColor}40`,
                        color: vr.rulerColor,
                      }}
                    >
                      {vr.rulerSymbol} {vr.ruler}
                    </span>
                  </td>
                  <td className="py-1.5 px-2 hidden sm:table-cell" style={{ color: "var(--v-text-muted)" }}>{vr.vargaPurpose}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 360° Ruler Distribution */}
      <div className="rounded-xl glass-card border border-[var(--v-border)] p-5 card-glow">
        <h3 style={{ color: "var(--v-text)" }} className="text-sm font-semibold mb-3">
          Overall Ruler Distribution (Full 360°)
        </h3>
        <p style={{ color: "var(--v-text-muted)" }} className="text-xs mb-3">
          Total degree-width each planet rules across all 16 vargas over the complete zodiac.
        </p>
        <div className="space-y-2">
          {PLANETS.map((planet) => {
            const info = ruler360Distribution[planet];
            if (!info) return null;
            // Max possible = 360° * 16 vargas = 5760°
            const maxDeg = 360 * N_VARGA;
            const pct = (info.totalDeg / maxDeg) * 100;
            const color = PLANET_COLORS[planet];
            return (
              <div key={planet} className="flex items-center gap-2">
                <span className="w-6 text-center text-sm" style={{ color }}>{PLANET_SYMBOLS[planet]}</span>
                <span className="w-16 text-xs font-medium" style={{ color }}>{planet}</span>
                <div className="flex-1 h-4 rounded-full overflow-hidden" style={{ backgroundColor: "var(--v-card)", border: "1px solid var(--v-border)" }}>
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ backgroundColor: color, opacity: 0.7, width: `${pct}%` }}
                  />
                </div>
                <span className="w-16 text-right text-[10px] font-mono" style={{ color: "var(--v-text-muted)" }}>
                  {info.totalDeg.toFixed(0)}°
                </span>
                <span className="w-10 text-right text-[9px] font-mono" style={{ color }}>
                  {pct.toFixed(1)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Planetary Friendships */}
      {planetAffinities && (
        <div className="rounded-xl glass-card border border-[var(--v-border)] p-5 card-glow">
          <h3 style={{ color: "var(--v-text)" }} className="text-sm font-semibold mb-3">
            Planetary Friendship Matrix
          </h3>
          <p style={{ color: "var(--v-text-muted)" }} className="text-xs mb-3">
            Shows friendly (green), neutral (gray), and inimical (red) relationships between the active planetary rulers at this degree.
          </p>
          <FriendshipMatrix activePlanets={Object.keys(rulerCounts)} />
        </div>
      )}
    </div>
  );
}

// Planetary Friendship Matrix sub-component
function FriendshipMatrix({ activePlanets }: { activePlanets: string[] }) {
  const friends: Record<string, string[]> = {
    "Sun": ["Moon", "Mars", "Jupiter"],
    "Moon": ["Sun", "Mercury"],
    "Mars": ["Sun", "Moon", "Jupiter"],
    "Mercury": ["Sun", "Venus"],
    "Jupiter": ["Sun", "Moon", "Mars"],
    "Venus": ["Mercury", "Saturn"],
    "Saturn": ["Mercury", "Venus"],
  };
  const enemies: Record<string, string[]> = {
    "Sun": ["Saturn", "Venus"],
    "Moon": [],
    "Mars": ["Mercury", "Venus"],
    "Mercury": ["Mars"],
    "Jupiter": ["Venus", "Mercury"],
    "Venus": ["Sun", "Moon", "Mars"],
    "Saturn": ["Sun", "Moon", "Mars"],
  };

  const planets = activePlanets.length > 0 ? activePlanets : PLANETS;

  return (
    <div className="overflow-x-auto custom-scrollbar">
      <table className="w-full text-[9px]">
        <thead>
          <tr>
            <th style={{ color: "var(--v-text-muted)" }} className="p-1" />
            {planets.map((p) => (
              <th key={p} className="p-1 text-center" style={{ color: PLANET_COLORS[p] }}>
                {PLANET_SYMBOLS[p]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {planets.map((rowPlanet) => (
            <tr key={rowPlanet}>
              <td className="p-1 font-medium" style={{ color: PLANET_COLORS[rowPlanet] }}>
                {PLANET_SYMBOLS[rowPlanet]} {rowPlanet.slice(0, 3)}
              </td>
              {planets.map((colPlanet) => {
                const isSelf = rowPlanet === colPlanet;
                const isFriend = friends[rowPlanet]?.includes(colPlanet);
                const isEnemy = enemies[rowPlanet]?.includes(colPlanet);
                const bgColor = isSelf
                  ? "rgba(155,127,232,0.2)"
                  : isFriend
                    ? "rgba(92,224,122,0.15)"
                    : isEnemy
                      ? "rgba(224,92,92,0.12)"
                      : "rgba(74,72,96,0.08)";
                const textColor = isSelf
                  ? "var(--v-accent-purple)"
                  : isFriend
                    ? "#5ce07a"
                    : isEnemy
                      ? "#e05c5c"
                      : "var(--v-text-muted)";
                const label = isSelf ? "—" : isFriend ? "F" : isEnemy ? "E" : "N";
                return (
                  <td
                    key={colPlanet}
                    className="p-1 text-center rounded"
                    style={{ backgroundColor: bgColor, color: textColor }}
                  >
                    {label}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex items-center gap-3 mt-2">
        <span className="flex items-center gap-1 text-[9px]" style={{ color: "#5ce07a" }}>
          <span className="w-3 h-3 rounded" style={{ backgroundColor: "rgba(92,224,122,0.15)" }} /> Friend
        </span>
        <span className="flex items-center gap-1 text-[9px]" style={{ color: "var(--v-text-muted)" }}>
          <span className="w-3 h-3 rounded" style={{ backgroundColor: "rgba(74,72,96,0.08)" }} /> Neutral
        </span>
        <span className="flex items-center gap-1 text-[9px]" style={{ color: "#e05c5c" }}>
          <span className="w-3 h-3 rounded" style={{ backgroundColor: "rgba(224,92,92,0.12)" }} /> Enemy
        </span>
      </div>
    </div>
  );
}
