import React from "react";
import { motion } from "framer-motion";
import { LockIcon, CheckIcon, ClockIcon } from "./Icons";
import { formatAmount, KNOWN_TOKENS } from "../utils/format";
import { ethers } from "ethers";

/**
 * Aggregate lock amounts by token.
 * Returns an array of { symbol, decimals, amount: bigint, formatted }
 */
export function aggregateByToken(locks, chainId, chainMeta) {
  const knownTokens = KNOWN_TOKENS[chainId] || [];
  const map = new Map();
  for (const l of locks) {
    const addr = (l.token || ethers.ZeroAddress).toLowerCase();
    const isNative = addr === ethers.ZeroAddress.toLowerCase();
    const known = isNative
      ? { symbol: chainMeta?.nativeSymbol || "ETH", decimals: 18 }
      : knownTokens.find((t) => t.address.toLowerCase() === addr) ||
        { symbol: addr.slice(0, 6) + "…", decimals: 18 };
    const cur = map.get(addr) || { ...known, amount: 0n };
    cur.amount += BigInt(l.amount.toString());
    map.set(addr, cur);
  }
  return Array.from(map.values())
    .filter((t) => t.amount > 0n)
    .map((t) => ({ ...t, formatted: formatAmount(t.amount, t.decimals) }))
    .sort((a, b) => (b.amount > a.amount ? 1 : -1));
}

/* Compact list of token totals: "100 USDC · 0.5 POL · 2 WETH" */
export function TokenTotals({ tokens, fallback = "—" }) {
  if (!tokens || tokens.length === 0) return <span className="token-totals empty">{fallback}</span>;
  return (
    <span className="token-totals">
      {tokens.map((t, i) => (
        <React.Fragment key={t.symbol}>
          {i > 0 && <span className="token-totals-sep">·</span>}
          <span className="token-totals-item">
            <span className="token-totals-amt">{t.formatted}</span>
            <span className="token-totals-sym">{t.symbol}</span>
          </span>
        </React.Fragment>
      ))}
    </span>
  );
}

/* A single stat chip showing icon + count + per-token totals */
export function StatChip({ icon, label, count, tokens, accent }) {
  return (
    <motion.div
      className={`stat-chip-v2 ${accent || ""}`}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: .3 }}
    >
      <div className="stat-chip-head">
        <span className="stat-chip-icon">{icon}</span>
        <span className="stat-chip-label">{label}</span>
      </div>
      <div className="stat-chip-count">{count}</div>
      <TokenTotals tokens={tokens} />
    </motion.div>
  );
}
