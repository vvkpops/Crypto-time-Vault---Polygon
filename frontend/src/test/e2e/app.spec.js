import { test, expect } from "@playwright/test";

// ─── Mock wallet injected into every page before load ─────────────────────────
const MOCK_ACCOUNT = "0xAbCd1234567890abcdef1234567890abcdef5678";
const MOCK_CHAIN_ID = 84532; // Base Sepolia

const mockWallet = `
  window.__TEST_WALLET__ = {
    account: "${MOCK_ACCOUNT}",
    chainId: ${MOCK_CHAIN_ID},
  };
`;

// Helper: click the header wallet button
async function connectWallet(page) {
  await page.locator(".btn-wallet").click();
  await page.waitForFunction(() => document.querySelector(".stats-row") !== null, { timeout: 5000 });
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(mockWallet);
});

// ═══════════════════════════════════════════════════════════════════════════════
// Basic render
// ═══════════════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════════════
// Wallet connection
// ═══════════════════════════════════════════════════════════════════════════════

test("clicking header Connect Wallet runs the connect flow", async ({ page }) => {
  await page.goto("/");
  await connectWallet(page);
  const btnText = await page.locator(".btn-wallet").textContent();
  expect(btnText.trim().length).toBeGreaterThan(0);
  expect(btnText.trim()).not.toBe("Connect Wallet");
});

// ═══════════════════════════════════════════════════════════════════════════════
// Deposit form
// ═══════════════════════════════════════════════════════════════════════════════

test("deposit form section title appears after connecting", async ({ page }) => {
  await page.goto("/");
  await connectWallet(page);
  await expect(page.getByText("New Lock")).toBeVisible();
});

test("all 5 long duration preset buttons are visible", async ({ page }) => {
  await page.goto("/");
  await connectWallet(page);
  for (const label of ["1 week", "1 month", "3 months", "6 months", "1 year"]) {
    await expect(page.getByText(label)).toBeVisible();
  }
});

test("all 4 short duration preset buttons are visible", async ({ page }) => {
  await page.goto("/");
  await connectWallet(page);
  for (const label of ["1 min", "5 min", "15 min", "30 min"]) {
    await expect(page.getByText(label, { exact: true })).toBeVisible();
  }
});

test("clicking a duration preset highlights it with active class", async ({ page }) => {
  await page.goto("/");
  await connectWallet(page);
  const presetBtn = page.locator(".duration-btn", { hasText: "1 month" });
  await presetBtn.click();
  await expect(presetBtn).toHaveClass(/active/);
});

test("clicking a short preset highlights it with active class", async ({ page }) => {
  await page.goto("/");
  await connectWallet(page);
  const presetBtn = page.getByRole("button", { name: "5 min", exact: true });
  await presetBtn.click();
  await expect(presetBtn).toHaveClass(/active/);
});

test("preset fills Days input", async ({ page }) => {
  await page.goto("/");
  await connectWallet(page);
  await page.locator(".duration-btn", { hasText: "1 week" }).click();
  await expect(page.getByPlaceholder("Days")).toHaveValue("7");
});

test("short preset fills Minutes input", async ({ page }) => {
  await page.goto("/");
  await connectWallet(page);
  await page.getByRole("button", { name: "5 min", exact: true }).click();
  await expect(page.getByPlaceholder("Minutes")).toHaveValue("5");
  await expect(page.getByPlaceholder("Days")).toHaveValue("");
});

test("1 min preset fills Minutes with 1", async ({ page }) => {
  await page.goto("/");
  await connectWallet(page);
  await page.locator(".duration-btn", { hasText: "1 min" }).click();
  await expect(page.getByPlaceholder("Minutes")).toHaveValue("1");
});

test("30 min preset fills Minutes with 30", async ({ page }) => {
  await page.goto("/");
  await connectWallet(page);
  await page.locator(".duration-btn", { hasText: "30 min" }).click();
  await expect(page.getByPlaceholder("Minutes")).toHaveValue("30");
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

test("Lock button enabled with short preset + amount", async ({ page }) => {
  await page.goto("/");
  await connectWallet(page);
  await page.locator(".duration-btn", { hasText: "1 min" }).click();
  await page.getByPlaceholder(/e.g. 0.5/i).fill("0.1");
  await expect(page.locator("button.btn-primary")).not.toBeDisabled();
});

test("asset dropdown contains native coin option", async ({ page }) => {
  await page.goto("/");
  await connectWallet(page);
  const select = page.locator("select").first();
  const options = await select.locator("option").allTextContents();
  expect(options.some((o) => /native|ETH|MATIC/i.test(o))).toBeTruthy();
});

test("asset dropdown contains Custom ERC-20 option", async ({ page }) => {
  await page.goto("/");
  await connectWallet(page);
  const select = page.locator("select").first();
  const options = await select.locator("option").allTextContents();
  expect(options.some((o) => /Custom ERC-20/i.test(o))).toBeTruthy();
});

test("label input accepts text", async ({ page }) => {
  await page.goto("/");
  await connectWallet(page);
  const labelInput = page.getByPlaceholder(/Holiday savings/i);
  await labelInput.fill("Emergency fund 2027");
  await expect(labelInput).toHaveValue("Emergency fund 2027");
});

test("Minutes input exists and accepts values", async ({ page }) => {
  await page.goto("/");
  await connectWallet(page);
  const minutesInput = page.getByPlaceholder("Minutes");
  await expect(minutesInput).toBeVisible();
  await minutesInput.fill("15");
  await expect(minutesInput).toHaveValue("15");
});

test("Hours input exists", async ({ page }) => {
  await page.goto("/");
  await connectWallet(page);
  await expect(page.getByPlaceholder("Hours")).toBeVisible();
});

test("custom duration can be typed manually", async ({ page }) => {
  await page.goto("/");
  await connectWallet(page);
  await page.getByPlaceholder("Days").fill("10");
  await page.getByPlaceholder("Hours").fill("6");
  await page.getByPlaceholder("Minutes").fill("30");
  await expect(page.getByPlaceholder("Days")).toHaveValue("10");
  await expect(page.getByPlaceholder("Hours")).toHaveValue("6");
  await expect(page.getByPlaceholder("Minutes")).toHaveValue("30");
  // Unlock hint should be visible
  await expect(page.getByText(/Unlocks:/i)).toBeVisible();
});

// ═══════════════════════════════════════════════════════════════════════════════
// Vault list
// ═══════════════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════════════
// Stats chips
// ═══════════════════════════════════════════════════════════════════════════════

test("stats row is visible after connecting", async ({ page }) => {
  await page.goto("/");
  await connectWallet(page);
  await expect(page.getByText("Total locks")).toBeVisible();
  await expect(page.getByText("Active")).toBeVisible();
  await expect(page.getByText("Ready")).toBeVisible();
});

test("stat chips have stat-chip class", async ({ page }) => {
  await page.goto("/");
  await connectWallet(page);
  const chips = page.locator(".stat-chip");
  await expect(chips).toHaveCount(3);
});

// ═══════════════════════════════════════════════════════════════════════════════
// Floating orbs & animations
// ═══════════════════════════════════════════════════════════════════════════════

test("floating orbs container is present", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".floating-orbs")).toBeVisible();
});

test("floating orbs has aria-hidden for accessibility", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".floating-orbs")).toHaveAttribute("aria-hidden", "true");
});

test("card-glow class exists after connecting", async ({ page }) => {
  await page.goto("/");
  await connectWallet(page);
  await expect(page.locator(".card-glow").first()).toBeVisible();
});

// ═══════════════════════════════════════════════════════════════════════════════
// Responsive / viewport
// ═══════════════════════════════════════════════════════════════════════════════

test("app renders correctly at mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 }); // iPhone size
  await page.goto("/");
  await expect(page.locator("#root")).not.toBeEmpty();
  await expect(page.getByText("TimeVault").first()).toBeVisible();
});

test("connect prompt is visible on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  await expect(page.getByText("Your personal time-lock vault")).toBeVisible();
});

test("deposit form renders on tablet viewport", async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto("/");
  await connectWallet(page);
  await expect(page.getByText("New Lock")).toBeVisible();
});

// ═══════════════════════════════════════════════════════════════════════════════
// Accessibility / SEO
// ═══════════════════════════════════════════════════════════════════════════════

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

test("no JS errors after connecting wallet", async ({ page }) => {
  const errors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  await page.goto("/");
  await connectWallet(page);
  await page.waitForTimeout(1000);
  const realErrors = errors.filter(
    (e) => !e.includes("extension") && !e.includes("favicon") && !e.includes("ERR_BLOCKED")
  );
  expect(realErrors).toHaveLength(0);
});

test("lock button has descriptive text", async ({ page }) => {
  await page.goto("/");
  await connectWallet(page);
  await page.getByPlaceholder(/e.g. 0.5/i).fill("1.5");
  await page.locator(".duration-btn", { hasText: "1 month" }).click();
  const btn = page.locator("button.btn-primary");
  await expect(btn).toContainText(/Lock.*1\.5/);
});

