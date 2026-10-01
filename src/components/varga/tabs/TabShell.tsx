"use client";

import type { ReactNode } from "react";
import { motion, type Transition, type Variants } from "framer-motion";

// Framer-motion variants shared by every tab.
export const tabContentVariants: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

export const tabContentTransition: Transition = {
  type: "tween",
  ease: "easeInOut",
  duration: 0.25,
};

// Staggered fade-in for sub-elements within tab content.
export const staggerContainerVariants: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.05,
    },
  },
};

export const staggerItemVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      type: "tween",
      ease: "easeOut",
      duration: 0.2,
    },
  },
};

interface TabSectionProps {
  /** Heading content, usually an emoji plus a label (and optionally a tab dot). */
  title: ReactNode;
  subtitle?: ReactNode;
  /** Rendered opposite the heading, e.g. the summary tab's export buttons. */
  headerExtra?: ReactNode;
  children: ReactNode;
}

/**
 * The outer chrome every tab shares: staggered container, gradient header with
 * an optional subtitle, then the tab body.
 */
export function TabSection({ title, subtitle, headerExtra, children }: TabSectionProps) {
  const headerClass = headerExtra
    ? "gradient-header rounded-t-xl -mt-5 -mx-5 mb-4 flex items-center justify-between flex-wrap gap-2"
    : "gradient-header rounded-t-xl -mt-5 -mx-5 mb-4";

  return (
    <section>
      <motion.div variants={staggerContainerVariants} initial="initial" animate="animate">
        <motion.div variants={staggerItemVariants} className={headerClass}>
          <div>
            <h2 style={{ color: "var(--v-text)" }} className="text-lg font-bold flex items-center gap-2 section-header-spacing">
              {title}
            </h2>
            {subtitle && (
              <p style={{ color: "var(--v-text-muted)" }} className="text-sm mt-1">
                {subtitle}
              </p>
            )}
          </div>
          {headerExtra}
        </motion.div>
        {children}
      </motion.div>
    </section>
  );
}

/** A stagger-animated block inside a `TabSection`. */
export function TabBlock({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div variants={staggerItemVariants} className={className}>
      {children}
    </motion.div>
  );
}
