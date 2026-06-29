import { describe, it, expect } from "vitest";

/**
 * Phase 14 — CSP Headers Test
 * Verifies that the Helmet configuration in app.ts produces a strict
 * Content-Security-Policy header that does not allow unsafe-inline scripts.
 */
describe("CSP Headers", () => {
  it("should not contain 'unsafe-inline' in script-src directive", async () => {
    const fs = await import("fs");
    const path = await import("path");
    // In vitest, import.meta.url points to the compiled location
    // Use process.cwd() + relative path instead
    const appSource = fs.readFileSync(
      path.join(process.cwd(), "src", "app.ts"),
      "utf8"
    );

    // Verify that unsafe-inline is NOT in the scriptSrc directive
    const scriptSrcMatch = appSource.match(/scriptSrc:\s*\[([^\]]+)\]/);
    if (scriptSrcMatch) {
      const scriptSrcValue = scriptSrcMatch[1];
      expect(scriptSrcValue).not.toContain("'unsafe-inline'");
      expect(scriptSrcValue).toContain("'self'");
      expect(scriptSrcValue).toContain("checkout.razorpay.com");
    } else {
      throw new Error("Could not find scriptSrc in app.ts");
    }
  });

  it("should have helmet configured with security headers", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const appSource = fs.readFileSync(
      path.join(process.cwd(), "src", "app.ts"),
      "utf8"
    );

    expect(appSource).toContain("helmet(");
    expect(appSource).toContain("hsts");
    expect(appSource).toContain("maxAge: 31536000");
    expect(appSource).toContain("contentSecurityPolicy");
    expect(appSource).toContain("upgradeInsecureRequests");
  });

  it("should have rate limiting configured", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const appSource = fs.readFileSync(
      path.join(process.cwd(), "src", "app.ts"),
      "utf8"
    );

    expect(appSource).toContain("rateLimit");
    expect(appSource).toContain("/api/auth");
  });
});
