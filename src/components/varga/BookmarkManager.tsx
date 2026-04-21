"use client";

import React, { useCallback } from "react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { SIGN_NAMES, SIGN_SYMBOLS, SIGN_COLORS } from "@/lib/varga-engine";

interface Bookmark {
  degree: number;
  label: string;
  timestamp: number;
}

interface BookmarkManagerProps {
  bookmarks: Bookmark[];
  currentDegree: number;
  onJump: (degree: number) => void;
  onRemove: (timestamp: number) => void;
  onClearAll: () => void;
  onAdd: () => void;
  maxBookmarks: number;
}

function relativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

export default function BookmarkManager({
  bookmarks,
  currentDegree,
  onJump,
  onRemove,
  onClearAll,
  onAdd,
  maxBookmarks,
}: BookmarkManagerProps) {
  const isBookmarked = bookmarks.some(b => Math.abs(b.degree - currentDegree) < 0.01);

  const handleJump = useCallback((deg: number) => {
    onJump(deg);
  }, [onJump]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors relative"
          style={{
            backgroundColor: isBookmarked
              ? "rgba(212, 168, 64, 0.15)"
              : "rgba(123, 95, 212, 0.15)",
            color: isBookmarked
              ? "var(--v-accent-gold)"
              : "var(--v-accent-purple)",
            border: `1px solid ${isBookmarked
              ? "rgba(212, 168, 64, 0.3)"
              : "rgba(123, 95, 212, 0.3)"}`,
          }}
          title={isBookmarked ? "View bookmarks" : "Bookmark this degree position"}
        >
          {isBookmarked ? (
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 1l2.246 4.544L15 6.269l-3.5 3.408L12.492 15 8 12.434 3.508 15l.992-5.323L1 6.269l4.754-.725L8 1z" />
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 1l2.246 4.544L15 6.269l-3.5 3.408L12.492 15 8 12.434 3.508 15l.992-5.323L1 6.269l4.754-.725L8 1z" />
            </svg>
          )}
          <span className="hidden sm:inline">{bookmarks.length > 0 ? `Bookmarks` : "Bookmark"}</span>
          {/* Badge count */}
          {bookmarks.length > 0 && (
            <span
              className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 rounded-full flex items-center justify-center text-[9px] font-bold px-1"
              style={{
                backgroundColor: "var(--v-accent-purple)",
                color: "var(--v-bg)",
                boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
              }}
            >
              {bookmarks.length}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-80 p-0 rounded-xl overflow-hidden"
        style={{
          backgroundColor: "var(--v-card)",
          borderColor: "var(--v-border)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
        }}
      >
        {/* Header */}
        <div
          className="px-4 py-3 flex items-center justify-between"
          style={{
            borderBottom: "1px solid var(--v-border)",
            background: "linear-gradient(135deg, rgba(155,127,232,0.1), rgba(240,192,96,0.05))",
          }}
        >
          <div className="flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="var(--v-accent-gold)">
              <path d="M8 1l2.246 4.544L15 6.269l-3.5 3.408L12.492 15 8 12.434 3.508 15l.992-5.323L1 6.269l4.754-.725L8 1z" />
            </svg>
            <span style={{ color: "var(--v-text)" }} className="text-sm font-semibold">
              Bookmarks
            </span>
            <span style={{ color: "var(--v-text-muted)" }} className="text-[10px]">
              {bookmarks.length}/{maxBookmarks}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {!isBookmarked && (
              <button
                onClick={onAdd}
                className="px-2 py-0.5 rounded text-[10px] font-medium transition-colors"
                style={{
                  color: "var(--v-accent-purple)",
                  backgroundColor: "rgba(155, 127, 232, 0.1)",
                  border: "1px solid rgba(155, 127, 232, 0.3)",
                }}
                title="Bookmark current position"
              >
                + Add Current
              </button>
            )}
            {bookmarks.length > 0 && (
              <button
                onClick={onClearAll}
                className="px-2 py-0.5 rounded text-[10px] font-medium transition-colors"
                style={{
                  color: "#e05252",
                  backgroundColor: "rgba(224, 82, 82, 0.1)",
                  border: "1px solid rgba(224, 82, 82, 0.2)",
                }}
                title="Clear all bookmarks"
              >
                Clear All
              </button>
            )}
          </div>
        </div>

        {/* Bookmark list */}
        {bookmarks.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <svg width="24" height="24" viewBox="0 0 16 16" fill="none" stroke="var(--v-text-muted)" strokeWidth="1" className="mx-auto mb-2 opacity-30">
              <path d="M8 1l2.246 4.544L15 6.269l-3.5 3.408L12.492 15 8 12.434 3.508 15l.992-5.323L1 6.269l4.754-.725L8 1z" />
            </svg>
            <p style={{ color: "var(--v-text-muted)" }} className="text-xs">
              No bookmarks yet
            </p>
            <p style={{ color: "var(--v-text-muted)" }} className="text-[10px] mt-1 opacity-60">
              Click the bookmark button to save degree positions
            </p>
          </div>
        ) : (
          <div className="max-h-72 overflow-y-auto custom-scrollbar">
            {bookmarks.map((bm) => {
              const bmSignIdx = Math.floor(bm.degree / 30);
              const bmSymbol = SIGN_SYMBOLS[Math.min(bmSignIdx + 1, 12)];
              const bmSignName = SIGN_NAMES[Math.min(bmSignIdx + 1, 12)];
              const isActive = Math.abs(bm.degree - currentDegree) < 0.01;
              return (
                <div
                  key={bm.timestamp}
                  className="group flex items-center gap-3 px-4 py-2.5 transition-colors cursor-pointer"
                  style={{
                    backgroundColor: isActive ? `${SIGN_COLORS[bmSignIdx]}10` : "transparent",
                    borderBottom: "1px solid var(--v-border)",
                  }}
                  onClick={() => handleJump(bm.degree)}
                  title={`Jump to ${bm.label}`}
                >
                  {/* Sign symbol */}
                  <span
                    className="text-base flex-shrink-0"
                    style={{ color: SIGN_COLORS[bmSignIdx] }}
                  >
                    {bmSymbol}
                  </span>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="text-xs font-medium truncate"
                        style={{ color: SIGN_COLORS[bmSignIdx] }}
                      >
                        {bmSignName}
                      </span>
                      <span
                        className="text-xs font-mono"
                        style={{ color: "var(--v-accent-gold)" }}
                      >
                        {bm.degree.toFixed(2)}°
                      </span>
                      {isActive && (
                        <span
                          className="px-1 py-0 rounded text-[8px] font-bold uppercase tracking-wider"
                          style={{
                            color: "var(--v-accent-purple)",
                            backgroundColor: "rgba(155, 127, 232, 0.15)",
                          }}
                        >
                          Current
                        </span>
                      )}
                    </div>
                    <div
                      className="text-[9px] mt-0.5"
                      style={{ color: "var(--v-text-muted)" }}
                    >
                      {relativeTime(bm.timestamp)}
                    </div>
                  </div>
                  {/* Delete button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(bm.timestamp);
                    }}
                    className="opacity-0 group-hover:opacity-100 flex-shrink-0 w-6 h-6 rounded flex items-center justify-center transition-opacity"
                    style={{
                      color: "#e05252",
                      backgroundColor: "rgba(224, 82, 82, 0.08)",
                    }}
                    title="Remove bookmark"
                  >
                    <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M4 4l8 8M12 4l-8 8" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        {bookmarks.length > 0 && (
          <div
            className="px-4 py-2 text-center"
            style={{ borderTop: "1px solid var(--v-border)" }}
          >
            <span style={{ color: "var(--v-text-muted)" }} className="text-[9px]">
              Click a bookmark to jump to that position
            </span>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
