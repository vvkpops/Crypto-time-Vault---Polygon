import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, CheckIcon } from "./Icons";

const SORT_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h12M3 12h8M3 18h4M16 14l4 4 4-4M20 6v12" />
  </svg>
);

export const SORT_OPTIONS = [
  { key: "newest",   label: "Newest first" },
  { key: "oldest",   label: "Oldest first" },
  { key: "ready",    label: "Ready first" },
  { key: "soonest",  label: "Unlocking soonest" },
  { key: "latest",   label: "Unlocking latest" },
  { key: "amount",   label: "Largest amount" },
  { key: "status",   label: "Group by status" },
];

export default function SortMenu({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const current = SORT_OPTIONS.find((o) => o.key === value) || SORT_OPTIONS[0];

  return (
    <div className="sort-menu" ref={wrapRef}>
      <button
        type="button"
        className="sort-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {SORT_ICON}
        <span className="sort-trigger-label">{current.label}</span>
        <motion.span
          style={{ display: "inline-flex" }}
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: .2 }}
        >
          <ChevronDown size={14} />
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            className="sort-popover"
            role="listbox"
            initial={{ opacity: 0, y: -6, scale: .98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: .98 }}
            transition={{ duration: .15, ease: [0.22, 1, 0.36, 1] }}
          >
            {SORT_OPTIONS.map((opt) => (
              <li key={opt.key}>
                <button
                  type="button"
                  className={`sort-option ${opt.key === value ? "active" : ""}`}
                  role="option"
                  aria-selected={opt.key === value}
                  onClick={() => { onChange?.(opt.key); setOpen(false); }}
                >
                  <span>{opt.label}</span>
                  {opt.key === value && <CheckIcon size={14} />}
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Sort a list of lock objects by the given key.
 * Lock fields: { id, token, amount, unlocksAt, createdAt, label, withdrawn, _index }
 */
export function sortLocks(locks, key) {
  const now = Math.floor(Date.now() / 1000);
  const arr = [...locks];

  const statusRank = (l) => {
    if (l.withdrawn) return 2;             // last
    if (Number(l.unlocksAt) <= now) return 0; // ready (first)
    return 1;                              // locked
  };

  switch (key) {
    case "oldest":
      return arr.sort((a, b) => Number(a.createdAt || 0) - Number(b.createdAt || 0));
    case "newest":
      return arr.sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
    case "ready":
      return arr.sort((a, b) => {
        const ar = a.withdrawn ? 2 : (Number(a.unlocksAt) <= now ? 0 : 1);
        const br = b.withdrawn ? 2 : (Number(b.unlocksAt) <= now ? 0 : 1);
        if (ar !== br) return ar - br;
        return Number(b.createdAt || 0) - Number(a.createdAt || 0);
      });
    case "soonest":
      return arr.sort((a, b) => {
        if (a.withdrawn !== b.withdrawn) return a.withdrawn ? 1 : -1;
        return Number(a.unlocksAt) - Number(b.unlocksAt);
      });
    case "latest":
      return arr.sort((a, b) => {
        if (a.withdrawn !== b.withdrawn) return a.withdrawn ? 1 : -1;
        return Number(b.unlocksAt) - Number(a.unlocksAt);
      });
    case "amount":
      return arr.sort((a, b) => {
        // Compare BigInt amounts directly (note: this doesn't normalize by decimals/token)
        const aa = BigInt(a.amount?.toString() || "0");
        const bb = BigInt(b.amount?.toString() || "0");
        if (bb > aa) return 1;
        if (bb < aa) return -1;
        return 0;
      });
    case "status":
      return arr.sort((a, b) => {
        const ar = statusRank(a);
        const br = statusRank(b);
        if (ar !== br) return ar - br;
        return Number(b.createdAt || 0) - Number(a.createdAt || 0);
      });
    default:
      return arr;
  }
}
