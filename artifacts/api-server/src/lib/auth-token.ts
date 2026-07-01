import crypto from "crypto";

const TOKEN_VERSION = "v1";
const TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function getSecret(): string {
  return process.env["SESSION_SECRET"] || process.env["TOKEN_SECRET"] || "dev-secret-change-in-production";
}

/**
 * Sign a user ID into a self-contained auth token.
 * Format (base64url): v1.<userId>.<issuedAt>.<hmac>
 */
export function signAuthToken(userId: number): string {
  const payload = `${TOKEN_VERSION}.${userId}.${Date.now()}`;
  const sig = crypto
    .createHmac("sha256", getSecret())
    .update(payload)
    .digest("hex");
  return Buffer.from(`${payload}.${sig}`).toString("base64url");
}

/**
 * Verify an auth token and return the userId, or null if invalid/expired.
 */
export function verifyAuthToken(token: string): number | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const parts = decoded.split(".");
    if (parts.length !== 4) return null;

    const [version, userIdStr, issuedAtStr, sig] = parts;
    if (version !== TOKEN_VERSION) return null;

    const payload = `${version}.${userIdStr}.${issuedAtStr}`;
    const expectedSig = crypto
      .createHmac("sha256", getSecret())
      .update(payload)
      .digest("hex");

    // Timing-safe comparison to prevent timing attacks
    if (
      sig.length !== expectedSig.length ||
      !crypto.timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expectedSig, "hex"))
    ) {
      return null;
    }

    const issuedAt = parseInt(issuedAtStr, 10);
    if (isNaN(issuedAt) || Date.now() - issuedAt > TOKEN_EXPIRY_MS) {
      return null; // Expired
    }

    const userId = parseInt(userIdStr, 10);
    if (isNaN(userId) || userId <= 0) return null;

    return userId;
  } catch {
    return null;
  }
}
