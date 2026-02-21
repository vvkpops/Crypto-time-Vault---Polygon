import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Header from "../../components/Header";

describe("Header", () => {
  it("renders the brand name", () => {
    render(<Header account={null} chainMeta={{}} onConnect={vi.fn()} loading={false} />);
    expect(screen.getByText("TimeVault")).toBeInTheDocument();
  });

  it("shows Connect Wallet button when not connected", () => {
    render(<Header account={null} chainMeta={{}} onConnect={vi.fn()} loading={false} />);
    expect(screen.getByRole("button", { name: /Connect Wallet/i })).toBeInTheDocument();
  });

  it("shows truncated address when connected", () => {
    render(
      <Header
        account="0xAbCd1234567890abcdef1234567890abcdef5678"
        chainMeta={{ name: "Base" }}
        onConnect={vi.fn()}
        loading={false}
      />
    );
    // shortAddr produces "0xAbCd…5678"
    expect(screen.getByRole("button", { name: /0xAbCd/i })).toBeInTheDocument();
  });

  it("shows network badge when connected", () => {
    render(
      <Header
        account="0xAbCd1234567890abcdef1234567890abcdef5678"
        chainMeta={{ name: "Base" }}
        onConnect={vi.fn()}
        loading={false}
      />
    );
    expect(screen.getByText("Base")).toBeInTheDocument();
  });

  it("calls onConnect when button is clicked", async () => {
    const onConnect = vi.fn();
    const user = userEvent.setup();
    render(<Header account={null} chainMeta={{}} onConnect={onConnect} loading={false} />);
    await user.click(screen.getByRole("button", { name: /Connect Wallet/i }));
    expect(onConnect).toHaveBeenCalledOnce();
  });

  it("shows Connecting… and disables button while loading", () => {
    render(<Header account={null} chainMeta={{}} onConnect={vi.fn()} loading={true} />);
    const btn = screen.getByRole("button", { name: /Connecting/i });
    expect(btn).toBeDisabled();
  });

  it("shows native balance chip when connected with balance", () => {
    render(
      <Header
        account="0xAbCd1234567890abcdef1234567890abcdef5678"
        chainMeta={{ name: "Polygon" }}
        onConnect={vi.fn()}
        loading={false}
        balance={{ raw: 1500000000000000000n, formatted: "1.5", symbol: "POL" }}
      />
    );
    expect(screen.getByText("1.5000")).toBeInTheDocument();
    expect(screen.getByText("POL")).toBeInTheDocument();
  });

  it("does not show balance chip when not connected", () => {
    const { container } = render(
      <Header account={null} chainMeta={{}} onConnect={vi.fn()} loading={false} />
    );
    expect(container.querySelector(".header-balance")).not.toBeInTheDocument();
  });

  it("does not show balance chip when balance is null", () => {
    const { container } = render(
      <Header
        account="0xAbCd1234567890abcdef1234567890abcdef5678"
        chainMeta={{ name: "Polygon" }}
        onConnect={vi.fn()}
        loading={false}
        balance={null}
      />
    );
    expect(container.querySelector(".header-balance")).not.toBeInTheDocument();
  });
});
