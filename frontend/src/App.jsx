import React, { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useVault } from "./hooks/useVault";
import Header from "./components/Header";
import DepositForm from "./components/DepositForm";
import VaultCard from "./components/VaultCard";
import Toast, { toast } from "./components/Toast";
import { KNOWN_TOKENS } from "./utils/format";
import { ethers } from "ethers";

/* ── Floating Orbs ── */
function FloatingOrbs() {
  const orbs = [
    { size: 260, x: "10%", y: "15%", color: "rgba(124,58,237,.12)", dur: 18 },
    { size: 180, x: "75%", y: "60%", color: "rgba(168,85,247,.10)", dur: 22 },
    { size: 120, x: "60%", y: "10%", color: "rgba(16,185,129,.08)", dur: 15 },
    { size: 200, x: "25%", y: "70%", color: "rgba(99,102,241,.08)", dur: 20 },
    { size: 90, x: "85%", y: "30%", color: "rgba(245,158,11,.06)", dur: 16 },
  ];
  return (
    <div className="floating-orbs" aria-hidden="true">
      {orbs.map((o, i) => (
        <motion.div
          key={i}
          className="orb"
          style={{
            width: o.size, height: o.size,
            left: o.x, top: o.y,
            background: `radial-gradient(circle, ${o.color} 0%, transparent 70%)`,
          }}
          animate={{
            x: [0, 30, -20, 15, 0],
            y: [0, -25, 20, -10, 0],
            scale: [1, 1.15, 0.9, 1.05, 1],
          }}
          transition={{ duration: o.dur, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

/* ── Animated Counter ── */
function AnimatedStat({ value, label, highlight }) {
  return (
    <motion.div
      className="stat-chip"
      style={highlight ? { borderColor: "var(--green)", background: "var(--green-glow)" } : {}}
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      whileHover={{ y: -3, boxShadow: "0 8px 24px rgba(0,0,0,.3)" }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      <motion.span
        className="stat-value"
        style={highlight ? { color: "var(--green)" } : {}}
        key={value}
        initial={{ scale: 1.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 500, damping: 20 }}
      >
        {value}
      </motion.span>
      <span className="stat-label">{label}</span>
    </motion.div>
  );
}

/* ── Page transition variants ── */
const pageVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

const sectionVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

const listContainerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

export default function App() {
  const {
    account, chainId, chainMeta, tokens, contractAddress,
    locks, loading, txPending,
    balance, tokenBalances,
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
      <FloatingOrbs />
      <div className="app-shell">
        <Header
          account={account}
          chainMeta={chainMeta}
          onConnect={connect}
          loading={loading}
          balance={balance}
        />

        <AnimatePresence mode="wait">
          {!account ? (
            /* ── Not connected ── */
            <motion.div
              key="connect-prompt"
              className="connect-prompt"
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              <motion.div
                className="connect-prompt-icon"
                animate={{
                  y: [0, -12, 0],
                  rotate: [0, -3, 3, 0],
                }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              >
                🔒
              </motion.div>
              <motion.h2
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                Your personal time-lock vault
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35, duration: 0.5 }}
              >
                Deposit POL, USDC, or any ERC-20 token. Choose a lock duration.
                Funds are <strong>mathematically inaccessible</strong> — even to you — until
                the timer expires.
              </motion.p>
              <motion.button
                className="btn btn-primary"
                onClick={connect}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.5 }}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
              >
                Connect Wallet to Start
              </motion.button>
              <motion.div
                style={{ fontSize: ".78rem", color: "var(--muted)", marginTop: 4 }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
              >
                Works with MetaMask · Coinbase Wallet · any injected wallet
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              key="main-content"
              variants={pageVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              {/* ── Stats row ── */}
              <motion.div className="stats-row" variants={sectionVariants}>
                <AnimatedStat value={stats.total} label="Total locks" />
                <AnimatedStat value={stats.active} label="Active" />
                <AnimatedStat value={stats.available} label="Ready" highlight={stats.available > 0} />
              </motion.div>

              {/* ── Wallet Balance Bar ── */}
              {(balance || tokenBalances.length > 0) && (
                <motion.div
                  className="balance-bar"
                  variants={sectionVariants}
                  initial="hidden"
                  animate="visible"
                >
                  <div className="balance-bar-label">
                    <span className="balance-bar-icon">💰</span> Wallet Balance
                  </div>
                  <div className="balance-tokens">
                    {balance && (
                      <motion.div
                        className="balance-token native"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        whileHover={{ y: -2, boxShadow: "0 6px 20px rgba(0,0,0,.3)" }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                      >
                        <span className="balance-token-amount">
                          {parseFloat(balance.formatted).toFixed(4)}
                        </span>
                        <span className="balance-token-symbol">{balance.symbol}</span>
                      </motion.div>
                    )}
                    {tokenBalances
                      .filter((t) => parseFloat(t.formatted) > 0)
                      .map((t, i) => (
                        <motion.div
                          key={t.address}
                          className="balance-token"
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          whileHover={{ y: -2, boxShadow: "0 6px 20px rgba(0,0,0,.3)" }}
                          transition={{ type: "spring", stiffness: 400, damping: 25, delay: 0.05 * (i + 1) }}
                        >
                          <span className="balance-token-amount">
                            {parseFloat(t.formatted) < 0.0001
                              ? "<0.0001"
                              : parseFloat(t.formatted).toLocaleString(undefined, { maximumFractionDigits: 4 })}
                          </span>
                          <span className="balance-token-symbol">{t.symbol}</span>
                        </motion.div>
                      ))}
                    {tokenBalances.length > 0 && tokenBalances.every((t) => parseFloat(t.formatted) === 0) && (
                      <div className="balance-token empty">
                        <span className="balance-token-amount">No token balances</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* ── Main layout ── */}
              <motion.div className="layout-cols" variants={sectionVariants}>
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
                  <motion.div
                    className="section-title"
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3, duration: 0.4 }}
                  >
                    <span className="section-icon">🏦</span> Your Vaults
                  </motion.div>

                  <AnimatePresence mode="wait">
                    {locks.length === 0 ? (
                      <motion.div
                        key="empty"
                        className="vault-empty"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.4 }}
                      >
                        <motion.p
                          animate={{ y: [0, -6, 0] }}
                          transition={{ duration: 3, repeat: Infinity }}
                        >
                          🏦
                        </motion.p>
                        <p style={{ marginTop: 14, fontWeight: 700, color: "var(--text)", fontSize: "1.05rem" }}>No locks yet</p>
                        <p style={{ fontSize: ".85rem", marginTop: 8, lineHeight: 1.6 }}>
                          Create your first time-lock using the form on the left.
                        </p>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="list"
                        className="vault-list"
                        variants={listContainerVariants}
                        initial="hidden"
                        animate="visible"
                      >
                        <AnimatePresence>
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
                        </AnimatePresence>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>

              {/* ── Contract info ── */}
              <AnimatePresence>
                {contractAddress && (
                  <motion.div
                    className="contract-footer"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, duration: 0.5 }}
                  >
                    <div className="contract-footer-inner">
                      <span className="contract-footer-label">Verified Smart Contract</span>
                      {chainMeta?.explorer ? (
                        <motion.a
                          className="contract-footer-address"
                          href={`${chainMeta.explorer}/address/${contractAddress}`}
                          target="_blank"
                          rel="noreferrer"
                          whileHover={{ scale: 1.02, boxShadow: "0 0 16px rgba(124,58,237,.3)" }}
                        >
                          {contractAddress}
                        </motion.a>
                      ) : (
                        <span className="contract-footer-address">{contractAddress}</span>
                      )}
                      <motion.div
                        className="contract-footer-badges"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.7 }}
                      >
                        {["🔐 Self-custody", "🚫 No admin keys", "💰 Zero fees"].map((badge, i) => (
                          <motion.span
                            key={badge}
                            className="contract-badge"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.8 + i * 0.1, type: "spring", stiffness: 500, damping: 25 }}
                            whileHover={{ scale: 1.08, y: -1 }}
                          >
                            {badge}
                          </motion.span>
                        ))}
                      </motion.div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Toast />
    </>
  );
}
