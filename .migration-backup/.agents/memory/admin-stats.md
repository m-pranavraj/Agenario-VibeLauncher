---
name: Admin stats endpoint
description: How admin access is gated and what stats are returned from /api/admin/stats.
---

**Rule:** Admin endpoint at `GET /api/admin/stats` is locked by checking the authenticated user's email against the `ADMIN_EMAIL` environment variable (set via Replit Secrets).

**Why:** No `isAdmin` flag in the DB schema. Email-match approach avoids schema migrations.

**How to apply:**
- Set `ADMIN_EMAIL` secret in Replit to the owner's email.
- Frontend `/admin` route fetches this endpoint; shows error panel if 403.
- Returns: totalUsers, totalScans, scansThisMonth, usersThisMonth, avgScore, planBreakdown, statusBreakdown, verdictBreakdown, monthlyScans (6 months).
- Route registered in `artifacts/api-server/src/routes/admin.ts`, imported by `routes/index.ts`.
