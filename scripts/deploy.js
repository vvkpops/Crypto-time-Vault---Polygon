const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying TimeVault with account:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "ETH/native");

  // Deploy the contract
  const TimeVault = await hre.ethers.getContractFactory("TimeVault");
  const vault = await TimeVault.deploy();
  await vault.waitForDeployment();

  const address = await vault.getAddress();
  console.log("\n✅ TimeVault deployed to:", address);
  console.log("   Network:", hre.network.name);
  console.log("   Block:", await hre.ethers.provider.getBlockNumber());

  // ─── Save address + ABI to frontend ────────────────────────────────────────
  const frontendDir = path.join(__dirname, "../frontend/src/contracts");
  if (!fs.existsSync(frontendDir)) {
    fs.mkdirSync(frontendDir, { recursive: true });
  }

  // Save address
  const addresses = {
    [hre.network.name]: address,
  };
  const addressFile = path.join(frontendDir, "addresses.json");
  let existing = {};
  if (fs.existsSync(addressFile)) {
    existing = JSON.parse(fs.readFileSync(addressFile, "utf8"));
  }
  fs.writeFileSync(addressFile, JSON.stringify({ ...existing, ...addresses }, null, 2));
  console.log("   Address saved to frontend/src/contracts/addresses.json");

  // Save ABI
  const artifact = await hre.artifacts.readArtifact("TimeVault");
  fs.writeFileSync(
    path.join(frontendDir, "TimeVault.json"),
    JSON.stringify(artifact, null, 2)
  );
  console.log("   ABI saved to frontend/src/contracts/TimeVault.json");

  // ─── Verify on block explorer (skip on localhost) ───────────────────────────
  if (hre.network.name !== "localhost" && hre.network.name !== "hardhat") {
    console.log("\nWaiting 10 blocks before verification...");
    await vault.deploymentTransaction().wait(10);
    try {
      await hre.run("verify:verify", { address });
      console.log("✅ Contract verified on block explorer");
    } catch (err) {
      console.log("Verification failed (may already be verified):", err.message);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
