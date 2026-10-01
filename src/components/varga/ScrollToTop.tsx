"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 400);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 10 }}
          transition={{ duration: 0.2 }}
          onClick={scrollToTop}
          className="fixed bottom-20 right-4 z-50 w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-colors"
          style={{
            backgroundColor: "var(--v-accent-purple)",
            color: "var(--v-bg)",
            boxShadow: "0 4px 14px 0 rgba(155, 127, 232, 0.2)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "var(--v-accent-gold)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "var(--v-accent-purple)";
          }}
          aria-label="Scroll to top"
          title="Scroll to top"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M8 12V4M4 8l4-4 4 4" />
          </svg>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
