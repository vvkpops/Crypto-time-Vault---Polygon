const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("TimeVault", function () {
  let vault, owner, alice;
  const ONE_DAY = 86400;
  const ONE_ETH = ethers.parseEther("1.0");

  beforeEach(async () => {
    [owner, alice] = await ethers.getSigners();
    const TimeVault = await ethers.getContractFactory("TimeVault");
    vault = await TimeVault.deploy();
  });

  // ─── Native coin ──────────────────────────────────────────────────────────

  describe("Native coin deposits", () => {
    it("locks funds and prevents early withdrawal", async () => {
      await vault.connect(alice).depositNative(ONE_DAY, "Savings", {
        value: ONE_ETH,
      });

      const locks = await vault.getLocks(alice.address);
      expect(locks.length).to.equal(1);
      expect(locks[0].amount).to.equal(ONE_ETH);
      expect(locks[0].withdrawn).to.equal(false);

      // Should revert before time expires
      await expect(vault.connect(alice).withdraw(0)).to.be.revertedWithCustomError(
        vault,
        "LockNotYetExpired"
      );
    });

    it("allows withdrawal after lock expires", async () => {
      await vault.connect(alice).depositNative(ONE_DAY, "Test", {
        value: ONE_ETH,
      });

      // Fast-forward time
      await time.increase(ONE_DAY + 1);

      const balBefore = await ethers.provider.getBalance(alice.address);
      const tx = await vault.connect(alice).withdraw(0);
      const receipt = await tx.wait();
      const gasCost = receipt.gasUsed * receipt.gasPrice;
      const balAfter = await ethers.provider.getBalance(alice.address);

      expect(balAfter - balBefore + gasCost).to.equal(ONE_ETH);

      const locks = await vault.getLocks(alice.address);
      expect(locks[0].withdrawn).to.equal(true);
    });

    it("prevents double withdrawal", async () => {
      await vault.connect(alice).depositNative(ONE_DAY, "Test", {
        value: ONE_ETH,
      });
      await time.increase(ONE_DAY + 1);
      await vault.connect(alice).withdraw(0);

      await expect(vault.connect(alice).withdraw(0)).to.be.revertedWithCustomError(
        vault,
        "LockAlreadyWithdrawn"
      );
    });

    it("rejects zero-value deposits", async () => {
      await expect(
        vault.connect(alice).depositNative(ONE_DAY, "Bad", { value: 0 })
      ).to.be.revertedWithCustomError(vault, "ZeroAmount");
    });

    it("supports multiple independent locks per user", async () => {
      await vault.connect(alice).depositNative(ONE_DAY, "Lock 1", { value: ONE_ETH });
      await vault.connect(alice).depositNative(ONE_DAY * 7, "Lock 2", { value: ONE_ETH });

      const locks = await vault.getLocks(alice.address);
      expect(locks.length).to.equal(2);

      // Fast-forward 1 day — only lock 0 should be available
      await time.increase(ONE_DAY + 1);
      await vault.connect(alice).withdraw(0);
      await expect(vault.connect(alice).withdraw(1)).to.be.revertedWithCustomError(
        vault,
        "LockNotYetExpired"
      );
    });
  });

  // ─── ERC-20 ───────────────────────────────────────────────────────────────

  describe("ERC-20 deposits", () => {
    let token;

    beforeEach(async () => {
      // Deploy a simple ERC-20 mock
      const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
      token = await ERC20Mock.deploy("MockUSDC", "mUSDC", 6);
      await token.mint(alice.address, 1000n * 10n ** 6n); // 1000 USDC
    });

    it("locks ERC-20 and releases after expiry", async () => {
      const amount = 500n * 10n ** 6n;
      await token.connect(alice).approve(await vault.getAddress(), amount);
      await vault.connect(alice).depositERC20(await token.getAddress(), amount, ONE_DAY, "USDC savings");

      await time.increase(ONE_DAY + 1);
      await vault.connect(alice).withdraw(0);

      expect(await token.balanceOf(alice.address)).to.equal(1000n * 10n ** 6n);
    });
  });

  // ─── timeRemaining ────────────────────────────────────────────────────────

  describe("timeRemaining", () => {
    it("returns correct remaining seconds", async () => {
      await vault.connect(alice).depositNative(ONE_DAY, "t", { value: ONE_ETH });
      const remaining = await vault.timeRemaining(alice.address, 0);
      expect(remaining).to.be.closeTo(BigInt(ONE_DAY), 5n);
    });

    it("returns 0 after expiry", async () => {
      await vault.connect(alice).depositNative(ONE_DAY, "t", { value: ONE_ETH });
      await time.increase(ONE_DAY + 1);
      expect(await vault.timeRemaining(alice.address, 0)).to.equal(0n);
    });
  });
});
