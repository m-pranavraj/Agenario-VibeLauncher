import { Router } from "express";
import { db, teamsTable, teamMembersTable, usersTable, scansTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { logger } from "../lib/logger.js";

const router = Router();

function requireAuth(req: any, res: any): boolean {
  if (!req.session?.userId && !req.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return false;
  }
  if (!req.session.userId && req.userId) {
    req.session.userId = req.userId;
  }
  return true;
}

// ── 1. Create a Team ────────────────────────────────────────────────────────
router.post("/teams", async (req, res): Promise<void> => {
  if (!requireAuth(req, res)) return;
  const userId = req.session.userId!;
  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";

  if (!name) {
    res.status(400).json({ error: "Team name is required" });
    return;
  }

  try {
    // Start transactional creation of team & owner membership
    const [team] = await db
      .insert(teamsTable)
      .values({ name, creatorId: userId })
      .returning();

    await db.insert(teamMembersTable).values({
      teamId: team.id,
      userId,
      role: "owner",
    });

    logger.info({ teamId: team.id, creatorId: userId }, "Team created successfully");
    res.status(201).json(team);
  } catch (err) {
    logger.error({ err }, "Failed to create team");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── 2. List User's Teams ───────────────────────────────────────────────────
router.get("/teams", async (req, res): Promise<void> => {
  if (!requireAuth(req, res)) return;
  const userId = req.session.userId!;

  try {
    const memberships = await db
      .select({
        teamId: teamsTable.id,
        teamName: teamsTable.name,
        role: teamMembersTable.role,
        createdAt: teamsTable.createdAt,
      })
      .from(teamMembersTable)
      .innerJoin(teamsTable, eq(teamMembersTable.teamId, teamsTable.id))
      .where(eq(teamMembersTable.userId, userId));

    res.json(memberships);
  } catch (err) {
    logger.error({ err }, "Failed to fetch user teams");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── 3. Add Member to a Team ────────────────────────────────────────────────
router.post("/teams/:id/members", async (req, res): Promise<void> => {
  if (!requireAuth(req, res)) return;
  const currentUserId = req.session.userId!;
  const teamId = parseInt(req.params.id, 10);
  const { email, role = "member" } = req.body as { email?: string; role?: string };

  if (isNaN(teamId) || !email) {
    res.status(400).json({ error: "Valid team ID and email are required" });
    return;
  }

  try {
    // 1. Verify current user is owner or admin of the team
    const [membership] = await db
      .select()
      .from(teamMembersTable)
      .where(
        and(
          eq(teamMembersTable.teamId, teamId),
          eq(teamMembersTable.userId, currentUserId)
        )
      )
      .limit(1);

    if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
      res.status(403).json({ error: "Only team owners or admins can invite members" });
      return;
    }

    // 2. Resolve target user by email
    const [targetUser] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email.trim().toLowerCase()))
      .limit(1);

    if (!targetUser) {
      res.status(404).json({ error: "User with this email not found" });
      return;
    }

    // 3. Add user to team
    await db.insert(teamMembersTable).values({
      teamId,
      userId: targetUser.id,
      role,
    });

    logger.info({ teamId, invitedUserId: targetUser.id, role }, "Added member to team");
    res.status(201).json({ success: true });
  } catch (err) {
    logger.error({ err }, "Failed to add member to team");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── 4. List Team Members ───────────────────────────────────────────────────
router.get("/teams/:id/members", async (req, res): Promise<void> => {
  if (!requireAuth(req, res)) return;
  const currentUserId = req.session.userId!;
  const teamId = parseInt(req.params.id, 10);

  if (isNaN(teamId)) {
    res.status(400).json({ error: "Invalid team ID" });
    return;
  }

  try {
    // Verify user is in the team
    const [userMembership] = await db
      .select()
      .from(teamMembersTable)
      .where(
        and(
          eq(teamMembersTable.teamId, teamId),
          eq(teamMembersTable.userId, currentUserId)
        )
      )
      .limit(1);

    if (!userMembership) {
      res.status(403).json({ error: "Access denied" });
      return;
    }

    // List all team members
    const members = await db
      .select({
        id: usersTable.id,
        email: usersTable.email,
        phone: usersTable.phone,
        role: teamMembersTable.role,
        joinedAt: teamMembersTable.createdAt,
      })
      .from(teamMembersTable)
      .innerJoin(usersTable, eq(teamMembersTable.userId, usersTable.id))
      .where(eq(teamMembersTable.teamId, teamId));

    res.json(members);
  } catch (err) {
    logger.error({ err }, "Failed to fetch team members");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── 5. List Team Scans ─────────────────────────────────────────────────────
router.get("/teams/:id/scans", async (req, res): Promise<void> => {
  if (!requireAuth(req, res)) return;
  const currentUserId = req.session.userId!;
  const teamId = parseInt(req.params.id, 10);

  if (isNaN(teamId)) {
    res.status(400).json({ error: "Invalid team ID" });
    return;
  }

  try {
    // Verify user is in the team
    const [membership] = await db
      .select()
      .from(teamMembersTable)
      .where(
        and(
          eq(teamMembersTable.teamId, teamId),
          eq(teamMembersTable.userId, currentUserId)
        )
      )
      .limit(1);

    if (!membership) {
      res.status(403).json({ error: "Access denied" });
      return;
    }

    // List scans linked to this team
    const scans = await db
      .select()
      .from(scansTable)
      .where(eq(scansTable.teamId, teamId));

    res.json(scans);
  } catch (err) {
    logger.error({ err }, "Failed to fetch team scans");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
