import { describe, it, expect } from "vitest";

// ── Auth helpers / logic tests ────────────────────────────────────────────────
describe("Auth logic — password hashing & formatting", () => {
  const bcrypt = require("bcryptjs");

  it("hashes password and verifies successfully", () => {
    const pwd = "my-secure-password";
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(pwd, salt);

    expect(bcrypt.compareSync(pwd, hash)).toBe(true);
    expect(bcrypt.compareSync("wrong-password", hash)).toBe(false);
  });

  it("masks reset token in logs correctly", () => {
    function maskResetToken(token: string): string {
      if (!token) return "";
      if (token.length <= 8) return "*".repeat(token.length);
      return token.slice(0, 8) + "...[MASKED]";
    }

    const rawToken = "supersecretpasswordresettoken12345";
    const masked = maskResetToken(rawToken);
    expect(masked).toBe("supersec...[MASKED]");
  });

  it("handles empty or short tokens gracefully when masking", () => {
    function maskResetToken(token: string): string {
      if (!token) return "";
      if (token.length <= 8) return "*".repeat(token.length);
      return token.slice(0, 8) + "...[MASKED]";
    }

    expect(maskResetToken("")).toBe("");
    expect(maskResetToken("abc")).toBe("***");
    expect(maskResetToken("12345678")).toBe("********");
  });
});

describe("Auth validation — phone numbers", () => {
  function isValidPhone(phone: string): boolean {
    if (!phone) return false;
    return /^\+[1-9]\d{6,14}$/.test(phone);
  }

  it("validates correct E.164 phone numbers", () => {
    expect(isValidPhone("+911234567890")).toBe(true);
    expect(isValidPhone("+14155552671")).toBe(true);
  });

  it("rejects invalid phone formats", () => {
    expect(isValidPhone("1234567890")).toBe(false); // missing +
    expect(isValidPhone("+012345")).toBe(false);      // leading 0 after + is invalid
    expect(isValidPhone("+91-1234567890")).toBe(false); // contains hyphens
  });
});
