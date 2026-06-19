import "express-session";

declare module "express-session" {
  interface SessionData {
    userId: number;
    pendingOtp?: {
      phone: string;
      otp: string;
      expiresAt: number;
    };
  }
}
