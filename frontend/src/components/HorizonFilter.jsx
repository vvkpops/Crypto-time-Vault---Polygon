import React from "react";
import { ClockIcon } from "./Icons";

const PRESETS = [1, 7, 30, 90];

export default function HorizonFilter({ value, onChange }) {
  return (
    <div className="horizon-filter">
      <label className="horizon-label">
        <ClockIcon size={14} />
        <span>Show availability within</span>
      </label>
      <div className="horizon-input-row">
        <input
          type="number"
          inputMode="numeric"
          min="0"
          max="18250"
          className="horizon-input"
          value={value}
          onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
          aria-label="Days horizon"
        />
        <span className="horizon-unit">days</span>
        <div className="horizon-presets">
          {PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              className={`horizon-preset ${value === p ? "active" : ""}`}
              onClick={() => onChange(p)}
            >
              {p === 1 ? "1d" : p === 7 ? "1w" : p === 30 ? "1mo" : "3mo"}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
