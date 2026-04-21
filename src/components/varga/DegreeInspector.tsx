"use client";

import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import {
  computeVargaAnalysis,
  SIGN_NAMES,
  SIGN_SYMBOLS,
  SIGN_COLORS,
  VARGA_NAMES,
  N_VARGA,
} from "@/lib/varga-engine";
import NakshatraWheel from "@/components/varga/NakshatraWheel";
import VargaDetailModal from "@/components/varga/VargaDetailModal";
import BookmarkManager from "@/components/varga/BookmarkManager";
import DegreePresets from "@/components/varga/DegreePresets";
import { useToast } from "@/hooks/use-toast";
import { NAKSHATRA_NAMES, NAKSHATRA_LORDS, NAKSHATRA_DEGREES, getNakshatraInfo } from "@/lib/varga-engine";

interface DegreeInspectorProps {
  data: ReturnType<typeof computeVargaAnalysis>;
}

interface Bookmark {
  degree: number;
  label: string;
  timestamp: number;
}

const MAX_BOOKMARKS = 20;
const BOOKMARKS_KEY = "varga-bookmarks";

const SPEED_OPTIONS = [
  { label: "0.5×", value: 0.5 },
  { label: "1×", value: 1 },
  { label: "2×", value: 2 },
  { label: "5×", value: 5 },
] as const;

function loadBookmarks(): Bookmark[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(BOOKMARKS_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return [];
}

function saveBookmarks(bookmarks: Bookmark[]) {
  try {
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
  } catch { /* ignore */ }
}

function generateBookmarkLabel(degree: number): string {
  const signIdx = Math.floor(degree / 30);
  const signDeg = degree - signIdx * 30;
  const signName = SIGN_NAMES[Math.min(signIdx + 1, 12)];
  return `${signName} ${signDeg.toFixed(1)}°`;
}

export default function DegreeInspector({ data }: DegreeInspectorProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  // Read initial degree from URL search params
  const [degree, setDegree] = useState(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const degParam = params.get("deg");
      if (degParam !== null) {
        const parsed = parseFloat(degParam);
        if (!isNaN(parsed) && parsed >= 0 && parsed < 360) {
          return parsed;
        }
      }
    }
    return 0;
  });

  const [modalVargaIdx, setModalVargaIdx] = useState<number | null>(null);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(() => loadBookmarks());
  const [showNakshatraNav, setShowNakshatraNav] = useState(false);

  // Animation state
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<number>(1);
  const [transitMode, setTransitMode] = useState(false);
  const animFrameRef = useRef<number | null>(null);
  const animStartTimeRef = useRef<number | null>(null);
  const animStartDegreeRef = useRef<number>(0);
  const isPlayingRef = useRef(false);
  const speedRef = useRef(1);
  const transitModeRef = useRef(false);
  const [prevSignRow, setPrevSignRow] = useState<number[] | null>(null);
  const [vargaShiftCount, setVargaShiftCount] = useState(0);
  const setDegreeRef = useRef(setDegree);
  const boundaryDegreesRef = useRef<number[]>([]);

  // Keep refs in sync
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);
  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);
  useEffect(() => {
    transitModeRef.current = transitMode;
  }, [transitMode]);
  useEffect(() => {
    setDegreeRef.current = setDegree;
  }, []);

  // Step navigation: find interval boundaries
  const boundaryDegrees = useMemo(() => {
    const bounds = new Set<number>();
    for (const iv of data.intervals) {
      bounds.add(iv.b0.toNumber());
      bounds.add(iv.b1.toNumber());
    }
    return Array.from(bounds).sort((a, b) => a - b);
  }, [data.intervals]);

  // Keep boundaryDegrees ref in sync for animation function
  useEffect(() => {
    boundaryDegreesRef.current = boundaryDegrees;
  }, [boundaryDegrees]);

  // Animation loop using requestAnimationFrame — stored in ref to avoid circular dependency
  const animateFrameFnRef = useRef<((timestamp: number) => void) | null>(null);

  // Keep the animation function up to date via effect
  useEffect(() => {
    animateFrameFnRef.current = (timestamp: number) => {
      if (!isPlayingRef.current) return;

      if (animStartTimeRef.current === null) {
        animStartTimeRef.current = timestamp;
      }

      const elapsed = (timestamp - animStartTimeRef.current) / 1000; // seconds
      // In transit mode, vary speed based on boundary proximity
      let effectiveSpeed = speedRef.current;
      if (transitModeRef.current) {
        const currentDeg = animStartDegreeRef.current + elapsed * speedRef.current;
        // Find distance to nearest boundary
        const normalizedDeg = ((currentDeg % 360) + 360) % 360;
        let minDist = 360;
        for (const b of boundaryDegreesRef.current) {
          const dist = Math.abs(b - normalizedDeg);
          const wrappedDist = Math.min(dist, 360 - dist);
          if (wrappedDist < minDist) minDist = wrappedDist;
        }
        // Slow down within 2° of a boundary, speed up otherwise
        if (minDist < 2) {
          effectiveSpeed = speedRef.current * 0.2; // slow near boundaries
        } else if (minDist < 5) {
          effectiveSpeed = speedRef.current * 0.5;
        } else {
          effectiveSpeed = speedRef.current * 1.8; // fast in stable regions
        }
      }
      // speed degrees per second
      const delta = elapsed * effectiveSpeed;
      let newDeg = animStartDegreeRef.current + delta;

      // Loop back to 0 when reaching 360
      if (newDeg >= 360) {
        newDeg = newDeg % 360;
      }

      setDegreeRef.current(newDeg);
      animFrameRef.current = requestAnimationFrame((ts) => animateFrameFnRef.current?.(ts));
    };
  }, []);

  // Start animation
  const handlePlay = useCallback(() => {
    animStartTimeRef.current = null;
    animStartDegreeRef.current = degree;
    setIsPlaying(true);
    animFrameRef.current = requestAnimationFrame((ts) => animateFrameFnRef.current?.(ts));
  }, [degree]);

  // Pause animation
  const handlePause = useCallback(() => {
    setIsPlaying(false);
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
  }, []);

  // Toggle play/pause
  const handleTogglePlay = useCallback(() => {
    if (isPlaying) {
      handlePause();
    } else {
      handlePlay();
    }
  }, [isPlaying, handlePlay, handlePause]);

  // Stop animation when component unmounts
  useEffect(() => {
    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  // Find next interval boundary after current degree
  const findNextBoundary = useCallback((currentDeg: number): number | null => {
    for (const b of boundaryDegrees) {
      if (b > currentDeg + 0.001) return b;
    }
    // Wrap around to the first boundary
    if (boundaryDegrees.length > 0) return boundaryDegrees[0];
    return null;
  }, [boundaryDegrees]);

  // Find previous interval boundary before current degree
  const findPrevBoundary = useCallback((currentDeg: number): number | null => {
    for (let i = boundaryDegrees.length - 1; i >= 0; i--) {
      if (boundaryDegrees[i] < currentDeg - 0.001) return boundaryDegrees[i];
    }
    // Wrap around to the last boundary
    if (boundaryDegrees.length > 0) return boundaryDegrees[boundaryDegrees.length - 1];
    return null;
  }, [boundaryDegrees]);

  const handleStepNext = useCallback(() => {
    const next = findNextBoundary(degree);
    if (next !== null) {
      // Pause animation if playing
      if (isPlaying) handlePause();
      setDegree(next >= 360 ? 0 : next);
    }
  }, [degree, findNextBoundary, isPlaying, handlePause]);

  const handleStepPrev = useCallback(() => {
    const prev = findPrevBoundary(degree);
    if (prev !== null) {
      // Pause animation if playing
      if (isPlaying) handlePause();
      setDegree(prev);
    }
  }, [degree, findPrevBoundary, isPlaying, handlePause]);

  // Sync degree to URL search params (clean up other component params)
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const url = new URL(window.location.href);
        url.searchParams.set("deg", degree.toFixed(2));
        // Remove comparison params when inspector is active
        url.searchParams.delete("degA");
        url.searchParams.delete("degB");
        window.history.replaceState(null, "", url.pathname + url.search + url.hash);
      } catch {
        // Silently fail in sandboxed iframes where history.replaceState is blocked
      }
    }
  }, [degree]);

  // Save bookmarks to localStorage whenever they change
  useEffect(() => {
    saveBookmarks(bookmarks);
  }, [bookmarks]);

  // Share button handler
  const handleShare = useCallback(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("deg", degree.toFixed(2));
    url.hash = "#inspector";
    navigator.clipboard.writeText(url.toString()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [degree]);

  // Bookmark handler
  const handleBookmark = useCallback(() => {
    // Check if already bookmarked
    const exists = bookmarks.some(b => Math.abs(b.degree - degree) < 0.01);
    if (exists) {
      toast({
        title: "Already bookmarked",
        description: `${generateBookmarkLabel(degree)} is already in your bookmarks.`,
      });
      return;
    }

    const newBookmark: Bookmark = {
      degree,
      label: generateBookmarkLabel(degree),
      timestamp: Date.now(),
    };

    if (bookmarks.length >= MAX_BOOKMARKS) {
      // Auto-delete the oldest bookmark to make room
      const sorted = [...bookmarks].sort((a, b) => a.timestamp - b.timestamp);
      const oldest = sorted[0];
      setBookmarks(prev => {
        const filtered = prev.filter(b => b.timestamp !== oldest.timestamp);
        return [...filtered, newBookmark].sort((a, b) => a.degree - b.degree);
      });
      toast({
        title: "Bookmark added (oldest removed)",
        description: `${newBookmark.label} saved. Oldest bookmark removed to stay within ${MAX_BOOKMARKS} limit.`,
      });
      return;
    }

    setBookmarks(prev => [...prev, newBookmark].sort((a, b) => a.degree - b.degree));
    toast({
      title: "Bookmark added",
      description: `${newBookmark.label} saved to bookmarks.`,
    });
  }, [degree, bookmarks, toast]);

  // Remove bookmark handler
  const handleRemoveBookmark = useCallback((timestamp: number) => {
    setBookmarks(prev => prev.filter(b => b.timestamp !== timestamp));
  }, []);

  // Clear all bookmarks handler
  const handleClearBookmarks = useCallback(() => {
    setBookmarks([]);
    toast({
      title: "Bookmarks cleared",
      description: "All bookmarks have been removed.",
    });
  }, [toast]);

  // Jump to bookmark
  const handleJumpToBookmark = useCallback((deg: number) => {
    setDegree(deg);
  }, []);

  const signIdx = Math.floor(degree / 30);
  const signDeg = degree - signIdx * 30;
  const signName = SIGN_NAMES[Math.min(signIdx + 1, 12)];
  const signSymbol = SIGN_SYMBOLS[Math.min(signIdx + 1, 12)];

  // Find the interval this degree falls in
  const intervalInfo = useMemo(() => {
    for (const iv of data.intervals) {
      if (degree >= iv.b0.toNumber() && degree < iv.b1.toNumber()) {
        return iv;
      }
    }
    return null;
  }, [degree, data.intervals]);

  // Count categories
  const counts = useMemo(() => {
    if (!intervalInfo) return null;
    return {
      odd: intervalInfo.parRow.filter(v => v === 1).length,
      even: intervalInfo.parRow.filter(v => v === 0).length,
      cardinal: intervalInfo.modRow.filter(v => v === 1).length,
      fixed: intervalInfo.modRow.filter(v => v === 2).length,
      mutable: intervalInfo.modRow.filter(v => v === 0).length,
      fire: intervalInfo.eleRow.filter(v => v === 1).length,
      earth: intervalInfo.eleRow.filter(v => v === 2).length,
      air: intervalInfo.eleRow.filter(v => v === 3).length,
      water: intervalInfo.eleRow.filter(v => v === 0).length,
    };
  }, [intervalInfo]);

  // Compute varga shift count at the current degree
  // How many vargas change sign at the boundary where this interval starts
  const boundaryShiftCount = useMemo(() => {
    if (!intervalInfo) return { count: 0, isBoundary: false };
    const b0 = intervalInfo.b0.toNumber();
    // Is this degree exactly at a boundary point?
    const isAtBoundary = Math.abs(degree - b0) < 0.01;

    // Find the previous interval to compare sign rows
    const currentIdx = data.intervals.indexOf(intervalInfo);
    if (currentIdx <= 0) {
      // At the very first interval or not found
      return { count: 0, isBoundary: isAtBoundary };
    }

    const prevInterval = data.intervals[currentIdx - 1];
    let shiftCount = 0;
    for (let i = 0; i < intervalInfo.signRow.length; i++) {
      if (intervalInfo.signRow[i] !== prevInterval.signRow[i]) shiftCount++;
    }

    return { count: shiftCount, isBoundary: isAtBoundary };
  }, [intervalInfo, degree, data.intervals]);

  // Also compute shift count from animation tracking (for during playback)
  const computedShiftCount = useMemo(() => {
    if (!intervalInfo || !prevSignRow) return 0;
    let count = 0;
    for (let i = 0; i < intervalInfo.signRow.length; i++) {
      if (intervalInfo.signRow[i] !== prevSignRow[i]) count++;
    }
    return count;
  }, [intervalInfo, prevSignRow]);

  // Track previous signRow for animation shift count
  const prevIntervalSignRowRef = useRef<number[] | null>(null);
  useEffect(() => {
    if (intervalInfo) {
      prevIntervalSignRowRef.current = [...intervalInfo.signRow];
      setPrevSignRow(prevIntervalSignRowRef.current);
    }
  }, [intervalInfo]);

  const handleDegreeChange = useCallback((newDeg: number) => {
    if (isPlaying) handlePause();
    setDegree(newDeg);
  }, [isPlaying, handlePause]);

  // Compute sign persistence for each varga at current degree
  // Scans forward through intervals to find when each varga's sign changes
  const vargaPersistence = useMemo(() => {
    if (!intervalInfo) return [];
    const persistence: { remainingDeg: number; totalSpan: number; signStart: number; signEnd: number }[] = [];
    const currentIntervalIdx = data.intervals.indexOf(intervalInfo);

    for (let j = 0; j < N_VARGA; j++) {
      const currentSign = intervalInfo.signRow[j];

      // Scan forward to find next sign change for this varga
      let signEnd = intervalInfo.b1.toNumber();
      for (let k = currentIntervalIdx + 1; k < data.intervals.length; k++) {
        if (data.intervals[k].signRow[j] !== currentSign) break;
        signEnd = data.intervals[k].b1.toNumber();
      }

      // Scan backward to find start of current sign for this varga
      let signStart = intervalInfo.b0.toNumber();
      for (let k = currentIntervalIdx - 1; k >= 0; k--) {
        if (data.intervals[k].signRow[j] !== currentSign) break;
        signStart = data.intervals[k].b0.toNumber();
      }

      const remainingDeg = Math.max(0, signEnd - degree);
      const totalSpan = Math.max(0.01, signEnd - signStart);
      persistence.push({
        remainingDeg: Math.min(remainingDeg, 30),
        totalSpan: Math.min(totalSpan, 30),
        signStart,
        signEnd,
      });
    }
    return persistence;
  }, [intervalInfo, degree, data.intervals]);

  // Find which sign appears most across vargas
  const dominantSign = useMemo(() => {
    if (!intervalInfo) return null;
    const signCounts: Record<number, number> = {};
    for (const v of intervalInfo.signRow) {
      signCounts[v] = (signCounts[v] || 0) + 1;
    }
    let maxSign = 0, maxCount = 0;
    for (const [sign, count] of Object.entries(signCounts)) {
      if (count > maxCount) { maxSign = parseInt(sign); maxCount = count; }
    }
    return { sign: maxSign, count: maxCount };
  }, [intervalInfo]);

  const isBookmarked = bookmarks.some(b => Math.abs(b.degree - degree) < 0.01);

  return (
    <div className="space-y-5">
      {/* Top section: Zodiac Wheel + Degree Slider */}
      <div className="rounded-xl glass-card border border-[var(--v-border)] p-5 card-glow">
        <div className="flex flex-col lg:flex-row gap-5 items-start">
          {/* Zodiac wheel */}
          <div className="flex-shrink-0 mx-auto lg:mx-0">
            <NakshatraWheel degree={degree} size={240} />
          </div>

          {/* Right side: slider and info */}
          <div className="flex-1 min-w-0 w-full">
            {/* Degree display with animation indicator, share & bookmark buttons */}
            <div className="mb-4 flex items-start justify-between gap-2">
              <div>
                <div className="text-2xl font-bold flex items-center gap-2" style={{ color: SIGN_COLORS[signIdx] }}>
                  {signSymbol} {signName}
                  {/* Pulsing animation indicator */}
                  {isPlaying && (
                    <span className="inline-block w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: "var(--v-accent-purple)", boxShadow: "0 0 6px var(--v-accent-purple)" }} />
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <div className="text-sm font-mono text-shadow-data" style={{ color: "var(--v-accent-gold)" }}>
                    {signDeg.toFixed(2)}° within sign · {degree.toFixed(2)}° total
                  </div>
                  <input
                    type="number"
                    min={0}
                    max={359.99}
                    step={0.01}
                    value={parseFloat(degree.toFixed(2))}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val) && val >= 0 && val < 360) {
                        if (isPlaying) handlePause();
                        setDegree(val);
                      }
                    }}
                    className="w-[80px] px-2 py-0.5 rounded-md text-xs font-mono glass-card border border-[var(--v-border)] focus:outline-none focus:ring-1 focus:ring-[var(--v-accent-purple)]"
                    style={{
                      color: "var(--v-accent-gold)",
                      backgroundColor: "var(--v-card-bg)",
                    }}
                    title="Enter exact degree (0-359.99)"
                  />
                  {/* Varga Shift Counter - always visible */}
                  {intervalInfo && (
                    <span
                      className="px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold"
                      style={{
                        backgroundColor: boundaryShiftCount.isBoundary
                          ? boundaryShiftCount.count >= 4
                            ? "rgba(224, 82, 82, 0.2)"
                            : boundaryShiftCount.count >= 2
                            ? "rgba(240, 192, 96, 0.2)"
                            : "rgba(92, 224, 122, 0.15)"
                          : "rgba(74, 72, 96, 0.15)",
                        color: boundaryShiftCount.isBoundary
                          ? boundaryShiftCount.count >= 4
                            ? "#e05252"
                            : boundaryShiftCount.count >= 2
                            ? "var(--v-accent-gold)"
                            : "#5ce07a"
                          : "var(--v-text-muted)",
                        border: `1px solid ${boundaryShiftCount.isBoundary
                          ? boundaryShiftCount.count >= 4
                            ? "rgba(224, 82, 82, 0.4)"
                            : boundaryShiftCount.count >= 2
                            ? "rgba(240, 192, 96, 0.4)"
                            : "rgba(92, 224, 122, 0.3)"
                          : "var(--v-border)"}`,
                      }}
                      title={
                        boundaryShiftCount.isBoundary
                          ? `${boundaryShiftCount.count} varga${boundaryShiftCount.count !== 1 ? "s" : ""} shift at this boundary`
                          : "Interior point — no varga shifts"
                      }
                    >
                      {boundaryShiftCount.isBoundary
                        ? `${boundaryShiftCount.count} shift${boundaryShiftCount.count !== 1 ? "s" : ""}`
                        : "interior"}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <BookmarkManager
                  bookmarks={bookmarks}
                  currentDegree={degree}
                  onJump={handleJumpToBookmark}
                  onRemove={handleRemoveBookmark}
                  onClearAll={handleClearBookmarks}
                  onAdd={handleBookmark}
                  maxBookmarks={MAX_BOOKMARKS}
                />
                <button
                  onClick={handleShare}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors"
                  style={{
                    backgroundColor: copied ? "rgba(92, 224, 122, 0.15)" : "rgba(123, 95, 212, 0.15)",
                    color: copied ? "#5ce07a" : "var(--v-accent-purple)",
                    border: `1px solid ${copied ? "rgba(92, 224, 122, 0.3)" : "rgba(123, 95, 212, 0.3)"}`,
                  }}
                  title="Copy shareable link to this degree position"
                >
                  {copied ? (
                    <>
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 8l3.5 3.5L13 4" />
                      </svg>
                      Copied!
                    </>
                  ) : (
                    <>
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 8a3 3 0 0 1 3-3h4a3 3 0 0 1 0 6H7a3 3 0 0 1-3-3z" />
                        <path d="M12 8a3 3 0 0 1-3 3H5a3 3 0 0 1 0-6h4a3 3 0 0 1 3 3z" />
                      </svg>
                      Share
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Degree slider with animation controls */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span style={{ color: "var(--v-text-muted)" }} className="text-xs uppercase tracking-wider">Zodiac Position</span>
                {/* Speed selector */}
                <div className="flex items-center gap-1">
                  <span style={{ color: "var(--v-text-muted)" }} className="text-[9px] mr-1">Speed</span>
                  {SPEED_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setSpeed(opt.value)}
                      className="px-1.5 py-0.5 rounded text-[9px] font-mono font-medium transition-colors btn-micro"
                      style={{
                        backgroundColor: speed === opt.value
                          ? "rgba(155, 127, 232, 0.2)"
                          : "transparent",
                        color: speed === opt.value
                          ? "var(--v-accent-purple)"
                          : "var(--v-text-muted)",
                        border: `1px solid ${speed === opt.value
                          ? "rgba(155, 127, 232, 0.4)"
                          : "var(--v-border)"}`,
                      }}
                      title={`${opt.value}° per second`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              {/* Slider row: Step Prev | Slider | Play/Pause | Step Next */}
              <div className="flex items-center gap-2">
                {/* Step Prev button */}
                <button
                  onClick={handleStepPrev}
                  className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors btn-micro"
                  style={{
                    backgroundColor: "var(--v-card)",
                    border: "1px solid var(--v-border)",
                    color: "var(--v-text-muted)",
                  }}
                  title="Jump to previous boundary"
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 2L5 8l6 6" />
                  </svg>
                </button>

                {/* Slider */}
                <div className="flex-1">
                  <input
                    type="range"
                    min={0}
                    max={359.99}
                    step={0.01}
                    value={degree}
                    onChange={(e) => {
                      if (isPlaying) handlePause();
                      setDegree(parseFloat(e.target.value));
                    }}
                    className="w-full h-3 rounded-full appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, ${SIGN_COLORS.map((c, i) =>
                        `${c} ${(i / 12) * 100}%, ${c} ${((i + 1) / 12) * 100}%`
                      ).join(", ")})`,
                    }}
                  />
                </div>

                {/* Play/Pause button */}
                <button
                  onClick={handleTogglePlay}
                  className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-colors"
                  style={{
                    backgroundColor: isPlaying
                      ? "rgba(155, 127, 232, 0.25)"
                      : "rgba(155, 127, 232, 0.15)",
                    border: `1.5px solid ${isPlaying
                      ? "rgba(155, 127, 232, 0.6)"
                      : "rgba(155, 127, 232, 0.35)"}`,
                    color: "var(--v-accent-purple)",
                    boxShadow: isPlaying
                      ? "0 0 12px rgba(155, 127, 232, 0.3)"
                      : "none",
                  }}
                  title={isPlaying ? "Pause animation" : "Play animation (transit through degrees)"}
                >
                  {isPlaying ? (
                    /* Pause icon */
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                      <rect x="3" y="2" width="4" height="12" rx="1" />
                      <rect x="9" y="2" width="4" height="12" rx="1" />
                    </svg>
                  ) : (
                    /* Play icon */
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M4 2l10 6-10 6V2z" />
                    </svg>
                  )}
                </button>

                {/* Transit Mode toggle */}
                <button
                  onClick={() => setTransitMode(prev => !prev)}
                  className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                  style={{
                    backgroundColor: transitMode
                      ? "rgba(240, 192, 96, 0.25)"
                      : "rgba(155, 127, 232, 0.1)",
                    border: `1.5px solid ${transitMode
                      ? "rgba(240, 192, 96, 0.6)"
                      : "rgba(155, 127, 232, 0.25)"}`,
                    color: transitMode ? "var(--v-accent-gold)" : "var(--v-text-muted)",
                    boxShadow: transitMode
                      ? "0 0 10px rgba(240, 192, 96, 0.2)"
                      : "none",
                  }}
                  title={transitMode ? "Transit Mode ON: slows near boundaries" : "Transit Mode: vary speed near boundaries"}
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="8" cy="8" r="5" />
                    <path d="M8 3v2.5" />
                    <path d="M8 10.5V13" />
                    <path d="M3 8h2.5" />
                    <path d="M10.5 8H13" />
                  </svg>
                </button>

                {/* Varga shift counter badge */}
                {isPlaying && computedShiftCount > 0 && (
                  <span
                    className="flex-shrink-0 px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold"
                    style={{
                      backgroundColor: computedShiftCount >= 4
                        ? "rgba(224, 82, 82, 0.2)"
                        : computedShiftCount >= 2
                        ? "rgba(240, 192, 96, 0.2)"
                        : "rgba(92, 224, 122, 0.15)",
                      color: computedShiftCount >= 4
                        ? "#e05252"
                        : computedShiftCount >= 2
                        ? "var(--v-accent-gold)"
                        : "#5ce07a",
                      border: `1px solid ${computedShiftCount >= 4
                        ? "rgba(224, 82, 82, 0.4)"
                        : computedShiftCount >= 2
                        ? "rgba(240, 192, 96, 0.4)"
                        : "rgba(92, 224, 122, 0.3)"}`,
                    }}
                  >
                    {computedShiftCount} shifted
                  </span>
                )}

                {/* Step Next button */}
                <button
                  onClick={handleStepNext}
                  className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors btn-micro"
                  style={{
                    backgroundColor: "var(--v-card)",
                    border: "1px solid var(--v-border)",
                    color: "var(--v-text-muted)",
                  }}
                  title="Jump to next boundary"
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 2l6 6-6 6" />
                  </svg>
                </button>
              </div>
              <div className="flex justify-between mt-1">
                {SIGN_SYMBOLS.slice(1).map((sym, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      if (isPlaying) handlePause();
                      setDegree(i * 30 + 0.01);
                    }}
                    className="text-xs hover:scale-125 transition-transform"
                    style={{ color: i === signIdx ? SIGN_COLORS[i] : "var(--v-text-muted)" }}
                  >
                    {sym}
                  </button>
                ))}
              </div>
            </div>

            {/* Degree Presets Panel */}
            <DegreePresets
              onPresetSelect={(deg) => {
                if (isPlaying) handlePause();
                setDegree(deg);
              }}
              currentDegree={degree}
            />

            {/* Quick navigation: Sign / Nakshatra toggle + buttons */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <button
                  onClick={() => setShowNakshatraNav(false)}
                  className="px-2 py-1 rounded text-[10px] font-medium transition-colors"
                  style={{
                    backgroundColor: !showNakshatraNav ? "rgba(155, 127, 232, 0.2)" : "transparent",
                    color: !showNakshatraNav ? "var(--v-accent-purple)" : "var(--v-text-muted)",
                    border: `1px solid ${!showNakshatraNav ? "rgba(155, 127, 232, 0.4)" : "transparent"}`,
                  }}
                >
                  12 Signs
                </button>
                <button
                  onClick={() => setShowNakshatraNav(true)}
                  className="px-2 py-1 rounded text-[10px] font-medium transition-colors"
                  style={{
                    backgroundColor: showNakshatraNav ? "rgba(155, 127, 232, 0.2)" : "transparent",
                    color: showNakshatraNav ? "var(--v-accent-purple)" : "var(--v-text-muted)",
                    border: `1px solid ${showNakshatraNav ? "rgba(155, 127, 232, 0.4)" : "transparent"}`,
                  }}
                >
                  27 Nakshatras
                </button>
              </div>
              {!showNakshatraNav ? (
                /* 12 Sign quick-nav buttons */
                <div className="flex flex-wrap gap-1.5">
                  {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
                    <button
                      key={deg}
                      onClick={() => {
                        if (isPlaying) handlePause();
                        setDegree(deg + 0.01);
                      }}
                      className="px-2 py-1 rounded text-[10px] font-mono transition-colors"
                      style={{
                        backgroundColor: Math.floor(deg / 30) === signIdx
                          ? `${SIGN_COLORS[Math.floor(deg / 30)]}30`
                          : "var(--v-card)",
                        color: Math.floor(deg / 30) === signIdx
                          ? SIGN_COLORS[Math.floor(deg / 30)]
                          : "var(--v-text-muted)",
                        border: `1px solid ${Math.floor(deg / 30) === signIdx
                          ? `${SIGN_COLORS[Math.floor(deg / 30)]}50`
                          : "var(--v-border)"}`,
                      }}
                    >
                      {deg}°
                    </button>
                  ))}
                </div>
              ) : (
                /* 27 Nakshatra quick-nav buttons */
                <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto custom-scrollbar">
                  {NAKSHATRA_NAMES.map((name, i) => {
                    const nakDeg = i * NAKSHATRA_DEGREES;
                    const nakInfo = getNakshatraInfo(degree);
                    const isActive = i === nakInfo.index;
                    const hue = (i / 27) * 360;
                    return (
                      <button
                        key={i}
                        onClick={() => {
                          if (isPlaying) handlePause();
                          setDegree(nakDeg + 0.01);
                        }}
                        className="px-1.5 py-0.5 rounded text-[9px] font-mono transition-colors"
                        style={{
                          backgroundColor: isActive
                            ? `hsla(${hue}, 50%, 50%, 0.25)`
                            : "var(--v-card)",
                          color: isActive
                            ? `hsl(${hue}, 60%, 65%)`
                            : "var(--v-text-muted)",
                          border: `1px solid ${isActive
                            ? `hsla(${hue}, 50%, 50%, 0.4)`
                            : "var(--v-border)"}`,
                        }}
                        title={`${name} (${NAKSHATRA_LORDS[i]}) - ${nakDeg.toFixed(1)}°`}
                      >
                        {name.slice(0, 3)}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Nakshatra info badges */}
            {(() => {
              const nakInfo = getNakshatraInfo(degree);
              const hue = (nakInfo.index / 27) * 360;
              return (
                <div className="flex flex-wrap gap-2 mb-3">
                  <div
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium"
                    style={{
                      backgroundColor: `hsla(${hue}, 50%, 50%, 0.15)`,
                      color: `hsl(${hue}, 60%, 65%)`,
                      border: `1px solid hsla(${hue}, 50%, 50%, 0.3)`,
                    }}
                  >
                    <span style={{ color: "var(--v-text-muted)" }} className="text-[10px]">Nakshatra</span>
                    {nakInfo.name}
                  </div>
                  <div
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium"
                    style={{
                      backgroundColor: "rgba(155, 127, 232, 0.1)",
                      color: "var(--v-accent-purple)",
                      border: "1px solid rgba(155, 127, 232, 0.25)",
                    }}
                  >
                    <span style={{ color: "var(--v-text-muted)" }} className="text-[10px]">Lord</span>
                    {nakInfo.lord}
                  </div>
                  <div
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium"
                    style={{
                      backgroundColor: "rgba(240, 192, 96, 0.1)",
                      color: "var(--v-accent-gold)",
                      border: "1px solid rgba(240, 192, 96, 0.25)",
                    }}
                  >
                    <span style={{ color: "var(--v-text-muted)" }} className="text-[10px]">Pada</span>
                    {nakInfo.pada}
                  </div>
                </div>
              );
            })()}

            {/* Category summary counts */}
            {counts && (
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {[
                  { label: "Odd", count: counts.odd, color: "#e07a5c" },
                  { label: "Cardinal", count: counts.cardinal, color: "#e05c5c" },
                  { label: "Fixed", count: counts.fixed, color: "#5c8ee0" },
                  { label: "Fire", count: counts.fire, color: "#e0622a" },
                  { label: "Water", count: counts.water, color: "#6080e0" },
                ].map(({ label, count, color }) => (
                  <div key={label} className="rounded-lg p-2 text-center border" style={{ backgroundColor: "var(--v-card)", borderColor: "var(--v-border)" }}>
                    <div style={{ color: "var(--v-text-muted)" }} className="text-[10px]">{label}</div>
                    <div className="text-base font-bold" style={{ color }}>{count}</div>
                    <div style={{ color: "var(--v-text-muted)" }} className="text-[8px]">/ {N_VARGA}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Varga sign placements table */}
      {intervalInfo && (
        <div className="rounded-xl glass-card border border-[var(--v-border)] p-5 card-glow">
          <div className="flex items-center justify-between mb-3">
            <h3 style={{ color: "var(--v-text)" }} className="text-sm font-semibold">
              Varga Sign Placements at {degree.toFixed(2)}°
            </h3>
            {dominantSign && (
              <div style={{ color: "var(--v-text-muted)" }} className="text-xs">
                Dominant: <span style={{ color: SIGN_COLORS[dominantSign.sign - 1] }} className="font-medium">
                  {SIGN_SYMBOLS[dominantSign.sign]} {SIGN_NAMES[dominantSign.sign]}
                </span>
                <span style={{ color: "var(--v-text-muted)" }}> ({dominantSign.count}/{N_VARGA})</span>
              </div>
            )}
          </div>
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--v-border)" }}>
                  <th style={{ color: "var(--v-text-muted)" }} className="text-left py-1.5 px-2 font-medium">Varga</th>
                  <th style={{ color: "var(--v-text-muted)" }} className="text-left py-1.5 px-2 font-medium">Sign</th>
                  <th style={{ color: "var(--v-text-muted)" }} className="text-center py-1.5 px-2 font-medium">Parity</th>
                  <th style={{ color: "var(--v-text-muted)" }} className="text-center py-1.5 px-2 font-medium">Modality</th>
                  <th style={{ color: "var(--v-text-muted)" }} className="text-center py-1.5 px-2 font-medium">Element</th>
                  <th style={{ color: "var(--v-text-muted)" }} className="text-center py-1.5 px-2 font-medium">Deg</th>
                  <th style={{ color: "var(--v-text-muted)" }} className="text-center py-1.5 px-2 font-medium">Persistence</th>
                </tr>
              </thead>
              <tbody>
                {VARGA_NAMES.map((name, j) => {
                  const vsign = intervalInfo.signRow[j];
                  const vparity = intervalInfo.parRow[j];
                  const vmod = intervalInfo.modRow[j];
                  const vele = intervalInfo.eleRow[j];
                  const vdeg = (vsign - 1) * 30;
                  // Check if sign changed from previous value for flash animation
                  const signChanged = prevSignRow !== null && prevSignRow[j] !== vsign;
                  const signColor = SIGN_COLORS[vsign - 1];

                  return (
                    <motion.tr
                      key={name}
                      layoutId={`varga-row-${name}`}
                      className={`varga-table-row border-b cursor-pointer group`}
                      style={{
                        borderBottomColor: "var(--v-border)",
                        borderBottomWidth: "1px",
                        borderLeftColor: signColor,
                        borderLeftWidth: "3px",
                        borderLeftStyle: "solid",
                      }}
                      onClick={() => setModalVargaIdx(j)}
                      title={`Click to see ${name} detailed sign mapping across 360°`}
                    >
                      <td className="py-1.5 px-2 font-mono font-medium" style={{ color: "var(--v-accent-purple)" }}>{name}</td>
                      <td className={`py-1.5 px-2 ${signChanged ? "sign-cell-flash" : ""}`}>
                        <span className="flex items-center gap-1.5">
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: signColor }}
                          />
                          <span className="varga-sign-name" style={{ color: signColor, fontSize: "12px", transition: "font-size 0.2s ease" }}>
                            {SIGN_SYMBOLS[vsign]} {SIGN_NAMES[vsign]}
                          </span>
                        </span>
                      </td>
                      <td className="py-1.5 px-2 text-center">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] ${
                          vparity === 1 ? "bg-[#e07a5c]/15 text-[#e07a5c]" : "bg-[#5cb8e0]/15 text-[#5cb8e0]"
                        }`}>
                          {vparity === 1 ? "Odd" : "Even"}
                        </span>
                      </td>
                      <td className="py-1.5 px-2 text-center">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] ${
                          vmod === 1 ? "bg-[#e05c5c]/15 text-[#e05c5c]" :
                          vmod === 2 ? "bg-[#5c8ee0]/15 text-[#5c8ee0]" : "bg-[#5ce07a]/15 text-[#5ce07a]"
                        }`}>
                          {vmod === 1 ? "Card" : vmod === 2 ? "Fix" : "Mut"}
                        </span>
                      </td>
                      <td className="py-1.5 px-2 text-center">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] ${
                          vele === 1 ? "bg-[#e0622a]/15 text-[#e0622a]" :
                          vele === 2 ? "bg-[#8ec06c]/15 text-[#8ec06c]" :
                          vele === 3 ? "bg-[#a8d8ea]/15 text-[#a8d8ea]" : "bg-[#6080e0]/15 text-[#6080e0]"
                        }`}>
                          {vele === 1 ? "Fire" : vele === 2 ? "Earth" : vele === 3 ? "Air" : "Water"}
                        </span>
                      </td>
                      <td className="py-1.5 px-2 text-center font-mono text-[10px]" style={{ color: "var(--v-text-muted)" }}>
                        {vdeg}°
                      </td>
                      {/* Sign persistence indicator - shows degrees remaining before next sign change */}
                      <td className="py-1.5 px-2" style={{ minWidth: "110px" }}>
                        {vargaPersistence[j] && (() => {
                          const p = vargaPersistence[j];
                          const greenPct = Math.max(0, (p.remainingDeg / p.totalSpan) * 100);
                          const isStable = p.remainingDeg > 10;
                          const isLow = p.remainingDeg < 3;
                          return (
                            <div className="flex items-center gap-1.5">
                              <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--v-border)", opacity: 0.3 }}>
                                <div
                                  className="h-full rounded-full transition-all duration-300"
                                  style={{
                                    width: `${greenPct}%`,
                                    backgroundColor: isStable ? "#5ce07a" : isLow ? "#e05252" : "var(--v-accent-gold)",
                                    opacity: 0.85,
                                  }}
                                />
                              </div>
                              <span
                                className="text-[8px] font-mono flex-shrink-0"
                                style={{
                                  color: isStable ? "#5ce07a" : isLow ? "#e05252" : "var(--v-accent-gold)",
                                }}
                              >
                                {p.remainingDeg.toFixed(1)}° left
                              </span>
                            </div>
                          );
                        })()}
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Distribution bars */}
          {counts && (
            <div className="mt-4 space-y-2">
              <h4 style={{ color: "var(--v-text-muted)" }} className="text-xs uppercase tracking-wider">Distribution</h4>
              {[
                { label: "Parity", items: [{ name: "Odd", count: counts.odd, color: "#e07a5c" }, { name: "Even", count: counts.even, color: "#5cb8e0" }] },
                { label: "Modality", items: [{ name: "Card", count: counts.cardinal, color: "#e05c5c" }, { name: "Fix", count: counts.fixed, color: "#5c8ee0" }, { name: "Mut", count: counts.mutable, color: "#5ce07a" }] },
                { label: "Element", items: [{ name: "Fire", count: counts.fire, color: "#e0622a" }, { name: "Earth", count: counts.earth, color: "#8ec06c" }, { name: "Air", count: counts.air, color: "#a8d8ea" }, { name: "Water", count: counts.water, color: "#6080e0" }] },
              ].map((group) => (
                <div key={group.label} className="flex items-center gap-2">
                  <span style={{ color: "var(--v-text-muted)" }} className="text-[10px] w-14 flex-shrink-0">{group.label}</span>
                  <div className="flex-1 flex h-4 rounded overflow-hidden" style={{ backgroundColor: "var(--v-card)" }}>
                    {group.items.map((item) => (
                      <div
                        key={item.name}
                        style={{
                          width: `${(item.count / N_VARGA) * 100}%`,
                          backgroundColor: item.color,
                          minWidth: item.count > 0 ? "2px" : "0",
                        }}
                        className="transition-all duration-200 relative group"
                        title={`${item.name}: ${item.count}/${N_VARGA}`}
                      >
                        {item.count > 2 && (
                          <span className="absolute inset-0 flex items-center justify-center text-[8px] text-white/80 font-mono">
                            {item.count}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Varga Detail Modal */}
      {modalVargaIdx !== null && (
        <VargaDetailModal
          isOpen={modalVargaIdx !== null}
          onClose={() => setModalVargaIdx(null)}
          vargaIndex={modalVargaIdx}
          data={data}
        />
      )}
    </div>
  );
}
