import { describe, it, expect } from "vitest";
import {
  shortAddr,
  formatAmount,
  formatCountdown,
  formatDate,
  durationToSeconds,
  DURATION_PRESETS,
  DURATION_PRESETS_SHORT,
  KNOWN_TOKENS,
  CHAIN_META,
} from "../../utils/format";

// ─── shortAddr ────────────────────────────────────────────────────────────────
describe("shortAddr", () => {
  it("truncates a full address", () => {
    expect(shortAddr("0xAbCdEf1234567890abcdef1234567890abcdef12"))
      .toBe("0xAbCd…ef12");
  });

  it("returns empty string for falsy input", () => {
    expect(shortAddr("")).toBe("");
    expect(shortAddr(null)).toBe("");
    expect(shortAddr(undefined)).toBe("");
  });
});

// ─── formatAmount ─────────────────────────────────────────────────────────────
describe("formatAmount", () => {
  it("formats 1 ETH (18 decimals)", () => {
    const one = 1_000_000_000_000_000_000n; // 1e18
    expect(formatAmount(one, 18, "ETH")).toBe("1 ETH");
  });

  it("formats 100 USDC (6 decimals)", () => {
    const usdc = 100_000_000n; // 100 * 1e6
    expect(formatAmount(usdc, 6, "USDC")).toBe("100 USDC");
  });

  it("handles 0", () => {
    expect(formatAmount(0n, 18, "ETH")).toBe("0 ETH");
  });

  it("handles very small amounts", () => {
    const tiny = 1n; // 1 wei
    const result = formatAmount(tiny, 18, "ETH");
    expect(result).toContain("ETH");
    expect(result).not.toBe("0 ETH");
  });

  it("works without a symbol", () => {
    const result = formatAmount(1_000_000_000_000_000_000n, 18);
    expect(result).toBe("1");
  });
});

// ─── formatCountdown ──────────────────────────────────────────────────────────
describe("formatCountdown", () => {
  it("returns withdrawable message for 0 or negative", () => {
    expect(formatCountdown(0)).toBe("Ready to withdraw ✓");
    expect(formatCountdown(-100)).toBe("Ready to withdraw ✓");
  });

  it("formats days correctly", () => {
    const result = formatCountdown(2 * 86400 + 3600 + 60); // 2d 1h 1m
    expect(result).toMatch(/^2d/);
  });

  it("formats hours when less than a day", () => {
    const result = formatCountdown(3 * 3600 + 30 * 60 + 5); // 3h 30m 5s
    expect(result).toMatch(/^3h/);
  });

  it("formats minutes when less than an hour", () => {
    const result = formatCountdown(45 * 60 + 10); // 45m 10s
    expect(result).toMatch(/^45m/);
  });

  it("formats seconds when less than a minute", () => {
    const result = formatCountdown(42);
    expect(result).toBe("42s left");
  });
});

// ─── durationToSeconds ────────────────────────────────────────────────────────
describe("durationToSeconds", () => {
  it("converts pure days", () => {
    expect(durationToSeconds({ days: 7 })).toBe(7 * 86400);
  });

  it("converts pure hours", () => {
    expect(durationToSeconds({ hours: 3 })).toBe(3 * 3600);
  });

  it("converts pure minutes", () => {
    expect(durationToSeconds({ minutes: 30 })).toBe(1800);
  });

  it("combines all fields", () => {
    expect(durationToSeconds({ days: 1, hours: 2, minutes: 30 }))
      .toBe(86400 + 7200 + 1800);
  });

  it("returns 0 for empty input", () => {
    expect(durationToSeconds({})).toBe(0);
  });

  it("handles string inputs (from HTML inputs)", () => {
    expect(durationToSeconds({ days: "5", hours: "0", minutes: "0" }))
      .toBe(5 * 86400);
  });
});

// ─── formatDate ───────────────────────────────────────────────────────────────
describe("formatDate", () => {
  it("returns a non-empty string for a valid timestamp", () => {
    const result = formatDate(1893456000); // some future date
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("returns empty string for falsy input", () => {
    expect(formatDate(0)).toBe("");
    expect(formatDate(null)).toBe("");
    expect(formatDate(undefined)).toBe("");
  });
});

// ─── DURATION_PRESETS ─────────────────────────────────────────────────────────
describe("DURATION_PRESETS", () => {
  it("has 5 presets", () => {
    expect(DURATION_PRESETS).toHaveLength(5);
  });

  it("first preset is 1 week (604800s)", () => {
    const [label, secs] = DURATION_PRESETS[0];
    expect(label).toBe("1 week");
    expect(secs).toBe(7 * 86400);
  });

  it("all presets have increasing durations", () => {
    const secs = DURATION_PRESETS.map(([, s]) => s);
    for (let i = 1; i < secs.length; i++) {
      expect(secs[i]).toBeGreaterThan(secs[i - 1]);
    }
  });
});

// ─── DURATION_PRESETS_SHORT ───────────────────────────────────────────────────
describe("DURATION_PRESETS_SHORT", () => {
  it("has 4 presets", () => {
    expect(DURATION_PRESETS_SHORT).toHaveLength(4);
  });

  it("first preset is 1 min (60s)", () => {
    const [label, secs] = DURATION_PRESETS_SHORT[0];
    expect(label).toBe("1 min");
    expect(secs).toBe(60);
  });

  it("last preset is 30 min (1800s)", () => {
    const [label, secs] = DURATION_PRESETS_SHORT[DURATION_PRESETS_SHORT.length - 1];
    expect(label).toBe("30 min");
    expect(secs).toBe(1800);
  });

  it("all presets have increasing durations", () => {
    const secs = DURATION_PRESETS_SHORT.map(([, s]) => s);
    for (let i = 1; i < secs.length; i++) {
      expect(secs[i]).toBeGreaterThan(secs[i - 1]);
    }
  });

  it("contains expected labels", () => {
    const labels = DURATION_PRESETS_SHORT.map(([l]) => l);
    expect(labels).toEqual(["1 min", "5 min", "15 min", "30 min"]);
  });

  it("all values are less than 1 hour", () => {
    for (const [, secs] of DURATION_PRESETS_SHORT) {
      expect(secs).toBeLessThanOrEqual(3600);
    }
  });

  it("all values are at least MIN_LOCK_DURATION (60s)", () => {
    for (const [, secs] of DURATION_PRESETS_SHORT) {
      expect(secs).toBeGreaterThanOrEqual(60);
    }
  });
});

// ─── KNOWN_TOKENS ─────────────────────────────────────────────────────────────
describe("KNOWN_TOKENS", () => {
  it("has tokens for Base mainnet (8453)", () => {
    expect(KNOWN_TOKENS[8453]).toBeDefined();
    expect(KNOWN_TOKENS[8453].length).toBeGreaterThan(0);
  });

  it("every token has required fields", () => {
    for (const [, tokens] of Object.entries(KNOWN_TOKENS)) {
      for (const tok of tokens) {
        expect(tok).toHaveProperty("symbol");
        expect(tok).toHaveProperty("address");
        expect(tok).toHaveProperty("decimals");
        expect(tok.address).toMatch(/^0x[0-9a-fA-F]{40}$/);
        expect([6, 8, 18]).toContain(tok.decimals);
      }
    }
  });
});

// ─── CHAIN_META ───────────────────────────────────────────────────────────────
describe("CHAIN_META", () => {
  it("has entries for Base, Polygon, and localhost", () => {
    expect(CHAIN_META[8453].name).toBe("Base");
    expect(CHAIN_META[137].name).toBe("Polygon");
    expect(CHAIN_META[31337].name).toBe("Localhost");
  });

  it("every entry has nativeSymbol", () => {
    for (const meta of Object.values(CHAIN_META)) {
      expect(meta).toHaveProperty("nativeSymbol");
    }
  });
});
