import React, { useMemo } from "react";
import { useVault } from "./hooks/useVault";
import Header from "./components/Header";
import DepositForm from "./components/DepositForm";
import VaultCard from "./components/VaultCard";
import Toast, { toast } from "./components/Toast";
import { KNOWN_TOKENS } from "./utils/format";
import { ethers } from "ethers";

export default function App() {
  const {
    account, chainId, chainMeta, tokens, contractAddress,
    locks, loading, txPending,
    connect, depositNative, depositERC20, withdraw,
  } = useVault();

  // ─── Stats ───────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const active    = locks.filter((l) => !l.withdrawn);
    const available = locks.filter((l) => !l.withdrawn && Number(l.unlocksAt) <= Math.floor(Date.now() / 1000));
    return { total: locks.length, active: active.length, available: available.length };
  }, [locks]);

  // ─── Deposit handler ──────────────────────────────────────────────────────
  async function handleDeposit(params) {
    try {
      let hash;
      if (params.type === "native") {
        hash = await depositNative(params);
      } else {
        hash = await depositERC20(params);
      }
      const explorerBase = chainMeta?.explorer || "";
      const txLink = explorerBase ? `${explorerBase}/tx/${hash}` : null;
      toast(
        txLink
          ? `✅ Locked! View tx: ${hash.slice(0, 10)}…`
          : "✅ Funds locked successfully!",
        "success"
      );
    } catch (err) {
      console.error(err);
      toast(`❌ ${err?.reason || err?.message || "Transaction failed"}`, "error");
    }
  }

  // ─── Withdraw handler ─────────────────────────────────────────────────────
  async function handleWithdraw(lockIndex) {
    try {
      const hash = await withdraw(lockIndex);
      toast("✅ Withdrawal successful! Funds are back in your wallet.", "success");
    } catch (err) {
      console.error(err);
      toast(`❌ ${err?.reason || err?.message || "Withdrawal failed"}`, "error");
    }
  }

  return (
    <>
      <div className="app-shell">
        <Header
          account={account}
          chainMeta={chainMeta}
          onConnect={connect}
          loading={loading}
        />

        {!account ? (
          /* ── Not connected ── */
          <div className="connect-prompt">
            <div className="connect-prompt-icon">🔒</div>
            <h2>Your personal time-lock vault</h2>
            <p>
              Deposit POL, USDC, or any ERC-20 token. Choose a lock duration.
              Funds are <strong>mathematically inaccessible</strong> — even to you — until
              the timer expires.
            </p>
            <button className="btn btn-primary" onClick={connect}>
              Connect Wallet to Start
            </button>
            <div style={{ fontSize: ".78rem", color: "var(--muted)", marginTop: 4 }}>
              Works with MetaMask · Coinbase Wallet · any injected wallet
            </div>
          </div>
        ) : (
          <>
            {/* ── Stats row ── */}
            <div className="stats-row">
              <div className="stat-chip">
                <span className="stat-value">{stats.total}</span>
                <span className="stat-label">Total locks</span>
              </div>
              <div className="stat-chip">
                <span className="stat-value">{stats.active}</span>
                <span className="stat-label">Active</span>
              </div>
              <div className="stat-chip" style={stats.available > 0 ? { borderColor: "var(--green)", background: "var(--green-glow)" } : {}}>
                <span className="stat-value" style={stats.available > 0 ? { color: "var(--green)" } : {}}>
                  {stats.available}
                </span>
                <span className="stat-label">Ready</span>
              </div>
            </div>

            {/* ── Main layout ── */}
            <div className="layout-cols">
              {/* LEFT — deposit form */}
              <div>
                <DepositForm
                  tokens={tokens}
                  chainMeta={chainMeta}
                  onDeposit={handleDeposit}
                  txPending={txPending}
                  contractAddress={contractAddress}
                />
              </div>

              {/* RIGHT — vault list */}
              <div>
                <div className="section-title">Your Vaults</div>
                {locks.length === 0 ? (
                  <div className="vault-empty">
                    <p>🏦</p>
                    <p style={{ marginTop: 14, fontWeight: 700, color: "var(--text)", fontSize: "1.05rem" }}>No locks yet</p>
                    <p style={{ fontSize: ".85rem", marginTop: 8, lineHeight: 1.6 }}>
                      Create your first time-lock using the form on the left.
                    </p>
                  </div>
                ) : (
                  <div className="vault-list">
                    {[...locks].reverse().map((lock) => (
                      <VaultCard
                        key={lock._index}
                        lock={lock}
                        lockIndex={lock._index}
                        onWithdraw={handleWithdraw}
                        txPending={txPending}
                        chainId={chainId}
                        chainMeta={chainMeta}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ── Contract info (prominent for public visibility) ── */}
            {contractAddress && (
              <div className="contract-footer">
                <div className="contract-footer-inner">
                  <span className="contract-footer-label">Verified Smart Contract</span>
                  {chainMeta?.explorer ? (
                    <a
                      className="contract-footer-address"
                      href={`${chainMeta.explorer}/address/${contractAddress}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {contractAddress}
                    </a>
                  ) : (
                    <span className="contract-footer-address">{contractAddress}</span>
                  )}
                  <div className="contract-footer-badges">
                    <span className="contract-badge">🔐 Self-custody</span>
                    <span className="contract-badge">🚫 No admin keys</span>
                    <span className="contract-badge">💰 Zero fees</span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <Toast />
    </>
  );
}
