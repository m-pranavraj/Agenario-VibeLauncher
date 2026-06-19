---
name: Tier Gate & Scan Limits
description: Plan limits and content gating logic for free/creator/enterprise users.
---

## Scan Limits
- Free: 2 scans/month
- Creator: 12 scans/month
- Enterprise: Infinity (no limit)
- Defined in `artifacts/api-server/src/utils/tierGate.ts` as `PLAN_LIMITS`
- Enforced in `checkScanLimit()` in `scans.ts`

## Content Gating (`applyTierGate`)
Applied in `GET /scans/:id` — mutates the response before sending.
- Issues 0–2: fully visible; issues 3+: `locked: true`, description truncated to 80 chars, fixPrompt replaced with upgrade message
- `_lockedIssueCount` added to response for frontend upgrade banner
- Revenue leaks 0–1: visible; 2+: locked with `_lockedLeakCount`
- Proof evidence: `codeRef` stripped for free users
- Shadow API: route arrays emptied, count shown in summary with `_lockedRouteCount`

**Why:** Monetization gate — free users see enough to understand value but must upgrade for actionable fix prompts.

**How to apply:** Import `applyTierGate` from `../utils/tierGate.js` and call it in any scan read endpoint. Pass user's `plan` string.
