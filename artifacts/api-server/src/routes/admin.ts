import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import { db, usersTable, scansTable, scanIssuesTable, apiKeysTable, webhookSecretsTable } from "@workspace/db";
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
    if (!me || me.email.trim().toLowerCase() !== adminEmail.trim().toLowerCase()) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const allUsers = await db.select({ plan: usersTable.plan, createdAt: usersTable.createdAt }).from(usersTable);
    const allScans = await db.select({
      status: scansTable.status,
      score: scansTable.score,
      createdAt: scansTable.createdAt,
      launchVerdict: scansTable.launchVerdict,
      framework: scansTable.framework,
      vibeTool: scansTable.vibeTool,
      issueCounts: scansTable.issueCounts,
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

    // SaaS financial metrics
    const mrr = (planBreakdown["creator"] ?? 0) * 299 + (planBreakdown["enterprise"] ?? 0) * 9999;
    const arr = mrr * 12;
    const arpu = allUsers.length > 0 ? Math.round(mrr / allUsers.length) : 0;
    const conversionRate = allUsers.length > 0
      ? Math.round(((planBreakdown["creator"] ?? 0) + (planBreakdown["enterprise"] ?? 0)) / allUsers.length * 100)
      : 0;

    // Platform adoption breakdowns
    const frameworkBreakdown = allScans.reduce<Record<string, number>>((acc, s) => {
      const fw = s.framework || "unknown";
      acc[fw] = (acc[fw] || 0) + 1;
      return acc;
    }, {});

    const vibeToolBreakdown = allScans.reduce<Record<string, number>>((acc, s) => {
      const vt = s.vibeTool || "unknown";
      acc[vt] = (acc[vt] || 0) + 1;
      return acc;
    }, {});

    // Vulnerability metrics
    let totalCritical = 0;
    let totalHigh = 0;
    let totalMedium = 0;
    let totalLow = 0;

    for (const s of allScans) {
      if (s.issueCounts) {
        totalCritical += s.issueCounts.critical ?? 0;
        totalHigh += s.issueCounts.high ?? 0;
        totalMedium += s.issueCounts.medium ?? 0;
        totalLow += s.issueCounts.low ?? 0;
      }
    }
    const totalVulnerabilities = totalCritical + totalHigh + totalMedium + totalLow;

    const recentScans = await db
      .select({
        id: scansTable.id,
        sourceType: scansTable.sourceType,
        sourceInput: scansTable.sourceInput,
        status: scansTable.status,
        score: scansTable.score,
        launchVerdict: scansTable.launchVerdict,
        framework: scansTable.framework,
        vibeTool: scansTable.vibeTool,
        issueCounts: scansTable.issueCounts,
        createdAt: scansTable.createdAt,
        completedAt: scansTable.completedAt,
        unlockedByAdmin: scansTable.unlockedByAdmin,
        userEmail: usersTable.email,
        userName: usersTable.name,
      })
      .from(scansTable)
      .leftJoin(usersTable, eq(scansTable.userId, usersTable.id))
      .orderBy(desc(scansTable.createdAt))
      .limit(50);

    const recentUsers = await db
      .select({
        id: usersTable.id,
        email: usersTable.email,
        name: usersTable.name,
        plan: usersTable.plan,
        scanLimit: usersTable.scanLimit,
        createdAt: usersTable.createdAt,
      })
      .from(usersTable)
      .orderBy(desc(usersTable.createdAt))
      .limit(50);

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
      mrr,
      arr,
      arpu,
      conversionRate,
      frameworkBreakdown,
      vibeToolBreakdown,
      totalCritical,
      totalHigh,
      totalMedium,
      totalLow,
      totalVulnerabilities,
      recentScans,
      recentUsers,
    });
  } catch (err) {
    logger.error({ err }, "Admin stats error");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/admin/users/:id/update-plan", async (req: any, res: any) => {
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
    if (!me || me.email.trim().toLowerCase() !== adminEmail.trim().toLowerCase()) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    const { plan, scanLimit } = req.body;

    const updateData: Record<string, any> = {};
    if (plan !== undefined) {
      updateData.plan = plan;
    }
    if (scanLimit !== undefined) {
      updateData.scanLimit = scanLimit === "" || scanLimit === null ? null : parseInt(scanLimit, 10);
    }

    await db.update(usersTable).set(updateData).where(eq(usersTable.id, userId));

    return res.json({ success: true, message: "User plan updated successfully" });
  } catch (err) {
    logger.error({ err }, "Admin update user plan error");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/admin/users/:id", async (req: any, res: any) => {
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
    if (!me || me.email.trim().toLowerCase() !== adminEmail.trim().toLowerCase()) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    if (userId === me.id) {
      return res.status(400).json({ error: "Cannot delete your own admin account" });
    }

    const userScans = await db.select({ id: scansTable.id }).from(scansTable).where(eq(scansTable.userId, userId));
    const scanIds = userScans.map((s) => s.id);

    if (scanIds.length > 0) {
      for (const scanId of scanIds) {
        await db.delete(scanIssuesTable).where(eq(scanIssuesTable.scanId, scanId));
      }
      await db.delete(scansTable).where(eq(scansTable.userId, userId));
    }

    await db.delete(apiKeysTable).where(eq(apiKeysTable.userId, userId));
    await db.delete(webhookSecretsTable).where(eq(webhookSecretsTable.userId, userId));
    await db.delete(usersTable).where(eq(usersTable.id, userId));

    return res.json({ success: true, message: "User and all associated data deleted successfully" });
  } catch (err) {
    logger.error({ err }, "Admin delete user error");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/admin/scans/:id", async (req: any, res: any) => {
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
    if (!me || me.email.trim().toLowerCase() !== adminEmail.trim().toLowerCase()) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const scanId = parseInt(req.params.id, 10);
    if (isNaN(scanId)) {
      return res.status(400).json({ error: "Invalid scan ID" });
    }

    await db.delete(scanIssuesTable).where(eq(scanIssuesTable.scanId, scanId));
    await db.delete(scansTable).where(eq(scansTable.id, scanId));

    return res.json({ success: true, message: "Scan deleted successfully" });
  } catch (err) {
    logger.error({ err }, "Admin delete scan error");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/admin/scans/:id/toggle-pro", async (req: any, res: any) => {
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
    if (!me || me.email.trim().toLowerCase() !== adminEmail.trim().toLowerCase()) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const scanId = parseInt(req.params.id, 10);
    if (isNaN(scanId)) {
      return res.status(400).json({ error: "Invalid scan ID" });
    }

    const { unlocked } = req.body;

    await db.update(scansTable).set({
      unlockedByAdmin: !!unlocked
    }).where(eq(scansTable.id, scanId));

    return res.json({ success: true, message: `Scan Pro status updated to ${unlocked}` });
  } catch (err) {
    logger.error({ err }, "Admin toggle pro error");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
