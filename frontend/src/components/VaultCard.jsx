import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  formatAmount, formatCountdownShort, formatDate,
  formatShortDate, formatShortDateTime, shortAddr,
} from "../utils/format";
import { KNOWN_TOKENS } from "../utils/format";
import { ethers } from "ethers";
import { ArrowUpRight, ChevronDown, TokenGlyph, CheckIcon, ClockIcon } from "./Icons";

const cardVariants = {
  hidden:  { opacity: 0, y: 14, scale: .98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 380, damping: 30 } },
  exit:    { opacity: 0, scale: .96, y: -8, transition: { duration: .2 } },
};

export default function VaultCard({
  lock, lockIndex, onWithdraw, txPending,
  chainId, chainMeta, horizonDays = 7,
}) {
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [expanded, setExpanded] = useState(false);

  const unlocksAt = Number(lock.unlocksAt);
  const createdAt = Number(lock.createdAt || 0);
  const validCreatedAt = createdAt > 1577836800 && createdAt < unlocksAt;
  const totalDuration = validCreatedAt ? unlocksAt - createdAt : 0;

  useEffect(() => {
    function tick() {
      setSecondsLeft(Math.max(0, unlocksAt - Math.floor(Date.now() / 1000)));
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [unlocksAt]);

  const isWithdrawn = lock.withdrawn;
  const isUnlocked  = !isWithdrawn && secondsLeft === 0;
  const isLocked    = !isWithdrawn && secondsLeft > 0;

  /**
   * Horizon-anchored progress.
   *   elapsedFrac  — honest per-lock progress (time elapsed / total lock duration)
   *   urgencyFrac  — kicks in when remaining time falls within the user's horizon
   * Final = max(elapsedFrac, urgencyFrac), so:
   *   • Fresh locks always start at 0%, regardless of lock length
   *   • Long locks show their real per-lock progress
   *   • Locks within the user's "soon" window get an urgency boost
   *   • Locks with less remaining always show ≥ as much fill
   */
  const progress = useMemo(() => {
    if (isWithdrawn || isUnlocked) return 1;
    const horizonSeconds = Math.max(86400, horizonDays * 86400);
    const elapsedFrac = totalDuration > 0
      ? Math.max(0, Math.min(1, (totalDuration - secondsLeft) / totalDuration))
      : 0;
    const urgencyFrac = 1 - Math.min(1, secondsLeft / horizonSeconds);
    return Math.max(elapsedFrac, urgencyFrac);
  }, [isUnlocked, isWithdrawn, secondsLeft, totalDuration, horizonDays]);

  const tokenAddr = lock.token || ethers.ZeroAddress;
  const isNative = tokenAddr === ethers.ZeroAddress;
  const knownTokens = KNOWN_TOKENS[chainId] || [];
  const tokenInfo = isNative
    ? { symbol: chainMeta?.nativeSymbol || "ETH", decimals: 18 }
    : knownTokens.find((t) => t.address?.toLowerCase() === tokenAddr.toLowerCase())
      || { symbol: tokenAddr.slice(0, 6) + "…", decimals: 18 };

  const statusClass = isWithdrawn ? "withdrawn" : isUnlocked ? "unlocked" : "locked";
  const amountFormatted = formatAmount(lock.amount, tokenInfo.decimals);
  const explorerUrl = chainMeta?.explorer ? `${chainMeta.explorer}/address/${tokenAddr}` : null;

  const etaText = isWithdrawn
    ? "Withdrawn"
    : `Available in ${formatCountdownShort(secondsLeft)}`;

  const startLabel = validCreatedAt ? formatShortDate(createdAt) : "Locked";
  const endLabel = formatShortDateTime(unlocksAt);

  // Always show at least a sliver if locked, for visibility
  const displayProgress = isWithdrawn ? 0 : Math.max(progress, isLocked ? 0.02 : 0);

  return (
    <motion.div
      className={`vault ${statusClass}`}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      layout
    >
      {/* Subtle full-card fill based on progress (amber → emerald hue) */}
      <div
        className="vault-fill"
        style={{ width: `${displayProgress * 100}%` }}
        aria-hidden="true"
      />

      <div className="vault-body">
        {/* ── Top row: token, label, amount, status, expand ── */}
        <div className="vault-header">
          <TokenGlyph symbol={tokenInfo.symbol} size={36} />
          <div className="vault-titleblock">
            <div className="vault-label">{lock.label || `Vault #${lock.id ?? lockIndex + 1}`}</div>
            <div className="vault-subtitle">
              <span className="vault-amount-val">{amountFormatted}</span>
              <span className="vault-amount-sym">{tokenInfo.symbol}</span>
            </div>
          </div>

          <div className="vault-header-right">
            <span className={`status-pill ${statusClass}`}>
              {isWithdrawn ? "Withdrawn" : isUnlocked ? "Ready" : "Locked"}
            </span>
            <motion.button
              className="vault-expand"
              onClick={() => setExpanded((v) => !v)}
              aria-label={expanded ? "Hide details" : "Show details"}
              whileTap={{ scale: .9 }}
              animate={{ rotate: expanded ? 180 : 0 }}
              transition={{ duration: .25 }}
            >
              <ChevronDown size={14} />
            </motion.button>
          </div>
        </div>

        {/* ── Center: ETA chip OR Withdraw button ── */}
        <div className="vault-center-action">
          {isUnlocked && !isWithdrawn ? (
            <motion.button
              key="withdraw-btn"
              className="vault-cta vault-cta-center"
              disabled={txPending}
              onClick={() => onWithdraw(lockIndex)}
              initial={{ opacity: 0, scale: .85 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ y: -1, scale: 1.02 }}
              whileTap={{ scale: .96 }}
              transition={{ type: "spring", stiffness: 500, damping: 25 }}
            >
              {txPending ? (
                <><span className="spinner" /> Confirming…</>
              ) : (
                <>Withdraw {amountFormatted} {tokenInfo.symbol} <ArrowUpRight size={14} /></>
              )}
            </motion.button>
          ) : (
            <motion.div
              key="eta-chip"
              className={`vault-bar-eta ${statusClass}`}
              initial={{ opacity: 0, scale: .9 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              {isWithdrawn ? <CheckIcon size={12} /> : <ClockIcon size={12} />}
              <span>{etaText}</span>
            </motion.div>
          )}
        </div>

        {/* ── Dates row (above bar, justified to card edges) ── */}
        <div className="vault-dates-row">
          <span className="vault-bar-date start">{startLabel}</span>
          <span className="vault-bar-date end">{endLabel}</span>
        </div>
      </div>

      {/* ── Expanded details ── */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            className="vault-details"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: .3, ease: [0.22, 1, 0.36, 1] }}
            style={{ overflow: "hidden" }}
          >
            <div className="detail-row">
              <span className="detail-label">Unlocks at</span>
              <span className="detail-val">{formatDate(unlocksAt)}</span>
            </div>
            {validCreatedAt && (
              <div className="detail-row">
                <span className="detail-label">Locked at</span>
                <span className="detail-val">{formatDate(createdAt)}</span>
              </div>
            )}
            <div className="detail-row">
              <span className="detail-label">Progress</span>
              <span className="detail-val">{Math.round(progress * 100)}%</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Asset</span>
              <span className="detail-val">
                {isNative ? tokenInfo.symbol + " (native)" : (
                  explorerUrl
                    ? <a href={explorerUrl} target="_blank" rel="noreferrer">{tokenInfo.symbol} ↗</a>
                    : tokenInfo.symbol
                )}
              </span>
            </div>
            {!isNative && (
              <div className="detail-row" style={{ gridColumn: "1 / -1" }}>
                <span className="detail-label">Token contract</span>
                <span className="detail-val">{shortAddr(tokenAddr)}</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Full-width progress bar at card bottom edge ── */}
      {!isWithdrawn && (
        <div className="vault-pbar">
          <motion.div
            className={`vault-pbar-fill ${statusClass}`}
            initial={{ width: 0 }}
            animate={{ width: `${displayProgress * 100}%` }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
      )}
    </motion.div>
  );
}
