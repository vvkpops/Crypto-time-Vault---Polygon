# TimeVault — Agent Version Tracking

> This file is maintained by the AI agent to track versions, changes, and release notes.

---

## Current Version: **V1.1.3**

## Version History

### V1.1.3 — Comprehensive Test Suite *(current)*
**Date:** 2025-07-17
**Summary:** Added exhaustive test coverage across all layers — 196 total tests: 55 Hardhat smart contract tests, 100 Vitest frontend unit tests, and 41 Playwright E2E tests. Added comprehensive DOCS.md documentation.

**Changes:**
- **Backend (Hardhat) tests** — `test/TimeVault.test.js`
  - Added MIN_LOCK_DURATION boundary tests (60s pass, 59s revert)
  - Added MAX_LOCK_DURATION boundary tests (50 years pass, 50 years + 1 revert)
  - Added `lockCount()` view function tests
  - Added event emission tests (Deposited, Withdrawn)
  - Added cross-user isolation tests (alice can't withdraw bob's lock)
  - Added out-of-bounds lockIndex revert tests
  - Added label storage verification
  - Added ERC-20 edge cases (zero-amount, address(0), insufficient approval)
  - Added empty label allowed test
  - Added multiple ERC-20 token tests

- **Frontend unit tests (Vitest)**
  - New `Toast.test.jsx` — rendering, toast() adds toasts, type classes, multiple toasts
  - New `App.test.jsx` — integration tests with mocked useVault hook
  - Extended `format.test.js` — DURATION_PRESETS_SHORT tests
  - Extended `DepositForm.test.jsx` — short presets, minutes input, 3-column layout

- **E2E tests (Playwright)** — `frontend/src/test/e2e/app.spec.js`
  - Added short duration preset tests (1 min, 5 min, 15 min, 30 min)
  - Added minutes input field tests
  - Added responsive viewport tests
  - Added floating orbs presence tests
  - Fixed stats row assertions (text was "Active"/"Ready", not "Active locks"/"Ready to withdraw")
  - Added custom duration input test
  - Added animation class presence tests

**Files Modified:**
- `test/TimeVault.test.js` — expanded from 8 to 55 tests
- `frontend/src/test/unit/format.test.js` — added DURATION_PRESETS_SHORT suite (34 total)
- `frontend/src/test/unit/DepositForm.test.jsx` — added 17 new tests (28 total)
- `frontend/src/test/unit/Toast.test.jsx` — **NEW FILE** (10 tests)
- `frontend/src/test/unit/App.test.jsx` — **NEW FILE** (13 tests)
- `frontend/src/test/unit/Header.test.jsx` — 6 tests (unchanged)
- `frontend/src/test/unit/VaultCard.test.jsx` — 9 tests (unchanged)
- `frontend/src/test/e2e/app.spec.js` — expanded from 18 to 41 tests
- `DOCS.md` — **NEW FILE** (comprehensive project documentation)
- `package.json` — version bumped to 1.1.3
- `frontend/package.json` — version bumped to 1.1.3
- `.agent/tracking.md` — **NEW FILE** (this file)

---

### Pre-V1.1.3 History (reconstructed)

#### V1.1.2 — Animation Overhaul
- Installed Framer Motion 12.34.3
- Rewrote all components with extensive animations
- Added floating orbs, staggered entrances, spring physics
- Added minutes input field to DepositForm
- Added DURATION_PRESETS_SHORT (1min, 5min, 15min, 30min)

#### V1.1.1 — UI Premium Dark Theme
- Complete CSS rewrite (glassmorphism, gradients, glow effects)
- Mobile responsive design
- Vercel deployment setup

#### V1.1.0 — Feature completions
- Auto-withdraw daemon (`scripts/auto-withdraw.js`)
- Git repo setup, pushed to GitHub

#### V1.0.0 — Initial Release
- TimeVault smart contract (Solidity 0.8.20)
- React frontend with Vite
- ERC-20 and native coin support
- Deploy scripts for Base, Polygon, localhost
- Basic Hardhat tests
- Basic Vitest + Playwright tests

---

## Tech Stack Reference
| Layer | Technology | Version |
|-------|-----------|---------|
| Smart Contract | Solidity | 0.8.20 |
| Contract Framework | Hardhat | 2.22.0 |
| OpenZeppelin | Contracts | 5.0.2 |
| Frontend | React | 18.3.1 |
| Bundler | Vite | 5.2.0 |
| Blockchain SDK | ethers.js | 6.11.0 |
| Animations | Framer Motion | 12.34.3 |
| Unit Testing | Vitest | 4.0.18 |
| DOM Testing | @testing-library/react | 16.3.2 |
| E2E Testing | Playwright | 1.58.2 |
| Coverage | @vitest/coverage-v8 | 4.0.18 |

## Repository
- **GitHub:** https://github.com/vvkpops/Crypto-time-Vault---Polygon
- **Deployment:** Polygon mainnet at `0x131272Ad93eD41a3DdDc393C0dA3d6B6F27e8d23`
