---
name: use-scans hook
description: The useScans() hook location and interface; was missing and caused dashboard build failure.
---

**Rule:** `useScans()` hook must be created at `src/hooks/use-scans.ts` — it does NOT come from Orval codegen.

**Why:** The original dashboard.tsx imported from `@/hooks/use-scans` but the file was never committed. Rebuilding dashboard without checking this causes an immediate Vite build error.

**How to apply:** The hook wraps `api.scans.list()` with a user guard and returns `{ scans, loading, error }`. Always check that this file exists before rewriting dashboard.tsx.
