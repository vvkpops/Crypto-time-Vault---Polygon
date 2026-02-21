import React, { useState, useCallback } from "react";

let _addToast = null;

export function toast(message, type = "info") {
  _addToast?.(message, type);
}

export default function Toast() {
  const [toasts, setToasts] = useState([]);

  _addToast = useCallback((message, type) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.type}`}>
          {t.message}
        </div>
      ))}
    </div>
  );
}
