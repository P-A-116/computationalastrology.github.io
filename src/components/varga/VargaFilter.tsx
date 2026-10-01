"use client";

import { VARGA_NAMES } from "@/lib/varga-engine";

interface VargaFilterProps {
  activeVargas: Set<number>; // indices of active vargas (0-15)
  onToggle: (index: number) => void;
  onSelectAll: () => void;
  onSelectNone: () => void;
}

export default function VargaFilter({
  activeVargas,
  onToggle,
  onSelectAll,
  onSelectNone,
}: VargaFilterProps) {
  const allActive = activeVargas.size === VARGA_NAMES.length;
  const noneActive = activeVargas.size === 0;

  return (
    <div
      className="rounded-lg glass-card p-3 mb-3"
      style={{ border: "1px solid var(--v-border)" }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span
          style={{ color: "var(--v-text-muted)" }}
          className="text-[10px] uppercase tracking-wider font-medium"
        >
          Varga Filter
        </span>
        <div className="flex items-center gap-1 ml-auto">
          <button
            onClick={onSelectAll}
            className="px-2 py-0.5 rounded text-[9px] font-medium transition-colors btn-micro"
            style={{
              backgroundColor: allActive
                ? "rgba(155, 127, 232, 0.2)"
                : "transparent",
              color: allActive
                ? "var(--v-accent-purple)"
                : "var(--v-text-muted)",
              border: `1px solid ${
                allActive
                  ? "rgba(155, 127, 232, 0.4)"
                  : "var(--v-border)"
              }`,
            }}
            title="Show all vargas"
          >
            All
          </button>
          <button
            onClick={onSelectNone}
            className="px-2 py-0.5 rounded text-[9px] font-medium transition-colors btn-micro"
            style={{
              backgroundColor: noneActive
                ? "rgba(155, 127, 232, 0.2)"
                : "transparent",
              color: noneActive
                ? "var(--v-accent-purple)"
                : "var(--v-text-muted)",
              border: `1px solid ${
                noneActive
                  ? "rgba(155, 127, 232, 0.4)"
                  : "var(--v-border)"
              }`,
            }}
            title="Hide all vargas"
          >
            None
          </button>
          <span
            style={{ color: "var(--v-text-muted)" }}
            className="text-[9px] ml-1 font-mono"
          >
            {activeVargas.size}/{VARGA_NAMES.length}
          </span>
        </div>
      </div>
      <div className="flex flex-wrap gap-1">
        {VARGA_NAMES.map((name, idx) => {
          const isActive = activeVargas.has(idx);
          return (
            <button
              key={name}
              onClick={() => onToggle(idx)}
              className="px-2 py-1 rounded text-[10px] font-mono font-medium transition-all duration-150 btn-micro"
              style={{
                backgroundColor: isActive
                  ? "rgba(155, 127, 232, 0.25)"
                  : "transparent",
                color: isActive
                  ? "var(--v-accent-purple)"
                  : "var(--v-text-muted)",
                border: `1px solid ${
                  isActive
                    ? "rgba(155, 127, 232, 0.5)"
                    : "var(--v-border)"
                }`,
                opacity: isActive ? 1 : 0.5,
              }}
              title={isActive ? `Hide ${name}` : `Show ${name}`}
            >
              {name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
