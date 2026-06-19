---
name: Session table must exist
description: The PostgreSQL session table for connect-pg-simple must exist before the API server starts; missing table causes 500 errors on all authenticated requests.
---

## Rule

The `session` table must be created manually via raw SQL before the API server processes any requests with session cookies.

```sql
CREATE TABLE IF NOT EXISTS "session" (
  "sid" varchar NOT NULL COLLATE "default",
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL,
  CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE
) WITH (OIDS=FALSE);
CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
```

**Why:** `connect-pg-simple` is initialized with `createTableIfMissing: false` (the `true` option fails after esbuild bundling). If the table doesn't exist, every request that has a session cookie causes connect-pg-simple to throw `relation "session" does not exist`, which gets swallowed by the session middleware and causes the response to either 500 or return stale data.

**How to apply:** Run the SQL above in the dev DB via `executeSql` or psql whenever the database is reset or recreated. Also required in production DB before first deploy. The table is NOT managed by Drizzle schema — it's a one-time manual operation.
