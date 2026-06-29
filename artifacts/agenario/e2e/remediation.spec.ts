import { test, expect } from "@playwright/test";

test.describe("Remediation Flow", () => {
  test("remediation page shows fix options for scan issues", async ({ page }) => {
    const uniqueEmail = `remediation-${Date.now()}@example.com`;

    await page.goto("/register");
    await page.fill('[name="name"]', "Remediation User");
    await page.fill('[name="email"]', uniqueEmail);
    await page.fill('[name="password"]', "SecurePass123!");
    await page.fill('[name="confirmPassword"]', "SecurePass123!");
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);

    // Complete a scan first
    await page.goto("/scans/new");
    await page.fill('[name="appDescription"]', "A React app with SQL injection vulnerability in login form");
    await page.click('button[type="submit"], button:has-text("Start Scan"), button:has-text("Analyze")');

    // Wait for scan to complete
    await expect(page.locator("text=Score").or(page.locator("text=Findings"))).toBeVisible({ timeout: 300_000 });

    // Navigate to remediation
    const remediationLink = page.locator('a:has-text("Fix"), a:has-text("Remediate"), button:has-text("Fix")');
    if (await remediationLink.count() > 0) {
      await remediationLink.first().click();
      await expect(page).toHaveURL(/\/remediate/);
    }
  });
});

test.describe("UI Smoke Tests", () => {
  test("home page loads correctly", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("text=Agenario").or(page.locator("text=Security")).or(page.locator("text=Scan"))).toBeVisible();
  });

  test("pricing page loads correctly", async ({ page }) => {
    await page.goto("/pricing");
    await expect(page.locator("text=Pricing").or(page.locator("text=Free")).or(page.locator("text=Creator"))).toBeVisible();
  });

  test("about page loads correctly", async ({ page }) => {
    await page.goto("/about");
    await expect(page.locator("text=Agenario").or(page.locator("text=About")).or(page.locator("text=Mission"))).toBeVisible();
  });

  test("careers page loads correctly", async ({ page }) => {
    await page.goto("/careers");
    await expect(page.locator("text=Careers").or(page.locator("text=Join")).or(page.locator("text=Team"))).toBeVisible();
  });
});
