import React, { useState, useEffect } from "react";
import { formatAmount, formatCountdown, formatDate } from "../utils/format";
import { KNOWN_TOKENS } from "../utils/format";
import { ethers } from "ethers";

export default function VaultCard({ lock, lockIndex, onWithdraw, txPending, chainId, chainMeta }) {
  const [secondsLeft, setSecondsLeft] = useState(0);

  const unlocksAt = Number(lock.unlocksAt);
  const now = Math.floor(Date.now() / 1000);

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
    <div className={`vault-card ${statusClass}`}>
      <div className="vault-icon">{icon}</div>
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
        <div className={`vault-timer ${isWithdrawn ? "withdrawn-text" : isUnlocked ? "unlocked-text" : "locked-text"}`}>
          {isWithdrawn
            ? `Withdrawn — was locked until ${formatDate(unlocksAt)}`
            : isUnlocked
            ? `Ready to withdraw! (unlocked ${formatDate(unlocksAt)})`
            : `${formatCountdown(secondsLeft)} · unlocks ${formatDate(unlocksAt)}`}
        </div>
      </div>

      <div className="vault-actions">
        {isUnlocked && !isWithdrawn && (
          <button
            className="btn-withdraw"
            disabled={txPending}
            onClick={() => onWithdraw(lockIndex)}
          >
            {txPending ? <span className="spinner" /> : "Withdraw"}
          </button>
        )}
      </div>
    </div>
  );
}
