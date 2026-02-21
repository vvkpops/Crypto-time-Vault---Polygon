import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DepositForm from "../../components/DepositForm";

const BASE_TOKENS = [
  { symbol: "USDC", address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", decimals: 6 },
  { symbol: "USDT", address: "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2", decimals: 6 },
];

const BASE_META = { name: "Base", nativeSymbol: "ETH", explorer: "https://basescan.org" };
const CONTRACT_ADDR = "0x1234567890123456789012345678901234567890";

function renderForm(overrides = {}) {
  const onDeposit = vi.fn();
  render(
    <DepositForm
      tokens={BASE_TOKENS}
      chainMeta={BASE_META}
      onDeposit={onDeposit}
      txPending={false}
      contractAddress={CONTRACT_ADDR}
      {...overrides}
    />
  );
  return { onDeposit };
}

describe("DepositForm", () => {
  it("renders without crashing", () => {
    renderForm();
    expect(screen.getByText("New Lock")).toBeInTheDocument();
  });

  it("shows native ETH as default asset", () => {
    renderForm();
    const select = screen.getByRole("combobox");
    expect(select.value).toBe("__native__");
  });

  it("lists known ERC-20 tokens in the asset dropdown", () => {
    renderForm();
    expect(screen.getByText(/USDC/)).toBeInTheDocument();
    expect(screen.getByText(/USDT/)).toBeInTheDocument();
  });

  it("renders all 5 duration preset buttons", () => {
    renderForm();
    expect(screen.getByText("1 week")).toBeInTheDocument();
    expect(screen.getByText("1 month")).toBeInTheDocument();
    expect(screen.getByText("3 months")).toBeInTheDocument();
    expect(screen.getByText("6 months")).toBeInTheDocument();
    expect(screen.getByText("1 year")).toBeInTheDocument();
  });

  it("clicking a preset fills the duration fields", async () => {
    renderForm();
    const user = userEvent.setup();
    await user.click(screen.getByText("1 week"));
    // Days input should be populated with 7
    const daysInput = screen.getByPlaceholderText("Days");
    expect(daysInput.value).toBe("7");
  });

  it("submit button is disabled when amount is empty", () => {
    renderForm();
    const btn = screen.getByRole("button", { name: /Lock/ });
    expect(btn).toBeDisabled();
  });

  it("submit button is disabled when duration < 60s", async () => {
    renderForm();
    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText(/e.g. 0.5/), "1");
    // Don't set a duration — button stays disabled
    const btn = screen.getByRole("button", { name: /Lock/ });
    expect(btn).toBeDisabled();
  });

  it("submit button is disabled while txPending", () => {
    renderForm({ txPending: true });
    const btn = screen.getByRole("button", { name: /Confirming/ });
    expect(btn).toBeDisabled();
  });

  it("shows a warning banner when contractAddress is null", () => {
    renderForm({ contractAddress: null });
    expect(screen.getByText(/Contract not deployed/)).toBeInTheDocument();
  });

  it("calls onDeposit with correct native params when submitted", async () => {
    const { onDeposit } = renderForm();
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText(/e.g. 0.5/), "0.5");
    await user.click(screen.getByText("1 month"));

    const btn = screen.getByRole("button", { name: /Lock/ });
    expect(btn).not.toBeDisabled();
    await user.click(btn);

    expect(onDeposit).toHaveBeenCalledOnce();
    const args = onDeposit.mock.calls[0][0];
    expect(args.type).toBe("native");
    expect(args.amount).toBe("0.5");
    expect(args.durationSec).toBe(30 * 86400);
  });

  it("calls onDeposit with erc20 type when token is selected", async () => {
    const { onDeposit } = renderForm();
    const user = userEvent.setup();

    // Change asset to USDC
    await user.selectOptions(screen.getByRole("combobox"), BASE_TOKENS[0].address);
    await user.type(screen.getByPlaceholderText(/e.g. 100/), "50");
    await user.click(screen.getByText("1 week"));
    await user.click(screen.getByRole("button", { name: /Lock/ }));

    expect(onDeposit).toHaveBeenCalledOnce();
    const args = onDeposit.mock.calls[0][0];
    expect(args.type).toBe("erc20");
    expect(args.tokenAddress).toBe(BASE_TOKENS[0].address);
    expect(args.decimals).toBe(6);
    expect(args.amount).toBe("50");
  });

  it("resets form fields after successful deposit", async () => {
    const { onDeposit } = renderForm();
    onDeposit.mockResolvedValue(); // simulate async resolve

    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText(/e.g. 0.5/), "1");
    await user.click(screen.getByText("1 week"));
    await user.click(screen.getByRole("button", { name: /Lock/ }));

    // After submit, amount should be cleared
    const amountInput = screen.getByPlaceholderText(/e.g. 0.5/);
    expect(amountInput.value).toBe("");
  });
});
