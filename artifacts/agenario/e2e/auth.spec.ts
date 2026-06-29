import { test, expect } from "@playwright/test";

test.describe("Authentication Flow", () => {
  test("user can register with email and password", async ({ page }) => {
    const uniqueEmail = `test-${Date.now()}@example.com`;

    await page.goto("/register");
    await page.fill('[name="name"]', "Test User");
    await page.fill('[name="email"]', uniqueEmail);
    await page.fill('[name="password"]', "SecurePass123!");
    await page.fill('[name="confirmPassword"]', "SecurePass123!");

    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("user can login with valid credentials", async ({ page }) => {
    const uniqueEmail = `login-${Date.now()}@example.com`;

    // Register first
    await page.goto("/register");
    await page.fill('[name="name"]', "Login User");
    await page.fill('[name="email"]', uniqueEmail);
    await page.fill('[name="password"]', "SecurePass123!");
    await page.fill('[name="confirmPassword"]', "SecurePass123!");
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);

    // Logout
    await page.goto("/login");
    await page.fill('[name="email"]', uniqueEmail);
    await page.fill('[name="password"]', "SecurePass123!");
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("user cannot login with invalid password", async ({ page }) => {
    await page.goto("/login");
    await page.fill('[name="email"]', "nonexistent@example.com");
    await page.fill('[name="password"]', "wrongpassword");
    await page.click('button[type="submit"]');

    await expect(page.locator("text=Invalid email or password")).toBeVisible();
  });
});

test.describe("Pricing & Billing", () => {
  test("pricing page displays all tiers", async ({ page }) => {
    await page.goto("/pricing");

    await expect(page.locator("text=Free")).toBeVisible();
    await expect(page.locator("text=Creator")).toBeVisible();
    await expect(page.locator("text=Enterprise")).toBeVisible();
  });
});

test.describe("Dashboard", () => {
  test("redirects to login when not authenticated", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });
});
