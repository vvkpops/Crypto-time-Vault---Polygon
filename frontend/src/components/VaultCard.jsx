import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { formatAmount, formatCountdown, formatDate } from "../utils/format";
import { KNOWN_TOKENS } from "../utils/format";
import { ethers } from "ethers";

const cardVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.95, filter: "blur(6px)" },
  visible: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)", transition: { type: "spring", stiffness: 400, damping: 30 } },
  exit: { opacity: 0, scale: 0.9, y: -10, filter: "blur(4px)", transition: { duration: 0.25 } },
};

export default function VaultCard({ lock, lockIndex, onWithdraw, txPending, chainId, chainMeta }) {
  const [secondsLeft, setSecondsLeft] = useState(0);

  const unlocksAt = Number(lock.unlocksAt);

  useEffect(() => {
    function update() {
      const remaining = Math.max(0, unlocksAt - Math.floor(Date.now() / 1000));
      setSecondsLeft(remaining);
    }
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [unlocksAt]);

  const isWithdrawn = lock.withdrawn;
  const isUnlocked  = !isWithdrawn && secondsLeft === 0;
  const isLocked    = !isWithdrawn && secondsLeft > 0;

  // Resolve token info
  const tokenAddr = lock.token || ethers.ZeroAddress;
  const isNative = tokenAddr === ethers.ZeroAddress;
  const knownTokens = KNOWN_TOKENS[chainId] || [];
  const tokenInfo = isNative
    ? { symbol: chainMeta?.nativeSymbol || "ETH", decimals: 18 }
    : knownTokens.find((t) => t.address?.toLowerCase() === tokenAddr.toLowerCase())
      || { symbol: tokenAddr.slice(0, 6) + "…", decimals: 18 };

  const statusClass = isWithdrawn ? "withdrawn" : isUnlocked ? "unlocked" : "locked";
  const icon = isWithdrawn ? "✅" : isUnlocked ? "🟢" : "🔒";

  const explorerUrl = chainMeta?.explorer
    ? `${chainMeta.explorer}/address/${tokenAddr}`
    : null;

  return (
    <motion.div
      className={`vault-card ${statusClass}`}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      layout
      whileHover={{ y: -4, boxShadow: isUnlocked ? "0 8px 32px rgba(16,185,129,.3)" : "0 8px 32px rgba(124,58,237,.2)" }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
    >
      <motion.div
        className="vault-icon"
        animate={isUnlocked ? { scale: [1, 1.15, 1], rotate: [0, -5, 5, 0] } : {}}
        transition={isUnlocked ? { duration: 2, repeat: Infinity, repeatDelay: 3 } : {}}
      >
        {icon}
      </motion.div>
      <div className="vault-info">
        <div className="vault-label">{lock.label || `Lock #${lock.id}`}</div>
        <div className="vault-amount">
          {formatAmount(lock.amount, tokenInfo.decimals, tokenInfo.symbol)}
          {!isNative && explorerUrl && (
            <a
              href={explorerUrl}
              target="_blank"
              rel="noreferrer"
              className="vault-token-link"
              style={{ marginLeft: 8, color: "var(--accent-h)", fontSize: ".75rem", textDecoration: "none", fontWeight: 600 }}
            >
              ↗ {tokenInfo.symbol}
            </a>
          )}
        </div>
        <motion.div
          className={`vault-timer ${isWithdrawn ? "withdrawn-text" : isUnlocked ? "unlocked-text" : "locked-text"}`}
          key={isUnlocked ? "unlocked" : isWithdrawn ? "withdrawn" : "locked"}
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          {isWithdrawn
            ? `Withdrawn — was locked until ${formatDate(unlocksAt)}`
            : isUnlocked
            ? `Ready to withdraw! (unlocked ${formatDate(unlocksAt)})`
            : `${formatCountdown(secondsLeft)} · unlocks ${formatDate(unlocksAt)}`}
        </motion.div>
      </div>

      <div className="vault-actions">
        {isUnlocked && !isWithdrawn && (
          <motion.button
            className="btn-withdraw"
            disabled={txPending}
            onClick={() => onWithdraw(lockIndex)}
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.08, y: -2 }}
            whileTap={{ scale: 0.92 }}
            transition={{ type: "spring", stiffness: 500, damping: 25 }}
          >
            {txPending ? <span className="spinner" /> : "Withdraw"}
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}
