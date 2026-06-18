---
name: Tailwind dark mode caveat
description: Why dark: prefix doesn't work and what to use instead in this project.
---

## Rule
Never use Tailwind `dark:` prefix classes in this codebase. They do not work with the class-based dark mode setup.

**Why:** This project uses Tailwind v4 (`@tailwindcss/vite`) paired with `next-themes` (attribute="class"), which adds `class="dark"` to `<html>`. Tailwind v4's `dark:` variant defaults to `@media (prefers-color-scheme: dark)`, not the `.dark` CSS class selector. Without `@custom-variant dark (&:is(.dark *))` in the CSS, `dark:` classes only respond to the OS-level dark mode preference — not the in-app toggle.

**How to apply:**
- All theme-conditional styling must use JS: `isLight ? "text-gray-900" : "text-white/90"`.
- For static configs (e.g. `SEVERITY_CONFIG`), use semi-transparent colors that are readable on both light and dark backgrounds (e.g. `bg-red-500/[0.08]`, `text-red-500`) rather than two separate color sets.
- The `isLight` value comes from: `const { resolvedTheme } = useTheme(); const isLight = resolvedTheme !== "dark";`
- `.glass` class is a special case — overridden via CSS in `index.css` under `:root:not(.dark) .glass { ... }`, which works because it targets the presence/absence of `.dark` on `<html>` directly (not a Tailwind variant).
