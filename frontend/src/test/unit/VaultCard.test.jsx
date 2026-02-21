import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import VaultCard from "../../components/VaultCard";
import { ethers } from "ethers";

const CHAIN_ID = 8453;
const CHAIN_META = { name: "Base", nativeSymbol: "ETH", explorer: "https://basescan.org" };

function makeLock(overrides = {}) {
  const now = Math.floor(Date.now() / 1000);
  return {
    id: 0n,
    token: ethers.ZeroAddress,
    amount: 500_000_000_000_000_000n, // 0.5 ETH
    unlocksAt: BigInt(now + 86400),   // 1 day from now (locked)
    createdAt: BigInt(now - 3600),
    label: "Test Savings",
    withdrawn: false,
    _index: 0,
    ...overrides,
  };
}

describe("VaultCard", () => {
  it("renders the lock label", () => {
    render(
      <VaultCard
        lock={makeLock()}
        lockIndex={0}
        onWithdraw={vi.fn()}
        txPending={false}
        chainId={CHAIN_ID}
        chainMeta={CHAIN_META}
      />
    );
    expect(screen.getByText("Test Savings")).toBeInTheDocument();
  });

  it("shows the ETH amount", () => {
    render(
      <VaultCard
        lock={makeLock()}
        lockIndex={0}
        onWithdraw={vi.fn()}
        txPending={false}
        chainId={CHAIN_ID}
        chainMeta={CHAIN_META}
      />
    );
    expect(screen.getByText(/0\.5.*ETH/)).toBeInTheDocument();
  });

  it("shows countdown when still locked", () => {
    render(
      <VaultCard
        lock={makeLock()}
        lockIndex={0}
        onWithdraw={vi.fn()}
        txPending={false}
        chainId={CHAIN_ID}
        chainMeta={CHAIN_META}
      />
    );
    expect(screen.getByText(/left/i)).toBeInTheDocument();
    // Withdraw button should NOT be visible
    expect(screen.queryByRole("button", { name: /Withdraw/i })).toBeNull();
  });

  it("shows Withdraw button when lock is expired", () => {
    const now = Math.floor(Date.now() / 1000);
    const expiredLock = makeLock({ unlocksAt: BigInt(now - 1) }); // expired 1s ago

    render(
      <VaultCard
        lock={expiredLock}
        lockIndex={0}
        onWithdraw={vi.fn()}
        txPending={false}
        chainId={CHAIN_ID}
        chainMeta={CHAIN_META}
      />
    );
    expect(screen.getByRole("button", { name: /Withdraw/i })).toBeInTheDocument();
  });

  it("calls onWithdraw with correct lockIndex when clicked", async () => {
    const now = Math.floor(Date.now() / 1000);
    const expiredLock = makeLock({ unlocksAt: BigInt(now - 1), _index: 3 });
    const onWithdraw = vi.fn();
    const user = userEvent.setup();

    render(
      <VaultCard
        lock={expiredLock}
        lockIndex={3}
        onWithdraw={onWithdraw}
        txPending={false}
        chainId={CHAIN_ID}
        chainMeta={CHAIN_META}
      />
    );
    await user.click(screen.getByRole("button", { name: /Withdraw/i }));
    expect(onWithdraw).toHaveBeenCalledWith(3);
  });

  it("disables Withdraw button while txPending", () => {
    const now = Math.floor(Date.now() / 1000);
    const expiredLock = makeLock({ unlocksAt: BigInt(now - 1) });

    render(
      <VaultCard
        lock={expiredLock}
        lockIndex={0}
        onWithdraw={vi.fn()}
        txPending={true}
        chainId={CHAIN_ID}
        chainMeta={CHAIN_META}
      />
    );
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("shows withdrawn state correctly", () => {
    const lock = makeLock({ withdrawn: true });

    render(
      <VaultCard
        lock={lock}
        lockIndex={0}
        onWithdraw={vi.fn()}
        txPending={false}
        chainId={CHAIN_ID}
        chainMeta={CHAIN_META}
      />
    );
    expect(screen.getByText(/Withdrawn/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Withdraw/i })).toBeNull();
  });

  it("falls back to Lock #id when label is empty", () => {
    render(
      <VaultCard
        lock={makeLock({ label: "" })}
        lockIndex={0}
        onWithdraw={vi.fn()}
        txPending={false}
        chainId={CHAIN_ID}
        chainMeta={CHAIN_META}
      />
    );
    expect(screen.getByText(/Lock #/i)).toBeInTheDocument();
  });

  it("resolves USDC token name for ERC-20 lock", () => {
    const usdcAddress = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
    const erc20Lock = makeLock({
      token: usdcAddress,
      amount: 100_000_000n, // 100 USDC (6 decimals)
    });

    render(
      <VaultCard
        lock={erc20Lock}
        lockIndex={0}
        onWithdraw={vi.fn()}
        txPending={false}
        chainId={CHAIN_ID}
        chainMeta={CHAIN_META}
      />
    );
    // Both the amount text and the explorer link contain USDC
    expect(screen.getAllByText(/USDC/).length).toBeGreaterThanOrEqual(1);
  });
});
