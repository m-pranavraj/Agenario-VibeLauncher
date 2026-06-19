---
name: AuthContext Fast Refresh
description: AuthContext is split across 3 files to satisfy Vite Fast Refresh; all pages use @/hooks/use-auth for the hook.
---

## Rule

`AuthContext.tsx` must export ONLY the `AuthProvider` component (a React component). Mixing hooks or non-component exports in the same file prevents Vite Fast Refresh from doing hot module replacement, causing full page reloads on every auth-context change.

**Current structure:**
- `src/contexts/auth-context.ts` — exports `AuthContext` (React context object) and `AuthContextType` interface
- `src/contexts/AuthContext.tsx` — exports only `AuthProvider` component; imports `AuthContext` from `./auth-context`
- `src/hooks/use-auth.ts` — exports `useAuth` hook; imports `AuthContext` from `@/contexts/auth-context`
- All pages import `useAuth` from `@/hooks/use-auth` (NOT from `@/contexts/AuthContext`)
- `App.tsx` imports `AuthProvider` from `@/contexts/AuthContext`

**Why:** Vite Fast Refresh requires a file to export ONLY React components (capitalized functions returning JSX). Exporting a hook (`useAuth`) alongside a component caused `[vite] invalidate: Could not Fast Refresh` on every edit, triggering full page refresh and losing component state during development.

**How to apply:** Any new auth-related utilities go in the hooks or auth-context file, not in AuthContext.tsx.
