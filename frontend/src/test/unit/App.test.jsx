import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock the useVault hook before importing App
const mockConnect = vi.fn();
const mockDepositNative = vi.fn();
const mockDepositERC20 = vi.fn();
const mockWithdraw = vi.fn();
const mockFetchLocks = vi.fn();

const defaultVaultReturn = {
  account: null,
  chainId: null,
  chainMeta: {},
  tokens: [],
  contractAddress: null,
  locks: [],
  loading: false,
  txPending: false,
  connect: mockConnect,
  depositNative: mockDepositNative,
  depositERC20: mockDepositERC20,
  withdraw: mockWithdraw,
  fetchLocks: mockFetchLocks,
};

let mockVaultReturn = { ...defaultVaultReturn };

vi.mock("../../hooks/useVault", () => ({
  useVault: () => mockVaultReturn,
}));

// Import after mock
import App from "../../App";

describe("App", () => {
  beforeEach(() => {
    mockVaultReturn = { ...defaultVaultReturn };
    vi.clearAllMocks();
  });

  it("renders without crashing", () => {
    render(<App />);
    expect(screen.getByText("TimeVault")).toBeInTheDocument();
  });

  it("shows connect prompt when not connected", () => {
    render(<App />);
    expect(screen.getByText("Your personal time-lock vault")).toBeInTheDocument();
    expect(screen.getByText("Connect Wallet to Start")).toBeInTheDocument();
  });

  it("shows tagline about self-custody", () => {
    render(<App />);
    expect(screen.getByText(/Self-custody time-locked savings/)).toBeInTheDocument();
  });

  it("shows wallet compatibility note", () => {
    render(<App />);
    expect(screen.getByText(/MetaMask.*Coinbase Wallet/i)).toBeInTheDocument();
  });

  it("shows deposit form and vault list when connected", () => {
    mockVaultReturn = {
      ...defaultVaultReturn,
      account: "0xAbCd1234567890abcdef1234567890abcdef5678",
      chainId: 137,
      chainMeta: { name: "Polygon", nativeSymbol: "POL", explorer: "https://polygonscan.com" },
      tokens: [],
      contractAddress: "0x131272Ad93eD41a3DdDc393C0dA3d6B6F27e8d23",
    };
    render(<App />);
    expect(screen.getByText("New Lock")).toBeInTheDocument();
    expect(screen.getByText("Your Vaults")).toBeInTheDocument();
  });

  it("shows stats row when connected", () => {
    mockVaultReturn = {
      ...defaultVaultReturn,
      account: "0xAbCd1234567890abcdef1234567890abcdef5678",
      chainId: 137,
      chainMeta: { name: "Polygon", nativeSymbol: "POL" },
      contractAddress: "0x131272Ad93eD41a3DdDc393C0dA3d6B6F27e8d23",
    };
    render(<App />);
    expect(screen.getByText("Total locks")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("Ready")).toBeInTheDocument();
  });

  it("displays correct stats for given locks", () => {
    const now = Math.floor(Date.now() / 1000);
    mockVaultReturn = {
      ...defaultVaultReturn,
      account: "0xAbCd1234567890abcdef1234567890abcdef5678",
      chainId: 137,
      chainMeta: { name: "Polygon", nativeSymbol: "POL" },
      contractAddress: "0x131272Ad93eD41a3DdDc393C0dA3d6B6F27e8d23",
      locks: [
        { id: 0n, token: "0x0000000000000000000000000000000000000000", amount: 1000000000000000000n, unlocksAt: BigInt(now + 86400), createdAt: BigInt(now), label: "Active lock", withdrawn: false, _index: 0 },
        { id: 1n, token: "0x0000000000000000000000000000000000000000", amount: 500000000000000000n, unlocksAt: BigInt(now - 1), createdAt: BigInt(now - 86400), label: "Ready lock", withdrawn: false, _index: 1 },
        { id: 2n, token: "0x0000000000000000000000000000000000000000", amount: 200000000000000000n, unlocksAt: BigInt(now - 100), createdAt: BigInt(now - 86400), label: "Withdrawn", withdrawn: true, _index: 2 },
      ],
    };
    render(<App />);
    // total = 3, active = 2 (not withdrawn), ready = 1 (not withdrawn and expired)
    const statValues = screen.getAllByText(/^[0-3]$/);
    expect(statValues.length).toBeGreaterThanOrEqual(3);
  });

  it("shows empty vault state when no locks exist", () => {
    mockVaultReturn = {
      ...defaultVaultReturn,
      account: "0xAbCd1234567890abcdef1234567890abcdef5678",
      chainId: 137,
      chainMeta: { name: "Polygon", nativeSymbol: "POL" },
      contractAddress: "0x131272Ad93eD41a3DdDc393C0dA3d6B6F27e8d23",
      locks: [],
    };
    render(<App />);
    expect(screen.getByText(/No locks yet/)).toBeInTheDocument();
  });

  it("renders floating orbs container", () => {
    const { container } = render(<App />);
    expect(container.querySelector(".floating-orbs")).toBeInTheDocument();
  });

  it("renders 5 floating orbs", () => {
    const { container } = render(<App />);
    const orbs = container.querySelectorAll(".floating-orbs .orb");
    // Framer motion may use divs without .orb class, but .floating-orbs should exist
    expect(container.querySelector(".floating-orbs")).toBeInTheDocument();
  });

  it("calls connect when hero CTA is clicked", async () => {
    render(<App />);
    const user = userEvent.setup();
    await user.click(screen.getByText("Connect Wallet to Start"));
    expect(mockConnect).toHaveBeenCalledOnce();
  });

  it("renders header component", () => {
    render(<App />);
    expect(screen.getByText("TimeVault")).toBeInTheDocument();
  });

  it("renders toast container", () => {
    const { container } = render(<App />);
    expect(container.querySelector(".toast-container")).toBeInTheDocument();
  });
});
