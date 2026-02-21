# 🔒 TimeVault — Self-Custody Time-Locked Savings dApp

A fully decentralized savings vault on **Polygon**.  
Deposit POL or any ERC-20 token (USDC, USDT, WETH, WBTC…), choose a lock duration,  
and your funds are **mathematically inaccessible until the timer expires** — even to you.

No bank. No middleman. No admin key. Just math.

> **Live Contract:** [`0x131272Ad93eD41a3DdDc393C0dA3d6B6F27e8d23`](https://polygonscan.com/address/0x131272Ad93eD41a3DdDc393C0dA3d6B6F27e8d23) on Polygon Mainnet

---

## How it works

1. You connect your wallet (MetaMask / Coinbase Wallet)  
2. You choose an asset and how long to lock it (1 week → 50 years)  
3. You deposit — the smart contract holds the funds  
4. The contract **blocks every withdrawal attempt** until the unlock timestamp  
5. Once expired, only **you** can withdraw to your wallet

**Multi-wallet support:** Any wallet can use the contract. Switch wallets freely — each wallet sees only its own locks. Come back anytime from any device to withdraw.

---

## Project Structure

```
Crypto App/
├── contracts/
│   ├── TimeVault.sol            ← The vault smart contract
│   └── mocks/ERC20Mock.sol      ← Test helper only
├── scripts/
│   ├── deploy.js                ← Deploys contract & saves ABI/address
│   └── auto-withdraw.js         ← Self-hosted auto-withdraw daemon
├── test/
│   └── TimeVault.test.js        ← Automated tests
├── hardhat.config.js
├── vercel.json                  ← Vercel deployment config
├── .env.example
├── package.json
└── frontend/
    ├── index.html
    ├── src/
    │   ├── App.jsx
    │   ├── hooks/useVault.js         ← All blockchain logic
    │   ├── utils/format.js           ← Token lists, helpers
    │   ├── contracts/
    │   │   ├── addresses.json        ← Deployed contract address
    │   │   └── TimeVault.json        ← Contract ABI
    │   └── components/
    │       ├── Header.jsx
    │       ├── DepositForm.jsx
    │       ├── VaultCard.jsx
    │       └── Toast.jsx
    └── package.json
```

---

## Step-by-Step Setup Guide

### For Users (just use the dApp)

The contract is **already deployed** on Polygon. You just need MetaMask:

1. Visit the live site (or run the frontend locally — see below)  
2. Click **Connect Wallet** — MetaMask will prompt to switch to Polygon  
3. Deposit POL or any ERC-20 token, set a lock duration  
4. Come back anytime from any device to withdraw once expired

> **No private key needed.** All transactions are signed in your wallet.

---

### For Developers (run locally)

#### Prerequisites

- [Node.js 18+](https://nodejs.org)  
- [MetaMask](https://metamask.io) browser extension

#### Step 1 — Install dependencies

```bash
# In the root folder (smart contracts)
npm install

# In the frontend folder
cd frontend
npm install
cd ..
```

#### Step 2 — Run the frontend

```bash
cd frontend
npm run dev
```

Open **http://localhost:5173** — connect MetaMask and you're using the live Polygon contract.

> The contract address and ABI are already baked into `frontend/src/contracts/`.  
> No `.env` or private key needed to run the frontend.

---

### Deploy to Vercel (one click)

This repo is Vercel-ready. To deploy:

1. Push to GitHub  
2. Import the repo at [vercel.com/new](https://vercel.com/new)  
3. Vercel auto-detects `vercel.json` — no configuration needed  
4. Hit **Deploy**

That's it. No environment variables required — the frontend is purely client-side.

---

### Redeploying the Contract (optional)

Only needed if you want your **own** contract on a different chain or address:

```bash
# 1. Create .env with your private key
copy .env.example .env
# Edit .env → PRIVATE_KEY=your_key

# 2. Deploy
npm run deploy:polygon    # or deploy:base, deploy:base-sepolia
```

This overwrites `frontend/src/contracts/addresses.json` with the new address.

---

## Adding Polygon to MetaMask

The app auto-prompts MetaMask to add Polygon. If you need to add it manually:

| Field | Value |
|---|---|
| Network Name | Polygon Mainnet |
| RPC URL | https://polygon-bor-rpc.publicnode.com |
| Chain ID | 137 |
| Symbol | POL |
| Explorer | https://polygonscan.com |

---

## Auto-Withdraw Daemon (optional)

Run on your own server to automatically withdraw locks the moment they expire:

```bash
# Uses .env (PRIVATE_KEY + POLYGON_RPC)
npm run auto-withdraw
```

Or with PM2 for persistent background execution:

```bash
pm2 start scripts/auto-withdraw.js --name vault-daemon
```

> Your key stays on your server. No third-party trust.

---

## Running Tests

```bash
# Smart contract tests
npm test

# Frontend unit tests
cd frontend && npm test

# E2E tests
cd frontend && npm run test:e2e
```

---

## Smart Contract Security

- **No admin / owner** — nobody can touch your funds  
- **No upgrade proxy** — the code is immutable after deployment  
- **ReentrancyGuard** — protects against re-entrancy attacks  
- **SafeERC20** — handles fee-on-transfer tokens correctly  
- **Custom errors** — gas-efficient reverts  
- Minimum lock: 1 minute | Maximum: 50 years  

---

## Verify contract on PolygonScan (optional)

1. Get a free API key at [https://polygonscan.com/apis](https://polygonscan.com/apis)  
2. Add to `.env`: `POLYGONSCAN_API_KEY=your_key`  
3. The deploy script verifies automatically after deployment

---

## Supported Tokens (Polygon)

| Token | Address |
|---|---|
| POL (native) | — |
| USDC | `0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359` |
| USDT | `0xc2132D05D31c914a87C6611C10748AEb04B58e8F` |
| WETH | `0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619` |
| WBTC | `0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6` |

Any ERC-20 token can be locked using the custom address option.

---

## Cost Estimate (Polygon Mainnet)

| Action | Gas cost (approx) |
|---|---|
| Deposit native POL | ~$0.005 |
| Deposit ERC-20 (incl. approve) | ~$0.01 |
| Withdraw | ~$0.005 |
