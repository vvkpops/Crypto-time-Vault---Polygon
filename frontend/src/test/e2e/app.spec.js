import { test, expect } from "@playwright/test";

// ─── Mock wallet injected into every page before load ─────────────────────────
//
// Instead of mocking the full MetaMask API (which conflicts with ethers.js v6
// internals), we inject window.__TEST_WALLET__ which the useVault hook checks
// first and uses to bypass the real BrowserProvider flow.
//
const MOCK_ACCOUNT = "0xAbCd1234567890abcdef1234567890abcdef5678";
const MOCK_CHAIN_ID = 84532; // Base Sepolia

const mockWallet = `
  window.__TEST_WALLET__ = {
    account: "${MOCK_ACCOUNT}",
    chainId: ${MOCK_CHAIN_ID},
  };
`;

// Helper: click the header wallet button (the small one, not the hero CTA)
async function connectWallet(page) {
  await page.locator(".btn-wallet").click();
  // Wait for React state to settle (account set → full UI renders)
  await page.waitForFunction(() => document.querySelector(".stats-row") !== null, { timeout: 5000 });
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(mockWallet);
});

// ─── Basic render ─────────────────────────────────────────────────────────────

test("page loads — not a blank screen", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await expect(page.locator("#root")).not.toBeEmpty();
});

test("shows TimeVault brand in header", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("TimeVault").first()).toBeVisible();
});

test("shows Connect Wallet button in header before connecting", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".btn-wallet")).toBeVisible();
  await expect(page.locator(".btn-wallet")).toContainText("Connect Wallet");
});

test("connect prompt headline is visible", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Your personal time-lock vault")).toBeVisible();
});

test("tagline describes the product", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText(/Self-custody time-locked savings/i)).toBeVisible();
});

test("hero CTA button is visible on landing page", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".btn-primary")).toBeVisible();
  await expect(page.locator(".btn-primary")).toContainText("Connect Wallet to Start");
});

// ─── Wallet connection ────────────────────────────────────────────────────────

test("clicking header Connect Wallet runs the connect flow", async ({ page }) => {
  await page.goto("/");
  await connectWallet(page);
  const btnText = await page.locator(".btn-wallet").textContent();
  expect(btnText.trim().length).toBeGreaterThan(0);
  expect(btnText.trim()).not.toBe("Connect Wallet");
});

// ─── Deposit form ─────────────────────────────────────────────────────────────

test("deposit form section title appears after connecting", async ({ page }) => {
  await page.goto("/");
  await connectWallet(page);
  await expect(page.getByText("New Lock")).toBeVisible();
});

test("all 5 duration preset buttons are visible", async ({ page }) => {
  await page.goto("/");
  await connectWallet(page);
  for (const label of ["1 week", "1 month", "3 months", "6 months", "1 year"]) {
    await expect(page.getByText(label)).toBeVisible();
  }
});

test("clicking a duration preset highlights it with active class", async ({ page }) => {
  await page.goto("/");
  await connectWallet(page);
  const presetBtn = page.locator(".duration-btn", { hasText: "1 month" });
  await presetBtn.click();
  await expect(presetBtn).toHaveClass(/active/);
});

test("preset fills Days input", async ({ page }) => {
  await page.goto("/");
  await connectWallet(page);
  await page.locator(".duration-btn", { hasText: "1 week" }).click();
  await expect(page.getByPlaceholder("Days")).toHaveValue("7");
});

test("selecting 1 year shows unlock date hint", async ({ page }) => {
  await page.goto("/");
  await connectWallet(page);
  await page.locator(".duration-btn", { hasText: "1 year" }).click();
  await expect(page.getByText(/Unlocks:/i)).toBeVisible();
});

test("Lock button is disabled when no amount entered", async ({ page }) => {
  await page.goto("/");
  await connectWallet(page);
  await page.locator(".duration-btn", { hasText: "1 month" }).click();
  await expect(page.locator("button.btn-primary")).toBeDisabled();
});

test("Lock button is enabled after amount + duration are set", async ({ page }) => {
  await page.goto("/");
  await connectWallet(page);
  await page.locator(".duration-btn", { hasText: "1 month" }).click();
  await page.getByPlaceholder(/e.g. 0.5/i).fill("0.5");
  await expect(page.locator("button.btn-primary")).not.toBeDisabled();
});

test("asset dropdown contains native coin option", async ({ page }) => {
  await page.goto("/");
  await connectWallet(page);
  const select = page.locator("select").first();
  const options = await select.locator("option").allTextContents();
  expect(options.some((o) => /native|ETH|MATIC/i.test(o))).toBeTruthy();
});

test("label input accepts text", async ({ page }) => {
  await page.goto("/");
  await connectWallet(page);
  const labelInput = page.getByPlaceholder(/Holiday savings/i);
  await labelInput.fill("Emergency fund 2027");
  await expect(labelInput).toHaveValue("Emergency fund 2027");
});

// ─── Vault list ───────────────────────────────────────────────────────────────

test("Your Vaults section is visible after connecting", async ({ page }) => {
  await page.goto("/");
  await connectWallet(page);
  await expect(page.getByText("Your Vaults")).toBeVisible();
});

test("empty vault state is shown when no locks exist", async ({ page }) => {
  await page.goto("/");
  await connectWallet(page);
  await expect(page.getByText(/No locks yet/i)).toBeVisible();
});

// ─── Stats chips ──────────────────────────────────────────────────────────────

test("stats row is visible after connecting", async ({ page }) => {
  await page.goto("/");
  await connectWallet(page);
  await expect(page.getByText("Total locks")).toBeVisible();
  await expect(page.getByText("Active locks")).toBeVisible();
  await expect(page.getByText("Ready to withdraw")).toBeVisible();
});

// ─── Accessibility / SEO ──────────────────────────────────────────────────────

test("page title is set", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/TimeVault/i);
});

test("no JS console errors on load", async ({ page }) => {
  const errors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  const realErrors = errors.filter(
    (e) => !e.includes("extension") && !e.includes("favicon") && !e.includes("ERR_BLOCKED")
  );
  expect(realErrors).toHaveLength(0);
});

test("no uncaught page crashes", async ({ page }) => {
  const crashes = [];
  page.on("pageerror", (err) => crashes.push(err.message));
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  expect(crashes).toHaveLength(0);
});
