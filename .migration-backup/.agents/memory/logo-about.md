---
name: Logo & About Page
description: Logo placement, founder info, and About page details.
---

## Assets
- Logo: `/public/logo.png` (uploaded by user — use as `<img src="/logo.png">`)
- Founder photo: `/public/founder-photo.jpeg` (use with `filter: grayscale(100%) contrast(1.1)`)

## Logo Usage
All navbars updated — replaces the Rocket icon placeholder:
```jsx
<img src="/logo.png" alt="Agenario" className="w-7 h-7 rounded-xl object-cover" />
```
Files updated: home.tsx, dashboard.tsx, new-scan.tsx, pricing.tsx, scan-results.tsx, docs.tsx, login.tsx, register.tsx

## About Page
- Route: `/about` (added to `App.tsx`)
- File: `artifacts/agenario/src/pages/about.tsx`
- Founder: MOGANTI PRANAV RAJ (all caps)
- Photo: grayscale with dot-grid overlay for editorial look
- Sections: Hero, Stats, Founder Card, Beliefs, CTA

## Navigation
About link added to home.tsx nav: `<Link href="/about">About</Link>`

**Why:** Brand consistency — logo image throughout instead of Rocket placeholder icon.
