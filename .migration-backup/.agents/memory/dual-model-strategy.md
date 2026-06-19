---
name: Dual Groq model strategy
description: Which model constant to use for which agents.ts function, and why.
---

## Rule

- `FAST_MODEL = "llama-3.1-8b-instant"` — used in `runAgentWithRetry` (all 10 analysis dimensions), `runRevenueIntelligence`, `runComplianceAnalysis`, `runProductHuntAudit`
- `SMART_MODEL = "llama-3.3-70b-versatile"` — used only in `runLaunchRiskForecast` and `runLaunchImpactCalculator`

**Why:** 8b-instant has ~3× higher TPM on free Groq tier, which prevents rate-limit failures when running 10+ agents in parallel. The 70b model is reserved for the final risk synthesis where reasoning quality matters most (probability estimates, financial impact projections).

**How to apply:** Any new agent function that does routine extraction/classification should use `FAST_MODEL`. Only final synthesis or forecast functions that need chained reasoning should use `SMART_MODEL`.
