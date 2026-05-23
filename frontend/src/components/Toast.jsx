import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckIcon, WarningIcon, InfoIcon } from "./Icons";

let _addToast = null;

export function toast(message, type = "info") {
  _addToast?.(message, type);
}

const toastVariants = {
  initial: { opacity: 0, y: 30, scale: .9 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 500, damping: 30 } },
  exit:    { opacity: 0, x: 60, scale: .9, transition: { duration: .25, ease: "easeIn" } },
};

const icons = {
  success: <CheckIcon size={16} />,
  error:   <WarningIcon size={16} />,
  info:    <InfoIcon size={16} />,
};

export default function Toast() {
  const [toasts, setToasts] = useState([]);

  _addToast = useCallback((message, type) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000);
  }, []);

  return (
    <div className="toast-container">
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            className={`toast ${t.type}`}
            variants={toastVariants}
            initial="initial" animate="animate" exit="exit"
            layout
          >
            <span className="toast-icon">{icons[t.type] || icons.info}</span>
            <span>{t.message}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
