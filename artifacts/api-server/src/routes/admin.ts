import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable, scansTable } from "@workspace/db";
import { logger } from "../lib/logger.js";

const router = Router();

router.get("/admin/stats", async (req: any, res: any) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const adminEmail = process.env["ADMIN_EMAIL"];
  if (!adminEmail) {
    return res.status(403).json({ error: "Admin access not configured on server. Set ADMIN_EMAIL env var." });
  }

  try {
    const users = await db.select().from(usersTable).where(eq(usersTable.id, req.session.userId)).limit(1);
    const me = users[0];
    if (!me || me.email.toLowerCase() !== adminEmail.toLowerCase()) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const allUsers = await db.select({ plan: usersTable.plan, createdAt: usersTable.createdAt }).from(usersTable);
    const allScans = await db.select({
      status: scansTable.status,
      score: scansTable.score,
      createdAt: scansTable.createdAt,
      launchVerdict: scansTable.launchVerdict,
    }).from(scansTable);

    const now = new Date();
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

    const planBreakdown = allUsers.reduce<Record<string, number>>((acc, u) => {
      acc[u.plan] = (acc[u.plan] || 0) + 1;
      return acc;
    }, {});

    const statusBreakdown = allScans.reduce<Record<string, number>>((acc, s) => {
      acc[s.status] = (acc[s.status] || 0) + 1;
      return acc;
    }, {});

    const scansThisMonth = allScans.filter(
      (s) => new Date(s.createdAt).getTime() >= startOfMonth.getTime()
    ).length;

    const usersThisMonth = allUsers.filter(
      (u) => new Date(u.createdAt).getTime() >= startOfMonth.getTime()
    ).length;

    const monthlyScans = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now);
      d.setMonth(d.getMonth() - (5 - i));
      const yr = d.getUTCFullYear();
      const mo = d.getUTCMonth();
      const count = allScans.filter((s) => {
        const sd = new Date(s.createdAt);
        return sd.getUTCFullYear() === yr && sd.getUTCMonth() === mo;
      }).length;
      return {
        label: d.toLocaleString("default", { month: "short" }),
        year: yr,
        month: mo + 1,
        count,
      };
    });

    const scoredScans = allScans.filter((s) => s.score != null);
    const avgScore =
      scoredScans.length > 0
        ? Math.round(scoredScans.reduce((sum, s) => sum + (s.score ?? 0), 0) / scoredScans.length)
        : 0;

    const verdictBreakdown = allScans.reduce<Record<string, number>>((acc, s) => {
      if (s.launchVerdict) {
        acc[s.launchVerdict] = (acc[s.launchVerdict] || 0) + 1;
      }
      return acc;
    }, {});

    return res.json({
      totalUsers: allUsers.length,
      totalScans: allScans.length,
      scansThisMonth,
      usersThisMonth,
      avgScore,
      planBreakdown,
      statusBreakdown,
      verdictBreakdown,
      monthlyScans,
    });
  } catch (err) {
    logger.error({ err }, "Admin stats error");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
