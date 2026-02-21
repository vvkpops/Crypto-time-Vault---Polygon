# TimeVault — V1.1.3 Documentation

> **Self-custody time-locked crypto savings on Polygon**

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Smart Contract Documentation](#2-smart-contract-documentation)
3. [Frontend Architecture](#3-frontend-architecture)
4. [Test Coverage Summary](#4-test-coverage-summary)
5. [Technology Stack](#5-technology-stack)
6. [Development Guide](#6-development-guide)
7. [Version History](#7-version-history)
8. [Deployment](#8-deployment)

---

## 1. Project Overview

### What is TimeVault?

TimeVault is a **self-custody time-locked savings vault** deployed on the **Polygon** blockchain. Users deposit native coins (POL) or any ERC-20 token, choose a lock duration (from 1 minute to 50 years), and the funds become **mathematically inaccessible** — even to the depositor — until the timer expires. There are no admin keys, no fees, and no escape hatches.

### Key Features

- **Native coin locking** — Lock POL (Polygon) with any duration
- **ERC-20 token locking** — Lock USDC, USDT, WBTC, WETH, or any custom ERC-20
- **Self-custody** — No admin, no owner, no backdoor. Only the depositor can withdraw after expiry
- **Zero fees** — The contract charges nothing
- **Labels** — Tag each lock with a personal note (e.g. "Holiday fund 2027")
- **Multiple locks** — Each user can have unlimited independent locks
- **Live countdown** — Real-time countdown timers on each vault card
- **Auto-withdraw daemon** — Optional Node.js script to auto-withdraw expired locks
- **Premium dark UI** — Glassmorphism design with Framer Motion animations

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React + Vite)                  │
│                        Deployed on Vercel                       │
│                                                                 │
│  ┌──────────┐  ┌──────────────┐  ┌───────────┐  ┌───────────┐  │
│  │  Header   │  │ DepositForm  │  │ VaultCard │  │   Toast   │  │
│  └─────┬────┘  └──────┬───────┘  └─────┬─────┘  └─────┬─────┘  │
│        │               │               │               │        │
│        └───────────────┴───────┬───────┘               │        │
│                                │                       │        │
│                     ┌──────────┴──────────┐             │        │
│                     │   useVault (hook)   ├─────────────┘        │
│                     └──────────┬──────────┘                      │
│                                │ ethers.js v6                    │
└────────────────────────────────┼────────────────────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │   MetaMask / Coinbase   │
                    │    Wallet (injected)    │
                    └────────────┬────────────┘
                                 │ JSON-RPC
                    ┌────────────┴────────────┐
                    │   Polygon Mainnet       │
                    │   Chain ID: 137         │
                    │                         │
                    │  ┌───────────────────┐  │
                    │  │   TimeVault.sol   │  │
                    │  │ (ReentrancyGuard) │  │
                    │  │ (SafeERC20)       │  │
                    │  └───────────────────┘  │
                    └─────────────────────────┘

┌─────────────────────────────────────────────┐
│          Auto-Withdraw Daemon (Node.js)     │
│          scripts/auto-withdraw.js           │
│          Polls locks, withdraws when ready  │
└─────────────────────────────────────────────┘
```

### Repository

- **GitHub:** https://github.com/vvkpops/Crypto-time-Vault---Polygon
- **Live Frontend:** Deployed on Vercel
- **Contract (Polygon):** `0x131272Ad93eD41a3DdDc893C0dA3d6B6F27e8d23`

---

## 2. Smart Contract Documentation

### Contract Info

| Property | Value |
|----------|-------|
| **Name** | TimeVault |
| **Solidity Version** | ^0.8.20 |
| **License** | MIT |
| **Network** | Polygon Mainnet (Chain ID 137) |
| **Address** | `0x131272Ad93eD41a3DdDc893C0dA3d6B6F27e8d23` |
| **Inherits** | OpenZeppelin `ReentrancyGuard` |
| **Uses** | OpenZeppelin `SafeERC20`, `IERC20` |

### Data Structures

#### `Lock` Struct

| Field | Type | Description |
|-------|------|-------------|
| `id` | `uint256` | Unique lock ID (global counter) |
| `token` | `address` | `address(0)` for native coin; ERC-20 contract address otherwise |
| `amount` | `uint256` | Amount locked (in smallest unit, e.g. wei) |
| `unlocksAt` | `uint256` | Unix timestamp when funds become withdrawable |
| `createdAt` | `uint256` | Unix timestamp of when the lock was created |
| `label` | `string` | Optional personal note (e.g. "Holiday fund 2026") |
| `withdrawn` | `bool` | `true` after the user has claimed the funds |

### Constants

| Constant | Value | Description |
|----------|-------|-------------|
| `MIN_LOCK_DURATION` | `1 minutes` (60 seconds) | Minimum allowed lock duration |
| `MAX_LOCK_DURATION` | `50 * 365 days` (1,576,800,000 seconds) | Maximum allowed lock duration (~50 years) |

### Functions

#### `depositNative(uint256 lockDuration, string calldata label) external payable nonReentrant`

Locks native coin (POL on Polygon, ETH on Base/Ethereum).

| Parameter | Type | Description |
|-----------|------|-------------|
| `lockDuration` | `uint256` | How many seconds to lock for (must be ≥ 60s, ≤ 50 years) |
| `label` | `string` | Optional personal note |

- **msg.value** must be > 0 (reverts `ZeroAmount` otherwise)
- **Emits:** `Deposited(owner, lockId, address(0), msg.value, unlocksAt, label)`

#### `depositERC20(address token, uint256 amount, uint256 lockDuration, string calldata label) external nonReentrant`

Locks an ERC-20 token. Caller must first approve the vault contract.

| Parameter | Type | Description |
|-----------|------|-------------|
| `token` | `address` | ERC-20 contract address (cannot be `address(0)`) |
| `amount` | `uint256` | Amount to lock in the token's smallest unit |
| `lockDuration` | `uint256` | How many seconds to lock for |
| `label` | `string` | Optional personal note |

- Uses `SafeERC20.safeTransferFrom` — handles fee-on-transfer tokens by comparing balance before/after
- **Emits:** `Deposited(owner, lockId, token, actualAmount, unlocksAt, label)`

#### `withdraw(uint256 lockIndex) external nonReentrant`

Withdraws a specific lock after its timer has expired.

| Parameter | Type | Description |
|-----------|------|-------------|
| `lockIndex` | `uint256` | Index in the caller's lock array (0-based, from `getLocks()`) |

- Reverts `LockNotFound` if index is out of bounds or user has no locks
- Reverts `LockAlreadyWithdrawn` if already claimed
- Reverts `LockNotYetExpired(unlocksAt, currentTime)` if `block.timestamp < unlocksAt`
- Native transfers use low-level `call{value}` — reverts `NativeTransferFailed` on failure
- ERC-20 transfers use `SafeERC20.safeTransfer`
- **Emits:** `Withdrawn(owner, lockId, token, amount)`

#### `getLocks(address owner) external view returns (Lock[] memory)`

Returns all locks (active + withdrawn) for a given address.

| Parameter | Type | Description |
|-----------|------|-------------|
| `owner` | `address` | The address to query |

**Returns:** Array of `Lock` structs.

#### `timeRemaining(address owner, uint256 lockIndex) external view returns (uint256)`

Returns seconds remaining before a lock can be withdrawn. Returns `0` if expired or withdrawn.

| Parameter | Type | Description |
|-----------|------|-------------|
| `owner` | `address` | The address to query |
| `lockIndex` | `uint256` | Index in owner's lock array |

- Reverts `LockNotFound` if `lockIndex` is out of bounds

#### `lockCount(address owner) external view returns (uint256)`

Returns the total number of locks (active + withdrawn) for an address.

| Parameter | Type | Description |
|-----------|------|-------------|
| `owner` | `address` | The address to query |

### Events

#### `Deposited`

```solidity
event Deposited(
    address indexed owner,
    uint256 indexed lockId,
    address indexed token,
    uint256 amount,
    uint256 unlocksAt,
    string  label
);
```

Emitted when a new lock is created (native or ERC-20).

#### `Withdrawn`

```solidity
event Withdrawn(
    address indexed owner,
    uint256 indexed lockId,
    address indexed token,
    uint256 amount
);
```

Emitted when a lock is successfully withdrawn after expiry.

### Custom Errors

| Error | Parameters | Description |
|-------|-----------|-------------|
| `ZeroAmount()` | — | Deposit amount is zero |
| `LockDurationTooShort()` | — | Duration < `MIN_LOCK_DURATION` or > `MAX_LOCK_DURATION` |
| `LockNotFound()` | — | Lock index out of bounds or user has no locks |
| `LockAlreadyWithdrawn()` | — | Attempting to withdraw a lock that was already claimed |
| `LockNotYetExpired(uint256 unlocksAt, uint256 currentTime)` | `unlocksAt`, `currentTime` | Lock timer hasn't expired yet |
| `NativeTransferFailed()` | — | Native coin transfer failed during withdrawal |
| `MismatchedNativeAmount()` | — | Reserved (not currently used) |

### Security Features

1. **ReentrancyGuard** — All state-changing functions (`depositNative`, `depositERC20`, `withdraw`) use the `nonReentrant` modifier from OpenZeppelin
2. **SafeERC20** — All ERC-20 transfers use `safeTransferFrom` / `safeTransfer` to handle non-standard tokens
3. **No owner / admin** — The contract has no `Ownable` pattern or admin functions. It is fully permissionless
4. **Fee-on-transfer support** — `depositERC20` measures actual received balance to handle deflationary tokens
5. **No selfdestruct** — The contract cannot be destroyed
6. **Checked arithmetic** — Solidity 0.8.20 has built-in overflow/underflow protection

### Mock Contract: `ERC20Mock.sol`

A minimal ERC-20 mock used exclusively in tests.

```solidity
contract ERC20Mock is ERC20 {
    uint8 private _decimals;

    constructor(string memory name, string memory symbol, uint8 decimals_) ERC20(name, symbol)
    function decimals() public view override returns (uint8)
    function mint(address to, uint256 amount) external
}
```

---

## 3. Frontend Architecture

### Component Tree

```
App.jsx
├── FloatingOrbs (animated background orbs ×5)
├── Header.jsx
│   ├── Brand logo + title ("TimeVault")
│   ├── Subtitle ("Self-custody time-locked savings")
│   ├── Network badge (e.g. "Polygon")
│   └── Wallet button (Connect / truncated address)
├── Connect Prompt (shown when wallet not connected)
│   ├── Lock icon (🔒, animated bounce)
│   ├── Headline ("Your personal time-lock vault")
│   ├── Description
│   ├── CTA button ("Connect Wallet to Start")
│   └── Wallet compatibility note
├── [Connected State]
│   ├── Stats Row
│   │   ├── AnimatedStat — Total locks
│   │   ├── AnimatedStat — Active
│   │   └── AnimatedStat — Ready (highlighted green)
│   ├── Layout Columns
│   │   ├── DepositForm.jsx (left column)
│   │   │   ├── Asset selector (native / known ERC-20 / custom address)
│   │   │   ├── Amount input
│   │   │   ├── Short duration presets (1 min, 5 min, 15 min, 30 min)
│   │   │   ├── Long duration presets (1 week, 1 month, 3 months, 6 months, 1 year)
│   │   │   ├── Custom duration inputs (Days / Hours / Minutes)
│   │   │   ├── Unlock date hint
│   │   │   ├── Minimum lock warning (< 60s)
│   │   │   ├── Label input (optional, max 60 chars)
│   │   │   └── Lock button (disabled when invalid)
│   │   └── Vault List (right column)
│   │       ├── Section title ("Your Vaults")
│   │       ├── Empty state ("No locks yet")
│   │       └── VaultCard.jsx × N (reverse chronological)
│   │           ├── Status icon (🔒 locked / 🟢 unlocked / ✅ withdrawn)
│   │           ├── Label (or "Lock #id" fallback)
│   │           ├── Amount + token symbol
│   │           ├── Countdown timer / status text
│   │           └── Withdraw button (when expired)
│   └── Contract footer (address, badges)
└── Toast.jsx (notification container)
```

### State Management: `useVault` Hook

The `useVault` hook (`frontend/src/hooks/useVault.js`) is the single source of truth for all blockchain interaction. It manages:

| State | Type | Description |
|-------|------|-------------|
| `provider` | `ethers.BrowserProvider` | Connected JSON-RPC provider |
| `signer` | `ethers.Signer` | Transaction signer |
| `account` | `string \| null` | Connected wallet address |
| `chainId` | `number \| null` | Current chain ID |
| `contract` | `ethers.Contract \| null` | TimeVault contract instance |
| `locks` | `Lock[]` | User's locks (auto-refreshed every 15s) |
| `loading` | `boolean` | Wallet connection in progress |
| `txPending` | `boolean` | Transaction confirmation in progress |

**Exposed functions:**

| Function | Description |
|----------|-------------|
| `connect()` | Requests MetaMask accounts, switches to Polygon (chain ID 0x89), builds provider/signer/contract |
| `depositNative({ amount, durationSec, label })` | Calls `contract.depositNative()` with `ethers.parseEther(amount)` as value |
| `depositERC20({ tokenAddress, decimals, amount, durationSec, label })` | Approves token if needed, then calls `contract.depositERC20()` |
| `withdraw(lockIndex)` | Calls `contract.withdraw(lockIndex)` |
| `fetchLocks()` | Calls `contract.getLocks(account)` and maps results to JS objects |

**Auto-reconnect:** On page load, checks `eth_accounts` for previously authorized wallets. Listens for `accountsChanged` and `chainChanged` events.

**Test bypass:** When `window.__TEST_WALLET__` is set (by Playwright), the `connect()` function skips the real ethers flow and directly sets account/chainId.

### UI Features

- **Framer Motion animations** — Every component uses Framer Motion for entrance animations, hover effects, and exit transitions
  - Spring physics for stats, cards, and buttons
  - Staggered children animations for sequential reveals
  - `AnimatePresence` for smooth mount/unmount transitions
  - `whileHover` and `whileTap` micro-interactions
- **Floating orbs** — 5 animated gradient orbs in the background with continuous looping motion (`aria-hidden="true"`)
- **Dark theme** — Glassmorphism cards, gradient backgrounds, glow effects, purple/green accent palette
- **Card glow** — `.card-glow` class on deposit form card
- **Live countdowns** — VaultCard updates `secondsLeft` every second via `setInterval`
- **Toast notifications** — Success/error/info toasts with 5-second auto-dismiss and exit animations
- **Responsive design** — Works on mobile (375px), tablet (768px), and desktop viewports

### Duration Presets

**Short presets (`DURATION_PRESETS_SHORT`):**

| Label | Seconds |
|-------|---------|
| 1 min | 60 |
| 5 min | 300 |
| 15 min | 900 |
| 30 min | 1800 |

**Long presets (`DURATION_PRESETS`):**

| Label | Seconds |
|-------|---------|
| 1 week | 604,800 |
| 1 month | 2,592,000 |
| 3 months | 7,776,000 |
| 6 months | 15,552,000 |
| 1 year | 31,536,000 |

### Formatting Utilities (`format.js`)

| Function | Description |
|----------|-------------|
| `shortAddr(addr)` | Truncates address to `0x1234…abcd` |
| `formatAmount(amountBN, decimals, symbol)` | Converts BigInt to human-readable (e.g. `"1 ETH"`, `"100 USDC"`) |
| `formatCountdown(seconds)` | Converts seconds to `"2d 1h 1m left"` / `"Ready to withdraw ✓"` |
| `formatDate(unixTs)` | Converts Unix timestamp to locale date string |
| `durationToSeconds({ days, hours, minutes })` | Converts duration fields to total seconds |

### Known Tokens (`KNOWN_TOKENS`)

**Base Mainnet (8453):**
- USDC (`0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`, 6 decimals)
- USDT (`0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2`, 6 decimals)
- WETH (`0x4200000000000000000000000000000000000006`, 18 decimals)
- cbBTC (`0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf`, 8 decimals)

**Base Sepolia (84532):**
- USDC (`0x036CbD53842c5426634e7929541eC2318f3dCF7e`, 6 decimals)

**Polygon (137):**
- USDC (`0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359`, 6 decimals)
- USDT (`0xc2132D05D31c914a87C6611C10748AEb04B58e8F`, 6 decimals)
- WETH (`0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619`, 18 decimals)
- WBTC (`0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6`, 8 decimals)

### Chain Metadata (`CHAIN_META`)

| Chain ID | Name | Native Symbol | Explorer |
|----------|------|---------------|----------|
| 8453 | Base | ETH | https://basescan.org |
| 84532 | Base Sepolia | ETH | https://sepolia.basescan.org |
| 137 | Polygon | POL | https://polygonscan.com |
| 1 | Ethereum | ETH | https://etherscan.io |
| 31337 | Localhost | ETH | — |

---

## 4. Test Coverage Summary

### Overview

| Test File | Framework | Test Count |
|-----------|-----------|:----------:|
| `test/TimeVault.test.js` | Hardhat + Chai | **55** |
| `frontend/src/test/unit/format.test.js` | Vitest | **34** |
| `frontend/src/test/unit/DepositForm.test.jsx` | Vitest + Testing Library | **28** |
| `frontend/src/test/unit/App.test.jsx` | Vitest + Testing Library | **13** |
| `frontend/src/test/unit/Toast.test.jsx` | Vitest + Testing Library | **10** |
| `frontend/src/test/unit/VaultCard.test.jsx` | Vitest + Testing Library | **9** |
| `frontend/src/test/unit/Header.test.jsx` | Vitest + Testing Library | **6** |
| `frontend/src/test/e2e/app.spec.js` | Playwright | **41** |
| **TOTAL** | | **196** |

**Breakdown:** 55 Hardhat + 100 Vitest + 41 Playwright = **196 tests**

---

### Hardhat Smart Contract Tests — `test/TimeVault.test.js` (55 tests)

#### Native coin deposits (5 tests)
1. `locks funds and prevents early withdrawal`
2. `allows withdrawal after lock expires`
3. `prevents double withdrawal`
4. `rejects zero-value deposits`
5. `supports multiple independent locks per user`

#### Lock duration boundaries (5 tests)
6. `accepts exactly MIN_LOCK_DURATION (60 seconds)`
7. `rejects duration below MIN_LOCK_DURATION (59 seconds)`
8. `rejects zero duration`
9. `accepts exactly MAX_LOCK_DURATION (50 years)`
10. `rejects duration exceeding MAX_LOCK_DURATION`

#### lockCount (4 tests)
11. `returns 0 for an address with no locks`
12. `increments correctly after deposits`
13. `does not decrease after withdrawal`
14. `is isolated per user`

#### Event emissions (4 tests)
15. `emits Deposited event on native deposit`
16. `emits Deposited event on ERC-20 deposit`
17. `emits Withdrawn event on withdrawal`
18. `assigns incrementing lockIds across users`

#### Cross-user isolation (3 tests)
19. `user cannot withdraw another user's lock`
20. `users have separate lock arrays`
21. `getLocks returns empty array for address with no deposits`

#### Label storage (3 tests)
22. `stores and retrieves the label correctly`
23. `allows an empty label`
24. `handles a very long label`

#### Out-of-bounds lockIndex (4 tests)
25. `withdraw reverts with LockNotFound for non-existent index`
26. `withdraw reverts with LockNotFound for completely empty user`
27. `timeRemaining reverts with LockNotFound for non-existent index`
28. `timeRemaining reverts for out-of-bounds index`

#### Lock data integrity (4 tests)
29. `stores token as address(0) for native deposits`
30. `stores createdAt as current block timestamp`
31. `calculates unlocksAt as createdAt + lockDuration`
32. `stores exact msg.value for native deposits`

#### ERC-20 deposits (10 tests)
33. `locks ERC-20 and releases after expiry`
34. `rejects zero-amount ERC-20 deposits`
35. `rejects address(0) as token for ERC-20 deposits`
36. `reverts when caller has not approved the vault`
37. `reverts when caller has insufficient balance`
38. `stores ERC-20 token address in lock data`
39. `supports multiple ERC-20 tokens simultaneously`
40. `can mix native and ERC-20 locks`
41. `rejects ERC-20 deposit with duration below minimum`
42. `rejects ERC-20 deposit with duration above maximum`

#### timeRemaining (4 tests)
43. `returns correct remaining seconds`
44. `returns 0 after expiry`
45. `decreases as time passes`
46. `returns 0 for withdrawn lock`

#### Public constants (2 tests)
47. `MIN_LOCK_DURATION is 1 minute`
48. `MAX_LOCK_DURATION is 50 years in seconds`

#### Withdrawal timing boundary (2 tests)
49. `cannot withdraw 1 second before unlock`
50. `can withdraw at exact unlock timestamp`

#### Reentrancy guard (1 test)
51. `contract uses ReentrancyGuard (verified by deployment)`

#### LockNotYetExpired error data (1 test)
52. `includes unlocksAt and currentTime in the error`

#### Contract balance integrity (3 tests)
53. `contract holds deposited native funds`
54. `contract balance decreases after withdrawal`
55. `contract holds deposited ERC-20 tokens`

---

### Vitest Unit Tests — `frontend/src/test/unit/format.test.js` (34 tests)

#### shortAddr (2 tests)
1. `truncates a full address`
2. `returns empty string for falsy input`

#### formatAmount (5 tests)
3. `formats 1 ETH (18 decimals)`
4. `formats 100 USDC (6 decimals)`
5. `handles 0`
6. `handles very small amounts`
7. `works without a symbol`

#### formatCountdown (5 tests)
8. `returns withdrawable message for 0 or negative`
9. `formats days correctly`
10. `formats hours when less than a day`
11. `formats minutes when less than an hour`
12. `formats seconds when less than a minute`

#### durationToSeconds (6 tests)
13. `converts pure days`
14. `converts pure hours`
15. `converts pure minutes`
16. `combines all fields`
17. `returns 0 for empty input`
18. `handles string inputs (from HTML inputs)`

#### formatDate (2 tests)
19. `returns a non-empty string for a valid timestamp`
20. `returns empty string for falsy input`

#### DURATION_PRESETS (3 tests)
21. `has 5 presets`
22. `first preset is 1 week (604800s)`
23. `all presets have increasing durations`

#### DURATION_PRESETS_SHORT (7 tests)
24. `has 4 presets`
25. `first preset is 1 min (60s)`
26. `last preset is 30 min (1800s)`
27. `all presets have increasing durations`
28. `contains expected labels`
29. `all values are less than 1 hour`
30. `all values are at least MIN_LOCK_DURATION (60s)`

#### KNOWN_TOKENS (2 tests)
31. `has tokens for Base mainnet (8453)`
32. `every token has required fields`

#### CHAIN_META (2 tests)
33. `has entries for Base, Polygon, and localhost`
34. `every entry has nativeSymbol`

---

### Vitest Unit Tests — `frontend/src/test/unit/DepositForm.test.jsx` (28 tests)

#### DepositForm (28 tests)
1. `renders without crashing`
2. `shows native ETH as default asset`
3. `lists known ERC-20 tokens in the asset dropdown`
4. `renders all 5 duration preset buttons`
5. `clicking a preset fills the duration fields`
6. `submit button is disabled when amount is empty`
7. `submit button is disabled when duration < 60s`
8. `submit button is disabled while txPending`
9. `shows a warning banner when contractAddress is null`
10. `calls onDeposit with correct native params when submitted`
11. `calls onDeposit with erc20 type when token is selected`
12. `resets form fields after successful deposit`
13. `renders all 4 short duration preset buttons`
14. `shows 'Quick duration — Short' label`
15. `shows 'Quick duration — Long' label`
16. `clicking a short preset fills Minutes field`
17. `clicking 1 min sets minutes to 1`
18. `clicking 30 min sets minutes to 30`
19. `has a Minutes input placeholder`
20. `has a Days input placeholder`
21. `has a Hours input placeholder`
22. `minutes input accepts manual entry`
23. `typing in custom duration clears the preset selection`
24. `submit button enabled when only minutes set >= 1`
25. `label input has maxLength of 60`
26. `shows minimum lock warning when duration < 60s but > 0`
27. `shows unlock date hint when duration > 0`
28. `renders Custom ERC-20 address option`

---

### Vitest Unit Tests — `frontend/src/test/unit/App.test.jsx` (13 tests)

#### App (13 tests)
1. `renders without crashing`
2. `shows connect prompt when not connected`
3. `shows tagline about self-custody`
4. `shows wallet compatibility note`
5. `shows deposit form and vault list when connected`
6. `shows stats row when connected`
7. `displays correct stats for given locks`
8. `shows empty vault state when no locks exist`
9. `renders floating orbs container`
10. `renders 5 floating orbs`
11. `calls connect when hero CTA is clicked`
12. `renders header component`
13. `renders toast container`

---

### Vitest Unit Tests — `frontend/src/test/unit/Toast.test.jsx` (10 tests)

#### Toast (10 tests)
1. `renders the toast container`
2. `starts with no toasts visible`
3. `shows a toast when toast() is called`
4. `applies correct CSS class for success type`
5. `applies correct CSS class for error type`
6. `applies correct CSS class for info type`
7. `defaults to info type when no type is specified`
8. `supports multiple toasts at once`
9. `auto-dismisses toast after 5000ms (state removed, exit animation pending)`
10. `each toast has the .toast class`

---

### Vitest Unit Tests — `frontend/src/test/unit/VaultCard.test.jsx` (9 tests)

#### VaultCard (9 tests)
1. `renders the lock label`
2. `shows the ETH amount`
3. `shows countdown when still locked`
4. `shows Withdraw button when lock is expired`
5. `calls onWithdraw with correct lockIndex when clicked`
6. `disables Withdraw button while txPending`
7. `shows withdrawn state correctly`
8. `falls back to Lock #id when label is empty`
9. `resolves USDC token name for ERC-20 lock`

---

### Vitest Unit Tests — `frontend/src/test/unit/Header.test.jsx` (6 tests)

#### Header (6 tests)
1. `renders the brand name`
2. `shows Connect Wallet button when not connected`
3. `shows truncated address when connected`
4. `shows network badge when connected`
5. `calls onConnect when button is clicked`
6. `shows Connecting… and disables button while loading`

---

### Playwright E2E Tests — `frontend/src/test/e2e/app.spec.js` (41 tests)

#### Basic render (6 tests)
1. `page loads — not a blank screen`
2. `shows TimeVault brand in header`
3. `shows Connect Wallet button in header before connecting`
4. `connect prompt headline is visible`
5. `tagline describes the product`
6. `hero CTA button is visible on landing page`

#### Wallet connection (1 test)
7. `clicking header Connect Wallet runs the connect flow`

#### Deposit form (19 tests)
8. `deposit form section title appears after connecting`
9. `all 5 long duration preset buttons are visible`
10. `all 4 short duration preset buttons are visible`
11. `clicking a duration preset highlights it with active class`
12. `clicking a short preset highlights it with active class`
13. `preset fills Days input`
14. `short preset fills Minutes input`
15. `1 min preset fills Minutes with 1`
16. `30 min preset fills Minutes with 30`
17. `selecting 1 year shows unlock date hint`
18. `Lock button is disabled when no amount entered`
19. `Lock button is enabled after amount + duration are set`
20. `Lock button enabled with short preset + amount`
21. `asset dropdown contains native coin option`
22. `asset dropdown contains Custom ERC-20 option`
23. `label input accepts text`
24. `Minutes input exists and accepts values`
25. `Hours input exists`
26. `custom duration can be typed manually`

#### Vault list (2 tests)
27. `Your Vaults section is visible after connecting`
28. `empty vault state is shown when no locks exist`

#### Stats chips (2 tests)
29. `stats row is visible after connecting`
30. `stat chips have stat-chip class`

#### Floating orbs & animations (3 tests)
31. `floating orbs container is present`
32. `floating orbs has aria-hidden for accessibility`
33. `card-glow class exists after connecting`

#### Responsive / viewport (3 tests)
34. `app renders correctly at mobile viewport`
35. `connect prompt is visible on mobile`
36. `deposit form renders on tablet viewport`

#### Accessibility / SEO (5 tests)
37. `page title is set`
38. `no JS console errors on load`
39. `no uncaught page crashes`
40. `no JS errors after connecting wallet`
41. `lock button has descriptive text`

---

## 5. Technology Stack

### Root Project (`package.json`)

| Dependency | Version | Type |
|------------|---------|------|
| `@openzeppelin/contracts` | ^5.0.2 | production |
| `@nomicfoundation/hardhat-toolbox` | ^5.0.0 | dev |
| `dotenv` | ^17.3.1 | dev |
| `hardhat` | ^2.22.0 | dev |

### Frontend (`frontend/package.json`)

| Dependency | Version | Type |
|------------|---------|------|
| `react` | ^18.3.1 | production |
| `react-dom` | ^18.3.1 | production |
| `ethers` | ^6.11.0 | production |
| `framer-motion` | ^12.34.3 | production |
| `@playwright/test` | ^1.58.2 | dev |
| `@testing-library/jest-dom` | ^6.9.1 | dev |
| `@testing-library/react` | ^16.3.2 | dev |
| `@testing-library/user-event` | ^14.6.1 | dev |
| `@vitejs/plugin-react` | ^4.3.0 | dev |
| `@vitest/coverage-v8` | ^4.0.18 | dev |
| `jsdom` | ^28.1.0 | dev |
| `vite` | ^5.2.0 | dev |
| `vitest` | ^4.0.18 | dev |

### Full Stack Summary

| Layer | Technology | Version |
|-------|-----------|---------|
| Smart Contract | Solidity | ^0.8.20 |
| Contract Framework | Hardhat | ^2.22.0 |
| OpenZeppelin | Contracts | ^5.0.2 |
| Frontend | React | ^18.3.1 |
| Bundler | Vite | ^5.2.0 |
| Blockchain SDK | ethers.js | ^6.11.0 |
| Animations | Framer Motion | ^12.34.3 |
| Unit Testing | Vitest | ^4.0.18 |
| DOM Testing | @testing-library/react | ^16.3.2 |
| E2E Testing | Playwright | ^1.58.2 |
| Coverage | @vitest/coverage-v8 | ^4.0.18 |
| DOM Environment | jsdom | ^28.1.0 |

---

## 6. Development Guide

### Prerequisites

- **Node.js** v18+
- **npm** v9+
- **MetaMask** or Coinbase Wallet browser extension
- (Optional) **Polygon RPC** URL and deployer private key for mainnet deployment

### Installation

```bash
# Clone the repository
git clone https://github.com/vvkpops/Crypto-time-Vault---Polygon.git
cd Crypto-time-Vault---Polygon

# Install root (Hardhat) dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### Environment Setup

Create a `.env` file in the project root:

```env
PRIVATE_KEY=0xYourDeployerPrivateKey
POLYGON_RPC=https://rpc.ankr.com/polygon
POLYGONSCAN_API_KEY=YourPolygonScanAPIKey
BASESCAN_API_KEY=YourBaseScanAPIKey
```

### Available Scripts — Root

| Command | Description |
|---------|-------------|
| `npm run compile` | Compile Solidity contracts with Hardhat |
| `npm test` | Run Hardhat smart contract tests (55 tests) |
| `npm run test:frontend` | Run Vitest frontend unit tests (100 tests) |
| `npm run test:e2e` | Run Playwright E2E tests (41 tests) |
| `npm run test:all` | Run all tests (Hardhat + Vitest + Playwright) |
| `npm run deploy:local` | Deploy to local Hardhat node |
| `npm run deploy:base-sepolia` | Deploy to Base Sepolia testnet |
| `npm run deploy:base` | Deploy to Base mainnet |
| `npm run deploy:polygon` | Deploy to Polygon mainnet |
| `npm run auto-withdraw` | Run the auto-withdraw daemon |
| `npm run node` | Start a local Hardhat node |

### Available Scripts — Frontend

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server (http://localhost:5173) |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm test` | Run Vitest unit tests |
| `npm run test:watch` | Run Vitest in watch mode |
| `npm run test:coverage` | Run Vitest with V8 coverage |
| `npm run test:e2e` | Run Playwright E2E tests |
| `npm run test:e2e:ui` | Run Playwright with interactive UI |
| `npm run test:all` | Run Vitest + Playwright |

### Running Tests

```bash
# Smart contract tests (55 tests)
npm test

# Frontend unit tests (100 tests)
cd frontend
npx vitest run

# E2E tests (41 tests) — auto-starts Vite dev server
cd frontend
npx playwright test

# All tests at once (196 total)
npm run test:all
```

### Local Development Workflow

```bash
# Terminal 1: Start local Hardhat node
npm run node

# Terminal 2: Deploy contract to localhost
npm run deploy:local

# Terminal 3: Start frontend dev server
cd frontend
npm run dev
```

### Test Configuration

**Vitest** (`frontend/vitest.config.js`):
- Environment: `jsdom`
- Globals: enabled
- Setup file: `./src/test/setup.js`
- Excludes: `node_modules`, `e2e` tests
- Coverage: V8 provider, `text` + `lcov` reporters, covers `src/**/*.{js,jsx}` excluding `src/contracts/` and `src/test/`

**Playwright** (`frontend/playwright.config.js`):
- Test directory: `./src/test/e2e`
- Browser: Chromium (Desktop Chrome)
- Base URL: `http://127.0.0.1:5173`
- Headless: true
- Retries: 1
- Timeout: 30 seconds
- Screenshots: on failure only
- Video: retained on failure
- Auto-starts Vite dev server before tests

**Hardhat** (`hardhat.config.js`):
- Solidity: 0.8.20 with optimizer (200 runs)
- Networks: localhost, baseSepolia, base, polygon
- Etherscan verification configured for Base and Polygon

---

## 7. Version History

### V1.1.3 — Comprehensive Test Suite *(current)*

Added exhaustive test coverage across all layers — 196 total tests.

**Backend (Hardhat) — 55 tests:**
- MIN_LOCK_DURATION boundary tests (60s pass, 59s revert)
- MAX_LOCK_DURATION boundary tests (50 years pass, 50 years + 1 revert)
- `lockCount()` view function tests
- Event emission tests (Deposited, Withdrawn)
- Cross-user isolation tests (alice can't withdraw bob's lock)
- Out-of-bounds lockIndex revert tests
- Label storage verification (empty, normal, very long)
- ERC-20 edge cases (zero-amount, address(0), insufficient approval, insufficient balance)
- Multiple ERC-20 token support tests
- Mixed native + ERC-20 lock tests
- Lock data integrity tests (timestamp, amount, token address)
- timeRemaining tests (decreasing, expired, withdrawn)
- Withdrawal timing boundary (1 second before, exact timestamp)
- Contract balance integrity (holds funds, decreases after withdrawal)
- Reentrancy guard verification

**Frontend unit tests (Vitest) — 100 tests:**
- **NEW** `Toast.test.jsx` (10 tests) — rendering, toast() API, type classes, auto-dismiss, multiple toasts
- **NEW** `App.test.jsx` (13 tests) — integration with mocked useVault, connect prompt, stats, floating orbs
- Extended `format.test.js` (+7 tests) — DURATION_PRESETS_SHORT suite (4 presets, labels, bounds)
- Extended `DepositForm.test.jsx` (+16 tests) — short presets, minutes input, 3-column layout, warnings

**E2E tests (Playwright) — 41 tests:**
- Short duration preset tests (1 min, 5 min, 15 min, 30 min)
- Minutes input field tests
- Responsive viewport tests (mobile 375px, tablet 768px)
- Floating orbs presence + accessibility tests
- Custom duration input test
- Animation class presence tests
- Fixed stats row assertions

**Files added/modified:**
- `test/TimeVault.test.js` — expanded to 55 tests
- `frontend/src/test/unit/format.test.js` — expanded to 34 tests
- `frontend/src/test/unit/DepositForm.test.jsx` — expanded to 28 tests
- `frontend/src/test/unit/Toast.test.jsx` — **NEW** (10 tests)
- `frontend/src/test/unit/App.test.jsx` — **NEW** (13 tests)
- `frontend/src/test/e2e/app.spec.js` — expanded to 41 tests
- `.agent/tracking.md` — **NEW** (version tracking file)

---

### V1.1.2 — Animation Overhaul + Short Duration Presets

- Installed **Framer Motion 12.34.3**
- Rewrote all components with extensive animations:
  - Floating orbs background (5 animated gradient spheres)
  - Staggered entrance animations on all sections
  - Spring physics on cards, stats, buttons
  - `AnimatePresence` exit animations
  - Hover/tap micro-interactions
- Added **minutes input field** to DepositForm (3-column layout: Days/Hours/Minutes)
- Added **DURATION_PRESETS_SHORT** (1 min, 5 min, 15 min, 30 min)
- Card glow effect on deposit form

---

### V1.1.1 — UI Premium Dark Theme

- Complete CSS rewrite with glassmorphism, gradients, and glow effects
- Mobile responsive design
- Vercel deployment setup (`vercel.json`)

---

### V1.1.0 — Feature Completions

- Auto-withdraw daemon (`scripts/auto-withdraw.js`) — Node.js script that polls locks and auto-withdraws expired ones
- Git repository setup and push to GitHub
- Bug fixes

---

### V1.0.0 — Initial Release

- **TimeVault smart contract** (Solidity 0.8.20)
  - Native coin + ERC-20 locking
  - Time-lock mechanism with `MIN_LOCK_DURATION` / `MAX_LOCK_DURATION`
  - `ReentrancyGuard` + `SafeERC20` security
  - Labels, multiple locks per user, global lock IDs
- **React frontend** with Vite bundler
  - Wallet connection (MetaMask / Coinbase Wallet)
  - Deposit form with duration presets
  - Vault cards with live countdowns
  - Toast notifications
- **Deploy scripts** for Base, Polygon, localhost
- **Basic Hardhat tests**
- **Basic Vitest + Playwright tests**

---

## 8. Deployment

### Smart Contract Deployment (Polygon)

The TimeVault contract is deployed on **Polygon Mainnet**:

| Property | Value |
|----------|-------|
| **Address** | `0x131272Ad93eD41a3DdDc893C0dA3d6B6F27e8d23` |
| **Network** | Polygon Mainnet (Chain ID 137) |
| **Explorer** | https://polygonscan.com/address/0x131272Ad93eD41a3DdDc893C0dA3d6B6F27e8d23 |

#### Deploy to Polygon

```bash
# 1. Set up .env with PRIVATE_KEY and POLYGON_RPC
# 2. Compile contracts
npm run compile

# 3. Deploy
npm run deploy:polygon
```

The deploy script (`scripts/deploy.js`):
1. Deploys the TimeVault contract
2. Saves the contract address to `frontend/src/contracts/addresses.json`
3. Saves the ABI to `frontend/src/contracts/TimeVault.json`
4. Waits 10 blocks and attempts Polygonscan verification

#### Deploy to Other Networks

```bash
npm run deploy:local          # Hardhat localhost
npm run deploy:base-sepolia   # Base Sepolia testnet
npm run deploy:base           # Base mainnet
```

### Frontend Deployment (Vercel)

The frontend is deployed on **Vercel**. A `vercel.json` configuration file exists at the project root.

#### Deploy Steps

```bash
# 1. Build the frontend
cd frontend
npm run build

# 2. Deploy via Vercel CLI or GitHub integration
# The dist/ folder is served as a static site
```

The frontend automatically reads the contract address from `frontend/src/contracts/addresses.json` and the ABI from `frontend/src/contracts/TimeVault.json`, both populated by the deploy script.

### GitHub Repository

- **URL:** https://github.com/vvkpops/Crypto-time-Vault---Polygon
- **License:** MIT

---

*Generated for TimeVault V1.1.3 — 196 tests across 3 testing frameworks*
