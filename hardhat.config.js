require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const PRIVATE_KEY        = process.env.PRIVATE_KEY        || "0x" + "0".repeat(64);
const BASESCAN_API_KEY   = process.env.BASESCAN_API_KEY   || "";
const POLYGONSCAN_API_KEY = process.env.POLYGONSCAN_API_KEY || "";
const POLYGON_RPC        = process.env.POLYGON_RPC        || "https://rpc.ankr.com/polygon";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    // ── Local development node ──────────────────────────────────────────────
    localhost: {
      url: "http://127.0.0.1:8545",
    },

    // ── Base Sepolia (testnet — use this first, it's FREE) ───────────────────
    baseSepolia: {
      url: "https://sepolia.base.org",
      chainId: 84532,
      accounts: [PRIVATE_KEY],
    },

    // ── Base mainnet ─────────────────────────────────────────────────────────
    base: {
      url: "https://mainnet.base.org",
      chainId: 8453,
      accounts: [PRIVATE_KEY],
    },

    // ── Polygon mainnet ───────────────────────────────────────────────────────
    polygon: {
      url: POLYGON_RPC,
      chainId: 137,
      accounts: [PRIVATE_KEY],
      gasPrice: "auto",
    },
  },
  etherscan: {
    apiKey: {
      baseSepolia: BASESCAN_API_KEY,
      base: BASESCAN_API_KEY,
      polygon: POLYGONSCAN_API_KEY,
    },
    customChains: [
      {
        network: "baseSepolia",
        chainId: 84532,
        urls: {
          apiURL: "https://api-sepolia.basescan.org/api",
          browserURL: "https://sepolia.basescan.org",
        },
      },
      {
        network: "base",
        chainId: 8453,
        urls: {
          apiURL: "https://api.basescan.org/api",
          browserURL: "https://basescan.org",
        },
      },
    ],
  },
};
