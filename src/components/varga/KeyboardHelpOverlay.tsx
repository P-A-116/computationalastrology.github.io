"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";

interface KeyboardHelpOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab?: string;
}

// Shortcut categories with colored left borders
const SHORTCUT_CATEGORIES = [
  {
    title: "Tab Navigation",
    borderColor: "#9b7fe8",
    shortcuts: [
      { keys: ["1", "–", "9"], description: "Switch between tabs 1-9", tabIds: ["inspector","comparison","rulers","analysis","parity","modality","element","combo","signs"] },
      { keys: ["Shift+1", "Shift+2"], description: "Switch to tabs 10-11 (Summary, Reference)", tabIds: ["summary","reference"] },
    ],
  },
  {
    title: "Degree Control",
    borderColor: "#f0c060",
    shortcuts: [
      { keys: ["←", "→"], description: "Adjust degree (Inspector tab)", tabIds: ["inspector"] },
      { keys: ["↑", "↓"], description: "Adjust degree by 10° (Inspector tab)", tabIds: ["inspector"] },
    ],
  },
  {
    title: "General",
    borderColor: "#5ce07a",
    shortcuts: [
      { keys: ["?"], description: "Show this keyboard shortcut help", tabIds: undefined },
      { keys: ["Esc"], description: "Close modal / overlay", tabIds: undefined },
    ],
  },
];

export default function KeyboardHelpOverlay({
  isOpen,
  onClose,
  activeTab,
}: KeyboardHelpOverlayProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          onClick={onClose}
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="relative z-10 w-full max-w-md glass-card rounded-xl shadow-2xl overflow-hidden"
            style={{ border: "1px solid var(--v-border)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="gradient-header flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base">⌨️</span>
                <h3 className="text-sm font-bold" style={{ color: "var(--v-text)" }}>
                  Keyboard Shortcuts
                </h3>
              </div>
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[var(--v-hover-bg)] transition-colors text-sm"
                style={{ color: "var(--v-text-muted)" }}
              >
                ✕
              </button>
            </div>

            {/* Shortcuts by category */}
            <div className="p-5 space-y-4">
              {SHORTCUT_CATEGORIES.map((category) => (
                <div key={category.title}>
                  {/* Category header with colored left border */}
                  <div
                    className="flex items-center gap-2 mb-2 pl-3"
                    style={{ borderLeft: `3px solid ${category.borderColor}` }}
                  >
                    <h4 className="text-xs font-semibold uppercase tracking-wider" style={{ color: category.borderColor }}>
                      {category.title}
                    </h4>
                  </div>
                  {/* Shortcuts in this category */}
                  <div className="space-y-2.5 pl-3">
                    {category.shortcuts.map((shortcut) => {
                      const isActive = shortcut.tabIds && activeTab && shortcut.tabIds.includes(activeTab);
                      return (
                        <div
                          key={shortcut.description}
                          className="flex items-center justify-between gap-4"
                        >
                          <span
                            className="text-sm"
                            style={{
                              color: isActive ? category.borderColor : "var(--v-text)",
                              opacity: isActive ? 1 : 0.7,
                              fontWeight: isActive ? 600 : 400,
                            }}
                          >
                            {shortcut.description}
                            {isActive && (
                              <span className="ml-1.5 text-[9px] font-normal px-1.5 py-0.5 rounded" style={{ backgroundColor: `${category.borderColor}20`, color: category.borderColor }}>
                                active
                              </span>
                            )}
                          </span>
                          <div className="flex items-center gap-1">
                            {shortcut.keys.map((key, i) => (
                              <React.Fragment key={i}>
                                <kbd
                                  className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-md text-xs font-mono shadow-sm"
                                  style={{
                                    backgroundColor: isActive ? `${category.borderColor}10` : "var(--v-bg)",
                                    border: `1px solid ${isActive ? category.borderColor : "var(--v-border)"}`,
                                    color: isActive ? category.borderColor : "var(--v-accent-purple)",
                                  }}
                                >
                                  {key}
                                </kbd>
                              </React.Fragment>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Footer hint */}
              <div className="mt-4 pt-3" style={{ borderTop: "1px solid var(--v-border)" }}>
                <p className="text-[10px] text-center" style={{ color: "var(--v-text-muted)" }}>
                  Press <kbd className="px-1 py-0.5 rounded text-[9px] font-mono" style={{ backgroundColor: "var(--v-bg)", border: "1px solid var(--v-border)", color: "var(--v-accent-purple)" }}>?</kbd> or <kbd className="px-1 py-0.5 rounded text-[9px] font-mono" style={{ backgroundColor: "var(--v-bg)", border: "1px solid var(--v-border)", color: "var(--v-accent-purple)" }}>Esc</kbd> to close
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
