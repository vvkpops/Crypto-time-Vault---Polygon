# 🔒 TimeVault — Self-Custody Time-Locked Savings dApp

A fully decentralized savings vault on **Base** (or Polygon).  
Deposit ETH or any ERC-20 token (USDC, USDT, WBTC…), choose a lock duration,  
and your funds are **mathematically inaccessible until the timer expires** — even to you.

No bank. No middleman. No admin key. Just math.

---

## How it works

1. You connect your wallet (MetaMask / Coinbase Wallet)  
2. You choose an asset and how long to lock it (1 week → 50 years)  
3. You deposit — the smart contract holds the funds  
4. The contract **blocks every withdrawal attempt** until the unlock timestamp  
5. Once expired, only **you** can withdraw to your wallet

---

## Project Structure

```
Crypto App/
├── contracts/
│   ├── TimeVault.sol        ← The vault smart contract
│   └── mocks/ERC20Mock.sol  ← Test helper only
├── scripts/
│   └── deploy.js            ← Deploys contract & saves ABI/address to frontend
├── test/
│   └── TimeVault.test.js    ← 8 automated tests
├── hardhat.config.js
├── .env.example             ← Copy to .env and fill in
├── package.json
└── frontend/
    ├── index.html
    ├── src/
    │   ├── App.jsx
    │   ├── hooks/useVault.js       ← All blockchain logic
    │   ├── utils/format.js         ← Token lists, helpers
    │   └── components/
    │       ├── Header.jsx
    │       ├── DepositForm.jsx      ← Lock creation form
    │       ├── VaultCard.jsx        ← Live countdown + withdraw
    │       └── Toast.jsx
    └── package.json
```

---

## Step-by-Step Setup Guide

### Prerequisites

- [Node.js 18+](https://nodejs.org)  
- [MetaMask](https://metamask.io) browser extension (or Coinbase Wallet)  
- A small amount of test ETH (free from a faucet — see below)

---

### Step 1 — Install dependencies

```bash
# In the root folder (smart contracts)
npm install

# In the frontend folder
cd frontend
npm install
cd ..
```

---

### Step 2 — Configure your wallet key

```bash
# Copy the example env file
copy .env.example .env
```

Edit `.env` and fill in:

```env
PRIVATE_KEY=your_wallet_private_key_here
```

> **How to get your private key from MetaMask:**  
> MetaMask → click account name → Account Details → Export Private Key  
> ⚠️ Never share this key. Never commit .env to git.

---

### Step 3 — Get free testnet ETH (Base Sepolia)

1. Go to [https://www.coinbase.com/faucets/base-ethereum-goerli-faucet](https://www.coinbase.com/faucets/base-ethereum-goerli-faucet)  
   or [https://faucet.quicknode.com/base/sepolia](https://faucet.quicknode.com/base/sepolia)
2. Paste your wallet address  
3. Receive ~0.1 ETH for free (enough for hundreds of transactions)

---

### Step 4 — Compile the contracts

```bash
npm run compile
```

---

### Step 5 — Deploy to Base Sepolia testnet (FREE)

```bash
npm run deploy:base-sepolia
```

This will:
- Deploy the `TimeVault` contract to Base Sepolia  
- Print the contract address  
- Automatically save the ABI and address to `frontend/src/contracts/`

---

### Step 6 — Run the frontend

```bash
cd frontend
npm run dev
```

Open **http://localhost:5173** in your browser.

1. Click **Connect Wallet**  
2. Switch MetaMask to **Base Sepolia** network  
3. Deposit some test ETH with a lock duration  
4. Watch the live countdown  
5. Withdraw once the timer hits zero ✅

---

### Step 7 — Deploy to Mainnet (when ready)

**Base mainnet** (recommended — ~$0.001/tx):
```bash
npm run deploy:base
```

**Polygon** (~$0.01/tx):
```bash
npm run deploy:polygon
```

Then fund your wallet with real ETH (on Base) or MATIC (on Polygon) for gas.

---

## Adding Base network to MetaMask

If Base Sepolia isn't in MetaMask yet:

1. Go to [https://chainlist.org](https://chainlist.org)  
2. Search "Base Sepolia"  
3. Click "Add to MetaMask"

Or use these settings manually:

| Field | Base Sepolia | Base Mainnet |
|---|---|---|
| Network Name | Base Sepolia | Base |
| RPC URL | https://sepolia.base.org | https://mainnet.base.org |
| Chain ID | 84532 | 8453 |
| Symbol | ETH | ETH |
| Explorer | https://sepolia.basescan.org | https://basescan.org |

---

## Running Tests

```bash
npm test
```

All 8 tests cover:
- Native coin locking & time enforcement  
- ERC-20 token locking  
- Double-withdrawal prevention  
- Multiple independent locks per wallet  
- Countdown accuracy

---

## Smart Contract Security

- **No admin / owner** — nobody can touch your funds  
- **No upgrade proxy** — the code is immutable after deployment  
- **ReentrancyGuard** — protects against re-entrancy attacks  
- **SafeERC20** — handles fee-on-transfer tokens correctly  
- **Custom errors** — gas-efficient reverts  
- Minimum lock: 1 minute | Maximum: 50 years  

---

## Verify contract on Basescan (optional)

1. Get a free API key at [https://basescan.org/apis](https://basescan.org/apis)  
2. Add to `.env`: `BASESCAN_API_KEY=your_key`  
3. The deploy script verifies automatically after deployment

---

## Swapping tokens before locking

Want to lock USDC instead of ETH?  
Swap on [Uniswap on Base](https://app.uniswap.org) or [Aerodrome](https://aerodrome.finance) — both have near-zero fees on Base.

---

## Cost estimate (Base mainnet)

| Action | Gas cost (approx) |
|---|---|
| Deploy contract (one-time) | ~$0.05 |
| Deposit native ETH | ~$0.002 |
| Deposit ERC-20 (incl. approve) | ~$0.005 |
| Withdraw | ~$0.002 |
