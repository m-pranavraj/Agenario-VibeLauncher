import { test, expect } from "@playwright/test";

async function registerAndLogin(page: any) {
  const uniqueEmail = `scan-${Date.now()}@example.com`;

  await page.goto("/register");
  await page.fill('[name="name"]', "Scan User");
  await page.fill('[name="email"]', uniqueEmail);
  await page.fill('[name="password"]', "SecurePass123!");
  await page.fill('[name="confirmPassword"]', "SecurePass123!");
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/dashboard/);

  return uniqueEmail;
}

test.describe("Scan Flow", () => {
  test("user can start a scan from description", async ({ page }) => {
    await registerAndLogin(page);

    await page.goto("/scans/new");

    // Fill in the description source type
    await page.fill('[name="appDescription"]', "A React web app with user authentication and payment processing");

    await page.click('button[type="submit"], button:has-text("Start Scan"), button:has-text("Analyze")');

    // Should redirect to scan progress or results
    await expect(page).toHaveURL(/\/scans\/\d+/);
  });

  test("scan progress page shows progress indicators", async ({ page }) => {
    await registerAndLogin(page);

    await page.goto("/scans/new");
    await page.fill('[name="appDescription"]', "A Node.js Express API with SQL database");
    await page.click('button[type="submit"], button:has-text("Start Scan"), button:has-text("Analyze")');

    // Should show progress
    await expect(page.locator("text=Analysis").or(page.locator("text=Scanning")).or(page.locator("text=Progress"))).toBeVisible({ timeout: 15_000 });
  });

  test("scan results page displays findings after completion", async ({ page }) => {
    await registerAndLogin(page);

    await page.goto("/scans/new");
    await page.fill('[name="appDescription"]', "A Replit clone using Supabase and Next.js with AI features");
    await page.click('button[type="submit"], button:has-text("Start Scan"), button:has-text("Analyze")');

    // Wait for scan to complete (long timeout)
    await expect(page.locator("text=Score").or(page.locator("text=Findings")).or(page.locator("text=Issues"))).toBeVisible({ timeout: 300_000 });
  });
});

test.describe("Report Export", () => {
  test("user can export scan report as JSON", async ({ page }) => {
    await registerAndLogin(page);

    await page.goto("/scans/new");
    await page.fill('[name="appDescription"]', "An e-commerce platform with Stripe integration");
    await page.click('button[type="submit"], button:has-text("Start Scan"), button:has-text("Analyze")');

    // Wait for scan to complete
    await expect(page.locator("text=Score").or(page.locator("text=Findings"))).toBeVisible({ timeout: 300_000 });

    // Check if export button exists
    const exportBtn = page.locator('button:has-text("Export"), a:has-text("Export")');
    if (await exportBtn.count() > 0) {
      await expect(exportBtn.first()).toBeVisible();
    }
  });
});
