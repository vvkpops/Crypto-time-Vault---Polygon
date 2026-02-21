#!/usr/bin/env node
/**
 * auto-withdraw.js  —  Self-hosted daemon that monitors your TimeVault locks
 * and automatically calls withdraw() the moment a lock expires.
 *
 * Usage:
 *   node scripts/auto-withdraw.js              # uses .env defaults (Polygon)
 *   POLL_INTERVAL=30 node scripts/auto-withdraw.js   # check every 30 seconds
 *
 * Requires the same .env file used for deployment:
 *   PRIVATE_KEY   — your wallet private key (same wallet that deposited)
 *   POLYGON_RPC   — RPC endpoint (default: Ankr public)
 *
 * Runs on YOUR server, YOUR key, YOUR gas — no third-party trust required.
 */

const { ethers } = require("ethers");
const fs   = require("fs");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "..", ".env") });

// ─── Config ──────────────────────────────────────────────────────────────────

const PRIVATE_KEY    = process.env.PRIVATE_KEY;
const RPC_URL        = process.env.POLYGON_RPC || "https://rpc.ankr.com/polygon";
const POLL_SECONDS   = Number(process.env.POLL_INTERVAL) || 60;   // default: check every 60s

if (!PRIVATE_KEY || PRIVATE_KEY === "your_private_key_here") {
  console.error("❌  Set PRIVATE_KEY in .env before running this script.");
  process.exit(1);
}

// ─── Load contract info ──────────────────────────────────────────────────────

const addressesPath = path.resolve(__dirname, "..", "frontend", "src", "contracts", "addresses.json");
const artifactPath  = path.resolve(__dirname, "..", "frontend", "src", "contracts", "TimeVault.json");

const addresses = JSON.parse(fs.readFileSync(addressesPath, "utf-8"));
const artifact  = JSON.parse(fs.readFileSync(artifactPath,  "utf-8"));

// ─── Setup provider / signer / contract ──────────────────────────────────────

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet   = new ethers.Wallet(PRIVATE_KEY, provider);

async function resolveContract() {
  const net     = await provider.getNetwork();
  const chainId = Number(net.chainId);

  const CHAIN_NAMES = {
    137: "polygon", 8453: "base", 84532: "baseSepolia", 31337: "localhost", 1: "homestead",
  };
  const networkName = CHAIN_NAMES[chainId] || String(chainId);
  const contractAddr = addresses[networkName];

  if (!contractAddr) {
    console.error(`❌  No deployed contract address found for chain ${chainId} (${networkName}).`);
    console.error(`    addresses.json has: ${JSON.stringify(addresses)}`);
    process.exit(1);
  }

  console.log(`🔗  Chain:    ${chainId} (${networkName})`);
  console.log(`📄  Contract: ${contractAddr}`);
  console.log(`👛  Wallet:   ${wallet.address}`);
  console.log(`⏱   Polling:  every ${POLL_SECONDS}s\n`);

  return new ethers.Contract(contractAddr, artifact.abi, wallet);
}

// ─── Main loop ───────────────────────────────────────────────────────────────

async function checkAndWithdraw(contract) {
  const now = Math.floor(Date.now() / 1000);

  let locks;
  try {
    locks = await contract.getLocks(wallet.address);
  } catch (err) {
    console.error(`⚠  Failed to fetch locks: ${err.message}`);
    return;
  }

  let pending = 0;

  for (let i = 0; i < locks.length; i++) {
    const lock = locks[i];
    const withdrawn = lock.withdrawn ?? lock[6];
    const unlocksAt = Number(lock.unlocksAt ?? lock[3]);
    const amount    = lock.amount ?? lock[2];
    const label     = lock.label  ?? lock[5] ?? `Lock #${i}`;

    // Skip already-withdrawn locks
    if (withdrawn) continue;

    // Skip locks that haven't expired yet
    if (unlocksAt > now) {
      pending++;
      const secsLeft = unlocksAt - now;
      const d = Math.floor(secsLeft / 86400);
      const h = Math.floor((secsLeft % 86400) / 3600);
      const m = Math.floor((secsLeft % 3600) / 60);
      console.log(`   🔒  "${label}" — ${d}d ${h}h ${m}m remaining`);
      continue;
    }

    // Lock expired → withdraw!
    console.log(`   🟢  "${label}" expired — withdrawing...`);
    try {
      const tx = await contract.withdraw(i);
      console.log(`   ⏳  TX submitted: ${tx.hash}`);
      const receipt = await tx.wait();
      console.log(`   ✅  Withdrawn! Gas used: ${receipt.gasUsed.toString()}`);
    } catch (err) {
      const reason = err?.reason || err?.message || "unknown error";
      console.error(`   ❌  Withdraw failed for index ${i}: ${reason}`);
    }
  }

  if (pending === 0 && locks.length > 0) {
    console.log(`   ✅  All ${locks.length} locks already withdrawn.`);
  } else if (locks.length === 0) {
    console.log(`   📭  No locks found for this wallet.`);
  }
}

async function main() {
  console.log("╔══════════════════════════════════════════╗");
  console.log("║   TimeVault Auto-Withdraw Daemon  🤖    ║");
  console.log("╚══════════════════════════════════════════╝\n");

  const contract = await resolveContract();

  // Run immediately on startup
  console.log(`[${new Date().toLocaleString()}] Checking locks...`);
  await checkAndWithdraw(contract);

  // Then poll on interval
  setInterval(async () => {
    console.log(`\n[${new Date().toLocaleString()}] Checking locks...`);
    await checkAndWithdraw(contract);
  }, POLL_SECONDS * 1000);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
