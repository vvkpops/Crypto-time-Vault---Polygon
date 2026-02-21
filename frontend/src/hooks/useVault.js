import { useState, useEffect, useCallback, useRef } from "react";
import { ethers } from "ethers";
import { CHAIN_META, KNOWN_TOKENS } from "../utils/format";

// These files are auto-populated by running: npm run compile && npm run deploy:polygon
import _addresses from "../contracts/addresses.json";
import _artifact  from "../contracts/TimeVault.json";

const ADDRESSES = _addresses || {};
const ABI       = _artifact?.abi || [];

export function useVault() {
  const [provider, setProvider]   = useState(null);
  const [signer, setSigner]       = useState(null);
  const [account, setAccount]     = useState(null);
  const [chainId, setChainId]     = useState(null);
  const [contract, setContract]   = useState(null);
  const [locks, setLocks]         = useState([]);
  const [loading, setLoading]     = useState(false);
  const [txPending, setTxPending] = useState(false);
  const refreshTimer = useRef(null);

  // ─── Internal: build provider/signer/contract from current MM state ───────
  const _attachWallet = useCallback(async () => {
    if (!window.ethereum) return;
    try {
      const _provider = new ethers.BrowserProvider(window.ethereum);
      const _signer   = await _provider.getSigner();
      const _account  = await _signer.getAddress();
      const net       = await _provider.getNetwork();
      const _chainId  = Number(net.chainId);
      setProvider(_provider);
      setSigner(_signer);
      setAccount(_account);
      setChainId(_chainId);
      const addr = ADDRESSES[chainIdToNetworkName(_chainId)];
      setContract(addr && ABI.length > 0 ? new ethers.Contract(addr, ABI, _signer) : null);
    } catch { /* not authorized yet — stay disconnected */ }
  }, []);

  // ─── Auto-reconnect on page load if already authorized ────────────────────
  useEffect(() => {
    if (!window.ethereum) return;
    window.ethereum.request({ method: "eth_accounts" }).then((accounts) => {
      if (accounts?.length > 0) _attachWallet();
    });

    // Re-attach whenever user switches account or network in MetaMask
    window.ethereum.on("accountsChanged", (accounts) => {
      if (accounts?.length > 0) _attachWallet();
      else { setAccount(null); setChainId(null); setContract(null); }
    });
    window.ethereum.on("chainChanged", () => _attachWallet());

    return () => {
      window.ethereum.removeListener("accountsChanged", _attachWallet);
      window.ethereum.removeListener("chainChanged",    _attachWallet);
    };
  }, [_attachWallet]);

  // ─── Connect wallet ───────────────────────────────────────────────────────
  const connect = useCallback(async () => {
    // ── Test bypass: Playwright injects window.__TEST_WALLET__ to skip
    //    the real ethers.BrowserProvider flow in CI/E2E environments ──────────
    if (window.__TEST_WALLET__) {
      const { account, chainId } = window.__TEST_WALLET__;
      setAccount(account);
      setChainId(chainId);
      return;
    }

    if (!window.ethereum) {
      alert("MetaMask (or Coinbase Wallet) not found.\nInstall it from metamask.io");
      return;
    }
    setLoading(true);
    try {
      // Step 1 — unlock accounts
      await window.ethereum.request({ method: "eth_requestAccounts" });

      // Step 2 — switch to Polygon
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0x89" }], // 137 = Polygon
        });
      } catch (switchErr) {
        // 4902 = chain not added yet — add it
        if (switchErr.code === 4902) {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [{
              chainId: "0x89",
              chainName: "Polygon Mainnet",
              nativeCurrency: { name: "POL", symbol: "POL", decimals: 18 },
              rpcUrls: ["https://polygon-bor-rpc.publicnode.com"],
              blockExplorerUrls: ["https://polygonscan.com"],
            }],
          });
        }
        // user rejected switch — continue on whatever chain they're on
      }

      // Step 3 — build provider/signer/contract fresh after switch
      await _attachWallet();
    } finally {
      setLoading(false);
    }
  }, [_attachWallet]);

  // ─── Fetch locks ──────────────────────────────────────────────────────────
  const fetchLocks = useCallback(async () => {
    if (!contract || !account) return;
    try {
      const raw = await contract.getLocks(account);
      setLocks(raw.map((l, idx) => ({
        id:        l.id,
        token:     l.token,
        amount:    l.amount,
        unlocksAt: l.unlocksAt,
        createdAt: l.createdAt,
        label:     l.label,
        withdrawn: l.withdrawn,
        _index:    idx,
      })));
    } catch (err) {
      // Suppress RPC rate-limit noise; real errors still logged
      if (!err?.message?.includes("too many errors") && !err?.message?.includes("missing revert data")) {
        console.error("fetchLocks:", err);
      }
    }
  }, [contract, account]);

  useEffect(() => {
    fetchLocks();
    refreshTimer.current = setInterval(fetchLocks, 15000); // refresh every 15s
    return () => clearInterval(refreshTimer.current);
  }, [fetchLocks]);

  // ─── Deposit native ───────────────────────────────────────────────────────
  const depositNative = useCallback(async ({ amount, durationSec, label }) => {
    if (!contract) throw new Error("Contract not connected");
    setTxPending(true);
    try {
      const tx = await contract.depositNative(durationSec, label, {
        value: ethers.parseEther(amount),
      });
      await tx.wait();
      await fetchLocks();
      return tx.hash;
    } finally {
      setTxPending(false);
    }
  }, [contract, fetchLocks]);

  // ─── Deposit ERC-20 ───────────────────────────────────────────────────────
  const depositERC20 = useCallback(async ({ tokenAddress, decimals, amount, durationSec, label }) => {
    if (!contract || !signer) throw new Error("Contract not connected");
    setTxPending(true);
    try {
      const erc20 = new ethers.Contract(
        tokenAddress,
        ["function approve(address,uint256) returns (bool)",
         "function allowance(address,address) view returns (uint256)"],
        signer
      );

      const contractAddress = await contract.getAddress();
      const parsed = ethers.parseUnits(amount, decimals);

      // Approve if needed
      const allowance = await erc20.allowance(account, contractAddress);
      if (allowance < parsed) {
        const approveTx = await erc20.approve(contractAddress, parsed);
        await approveTx.wait();
      }

      const tx = await contract.depositERC20(tokenAddress, parsed, durationSec, label);
      await tx.wait();
      await fetchLocks();
      return tx.hash;
    } finally {
      setTxPending(false);
    }
  }, [contract, signer, account, fetchLocks]);

  // ─── Withdraw ─────────────────────────────────────────────────────────────
  const withdraw = useCallback(async (lockIndex) => {
    if (!contract) throw new Error("Contract not connected");
    setTxPending(true);
    try {
      const tx = await contract.withdraw(lockIndex);
      await tx.wait();
      await fetchLocks();
      return tx.hash;
    } finally {
      setTxPending(false);
    }
  }, [contract, fetchLocks]);

  const chainMeta = CHAIN_META[chainId] || {};
  const tokens    = KNOWN_TOKENS[chainId] || [];
  const contractAddress = ADDRESSES[chainIdToNetworkName(chainId)] || null;

  return {
    account, chainId, chainMeta, tokens, contractAddress,
    locks, loading, txPending,
    connect, depositNative, depositERC20, withdraw, fetchLocks,
  };
}

function chainIdToNetworkName(id) {
  const map = { 8453: "base", 84532: "baseSepolia", 137: "polygon", 31337: "localhost", 1: "homestead" };
  return map[id] || String(id);
}
