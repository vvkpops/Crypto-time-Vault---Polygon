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

  // ── Short presets & minutes input ──────────────────────────────────────────

  it("renders all 4 short duration preset buttons", () => {
    renderForm();
    expect(screen.getByText("1 min")).toBeInTheDocument();
    expect(screen.getByText("5 min")).toBeInTheDocument();
    expect(screen.getByText("15 min")).toBeInTheDocument();
    expect(screen.getByText("30 min")).toBeInTheDocument();
  });

  it("shows 'Quick duration — Short' label", () => {
    renderForm();
    expect(screen.getByText("Quick duration — Short")).toBeInTheDocument();
  });

  it("shows 'Quick duration — Long' label", () => {
    renderForm();
    expect(screen.getByText("Quick duration — Long")).toBeInTheDocument();
  });

  it("clicking a short preset fills Minutes field", async () => {
    renderForm();
    const user = userEvent.setup();
    await user.click(screen.getByText("5 min"));
    expect(screen.getByPlaceholderText("Minutes").value).toBe("5");
  });

  it("clicking 1 min sets minutes to 1", async () => {
    renderForm();
    const user = userEvent.setup();
    await user.click(screen.getByText("1 min"));
    expect(screen.getByPlaceholderText("Minutes").value).toBe("1");
    expect(screen.getByPlaceholderText("Days").value).toBe("");
    expect(screen.getByPlaceholderText("Hours").value).toBe("");
  });

  it("clicking 30 min sets minutes to 30", async () => {
    renderForm();
    const user = userEvent.setup();
    await user.click(screen.getByText("30 min"));
    expect(screen.getByPlaceholderText("Minutes").value).toBe("30");
  });

  it("has a Minutes input placeholder", () => {
    renderForm();
    expect(screen.getByPlaceholderText("Minutes")).toBeInTheDocument();
  });

  it("has a Days input placeholder", () => {
    renderForm();
    expect(screen.getByPlaceholderText("Days")).toBeInTheDocument();
  });

  it("has a Hours input placeholder", () => {
    renderForm();
    expect(screen.getByPlaceholderText("Hours")).toBeInTheDocument();
  });

  it("minutes input accepts manual entry", async () => {
    renderForm();
    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText("Minutes"), "45");
    expect(screen.getByPlaceholderText("Minutes").value).toBe("45");
  });

  it("typing in custom duration clears the preset selection", async () => {
    renderForm();
    const user = userEvent.setup();
    // First select a preset
    await user.click(screen.getByText("1 week"));
    // Then type in custom days
    await user.clear(screen.getByPlaceholderText("Days"));
    await user.type(screen.getByPlaceholderText("Days"), "10");
    // Now clicking the same preset again should re-highlight it
    const presetBtn = screen.getByText("1 week");
    expect(presetBtn.className).not.toContain("active");
  });

  it("submit button enabled when only minutes set >= 1", async () => {
    renderForm();
    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText(/e.g. 0.5/), "0.5");
    await user.click(screen.getByText("1 min"));
    const btn = screen.getByRole("button", { name: /Lock/ });
    expect(btn).not.toBeDisabled();
  });

  it("label input has maxLength of 60", () => {
    renderForm();
    const label = screen.getByPlaceholderText(/Holiday savings/i);
    expect(label.getAttribute("maxlength")).toBe("60");
  });

  it("shows minimum lock warning when duration < 60s but > 0", async () => {
    renderForm();
    const user = userEvent.setup();
    // Type 0.5 minutes = 30 seconds < 60
    await user.type(screen.getByPlaceholderText("Minutes"), "0.5");
    // Warning should be visible (but lock button still disabled)
    expect(screen.getByText(/Minimum lock is 1 minute/)).toBeInTheDocument();
  });

  it("shows unlock date hint when duration > 0", async () => {
    renderForm();
    const user = userEvent.setup();
    await user.click(screen.getByText("5 min"));
    expect(screen.getByText(/Unlocks:/)).toBeInTheDocument();
  });

  it("renders Custom ERC-20 address option", () => {
    renderForm();
    const select = screen.getByRole("combobox");
    const options = Array.from(select.options).map(o => o.textContent);
    expect(options).toContain("Custom ERC-20 address…");
  });
});
