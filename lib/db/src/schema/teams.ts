import { pgTable, serial, text, integer, timestamp, index, unique } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

/**
 * Phase 4.2 — teams table
 * Defines enterprise team workspaces.
 */
export const teamsTable = pgTable("teams", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  creatorId: integer("creator_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * Phase 4.2 — team_members table
 * Maps users to teams with role-based access control.
 */
export const teamMembersTable = pgTable(
  "team_members",
  {
    id: serial("id").primaryKey(),
    teamId: integer("team_id")
      .notNull()
      .references(() => teamsTable.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("member"), // 'owner' | 'admin' | 'member'
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_team_members_team_id").on(table.teamId),
    index("idx_team_members_user_id").on(table.userId),
    unique("uq_team_user").on(table.teamId, table.userId),
  ]
);
