import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

let _addToast = null;

export function toast(message, type = "info") {
  _addToast?.(message, type);
}

const toastVariants = {
  initial: { opacity: 0, y: 40, scale: 0.9, filter: "blur(6px)" },
  animate: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)", transition: { type: "spring", stiffness: 500, damping: 30 } },
  exit: { opacity: 0, x: 80, scale: 0.85, filter: "blur(4px)", transition: { duration: 0.3, ease: "easeIn" } },
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
            initial="initial"
            animate="animate"
            exit="exit"
            layout
          >
            {t.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
