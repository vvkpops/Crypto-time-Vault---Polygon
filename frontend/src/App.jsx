import React, { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useVault } from "./hooks/useVault";
import Header from "./components/Header";
import DepositForm from "./components/DepositForm";
import VaultCard from "./components/VaultCard";
import Toast, { toast } from "./components/Toast";
import SortMenu, { sortLocks } from "./components/SortMenu";
import HorizonFilter from "./components/HorizonFilter";
import { aggregateByToken, StatChip } from "./components/VaultStats";
import {
  BrandMark, ShieldIcon, LockIcon, CoinIcon, PlusIcon,
  ArrowUpRight, CheckIcon, SparkIcon, VaultIcon, WalletIcon, ClockIcon,
} from "./components/Icons";

const SORT_STORAGE_KEY = "timevault.sortBy";
const HORIZON_STORAGE_KEY = "timevault.horizonDays";

export default function App() {
  const {
    account, chainId, chainMeta, tokens, contractAddress,
    locks, loading, txPending,
    balance, tokenBalances,
    connect, depositNative, depositERC20, withdraw,
  } = useVault();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [sortBy, setSortBy] = useState(() => {
    try { return localStorage.getItem(SORT_STORAGE_KEY) || "newest"; }
    catch { return "newest"; }
  });
  const [horizonDays, setHorizonDays] = useState(() => {
    try { return Number(localStorage.getItem(HORIZON_STORAGE_KEY)) || 7; }
    catch { return 7; }
  });

  useEffect(() => { try { localStorage.setItem(SORT_STORAGE_KEY, sortBy); } catch {} }, [sortBy]);
  useEffect(() => { try { localStorage.setItem(HORIZON_STORAGE_KEY, String(horizonDays)); } catch {} }, [horizonDays]);

  const stats = useMemo(() => {
    const now = Math.floor(Date.now() / 1000);
    const active    = locks.filter((l) => !l.withdrawn);
    const available = locks.filter((l) => !l.withdrawn && Number(l.unlocksAt) <= now);
    return { total: locks.length, active: active.length, available: available.length };
  }, [locks]);

  async function handleDeposit(params) {
    try {
      const hash = params.type === "native"
        ? await depositNative(params)
        : await depositERC20(params);
      toast(`Funds locked successfully · tx ${hash.slice(0, 8)}…`, "success");
    } catch (err) {
      console.error(err);
      toast(err?.reason || err?.message || "Transaction failed", "error");
    }
  }

  async function handleWithdraw(lockIndex) {
    try {
      await withdraw(lockIndex);
      toast("Withdrawal successful — funds back in wallet", "success");
    } catch (err) {
      console.error(err);
      toast(err?.reason || err?.message || "Withdrawal failed", "error");
    }
  }

  const visibleTokenBalances = tokenBalances?.filter((t) => parseFloat(t.formatted) > 0) || [];
  const hasAnyBalance = balance || visibleTokenBalances.length > 0;

  return (
    <>
      <div className="app-shell">
        <Header
          account={account}
          chainMeta={chainMeta}
          onConnect={connect}
          loading={loading}
        />

        <AnimatePresence mode="wait">
          {!account ? (
            <ConnectHero key="hero" onConnect={connect} loading={loading} />
          ) : (
            <Dashboard
              key="dash"
              account={account}
              chainMeta={chainMeta}
              contractAddress={contractAddress}
              locks={locks}
              stats={stats}
              balance={balance}
              tokenBalances={visibleTokenBalances}
              hasAnyBalance={hasAnyBalance}
              chainId={chainId}
              txPending={txPending}
              sortBy={sortBy}
              onSortChange={setSortBy}
              horizonDays={horizonDays}
              onHorizonChange={setHorizonDays}
              onOpenSheet={() => setSheetOpen(true)}
              onWithdraw={handleWithdraw}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Mobile FAB */}
      {account && (
        <motion.button
          className="fab"
          onClick={() => setSheetOpen(true)}
          initial={{ opacity: 0, y: 30, scale: .8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: .3, type: "spring", stiffness: 400, damping: 25 }}
          whileTap={{ scale: .95 }}
        >
          <PlusIcon size={18} />
          New Lock
        </motion.button>
      )}

      <DepositForm
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        tokens={tokens}
        chainMeta={chainMeta}
        onDeposit={handleDeposit}
        txPending={txPending}
        contractAddress={contractAddress}
        tokenBalances={tokenBalances}
        nativeBalance={balance}
      />

      <Toast />
    </>
  );
}

/* ── Hero (not connected) ────────────────────────────────────────────────── */
function ConnectHero({ onConnect, loading }) {
  return (
    <motion.div
      className="hero"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { staggerChildren: .1 } }}
      exit={{ opacity: 0, transition: { duration: .2 } }}
    >
      <motion.div
        className="hero-mark"
        initial={{ opacity: 0, y: 20, scale: .9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: .6, ease: [0.22, 1, 0.36, 1] }}
      >
        <BrandMark size={56} />
      </motion.div>

      <motion.h1
        className="hero-title"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: .15, duration: .5 }}
      >
        Your money, <span className="gold">locked by you</span>.
      </motion.h1>

      <motion.p
        className="hero-sub"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: .3, duration: .5 }}
      >
        A self-custody time-lock vault on Polygon. Deposit POL, USDC, or any ERC-20.
        Funds are mathematically inaccessible — even to you — until the timer expires.
      </motion.p>

      <motion.button
        className="hero-cta"
        onClick={onConnect}
        disabled={loading}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: .45, duration: .5 }}
        whileHover={!loading ? { y: -2 } : {}}
        whileTap={!loading ? { scale: .96 } : {}}
      >
        <WalletIcon size={18} />
        {loading ? "Connecting…" : "Connect Wallet to Start"}
      </motion.button>

      <motion.div
        className="hero-trust"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: .6 }}
      >
        <span><ShieldIcon size={14} /> No admin keys</span>
        <span><LockIcon size={14} /> Audited contract</span>
        <span><CheckIcon size={14} /> Zero fees</span>
      </motion.div>
    </motion.div>
  );
}

/* ── Dashboard (connected) ───────────────────────────────────────────────── */
function Dashboard({
  account, chainMeta, contractAddress,
  locks, stats, balance, tokenBalances, hasAnyBalance,
  chainId, txPending, sortBy, onSortChange,
  horizonDays, onHorizonChange,
  onOpenSheet, onWithdraw,
}) {
  const now = Math.floor(Date.now() / 1000);
  const horizonTs = now + horizonDays * 86400;

  /* Partition locks */
  const inProgress = useMemo(() => locks.filter((l) => !l.withdrawn), [locks]);
  const withdrawn  = useMemo(() => locks.filter((l) => l.withdrawn), [locks]);

  const readyNow = useMemo(
    () => inProgress.filter((l) => Number(l.unlocksAt) <= now),
    [inProgress, now]
  );
  const readyByHorizon = useMemo(
    () => inProgress.filter((l) => {
      const t = Number(l.unlocksAt);
      return t > now && t <= horizonTs;
    }),
    [inProgress, now, horizonTs]
  );
  const stillLocked = useMemo(
    () => inProgress.filter((l) => Number(l.unlocksAt) > now),
    [inProgress, now]
  );

  /* Per-token aggregates */
  const totLocked   = useMemo(() => aggregateByToken(stillLocked, chainId, chainMeta), [stillLocked, chainId, chainMeta]);
  const totReady    = useMemo(() => aggregateByToken(readyNow, chainId, chainMeta), [readyNow, chainId, chainMeta]);
  const totHorizon  = useMemo(() => aggregateByToken(readyByHorizon, chainId, chainMeta), [readyByHorizon, chainId, chainMeta]);
  const totWithdrawn = useMemo(() => aggregateByToken(withdrawn, chainId, chainMeta), [withdrawn, chainId, chainMeta]);

  const sortedInProgress = useMemo(() => sortLocks(inProgress, sortBy), [inProgress, sortBy]);
  const sortedWithdrawn  = useMemo(() => sortLocks(withdrawn, sortBy === "ready" ? "newest" : sortBy), [withdrawn, sortBy]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: .4 }}
    >
      {/* ── Unified top dashboard ── */}
      <motion.div
        className="tvl-hero unified"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: .5, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="dash-top">
          <div className="tvl-label">
            <VaultIcon size={14} />
            Your Vault Activity
          </div>
          <div className="dash-headline-counts">
            <span className="dash-count-item"><strong>{stats.total}</strong>total</span>
            <span className="dash-count-divider">·</span>
            <span className="dash-count-item"><strong>{stats.active}</strong>locked</span>
            <span className="dash-count-divider">·</span>
            <span className={`dash-count-item ${stats.available > 0 ? "ready" : ""}`}>
              <strong>{stats.available}</strong>ready
            </span>
          </div>
        </div>

        <div className="dash-filter">
          <HorizonFilter value={horizonDays} onChange={onHorizonChange} />
        </div>

        <div className="stat-chips-row dash-chips">
          <StatChip
            icon={<LockIcon size={14} />}
            label="Currently Locked"
            count={stillLocked.length}
            tokens={totLocked}
            accent="locked"
          />
          <StatChip
            icon={<CheckIcon size={14} />}
            label="Ready Now"
            count={readyNow.length}
            tokens={totReady}
            accent="ready"
          />
          <StatChip
            icon={<ClockIcon size={14} />}
            label={`Ready in ${horizonDays}d`}
            count={readyByHorizon.length}
            tokens={totHorizon}
            accent="horizon"
          />
        </div>
      </motion.div>

      {/* ── Wallet balances strip ── */}
      {hasAnyBalance && (
        <motion.div
          className="balances"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: .1, duration: .4 }}
        >
          {balance && (
            <div className="bal-chip native">
              <WalletIcon size={16} style={{ color: "var(--gold)" }} />
              <div className="bal-info">
                <span className="bal-amount">{parseFloat(balance.formatted).toFixed(4)}</span>
                <span className="bal-symbol">{balance.symbol}</span>
              </div>
            </div>
          )}
          {tokenBalances.map((t) => (
            <div key={t.address} className="bal-chip">
              <CoinIcon size={16} style={{ color: "var(--text-3)" }} />
              <div className="bal-info">
                <span className="bal-amount">
                  {parseFloat(t.formatted) < 0.0001
                    ? "<0.0001"
                    : parseFloat(t.formatted).toLocaleString(undefined, { maximumFractionDigits: 4 })}
                </span>
                <span className="bal-symbol">{t.symbol}</span>
              </div>
            </div>
          ))}
        </motion.div>
      )}

      {/* ── Two-column split ── */}
      <div className="vault-columns">
        {/* ── In Progress column ── */}
        <section className="vault-col">
          <div className="section-head">
            <div className="section-title">
              <span className="section-title-icon"><ClockIcon size={14} /></span>
              In Progress
              {inProgress.length > 0 && <span className="section-count">{inProgress.length}</span>}
            </div>
            <div className="section-actions">
              {inProgress.length > 1 && <SortMenu value={sortBy} onChange={onSortChange} />}
              <button className="section-action desktop-only" onClick={onOpenSheet}>
                <PlusIcon size={14} /> New Lock
              </button>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {inProgress.length === 0 ? (
              <motion.div
                key="empty-in-progress"
                className="vault-empty"
                initial={{ opacity: 0, scale: .96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: .96 }}
              >
                <div className="vault-empty-icon"><VaultIcon size={28} /></div>
                <div className="vault-empty-title">No active vaults</div>
                <div className="vault-empty-sub">
                  Create your first time-lock by tapping the <strong>New Lock</strong> button.
                </div>
                <button
                  className="hero-cta"
                  style={{ marginTop: 20, padding: "12px 24px", fontSize: ".95rem" }}
                  onClick={onOpenSheet}
                >
                  <PlusIcon size={16} />
                  Create First Lock
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="list-in-progress"
                className="vault-list"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { staggerChildren: .05 } }}
              >
                <AnimatePresence>
                  {sortedInProgress.map((lock) => (
                    <VaultCard
                      key={lock._index}
                      lock={lock}
                      lockIndex={lock._index}
                      onWithdraw={onWithdraw}
                      txPending={txPending}
                      chainId={chainId}
                      chainMeta={chainMeta}
                      horizonDays={horizonDays}
                    />
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* ── Withdrawn column ── */}
        <section className="vault-col withdrawn-col">
          <div className="section-head">
            <div className="section-title">
              <span className="section-title-icon"><CheckIcon size={14} /></span>
              Withdrawn
              {withdrawn.length > 0 && <span className="section-count">{withdrawn.length}</span>}
            </div>
          </div>

          {withdrawn.length > 0 && (
            <div className="withdrawn-summary">
              <StatChip
                icon={<CheckIcon size={14} />}
                label="Total Withdrawn"
                count={withdrawn.length}
                tokens={totWithdrawn}
                accent="withdrawn"
              />
            </div>
          )}

          <AnimatePresence mode="wait">
            {withdrawn.length === 0 ? (
              <motion.div
                key="empty-withdrawn"
                className="vault-empty withdrawn-empty"
                initial={{ opacity: 0, scale: .96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: .96 }}
              >
                <div className="vault-empty-icon"><CheckIcon size={28} /></div>
                <div className="vault-empty-title">No withdrawals yet</div>
                <div className="vault-empty-sub">
                  Completed withdrawals will appear here.
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="list-withdrawn"
                className="vault-list"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { staggerChildren: .05 } }}
              >
                <AnimatePresence>
                  {sortedWithdrawn.map((lock) => (
                    <VaultCard
                      key={lock._index}
                      lock={lock}
                      lockIndex={lock._index}
                      onWithdraw={onWithdraw}
                      txPending={txPending}
                      chainId={chainId}
                      chainMeta={chainMeta}
                      horizonDays={horizonDays}
                    />
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </div>

      {/* ── Footer ── */}
      {contractAddress && (
        <motion.div
          className="footer"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: .3 }}
        >
          <div className="footer-label">Verified Smart Contract</div>
          {chainMeta?.explorer ? (
            <a
              className="footer-addr"
              href={`${chainMeta.explorer}/address/${contractAddress}`}
              target="_blank"
              rel="noreferrer"
            >
              {contractAddress} <ArrowUpRight size={12} />
            </a>
          ) : (
            <span className="footer-addr">{contractAddress}</span>
          )}
          <div className="footer-badges">
            <span className="footer-badge"><ShieldIcon size={12} /> Self-custody</span>
            <span className="footer-badge"><LockIcon size={12} /> No admin keys</span>
            <span className="footer-badge"><CheckIcon size={12} /> Zero fees</span>
            <span className="footer-badge"><SparkIcon size={12} /> Audited</span>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
