---
name: Groq Rate Limits Fix
description: Batching strategy to avoid Groq API rate limit errors during scan analysis.
---

## Problem
Running 10 agents + compliance + revenue = 12+ parallel Groq API calls to `llama-3.3-70b-versatile` simultaneously caused "Analysis failed" errors via rate limiting.

## Fix
Batch agents into groups of 4 with a 400ms pause between batches. Compliance and revenue run in parallel after all agent batches complete.

```typescript
const agentBatchSize = 4;
for (let i = 0; i < AGENTS.length; i += agentBatchSize) {
  const batch = AGENTS.slice(i, i + agentBatchSize);
  const batchResults = await Promise.all(batch.map(agent => runAgent(...)));
  agentResults.push(...batchResults);
  if (i + agentBatchSize < AGENTS.length) await new Promise(r => setTimeout(r, 400));
}
const [complianceResults, revenueIntelligence] = await Promise.all([...]);
```

**Why:** Groq rate limits on llama-3.3-70b-versatile with the free/low tier key; batching respects limits without serializing everything.

**How to apply:** Applied in `runAllAgents()` in `artifacts/api-server/src/lib/agents.ts`. Each individual `runAgent` call already has its own try/catch with empty-issues fallback.
