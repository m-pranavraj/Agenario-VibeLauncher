---
name: Light/dark theme system
description: How the Agenario theme toggle works and critical JSX template literal bug pattern to avoid.
---

## Architecture

- `next-themes` ThemeProvider in App.tsx with `defaultTheme="light"`, `enableSystem={false}`
- `useIsLight()` hook at `src/hooks/use-is-light.ts` — returns `resolvedTheme === "light"` (mounted-guarded)
- Shared `ThemeToggle` component at `src/components/ThemeToggle.tsx` — renders moon/sun icon, calls `setTheme()`
- All pages use `isLight` conditionals for classes. Theme state persists via next-themes localStorage.

## ThemeToggle placement by page type
- Pages with navbars: add `<ThemeToggle />` inside the navbar's right-side flex container
- Auth pages (login, register): add in a `fixed top-4 right-4 z-50` wrapper (no navbar)
- home.tsx: has its own inline toggle using `useTheme()` directly (do not replace with shared component)

## Critical JSX template literal bug
`hover:${...}` inside JSX template literals breaks Babel/Vite's React parser.

**Bad (breaks compilation):**
```tsx
className={`... hover:${isLight ? "bg-gray-50" : "bg-white/[0.02]"} ...`}
```

**Good (works):**
```tsx
className={`... ${isLight ? "hover:bg-gray-50" : "hover:bg-white/[0.02]"} ...`}
```

**Why:** Babel's JSX transform treats `hover:${` as a parse ambiguity. The fix is to move the `hover:` prefix inside the ternary branches.

**How to apply:** Any time you write a dynamic Tailwind class that starts with a modifier prefix like `hover:`, `focus:`, `dark:`, etc., always put the full modifier+class inside the interpolation — never have the modifier as static text followed by `${`.
