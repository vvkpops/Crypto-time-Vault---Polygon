import React, { useState } from "react";
import { DURATION_PRESETS, durationToSeconds } from "../utils/format";

const ASSET_NATIVE = "__native__";

export default function DepositForm({ tokens, chainMeta, onDeposit, txPending, contractAddress }) {
  const [asset, setAsset]   = useState(ASSET_NATIVE);
  const [amount, setAmount] = useState("");
  const [label, setLabel]   = useState("");
  const [days, setDays]     = useState("");
  const [hours, setHours]   = useState("");
  const [minutes, setMinutes] = useState("");
  const [preset, setPreset] = useState(null);

  const nativeSymbol = chainMeta?.nativeSymbol || "ETH";

  function applyPreset(idx) {
    setPreset(idx);
    const secs = DURATION_PRESETS[idx][1];
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
    // Reset form
    setAmount(""); setLabel(""); setDays(""); setHours(""); setMinutes(""); setPreset(null);
  }

  const selectedToken = asset === ASSET_NATIVE ? null : tokens.find((t) => t.address === asset);

  return (
    <div className="card">
      <div className="section-title" style={{ marginBottom: 20 }}>New Lock</div>

      {!contractAddress && (
        <div className="warning-banner">
          ⚠️ Contract not deployed on this network yet.<br />
          Run <code>npm run deploy:polygon</code> first.
        </div>
      )}

      <form onSubmit={handleSubmit} className="form-grid">
        {/* Asset selector */}
        <div className="form-group">
          <label>Asset to lock</label>
          <select value={asset} onChange={(e) => setAsset(e.target.value)}>
            <option value={ASSET_NATIVE}>{nativeSymbol} (native coin)</option>
            {tokens.map((t) => (
              <option key={t.address} value={t.address}>{t.symbol}</option>
            ))}
            <option value="custom">Custom ERC-20 address…</option>
          </select>
        </div>

        {/* Custom token address */}
        {asset === "custom" && (
          <div className="form-group">
            <label>Token contract address</label>
            <input
              placeholder="0x…"
              onChange={(e) => setAsset(e.target.value.trim())}
            />
          </div>
        )}

        {/* Amount */}
        <div className="form-group">
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
        </div>

        {/* Duration presets */}
        <div className="form-group">
          <label>Quick duration</label>
          <div className="duration-grid">
            {DURATION_PRESETS.map(([lbl], i) => (
              <button
                key={i}
                type="button"
                className={`duration-btn${preset === i ? " active" : ""}`}
                onClick={() => applyPreset(i)}
              >
                {lbl}
              </button>
            ))}
          </div>
        </div>

        {/* Custom duration */}
        <div className="form-group">
          <label>Or custom duration</label>
          <div className="form-row">
            <input
              type="number" min="0" placeholder="Days"
              value={days} onChange={(e) => { setDays(e.target.value); setPreset(null); }}
            />
            <input
              type="number" min="0" max="23" placeholder="Hours"
              value={hours} onChange={(e) => { setHours(e.target.value); setPreset(null); }}
            />
          </div>
          {totalSecs > 0 && (
            <span className="hint">
              Unlocks: {new Date(Date.now() + totalSecs * 1000).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
            </span>
          )}
          {totalSecs > 0 && totalSecs < 60 && (
            <span className="hint" style={{ color: "var(--red)" }}>Minimum lock is 1 minute</span>
          )}
        </div>

        {/* Label */}
        <div className="form-group">
          <label>Label (optional)</label>
          <input
            type="text"
            placeholder='e.g. "Holiday savings 2027"'
            maxLength={60}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          disabled={txPending || !amount || totalSecs < 60}
        >
          {txPending ? (
            <><span className="spinner" /> Confirming…</>
          ) : (
            <>🔒 Lock {amount ? `${amount} ${selectedToken?.symbol || nativeSymbol}` : "funds"}</>
          )}
        </button>
      </form>
    </div>
  );
}
