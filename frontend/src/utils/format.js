import { ethers } from "ethers";

// Known ERC-20 tokens per chain (chainId → list)
export const KNOWN_TOKENS = {
  // Base mainnet
  8453: [
    { symbol: "USDC",  address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", decimals: 6  },
    { symbol: "USDT",  address: "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2", decimals: 6  },
    { symbol: "WETH",  address: "0x4200000000000000000000000000000000000006", decimals: 18 },
    { symbol: "cbBTC", address: "0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf", decimals: 8  },
  ],
  // Base Sepolia (testnet)
  84532: [
    { symbol: "USDC",  address: "0x036CbD53842c5426634e7929541eC2318f3dCF7e", decimals: 6  },
  ],
  // Polygon
  137: [
    { symbol: "USDC",  address: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359", decimals: 6  },
    { symbol: "USDT",  address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F", decimals: 6  },
    { symbol: "WETH",  address: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619", decimals: 18 },
    { symbol: "WBTC",  address: "0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6", decimals: 8  },
  ],
};

export const CHAIN_META = {
  8453:  { name: "Base",         nativeSymbol: "ETH",  explorer: "https://basescan.org" },
  84532: { name: "Base Sepolia", nativeSymbol: "ETH",  explorer: "https://sepolia.basescan.org" },
  137:   { name: "Polygon",      nativeSymbol: "POL",   explorer: "https://polygonscan.com" },
  1:     { name: "Ethereum",     nativeSymbol: "ETH",  explorer: "https://etherscan.io" },
  31337: { name: "Localhost",    nativeSymbol: "ETH",  explorer: "" },
};

// Duration presets  [label, seconds]
export const DURATION_PRESETS_SHORT = [
  ["1 min",   60],
  ["5 min",   300],
  ["15 min",  900],
  ["30 min",  1800],
];

export const DURATION_PRESETS = [
  ["1 week",   7  * 86400],
  ["1 month",  30 * 86400],
  ["3 months", 90 * 86400],
  ["6 months", 180 * 86400],
  ["1 year",   365 * 86400],
];

/** Short-form address: 0x1234…abcd */
export function shortAddr(addr) {
  if (!addr) return "";
  return addr.slice(0, 6) + "…" + addr.slice(-4);
}

/** Format big number to human-readable with symbol */
export function formatAmount(amountBN, decimals = 18, symbol = "") {
  try {
    const formatted = ethers.formatUnits(amountBN, decimals);
    // Show up to 6 sig figs
    const num = parseFloat(formatted);
    const display =
      num === 0       ? "0" :
      num < 0.001     ? formatted :
      num.toPrecision(6).replace(/\.?0+$/, "");
    return symbol ? `${display} ${symbol}` : display;
  } catch {
    return "—";
  }
}

/** Countdown string from seconds remaining */
export function formatCountdown(seconds) {
  if (seconds <= 0) return "Ready to withdraw ✓";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (d > 0)  return `${d}d ${h}h ${m}m left`;
  if (h > 0)  return `${h}h ${m}m ${s}s left`;
  if (m > 0)  return `${m}m ${s}s left`;
  return `${s}s left`;
}

/** Date string for unlock time */
export function formatDate(unixTs) {
  if (!unixTs) return "";
  return new Date(Number(unixTs) * 1000).toLocaleString(undefined, {
    dateStyle: "medium", timeStyle: "short",
  });
}

/** Short date: "Nov 14" */
export function formatShortDate(unixTs) {
  if (!unixTs) return "";
  return new Date(Number(unixTs) * 1000).toLocaleDateString(undefined, {
    month: "short", day: "numeric",
  });
}

/** Compact date+time: "Nov 17 · 9:30 PM" */
export function formatShortDateTime(unixTs) {
  if (!unixTs) return "";
  const d = new Date(Number(unixTs) * 1000);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) +
    " · " +
    d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

/** Compact countdown: "9h 45m" / "1d 10h" / "Ready" */
export function formatCountdownShort(seconds) {
  if (seconds <= 0) return "Ready";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (d > 0)  return `${d}d ${h}h`;
  if (h > 0)  return `${h}h ${m}m`;
  if (m > 0)  return `${m}m ${s}s`;
  return `${s}s`;
}

/** Convert lock duration fields to total seconds */
export function durationToSeconds({ days = 0, hours = 0, minutes = 0 }) {
  return Number(days) * 86400 + Number(hours) * 3600 + Number(minutes) * 60;
}
