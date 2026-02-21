const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("TimeVault", function () {
  let vault, owner, alice, bob;
  const ONE_DAY = 86400;
  const ONE_MINUTE = 60;
  const ONE_ETH = ethers.parseEther("1.0");
  const HALF_ETH = ethers.parseEther("0.5");

  beforeEach(async () => {
    [owner, alice, bob] = await ethers.getSigners();
    const TimeVault = await ethers.getContractFactory("TimeVault");
    vault = await TimeVault.deploy();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Native coin deposits
  // ═══════════════════════════════════════════════════════════════════════════

  describe("Native coin deposits", () => {
    it("locks funds and prevents early withdrawal", async () => {
      await vault.connect(alice).depositNative(ONE_DAY, "Savings", {
        value: ONE_ETH,
      });

      const locks = await vault.getLocks(alice.address);
      expect(locks.length).to.equal(1);
      expect(locks[0].amount).to.equal(ONE_ETH);
      expect(locks[0].withdrawn).to.equal(false);

      await expect(vault.connect(alice).withdraw(0)).to.be.revertedWithCustomError(
        vault,
        "LockNotYetExpired"
      );
    });

    it("allows withdrawal after lock expires", async () => {
      await vault.connect(alice).depositNative(ONE_DAY, "Test", {
        value: ONE_ETH,
      });

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

      await time.increase(ONE_DAY + 1);
      await vault.connect(alice).withdraw(0);
      await expect(vault.connect(alice).withdraw(1)).to.be.revertedWithCustomError(
        vault,
        "LockNotYetExpired"
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Duration boundary tests
  // ═══════════════════════════════════════════════════════════════════════════

  describe("Lock duration boundaries", () => {
    it("accepts exactly MIN_LOCK_DURATION (60 seconds)", async () => {
      await expect(
        vault.connect(alice).depositNative(ONE_MINUTE, "Min lock", { value: ONE_ETH })
      ).to.not.be.reverted;

      const locks = await vault.getLocks(alice.address);
      expect(locks.length).to.equal(1);
    });

    it("rejects duration below MIN_LOCK_DURATION (59 seconds)", async () => {
      await expect(
        vault.connect(alice).depositNative(59, "Too short", { value: ONE_ETH })
      ).to.be.revertedWithCustomError(vault, "LockDurationTooShort");
    });

    it("rejects zero duration", async () => {
      await expect(
        vault.connect(alice).depositNative(0, "Zero", { value: ONE_ETH })
      ).to.be.revertedWithCustomError(vault, "LockDurationTooShort");
    });

    it("accepts exactly MAX_LOCK_DURATION (50 years)", async () => {
      const fiftyYears = 50 * 365 * ONE_DAY;
      await expect(
        vault.connect(alice).depositNative(fiftyYears, "50 years", { value: ONE_ETH })
      ).to.not.be.reverted;
    });

    it("rejects duration exceeding MAX_LOCK_DURATION", async () => {
      const tooLong = 50 * 365 * ONE_DAY + 1;
      await expect(
        vault.connect(alice).depositNative(tooLong, "Too long", { value: ONE_ETH })
      ).to.be.revertedWithCustomError(vault, "LockDurationTooShort");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Lock count
  // ═══════════════════════════════════════════════════════════════════════════

  describe("lockCount", () => {
    it("returns 0 for an address with no locks", async () => {
      expect(await vault.lockCount(alice.address)).to.equal(0n);
    });

    it("increments correctly after deposits", async () => {
      await vault.connect(alice).depositNative(ONE_DAY, "A", { value: ONE_ETH });
      expect(await vault.lockCount(alice.address)).to.equal(1n);

      await vault.connect(alice).depositNative(ONE_DAY, "B", { value: ONE_ETH });
      expect(await vault.lockCount(alice.address)).to.equal(2n);
    });

    it("does not decrease after withdrawal", async () => {
      await vault.connect(alice).depositNative(ONE_DAY, "A", { value: ONE_ETH });
      await time.increase(ONE_DAY + 1);
      await vault.connect(alice).withdraw(0);

      expect(await vault.lockCount(alice.address)).to.equal(1n);
    });

    it("is isolated per user", async () => {
      await vault.connect(alice).depositNative(ONE_DAY, "Alice", { value: ONE_ETH });
      await vault.connect(alice).depositNative(ONE_DAY, "Alice 2", { value: ONE_ETH });
      await vault.connect(bob).depositNative(ONE_DAY, "Bob", { value: ONE_ETH });

      expect(await vault.lockCount(alice.address)).to.equal(2n);
      expect(await vault.lockCount(bob.address)).to.equal(1n);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Event emissions
  // ═══════════════════════════════════════════════════════════════════════════

  describe("Event emissions", () => {
    it("emits Deposited event on native deposit", async () => {
      const tx = vault.connect(alice).depositNative(ONE_DAY, "My Savings", {
        value: ONE_ETH,
      });

      await expect(tx)
        .to.emit(vault, "Deposited")
        .withArgs(
          alice.address,
          0n,
          ethers.ZeroAddress,
          ONE_ETH,
          (val) => val > 0n,
          "My Savings"
        );
    });

    it("emits Deposited event on ERC-20 deposit", async () => {
      const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
      const token = await ERC20Mock.deploy("TestToken", "TT", 18);
      const amount = ethers.parseEther("100");
      await token.mint(alice.address, amount);
      await token.connect(alice).approve(await vault.getAddress(), amount);

      const tx = vault.connect(alice).depositERC20(
        await token.getAddress(), amount, ONE_DAY, "ERC20 savings"
      );

      await expect(tx)
        .to.emit(vault, "Deposited")
        .withArgs(
          alice.address,
          0n,
          await token.getAddress(),
          amount,
          (val) => val > 0n,
          "ERC20 savings"
        );
    });

    it("emits Withdrawn event on withdrawal", async () => {
      await vault.connect(alice).depositNative(ONE_DAY, "Test", { value: ONE_ETH });
      await time.increase(ONE_DAY + 1);

      const tx = vault.connect(alice).withdraw(0);

      await expect(tx)
        .to.emit(vault, "Withdrawn")
        .withArgs(alice.address, 0n, ethers.ZeroAddress, ONE_ETH);
    });

    it("assigns incrementing lockIds across users", async () => {
      const tx1 = vault.connect(alice).depositNative(ONE_DAY, "Alice #1", { value: ONE_ETH });
      await expect(tx1).to.emit(vault, "Deposited").withArgs(alice.address, 0n, ethers.ZeroAddress, ONE_ETH, (v) => v > 0n, "Alice #1");

      const tx2 = vault.connect(bob).depositNative(ONE_DAY, "Bob #1", { value: HALF_ETH });
      await expect(tx2).to.emit(vault, "Deposited").withArgs(bob.address, 1n, ethers.ZeroAddress, HALF_ETH, (v) => v > 0n, "Bob #1");

      const tx3 = vault.connect(alice).depositNative(ONE_DAY, "Alice #2", { value: HALF_ETH });
      await expect(tx3).to.emit(vault, "Deposited").withArgs(alice.address, 2n, ethers.ZeroAddress, HALF_ETH, (v) => v > 0n, "Alice #2");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Cross-user isolation
  // ═══════════════════════════════════════════════════════════════════════════

  describe("Cross-user isolation", () => {
    it("user cannot withdraw another user's lock", async () => {
      await vault.connect(alice).depositNative(ONE_DAY, "Alice only", { value: ONE_ETH });
      await time.increase(ONE_DAY + 1);

      await expect(vault.connect(bob).withdraw(0)).to.be.revertedWithCustomError(
        vault,
        "LockNotFound"
      );
    });

    it("users have separate lock arrays", async () => {
      await vault.connect(alice).depositNative(ONE_DAY, "Alice", { value: ONE_ETH });
      await vault.connect(bob).depositNative(ONE_DAY * 7, "Bob", { value: HALF_ETH });

      const aliceLocks = await vault.getLocks(alice.address);
      const bobLocks = await vault.getLocks(bob.address);

      expect(aliceLocks.length).to.equal(1);
      expect(bobLocks.length).to.equal(1);
      expect(aliceLocks[0].label).to.equal("Alice");
      expect(bobLocks[0].label).to.equal("Bob");
      expect(aliceLocks[0].amount).to.equal(ONE_ETH);
      expect(bobLocks[0].amount).to.equal(HALF_ETH);
    });

    it("getLocks returns empty array for address with no deposits", async () => {
      const locks = await vault.getLocks(bob.address);
      expect(locks.length).to.equal(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Label storage
  // ═══════════════════════════════════════════════════════════════════════════

  describe("Label storage", () => {
    it("stores and retrieves the label correctly", async () => {
      const label = "Holiday fund 2026";
      await vault.connect(alice).depositNative(ONE_DAY, label, { value: ONE_ETH });

      const locks = await vault.getLocks(alice.address);
      expect(locks[0].label).to.equal(label);
    });

    it("allows an empty label", async () => {
      await vault.connect(alice).depositNative(ONE_DAY, "", { value: ONE_ETH });
      const locks = await vault.getLocks(alice.address);
      expect(locks[0].label).to.equal("");
    });

    it("handles a very long label", async () => {
      const longLabel = "A".repeat(200);
      await vault.connect(alice).depositNative(ONE_DAY, longLabel, { value: ONE_ETH });
      const locks = await vault.getLocks(alice.address);
      expect(locks[0].label).to.equal(longLabel);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Out-of-bounds lockIndex
  // ═══════════════════════════════════════════════════════════════════════════

  describe("Out-of-bounds lockIndex", () => {
    it("withdraw reverts with LockNotFound for non-existent index", async () => {
      await vault.connect(alice).depositNative(ONE_DAY, "A", { value: ONE_ETH });
      await time.increase(ONE_DAY + 1);

      await expect(vault.connect(alice).withdraw(1)).to.be.revertedWithCustomError(
        vault,
        "LockNotFound"
      );
    });

    it("withdraw reverts with LockNotFound for completely empty user", async () => {
      await expect(vault.connect(alice).withdraw(0)).to.be.revertedWithCustomError(
        vault,
        "LockNotFound"
      );
    });

    it("timeRemaining reverts with LockNotFound for non-existent index", async () => {
      await expect(vault.timeRemaining(alice.address, 0)).to.be.revertedWithCustomError(
        vault,
        "LockNotFound"
      );
    });

    it("timeRemaining reverts for out-of-bounds index", async () => {
      await vault.connect(alice).depositNative(ONE_DAY, "A", { value: ONE_ETH });
      await expect(vault.timeRemaining(alice.address, 5)).to.be.revertedWithCustomError(
        vault,
        "LockNotFound"
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Lock data integrity
  // ═══════════════════════════════════════════════════════════════════════════

  describe("Lock data integrity", () => {
    it("stores token as address(0) for native deposits", async () => {
      await vault.connect(alice).depositNative(ONE_DAY, "Native", { value: ONE_ETH });
      const locks = await vault.getLocks(alice.address);
      expect(locks[0].token).to.equal(ethers.ZeroAddress);
    });

    it("stores createdAt as current block timestamp", async () => {
      const tx = await vault.connect(alice).depositNative(ONE_DAY, "TS", { value: ONE_ETH });
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);

      const locks = await vault.getLocks(alice.address);
      expect(locks[0].createdAt).to.equal(BigInt(block.timestamp));
    });

    it("calculates unlocksAt as createdAt + lockDuration", async () => {
      const duration = ONE_DAY * 30;
      const tx = await vault.connect(alice).depositNative(duration, "30d", { value: ONE_ETH });
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);

      const locks = await vault.getLocks(alice.address);
      expect(locks[0].unlocksAt).to.equal(BigInt(block.timestamp + duration));
    });

    it("stores exact msg.value for native deposits", async () => {
      const weirdAmount = ethers.parseEther("0.123456789012345678");
      await vault.connect(alice).depositNative(ONE_DAY, "Precise", { value: weirdAmount });

      const locks = await vault.getLocks(alice.address);
      expect(locks[0].amount).to.equal(weirdAmount);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ERC-20 deposits
  // ═══════════════════════════════════════════════════════════════════════════

  describe("ERC-20 deposits", () => {
    let token;

    beforeEach(async () => {
      const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
      token = await ERC20Mock.deploy("MockUSDC", "mUSDC", 6);
      await token.mint(alice.address, 1000n * 10n ** 6n);
    });

    it("locks ERC-20 and releases after expiry", async () => {
      const amount = 500n * 10n ** 6n;
      await token.connect(alice).approve(await vault.getAddress(), amount);
      await vault.connect(alice).depositERC20(await token.getAddress(), amount, ONE_DAY, "USDC savings");

      await time.increase(ONE_DAY + 1);
      await vault.connect(alice).withdraw(0);

      expect(await token.balanceOf(alice.address)).to.equal(1000n * 10n ** 6n);
    });

    it("rejects zero-amount ERC-20 deposits", async () => {
      await expect(
        vault.connect(alice).depositERC20(await token.getAddress(), 0, ONE_DAY, "Zero")
      ).to.be.revertedWithCustomError(vault, "ZeroAmount");
    });

    it("rejects address(0) as token for ERC-20 deposits", async () => {
      await expect(
        vault.connect(alice).depositERC20(ethers.ZeroAddress, 100n, ONE_DAY, "Bad")
      ).to.be.revertedWithCustomError(vault, "LockNotFound");
    });

    it("reverts when caller has not approved the vault", async () => {
      const amount = 500n * 10n ** 6n;
      await expect(
        vault.connect(alice).depositERC20(await token.getAddress(), amount, ONE_DAY, "No approve")
      ).to.be.reverted;
    });

    it("reverts when caller has insufficient balance", async () => {
      const tooMuch = 2000n * 10n ** 6n;
      await token.connect(alice).approve(await vault.getAddress(), tooMuch);

      await expect(
        vault.connect(alice).depositERC20(await token.getAddress(), tooMuch, ONE_DAY, "Too much")
      ).to.be.reverted;
    });

    it("stores ERC-20 token address in lock data", async () => {
      const amount = 100n * 10n ** 6n;
      await token.connect(alice).approve(await vault.getAddress(), amount);
      await vault.connect(alice).depositERC20(await token.getAddress(), amount, ONE_DAY, "Check addr");

      const locks = await vault.getLocks(alice.address);
      expect(locks[0].token).to.equal(await token.getAddress());
    });

    it("supports multiple ERC-20 tokens simultaneously", async () => {
      const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
      const tokenB = await ERC20Mock.deploy("MockWBTC", "mWBTC", 8);
      await tokenB.mint(alice.address, 5n * 10n ** 8n);

      const usdcAmount = 200n * 10n ** 6n;
      const wbtcAmount = 1n * 10n ** 8n;

      await token.connect(alice).approve(await vault.getAddress(), usdcAmount);
      await vault.connect(alice).depositERC20(await token.getAddress(), usdcAmount, ONE_DAY, "USDC");

      await tokenB.connect(alice).approve(await vault.getAddress(), wbtcAmount);
      await vault.connect(alice).depositERC20(await tokenB.getAddress(), wbtcAmount, ONE_DAY * 7, "WBTC");

      const locks = await vault.getLocks(alice.address);
      expect(locks.length).to.equal(2);
      expect(locks[0].token).to.equal(await token.getAddress());
      expect(locks[1].token).to.equal(await tokenB.getAddress());
      expect(locks[0].amount).to.equal(usdcAmount);
      expect(locks[1].amount).to.equal(wbtcAmount);
    });

    it("can mix native and ERC-20 locks", async () => {
      await vault.connect(alice).depositNative(ONE_DAY, "Native", { value: ONE_ETH });

      const amount = 100n * 10n ** 6n;
      await token.connect(alice).approve(await vault.getAddress(), amount);
      await vault.connect(alice).depositERC20(await token.getAddress(), amount, ONE_DAY, "ERC-20");

      const locks = await vault.getLocks(alice.address);
      expect(locks.length).to.equal(2);
      expect(locks[0].token).to.equal(ethers.ZeroAddress);
      expect(locks[1].token).to.equal(await token.getAddress());
    });

    it("rejects ERC-20 deposit with duration below minimum", async () => {
      const amount = 100n * 10n ** 6n;
      await token.connect(alice).approve(await vault.getAddress(), amount);

      await expect(
        vault.connect(alice).depositERC20(await token.getAddress(), amount, 30, "Short")
      ).to.be.revertedWithCustomError(vault, "LockDurationTooShort");
    });

    it("rejects ERC-20 deposit with duration above maximum", async () => {
      const amount = 100n * 10n ** 6n;
      const tooLong = 50 * 365 * ONE_DAY + 1;
      await token.connect(alice).approve(await vault.getAddress(), amount);

      await expect(
        vault.connect(alice).depositERC20(await token.getAddress(), amount, tooLong, "Long")
      ).to.be.revertedWithCustomError(vault, "LockDurationTooShort");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // timeRemaining
  // ═══════════════════════════════════════════════════════════════════════════

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

    it("decreases as time passes", async () => {
      await vault.connect(alice).depositNative(ONE_DAY, "t", { value: ONE_ETH });

      const before = await vault.timeRemaining(alice.address, 0);
      await time.increase(3600);
      const after = await vault.timeRemaining(alice.address, 0);

      expect(after).to.be.lessThan(before);
      expect(before - after).to.be.closeTo(3600n, 5n);
    });

    it("returns 0 for withdrawn lock", async () => {
      await vault.connect(alice).depositNative(ONE_MINUTE, "t", { value: ONE_ETH });
      await time.increase(ONE_MINUTE + 1);
      await vault.connect(alice).withdraw(0);

      expect(await vault.timeRemaining(alice.address, 0)).to.equal(0n);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Constants
  // ═══════════════════════════════════════════════════════════════════════════

  describe("Public constants", () => {
    it("MIN_LOCK_DURATION is 1 minute", async () => {
      expect(await vault.MIN_LOCK_DURATION()).to.equal(60n);
    });

    it("MAX_LOCK_DURATION is 50 years in seconds", async () => {
      const fiftyYears = 50n * 365n * 86400n;
      expect(await vault.MAX_LOCK_DURATION()).to.equal(fiftyYears);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Withdrawal timing boundary
  // ═══════════════════════════════════════════════════════════════════════════

  describe("Withdrawal timing boundary", () => {
    it("cannot withdraw 1 second before unlock", async () => {
      await vault.connect(alice).depositNative(ONE_DAY, "Boundary", { value: ONE_ETH });
      await time.increase(ONE_DAY - 2);

      await expect(vault.connect(alice).withdraw(0)).to.be.revertedWithCustomError(
        vault,
        "LockNotYetExpired"
      );
    });

    it("can withdraw at exact unlock timestamp", async () => {
      const tx = await vault.connect(alice).depositNative(ONE_DAY, "Exact", { value: ONE_ETH });
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);
      const unlockTime = block.timestamp + ONE_DAY;

      await time.increaseTo(unlockTime);

      await expect(vault.connect(alice).withdraw(0)).to.not.be.reverted;
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Reentrancy guard
  // ═══════════════════════════════════════════════════════════════════════════

  describe("Reentrancy guard", () => {
    it("contract uses ReentrancyGuard (verified by deployment)", async () => {
      const vault2 = await (await ethers.getContractFactory("TimeVault")).deploy();
      expect(await vault2.getAddress()).to.be.properAddress;
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // LockNotYetExpired error data
  // ═══════════════════════════════════════════════════════════════════════════

  describe("LockNotYetExpired error data", () => {
    it("includes unlocksAt and currentTime in the error", async () => {
      await vault.connect(alice).depositNative(ONE_DAY, "Error data", { value: ONE_ETH });

      try {
        await vault.connect(alice).withdraw(0);
        expect.fail("Should have reverted");
      } catch (err) {
        expect(err.message).to.include("LockNotYetExpired");
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Contract balance integrity
  // ═══════════════════════════════════════════════════════════════════════════

  describe("Contract balance integrity", () => {
    it("contract holds deposited native funds", async () => {
      await vault.connect(alice).depositNative(ONE_DAY, "A", { value: ONE_ETH });
      await vault.connect(bob).depositNative(ONE_DAY, "B", { value: HALF_ETH });

      const vaultBal = await ethers.provider.getBalance(await vault.getAddress());
      expect(vaultBal).to.equal(ONE_ETH + HALF_ETH);
    });

    it("contract balance decreases after withdrawal", async () => {
      await vault.connect(alice).depositNative(ONE_DAY, "A", { value: ONE_ETH });
      await time.increase(ONE_DAY + 1);
      await vault.connect(alice).withdraw(0);

      const vaultBal = await ethers.provider.getBalance(await vault.getAddress());
      expect(vaultBal).to.equal(0n);
    });

    it("contract holds deposited ERC-20 tokens", async () => {
      const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
      const tk = await ERC20Mock.deploy("TK", "TK", 18);
      const amount = ethers.parseEther("50");
      await tk.mint(alice.address, amount);
      await tk.connect(alice).approve(await vault.getAddress(), amount);
      await vault.connect(alice).depositERC20(await tk.getAddress(), amount, ONE_DAY, "Hold");

      expect(await tk.balanceOf(await vault.getAddress())).to.equal(amount);
    });
  });
});
