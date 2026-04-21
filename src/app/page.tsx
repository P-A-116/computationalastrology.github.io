"use client";

import React, { Suspense, useEffect } from "react";
import dynamic from "next/dynamic";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";

const VargaVisualizer = dynamic(
  () => import("@/components/varga/VargaVisualizer"),
  { ssr: false }
);

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => { setMounted(true); }, []);

  if (!mounted) {
    return (
      <button
        className="w-9 h-9 rounded-lg border border-[#4a4860]/30 bg-[#16161f] flex items-center justify-center transition-colors"
        aria-label="Toggle theme"
      >
        <Sun className="w-4 h-4 text-[#4a4860]" />
      </button>
    );
  }

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="w-9 h-9 rounded-lg border flex items-center justify-center transition-all duration-300 hover:scale-105 btn-micro"
      style={{
        borderColor: theme === "dark" ? "rgba(74,72,96,0.3)" : "#e0dbd4",
        backgroundColor: theme === "dark" ? "#16161f" : "#ffffff",
        color: theme === "dark" ? "#9b7fe8" : "#7b5fd4",
      }}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      {theme === "dark" ? (
        <Sun className="w-4 h-4 text-[#f0c060]" />
      ) : (
        <Moon className="w-4 h-4 text-[#7b5fd4]" />
      )}
    </button>
  );
}

function LoadingState() {
  return (
    <div className="space-y-4 py-6">
      {/* Header skeleton */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg skeleton-shimmer" />
        <div className="flex-1 space-y-2">
          <div className="h-5 w-48 skeleton-shimmer" />
          <div className="h-3 w-64 skeleton-shimmer" />
        </div>
      </div>

      {/* Intro card skeleton */}
      <div className="rounded-xl glass-card border border-[var(--v-border)] p-5 space-y-3">
        <div className="h-4 w-72 skeleton-shimmer" />
        <div className="h-3 w-full skeleton-shimmer" />
        <div className="h-3 w-5/6 skeleton-shimmer" />
        <div className="flex gap-4 pt-2">
          <div className="h-3 w-20 skeleton-shimmer" />
          <div className="h-3 w-20 skeleton-shimmer" />
          <div className="h-3 w-24 skeleton-shimmer" />
        </div>
      </div>

      {/* Tab bar skeleton */}
      <div className="flex gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-8 rounded-lg skeleton-shimmer"
            style={{ width: `${60 + (i % 3) * 20}px`, animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>

      {/* Main content skeleton */}
      <div className="rounded-xl glass-card border border-[var(--v-border)] p-5 space-y-4">
        <div className="flex flex-col lg:flex-row gap-5">
          {/* Wheel skeleton */}
          <div className="w-60 h-60 rounded-full skeleton-shimmer mx-auto" />
          {/* Right side skeleton */}
          <div className="flex-1 space-y-3">
            <div className="h-6 w-32 skeleton-shimmer" />
            <div className="h-4 w-48 skeleton-shimmer" />
            <div className="h-3 w-full skeleton-shimmer" />
            <div className="grid grid-cols-5 gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-14 skeleton-shimmer" style={{ animationDelay: `${i * 100}ms` }} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Centered spinner overlay */}
      <div className="flex flex-col items-center justify-center py-8 gap-3">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-2 border-[var(--v-border)] border-t-[var(--v-accent-purple)] animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-base">🔮</span>
          </div>
        </div>
        <div className="text-center">
          <p style={{ color: "var(--v-text)" }} className="font-medium text-sm">Computing Varga Analysis...</p>
          <p style={{ color: "var(--v-text-muted)" }} className="text-xs mt-1">
            Calculating 1,801 exact boundaries and interval mappings
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const { theme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // Remove no-transition class after mount to enable smooth theme transitions
  useEffect(() => {
    const timeout = setTimeout(() => {
      document.documentElement.classList.remove("no-transition");
      setMounted(true);
    }, 100);
    return () => clearTimeout(timeout);
  }, []);

  // Use CSS variables for theme-dependent styles to avoid hydration mismatch
  // isDark is only used after mount
  const isDark = mounted ? theme === "dark" : true; // default to dark to match initial SSR render

  return (
    <div
      className="min-h-screen flex flex-col animated-bg"
      style={{ color: "var(--v-text)" }}
    >
      {/* Header */}
      <header
        className="backdrop-blur-sm sticky top-0 z-50"
        style={{ backgroundColor: "var(--v-header-bg)" }}
      >
        <div className="header-stars max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center text-lg font-bold shadow-[0_0_12px_rgba(155,127,232,0.3)]"
              style={{
                background: `linear-gradient(135deg, var(--v-accent-purple), var(--v-accent-gold))`,
                color: isDark ? "#0e0e14" : "#ffffff",
              }}
            >
              V
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-gradient-purple-gold">
                Varga Sign Analysis
              </h1>
              <p style={{ color: "var(--v-text-muted)" }} className="text-xs">
                Exact boundary computation across 16 divisional charts
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Badge
              variant="outline"
              className="text-xs"
              style={{
                borderColor: isDark ? "rgba(155,127,232,0.3)" : "rgba(123,95,212,0.3)",
                color: "var(--v-accent-purple)",
                backgroundColor: isDark ? "rgba(155,127,232,0.05)" : "rgba(123,95,212,0.05)",
              }}
            >
              Jyotish
            </Badge>
            <Badge
              variant="outline"
              className="text-xs"
              style={{
                borderColor: isDark ? "rgba(240,192,96,0.3)" : "rgba(212,168,64,0.3)",
                color: "var(--v-accent-gold)",
                backgroundColor: isDark ? "rgba(240,192,96,0.05)" : "rgba(212,168,64,0.05)",
              }}
            >
              16 Vargas
            </Badge>
          </div>
        </div>
        {/* Animated gradient line below header */}
        <div className="header-gradient-line" />
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        {/* Intro section */}
        <div className="mb-8 p-5 rounded-xl glass-card gradient-border-hover card-glow">
          <div className="flex flex-col md:flex-row md:items-start gap-4">
            <div className="flex-1">
              <h2
                className="text-base font-semibold mb-2 section-header-spacing text-shadow-purple"
                style={{ color: "var(--v-text)" }}
              >
                Modality Visualizations — Exact Computation
              </h2>
              <p style={{ color: "var(--v-text)", opacity: 0.7 }} className="text-sm leading-relaxed">
                This tool computes the exact sign placement for each of the 16 Vargas (D1–D60)
                at every analytically-determined boundary point across the full 360° zodiac.
                For each interval between boundaries, the parity (odd/even), modality
                (cardinal/fixed/mutable), element (fire/earth/air/water), and specific sign
                are evaluated for all vargas simultaneously, revealing precise peak and trough
                regions where qualities concentrate or disperse.
              </p>
            </div>
            <div className="flex flex-col gap-1.5 min-w-[180px]">
              <div style={{ color: "var(--v-text-muted)" }} className="text-xs uppercase tracking-wider mb-1">Coverage</div>
              <div className="flex items-center gap-2">
                <span style={{ color: "var(--v-text)", opacity: 0.6 }} className="text-xs">Signs:</span>
                <span className="text-xs font-mono text-shadow-data" style={{ color: "var(--v-accent-gold)" }}>12</span>
              </div>
              <div className="flex items-center gap-2">
                <span style={{ color: "var(--v-text)", opacity: 0.6 }} className="text-xs">Vargas:</span>
                <span className="text-xs font-mono text-shadow-purple" style={{ color: "var(--v-accent-purple)" }}>16</span>
              </div>
              <div className="flex items-center gap-2">
                <span style={{ color: "var(--v-text)", opacity: 0.6 }} className="text-xs">Boundaries:</span>
                <span className="text-xs font-mono text-shadow-data" style={{ color: "var(--v-accent-gold)" }}>1,801</span>
              </div>
              <div className="flex items-center gap-2">
                <span style={{ color: "var(--v-text)", opacity: 0.6 }} className="text-xs">Intervals:</span>
                <span className="text-xs font-mono text-shadow-data" style={{ color: "var(--v-accent-gold)" }}>1,800</span>
              </div>
            </div>
          </div>
        </div>

        {/* Visualizations */}
        <Suspense fallback={<LoadingState />}>
          <VargaVisualizer />
        </Suspense>
      </main>

      {/* Footer */}
      <footer className="mt-auto">
        {/* Animated gradient line above footer (matching header) */}
        <div className="footer-gradient-line" />
        {/* Gradient fade from content into footer */}
        <div
          className="h-8"
          style={{
            background: `linear-gradient(to bottom, transparent, ${isDark ? "rgba(14, 14, 20, 0.7)" : "rgba(245, 243, 239, 0.7)"})`,
          }}
        />
        <div
          className="footer-glass-card"
          style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}
        >
          <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col items-center gap-3">
            {/* Zodiac symbol wheel decoration with hover rotation */}
            <div
              className="footer-zodiac-wheel flex items-center gap-2 transition-transform duration-1000 ease-in-out hover:rotate-[180deg]"
              style={{ cursor: "default" }}
            >
              {["♈","♉","♊","♋","♌","♍","♎","♏","♐","♑","♒","♓"].map((sym, i) => (
                <span
                  key={i}
                  className="text-[11px] opacity-40 footer-zodiac-symbol"
                  style={{
                    color: ["#e05050","#b08040","#60c8c0","#4870e0","#e0a020","#80c040","#c060c0","#3840b0","#e07040","#607880","#40b8c8","#6060c0"][i],
                    animationDelay: `${i * 0.2}s`,
                  }}
                >
                  {sym}
                </span>
              ))}
            </div>
            {/* Decorative star element */}
            <div
              className="flex items-center gap-3"
              style={{ color: "var(--v-accent-purple)", opacity: 0.25 }}
            >
              <span className="text-[6px]">✦</span>
              <span className="text-[8px]">✧</span>
              <span className="text-[6px]">✦</span>
            </div>
            {/* Main footer content */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 w-full">
              <p style={{ color: "var(--v-text-muted)" }} className="text-xs">
                Varga Sign Analysis — Exact boundary computation using fractional arithmetic
              </p>
              <div className="flex items-center gap-3 text-xs" style={{ color: "var(--v-text-muted)" }}>
                <span>Built with Next.js • TypeScript • Canvas API • Framer Motion</span>
              </div>
            </div>
            {/* Version number */}
            <span
              className="text-[9px] font-mono opacity-30"
              style={{ color: "var(--v-text-muted)" }}
            >
              v2.0
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
