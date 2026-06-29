import type { Request, Response, NextFunction } from "express";

export const metrics = {
  httpRequestsTotal: {} as Record<string, number>,
  httpRequestDurationMs: [] as number[],
  scansStarted: 0,
  scansCompleted: 0,
  scansFailed: 0,
};

export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = process.hrtime();

  res.on("finish", () => {
    const duration = process.hrtime(start);
    const ms = duration[0] * 1000 + duration[1] / 1e6;

    const key = `${req.method}_${res.statusCode}`;
    metrics.httpRequestsTotal[key] = (metrics.httpRequestsTotal[key] || 0) + 1;
    metrics.httpRequestDurationMs.push(ms);
    if (metrics.httpRequestDurationMs.length > 1000) {
      metrics.httpRequestDurationMs.shift(); // Keep last 1000 requests
    }
  });

  next();
}
