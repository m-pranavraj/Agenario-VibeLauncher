---
name: connect-pg-simple esbuild bundling
description: Why createTableIfMissing fails when bundled with esbuild and how to work around it.
---

When `connect-pg-simple` is bundled into a single ESM file via esbuild, it can no longer resolve the `table.sql` file it ships alongside (the path traversal breaks in the bundle). This causes a runtime `ENOENT` on startup.

**Why:** esbuild flattens node_modules into the bundle; file-system path traversal relative to the package directory no longer works.

**How to apply:** Remove `createTableIfMissing: true` from the `PgStore` config. Create the session table manually once via raw SQL:
```sql
CREATE TABLE IF NOT EXISTS "session" (
  "sid" varchar NOT NULL COLLATE "default",
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL,
  CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE
);
CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
```
