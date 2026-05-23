import React from "react";

const base = { width: 24, height: 24, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round" };

export const VaultIcon = ({ size = 24, ...p }) => (
  <svg {...base} width={size} height={size} {...p}>
    <rect x="2.5" y="3.5" width="19" height="17" rx="2.5" />
    <circle cx="10" cy="12" r="4.2" />
    <circle cx="10" cy="12" r="1.2" fill="currentColor" stroke="none" />
    <path d="M10 7.8v-1M10 17.2v-1M5.8 12h-1M15.2 12h-1M7 9 6.3 8.3M13 9l.7-.7M7 15l-.7.7M13 15l.7.7" />
    <path d="M17.5 9v6" />
    <path d="M4.5 20.5v1.5M19.5 20.5v1.5" />
  </svg>
);

export const LockIcon = ({ size = 24, ...p }) => (
  <svg {...base} width={size} height={size} {...p}>
    <rect x="4" y="11" width="16" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    <circle cx="12" cy="16" r="1.4" fill="currentColor" stroke="none" />
  </svg>
);

export const UnlockIcon = ({ size = 24, ...p }) => (
  <svg {...base} width={size} height={size} {...p}>
    <rect x="4" y="11" width="16" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 7.5-2" />
    <circle cx="12" cy="16" r="1.4" fill="currentColor" stroke="none" />
  </svg>
);

export const ShieldIcon = ({ size = 24, ...p }) => (
  <svg {...base} width={size} height={size} {...p}>
    <path d="M12 2.5 4 5.5v6c0 4.8 3.4 9 8 10.5 4.6-1.5 8-5.7 8-10.5v-6l-8-3Z" />
    <path d="m8.5 12 2.5 2.5 4.5-5" />
  </svg>
);

export const ClockIcon = ({ size = 24, ...p }) => (
  <svg {...base} width={size} height={size} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3.5 2" />
  </svg>
);

export const CoinIcon = ({ size = 24, ...p }) => (
  <svg {...base} width={size} height={size} {...p}>
    <ellipse cx="12" cy="6.5" rx="8" ry="3" />
    <path d="M4 6.5v11c0 1.66 3.58 3 8 3s8-1.34 8-3v-11" />
    <path d="M4 12c0 1.66 3.58 3 8 3s8-1.34 8-3" />
  </svg>
);

export const WalletIcon = ({ size = 24, ...p }) => (
  <svg {...base} width={size} height={size} {...p}>
    <path d="M3 7.5C3 6 4 5 5.5 5h12A2.5 2.5 0 0 1 20 7.5V8H5.5C4 8 3 7 3 7.5Z" />
    <path d="M3 7.5v10A2.5 2.5 0 0 0 5.5 20H19a2 2 0 0 0 2-2V9.5A1.5 1.5 0 0 0 19.5 8H5.5" />
    <circle cx="16.5" cy="14" r="1.2" fill="currentColor" stroke="none" />
  </svg>
);

export const PlusIcon = ({ size = 24, ...p }) => (
  <svg {...base} width={size} height={size} {...p}>
    <path d="M12 5v14M5 12h14" strokeWidth="2.2" />
  </svg>
);

export const CloseIcon = ({ size = 24, ...p }) => (
  <svg {...base} width={size} height={size} {...p}>
    <path d="M6 6l12 12M18 6L6 18" strokeWidth="2" />
  </svg>
);

export const CheckIcon = ({ size = 24, ...p }) => (
  <svg {...base} width={size} height={size} {...p}>
    <path d="m5 12 5 5L20 7" strokeWidth="2" />
  </svg>
);

export const ChevronRight = ({ size = 24, ...p }) => (
  <svg {...base} width={size} height={size} {...p}>
    <path d="m9 6 6 6-6 6" />
  </svg>
);

export const ChevronDown = ({ size = 24, ...p }) => (
  <svg {...base} width={size} height={size} {...p}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export const ArrowUpRight = ({ size = 24, ...p }) => (
  <svg {...base} width={size} height={size} {...p}>
    <path d="M7 17 17 7M9 7h8v8" />
  </svg>
);

export const SparkIcon = ({ size = 24, ...p }) => (
  <svg {...base} width={size} height={size} {...p}>
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.5 5.5l2.8 2.8M15.7 15.7l2.8 2.8M5.5 18.5l2.8-2.8M15.7 8.3l2.8-2.8" />
  </svg>
);

export const InfoIcon = ({ size = 24, ...p }) => (
  <svg {...base} width={size} height={size} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5M12 8h.01" />
  </svg>
);

export const WarningIcon = ({ size = 24, ...p }) => (
  <svg {...base} width={size} height={size} {...p}>
    <path d="M12 3 2 20h20L12 3Z" />
    <path d="M12 10v4M12 17h.01" />
  </svg>
);

/* Brand mark — combined vault + clock */
export const BrandMark = ({ size = 32, ...p }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" {...p}>
    <defs>
      <linearGradient id="bmg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#e9c777" />
        <stop offset="100%" stopColor="#b8893a" />
      </linearGradient>
    </defs>
    <rect x="3" y="5" width="34" height="30" rx="6" fill="url(#bmg)" opacity="0.15" />
    <rect x="3" y="5" width="34" height="30" rx="6" stroke="url(#bmg)" strokeWidth="1.5" />
    <circle cx="17" cy="20" r="7" stroke="url(#bmg)" strokeWidth="1.8" />
    <circle cx="17" cy="20" r="1.8" fill="url(#bmg)" />
    <path d="M17 14v-1.5M17 27.5V26M11 20H9.5M24.5 20H23M13.2 16.2l-1-1M21 24l1 1M13.2 23.8l-1 1M21 16l1-1" stroke="url(#bmg)" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M28 14v12" stroke="url(#bmg)" strokeWidth="1.8" strokeLinecap="round" />
    <circle cx="28" cy="14" r="1.2" fill="url(#bmg)" />
    <circle cx="28" cy="26" r="1.2" fill="url(#bmg)" />
  </svg>
);

/* Token glyphs */
export const TokenGlyph = ({ symbol, size = 28 }) => {
  const colors = {
    POL:  ["#8247e5", "#5b32a8"],
    MATIC:["#8247e5", "#5b32a8"],
    ETH:  ["#627eea", "#3c5cb8"],
    USDC: ["#2775ca", "#1a5598"],
    USDT: ["#26a17b", "#1a7a5c"],
    WETH: ["#627eea", "#3c5cb8"],
    WBTC: ["#f7931a", "#c9760f"],
    cbBTC:["#f7931a", "#c9760f"],
  };
  const [c1, c2] = colors[symbol?.toUpperCase()] || ["#3a4058", "#222738"];
  const initial = (symbol || "?").slice(0, 1).toUpperCase();
  return (
    <div
      style={{
        width: size, height: size, borderRadius: "50%",
        background: `linear-gradient(135deg, ${c1}, ${c2})`,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        color: "#fff", fontWeight: 800, fontSize: size * 0.4,
        flexShrink: 0,
        boxShadow: `0 2px 8px ${c1}55`,
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      {initial}
    </div>
  );
};
