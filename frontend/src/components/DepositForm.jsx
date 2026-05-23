import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DURATION_PRESETS, DURATION_PRESETS_SHORT, durationToSeconds, formatDate } from "../utils/format";
import { ethers } from "ethers";
import {
  CloseIcon, LockIcon, SparkIcon, ClockIcon, WarningIcon,
  TokenGlyph,
} from "./Icons";

const ASSET_NATIVE = "__native__";
const ASSET_CUSTOM = "__custom__";

const sheetVariants = {
  hidden:  { y: "100%", opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 380, damping: 40 } },
  exit:    { y: "100%", opacity: 0, transition: { duration: .25, ease: "easeIn" } },
};

const backdropVariants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: .25 } },
  exit:    { opacity: 0, transition: { duration: .2 } },
};

export default function DepositForm({
  open,
  onClose,
  tokens,
  chainMeta,
  onDeposit,
  txPending,
  contractAddress,
  tokenBalances,
  nativeBalance,
}) {
  const [asset, setAsset]     = useState(ASSET_NATIVE);
  const [customAddr, setCustomAddr] = useState("");
  const [amount, setAmount]   = useState("");
  const [label, setLabel]     = useState("");
  const [days, setDays]       = useState("");
  const [hours, setHours]     = useState("");
  const [minutes, setMinutes] = useState("");
  const [preset, setPreset]   = useState(null);

  const nativeSymbol = chainMeta?.nativeSymbol || "ETH";

  // Reset on close
  useEffect(() => {
    if (!open) {
      setAmount(""); setLabel(""); setDays(""); setHours(""); setMinutes("");
      setPreset(null);
    }
  }, [open]);

  // Lock body scroll when open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Escape key
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  function applyPreset(key) {
    setPreset(key);
    const allPresets = [...DURATION_PRESETS_SHORT, ...DURATION_PRESETS];
    const found = allPresets.find(([lbl]) => lbl === key);
    if (!found) return;
    const secs = found[1];
    setDays(Math.floor(secs / 86400) || "");
    setHours(Math.floor((secs % 86400) / 3600) || "");
    setMinutes(Math.floor((secs % 3600) / 60) || "");
  }

  const totalSecs = durationToSeconds({ days, hours, minutes });

  const selectedToken = useMemo(() => {
    if (asset === ASSET_NATIVE || asset === ASSET_CUSTOM) return null;
    return tokens.find((t) => t.address === asset);
  }, [asset, tokens]);

  const displaySymbol = asset === ASSET_NATIVE
    ? nativeSymbol
    : selectedToken?.symbol || "TOKEN";

  /* Max balance for selected asset */
  const maxBalance = useMemo(() => {
    if (asset === ASSET_NATIVE) return nativeBalance?.formatted;
    if (selectedToken) {
      const bal = tokenBalances?.find((b) => b.address?.toLowerCase() === selectedToken.address.toLowerCase());
      return bal?.formatted;
    }
    return null;
  }, [asset, selectedToken, nativeBalance, tokenBalances]);

  function setMax() {
    if (maxBalance) {
      // For native, leave a tiny bit for gas
      const num = parseFloat(maxBalance);
      if (asset === ASSET_NATIVE) {
        const safe = Math.max(0, num - 0.005);
        setAmount(safe > 0 ? safe.toString() : "");
      } else {
        setAmount(maxBalance);
      }
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!amount || totalSecs < 60) return;

    const finalAddr = asset === ASSET_CUSTOM ? customAddr : asset;

    if (asset === ASSET_NATIVE) {
      await onDeposit({ type: "native", amount, durationSec: totalSecs, label });
    } else {
      const tok = asset === ASSET_CUSTOM
        ? { decimals: 18 }
        : tokens.find((t) => t.address === asset);
      await onDeposit({
        type: "erc20",
        tokenAddress: finalAddr,
        decimals: tok?.decimals ?? 18,
        amount,
        durationSec: totalSecs,
        label,
      });
    }
    onClose?.();
  }

  const formValid = amount && parseFloat(amount) > 0 && totalSecs >= 60 &&
    (asset !== ASSET_CUSTOM || ethers.isAddress(customAddr));

  const showError = totalSecs > 0 && totalSecs < 60;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="sheet-backdrop"
          variants={backdropVariants}
          initial="hidden" animate="visible" exit="exit"
          onClick={(e) => e.target === e.currentTarget && onClose?.()}
        >
          <motion.div
            className="sheet"
            variants={sheetVariants}
            initial="hidden" animate="visible" exit="exit"
            role="dialog"
            aria-modal="true"
          >
            <div className="sheet-handle" />

            <div className="sheet-header">
              <div className="sheet-title">
                <div className="sheet-title-icon"><SparkIcon size={18} /></div>
                New Time Lock
              </div>
              <button className="sheet-close" onClick={onClose} aria-label="Close">
                <CloseIcon size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: "contents" }}>
              <div className="sheet-body">
                {!contractAddress && (
                  <div className="warn-banner">
                    <WarningIcon size={18} style={{ flexShrink: 0, marginTop: 1 }} />
                    <div>
                      Contract not deployed on this network yet. Run{" "}
                      <code>npm run deploy:polygon</code> first.
                    </div>
                  </div>
                )}

                {/* ── Asset ── */}
                <div className="field-group">
                  <span className="field-label">Asset</span>
                  <div className="asset-grid">
                    <button
                      type="button"
                      className={`asset-btn ${asset === ASSET_NATIVE ? "active" : ""}`}
                      onClick={() => setAsset(ASSET_NATIVE)}
                    >
                      <TokenGlyph symbol={nativeSymbol} size={28} />
                      <span className="asset-btn-sym">{nativeSymbol}</span>
                    </button>
                    {tokens.map((t) => (
                      <button
                        key={t.address}
                        type="button"
                        className={`asset-btn ${asset === t.address ? "active" : ""}`}
                        onClick={() => setAsset(t.address)}
                      >
                        <TokenGlyph symbol={t.symbol} size={28} />
                        <span className="asset-btn-sym">{t.symbol}</span>
                      </button>
                    ))}
                    <button
                      type="button"
                      className={`asset-btn ${asset === ASSET_CUSTOM ? "active" : ""}`}
                      onClick={() => setAsset(ASSET_CUSTOM)}
                    >
                      <TokenGlyph symbol="?" size={28} />
                      <span className="asset-btn-sym">Custom</span>
                    </button>
                  </div>

                  <AnimatePresence>
                    {asset === ASSET_CUSTOM && (
                      <motion.input
                        className="field mono"
                        style={{ marginTop: 10 }}
                        placeholder="0x… token contract address"
                        value={customAddr}
                        onChange={(e) => setCustomAddr(e.target.value.trim())}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                      />
                    )}
                  </AnimatePresence>
                </div>

                {/* ── Amount ── */}
                <div className="field-group">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <span className="field-label">Amount</span>
                    {maxBalance && (
                      <span className="field-hint">
                        Balance: <span style={{ color: "var(--text-2)", fontFamily: "var(--mono)", marginLeft: 4 }}>
                          {parseFloat(maxBalance).toLocaleString(undefined, { maximumFractionDigits: 6 })}
                        </span>
                      </span>
                    )}
                  </div>
                  <div className="amount-input-wrap">
                    <input
                      className="field"
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="any"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      required
                    />
                    <div className="amount-suffix">
                      {maxBalance && parseFloat(maxBalance) > 0 && (
                        <button type="button" className="btn-max" onClick={setMax}>MAX</button>
                      )}
                      <span className="amount-sym">{displaySymbol}</span>
                    </div>
                  </div>
                </div>

                {/* ── Duration ── */}
                <div className="field-group">
                  <span className="field-label">Lock duration</span>
                  <div className="preset-grid">
                    {DURATION_PRESETS_SHORT.map(([lbl]) => (
                      <button
                        key={lbl} type="button"
                        className={`preset-btn ${preset === lbl ? "active" : ""}`}
                        onClick={() => applyPreset(lbl)}
                      >
                        {lbl}
                      </button>
                    ))}
                  </div>

                  <div className="preset-divider">Long-term</div>

                  <div className="preset-grid" style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
                    {DURATION_PRESETS.map(([lbl]) => (
                      <button
                        key={lbl} type="button"
                        className={`preset-btn ${preset === lbl ? "active" : ""}`}
                        onClick={() => applyPreset(lbl)}
                      >
                        {lbl}
                      </button>
                    ))}
                  </div>

                  <div className="preset-divider">Custom</div>

                  <div className="custom-duration-row">
                    <input
                      className="field" type="number" inputMode="numeric"
                      min="0" placeholder="Days"
                      value={days}
                      onChange={(e) => { setDays(e.target.value); setPreset(null); }}
                    />
                    <input
                      className="field" type="number" inputMode="numeric"
                      min="0" placeholder="Hours"
                      value={hours}
                      onChange={(e) => { setHours(e.target.value); setPreset(null); }}
                    />
                    <input
                      className="field" type="number" inputMode="numeric"
                      min="0" placeholder="Min"
                      value={minutes}
                      onChange={(e) => { setMinutes(e.target.value); setPreset(null); }}
                    />
                  </div>

                  {showError && (
                    <span className="field-hint warn" style={{ marginTop: 6 }}>
                      <WarningIcon size={13} /> Minimum lock duration is 1 minute
                    </span>
                  )}
                </div>

                {/* ── Label ── */}
                <div className="field-group">
                  <span className="field-label">Label <span style={{ textTransform: "none", letterSpacing: 0, color: "var(--muted)", fontWeight: 500 }}>(optional)</span></span>
                  <input
                    className="field"
                    type="text"
                    placeholder='e.g. "Holiday savings 2027"'
                    maxLength={60}
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                  />
                </div>

                {/* ── Summary ── */}
                {totalSecs >= 60 && amount && parseFloat(amount) > 0 && (
                  <motion.div
                    className="summary-card"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div className="summary-icon"><ClockIcon size={18} /></div>
                    <div className="summary-text">
                      Locking <strong>{amount} {displaySymbol}</strong> until{" "}
                      <span className="summary-date">
                        {formatDate(Math.floor(Date.now() / 1000) + totalSecs)}
                      </span>
                    </div>
                  </motion.div>
                )}
              </div>

              <div className="sheet-footer">
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={txPending || !formValid}
                >
                  {txPending ? (
                    <><span className="spinner lg" /> Confirming…</>
                  ) : (
                    <><LockIcon size={16} /> Lock {amount && parseFloat(amount) > 0 ? `${amount} ${displaySymbol}` : "funds"}</>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
