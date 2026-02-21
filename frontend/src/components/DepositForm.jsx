import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DURATION_PRESETS, DURATION_PRESETS_SHORT, durationToSeconds } from "../utils/format";

const ASSET_NATIVE = "__native__";

const formVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.97 },
  visible: {
    opacity: 1, y: 0, scale: 1,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1], staggerChildren: 0.06, delayChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 16, filter: "blur(4px)" },
  visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
};

const presetVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: (i) => ({
    opacity: 1, scale: 1,
    transition: { delay: i * 0.04, type: "spring", stiffness: 500, damping: 25 }
  }),
  tap: { scale: 0.92 },
};

export default function DepositForm({ tokens, chainMeta, onDeposit, txPending, contractAddress }) {
  const [asset, setAsset]     = useState(ASSET_NATIVE);
  const [amount, setAmount]   = useState("");
  const [label, setLabel]     = useState("");
  const [days, setDays]       = useState("");
  const [hours, setHours]     = useState("");
  const [minutes, setMinutes] = useState("");
  const [preset, setPreset]   = useState(null);

  const nativeSymbol = chainMeta?.nativeSymbol || "ETH";

  function applyPreset(key) {
    setPreset(key);
    const allPresets = [...DURATION_PRESETS_SHORT, ...DURATION_PRESETS];
    const found = allPresets.find(([lbl]) => lbl === key);
    if (!found) return;
    const secs = found[1];
    const d = Math.floor(secs / 86400);
    const h = Math.floor((secs % 86400) / 3600);
    const m = Math.floor((secs % 3600) / 60);
    setDays(d || "");
    setHours(h || "");
    setMinutes(m || "");
  }

  const totalSecs = durationToSeconds({ days, hours, minutes });

  async function handleSubmit(e) {
    e.preventDefault();
    if (!amount || totalSecs < 60) return;

    if (asset === ASSET_NATIVE) {
      await onDeposit({ type: "native", amount, durationSec: totalSecs, label });
    } else {
      const tok = tokens.find((t) => t.address === asset);
      await onDeposit({
        type: "erc20",
        tokenAddress: asset,
        decimals: tok.decimals,
        amount,
        durationSec: totalSecs,
        label,
      });
    }
    setAmount(""); setLabel(""); setDays(""); setHours(""); setMinutes(""); setPreset(null);
  }

  const selectedToken = asset === ASSET_NATIVE ? null : tokens.find((t) => t.address === asset);

  return (
    <motion.div
      className="card card-glow"
      variants={formVariants}
      initial="hidden"
      animate="visible"
      whileHover={{ borderColor: "rgba(124,58,237,0.4)" }}
    >
      <motion.div className="section-title" variants={itemVariants} style={{ marginBottom: 20 }}>
        <span className="section-icon">✨</span> New Lock
      </motion.div>

      <AnimatePresence>
        {!contractAddress && (
          <motion.div
            className="warning-banner"
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: "auto", marginBottom: 18 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            transition={{ duration: 0.3 }}
          >
            ⚠️ Contract not deployed on this network yet.<br />
            Run <code>npm run deploy:polygon</code> first.
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit} className="form-grid">
        {/* Asset selector */}
        <motion.div className="form-group" variants={itemVariants}>
          <label>Asset to lock</label>
          <select value={asset} onChange={(e) => setAsset(e.target.value)}>
            <option value={ASSET_NATIVE}>{nativeSymbol} (native coin)</option>
            {tokens.map((t) => (
              <option key={t.address} value={t.address}>{t.symbol}</option>
            ))}
            <option value="custom">Custom ERC-20 address…</option>
          </select>
        </motion.div>

        {/* Custom token address */}
        <AnimatePresence>
          {asset === "custom" && (
            <motion.div
              className="form-group"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <label>Token contract address</label>
              <input placeholder="0x…" onChange={(e) => setAsset(e.target.value.trim())} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Amount */}
        <motion.div className="form-group" variants={itemVariants}>
          <label>Amount</label>
          <input
            type="number"
            min="0"
            step="any"
            placeholder={asset === ASSET_NATIVE ? `e.g. 0.5 ${nativeSymbol}` : `e.g. 100`}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </motion.div>

        {/* Duration presets — Short */}
        <motion.div className="form-group" variants={itemVariants}>
          <label>Quick duration — Short</label>
          <div className="duration-grid duration-grid-4">
            {DURATION_PRESETS_SHORT.map(([lbl], i) => (
              <motion.button
                key={lbl}
                type="button"
                className={`duration-btn${preset === lbl ? " active" : ""}`}
                onClick={() => applyPreset(lbl)}
                variants={presetVariants}
                custom={i}
                initial="hidden"
                animate="visible"
                whileTap="tap"
                whileHover={{ scale: 1.05, y: -2 }}
              >
                {lbl}
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Duration presets — Long */}
        <motion.div className="form-group" variants={itemVariants}>
          <label>Quick duration — Long</label>
          <div className="duration-grid">
            {DURATION_PRESETS.map(([lbl], i) => (
              <motion.button
                key={lbl}
                type="button"
                className={`duration-btn${preset === lbl ? " active" : ""}`}
                onClick={() => applyPreset(lbl)}
                variants={presetVariants}
                custom={i + 4}
                initial="hidden"
                animate="visible"
                whileTap="tap"
                whileHover={{ scale: 1.05, y: -2 }}
              >
                {lbl}
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Custom duration — Days / Hours / Minutes */}
        <motion.div className="form-group" variants={itemVariants}>
          <label>Or custom duration</label>
          <div className="form-row form-row-3">
            <input
              type="number" min="0" step="any" placeholder="Days"
              value={days} onChange={(e) => { setDays(e.target.value); setPreset(null); }}
            />
            <input
              type="number" min="0" step="any" placeholder="Hours"
              value={hours} onChange={(e) => { setHours(e.target.value); setPreset(null); }}
            />
            <input
              type="number" min="0" step="any" placeholder="Minutes"
              value={minutes} onChange={(e) => { setMinutes(e.target.value); setPreset(null); }}
            />
          </div>

          <AnimatePresence>
            {totalSecs > 0 && (
              <motion.span
                className="hint"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
              >
                🗓️ Unlocks: {new Date(Date.now() + totalSecs * 1000).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
              </motion.span>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {totalSecs > 0 && totalSecs < 60 && (
              <motion.span
                className="hint"
                style={{ color: "var(--red)" }}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
              >
                ⚠ Minimum lock is 1 minute
              </motion.span>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Label */}
        <motion.div className="form-group" variants={itemVariants}>
          <label>Label (optional)</label>
          <input
            type="text"
            placeholder='e.g. "Holiday savings 2027"'
            maxLength={60}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
        </motion.div>

        <motion.button
          type="submit"
          className="btn btn-primary"
          disabled={txPending || !amount || totalSecs < 60}
          variants={itemVariants}
          whileHover={!txPending && amount && totalSecs >= 60 ? { scale: 1.02, y: -2 } : {}}
          whileTap={!txPending && amount && totalSecs >= 60 ? { scale: 0.97 } : {}}
        >
          {txPending ? (
            <><span className="spinner" /> Confirming…</>
          ) : (
            <>🔒 Lock {amount ? `${amount} ${selectedToken?.symbol || nativeSymbol}` : "funds"}</>
          )}
        </motion.button>
      </form>
    </motion.div>
  );
}
