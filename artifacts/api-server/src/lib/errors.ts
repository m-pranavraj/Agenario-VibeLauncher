/**
 * Phase 5.4 — Standardized Error Handling
 * Replaces all inline res.status(x).json({ error: '...' }) calls with a consistent AppError class.
 * Use this in every route handler and middleware.
 */

export type ErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "BAD_REQUEST"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "INTERNAL"
  | "SERVICE_UNAVAILABLE"
  | "PAYMENT_REQUIRED";

const HTTP_STATUS: Record<ErrorCode, number> = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  BAD_REQUEST: 400,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  INTERNAL: 500,
  SERVICE_UNAVAILABLE: 503,
  PAYMENT_REQUIRED: 402,
};

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly userMessage: string;
  public readonly details?: unknown;

  constructor(code: ErrorCode, userMessage: string, details?: unknown) {
    super(userMessage);
    this.name = "AppError";
    this.code = code;
    this.statusCode = HTTP_STATUS[code];
    this.userMessage = userMessage;
    this.details = details;

    // Maintain correct prototype chain
    Object.setPrototypeOf(this, AppError.prototype);
  }

  toJSON() {
    return {
      error: this.userMessage,
      code: this.code,
      ...(this.details ? { details: this.details } : {}),
    };
  }
}

// ── Convenience factory functions ─────────────────────────────────────────────

export const Errors = {
  unauthorized: (msg = "Authentication required") => new AppError("UNAUTHORIZED", msg),
  forbidden: (msg = "Access denied") => new AppError("FORBIDDEN", msg),
  notFound: (resource = "Resource") => new AppError("NOT_FOUND", `${resource} not found`),
  badRequest: (msg: string, details?: unknown) => new AppError("BAD_REQUEST", msg, details),
  conflict: (msg: string) => new AppError("CONFLICT", msg),
  rateLimited: (msg = "Too many requests. Please try again later.") => new AppError("RATE_LIMITED", msg),
  internal: (msg = "An unexpected error occurred. Please try again.") => new AppError("INTERNAL", msg),
  paymentRequired: (msg = "Upgrade your plan to access this feature") => new AppError("PAYMENT_REQUIRED", msg),
};

// ── Express error handler middleware ──────────────────────────────────────────

import type { Request, Response, NextFunction } from "express";
import { logger } from "./logger.js";
import crypto from "crypto";

function captureExceptionToSentry(err: any): void {
  // Sentry error tracking is disabled
  return;
}

export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction): void {
  if (res.headersSent) {
    next(err);
    return;
  }

  // Capture unhandled errors or 5xx AppErrors in Sentry
  if (!(err instanceof AppError) || err.statusCode >= 500) {
    captureExceptionToSentry(err);
  }

  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error({ err, url: req.url, method: req.method }, "AppError 5xx");
    }
    res.status(err.statusCode).json(err.toJSON());
    return;
  }

  // Unknown error — log fully, return generic message
  logger.error({ err, url: req.url, method: req.method }, "Unhandled error");
  res.status(500).json({ error: "An unexpected error occurred. Please try again." });
}

// ── Async route wrapper — avoids try/catch boilerplate ────────────────────────

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

export function asyncRoute(handler: AsyncHandler) {
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res, next).catch(next);
  };
}
