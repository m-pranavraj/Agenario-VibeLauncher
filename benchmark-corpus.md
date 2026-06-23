# Agenario Benchmark Corpus

This document details the intentional vulnerable applications used to evaluate Agenario's Truth Layer engines (SymCost, VibeTaint, RegGraph, FailSafe, PromptTrace, FlowValue, CogFlow, ObsCover, ArchScan, DeploySafe).

## Methodology
To ensure our engines do more than just simple pattern matching, we maintain a corpus of intentional vulnerable applications. Each app is designed with specific architectures, frameworks, and edge cases (both true vulnerabilities and tricky false positives).

## Categories

### 1. The VibeTaint Challenge Apps
These apps test deep data flow analysis across modern TS/JS frameworks.

1. **Next.js Server Action Leaker** (App Router): Tests implicit taint flows where user input mutates state in a server action, leading to an SSR XSS vector.
2. **Express Middleware Bypass**: Tests if the engine understands when security middleware is instantiated *after* vulnerable routes.
3. **React Context Poisoning**: Tests cross-component data flow through complex React Context providers.
4. **Zod Validator Illusion**: Uses a custom Zod `.transform()` that accidentally un-sanitizes input before passing it to Prisma.
5. **GraphQL Resolver Deep-Nesting**: Tests recursive depth-limit bypassing and AST parsing of deeply nested GraphQL inputs.

### 2. The SymCost (Performance) Targets
These apps test symbolic execution and performance cost modeling.

6. **The N+1 React Server Component**: A Next.js RSC app that queries Prisma inside a `.map()`, creating massive database load.
7. **The O(n^2) Filter**: A client-side React component that sorts and filters a 10,000 item list on every keystroke.
8. **The Giant Barrel File**: An app with a single `index.ts` exporting 400 heavy components, defeating tree-shaking.
9. **The Redux Render Storm**: An app where a root-level Redux state change triggers a full re-render of 1,000 DOM nodes.
10. **The Memory Leak Closure**: A Node.js background worker that retains large array references inside setInterval closures.

### 3. The FlowValue (Revenue Logic) Targets
These apps test the understanding of business-critical logic paths.

11. **The Stripe Webhook Replay**: A billing app that lacks idempotency checks on Stripe webhook handlers, allowing double-crediting.
12. **The Fractional Cent Rounding Flaw**: An e-commerce checkout that calculates tax incorrectly due to floating-point math, leading to revenue leakage at scale.
13. **The Race Condition Cart**: A ticketing system where concurrent requests can bypass the inventory counter.
14. **The Unprotected Promo Code**: An endpoint that allows brute-forcing promo codes without rate-limiting.
15. **The Ghost Subscription**: A downgrade flow that cancels the Stripe sub but fails to update the local database, leaving the user on a premium plan forever.

### 4. The RegGraph (Compliance) Targets
These apps test data retention, PII exposure, and regulatory mapping.

16. **The Eternal Log File**: An app that writes raw user passwords to a local `winston` log file during error handling.
17. **The Undeletable User**: A GDPR compliance failure where the "Delete Account" button soft-deletes the user but retains their full PII in related tables.
18. **The Open S3 Bucket API**: An endpoint that returns pre-signed URLs to an S3 bucket without checking user authorization.
19. **The HIPAA PHI Leak**: A medical app that includes patient SSNs in the JSON payload of an autocomplete endpoint.
20. **The Credit Card Logger**: A checkout flow that accidentally logs the `req.body` containing plaintext PANs.

### 5. The FailSafe (Reliability) Targets
These apps test system resilience and error handling.

21. **The Naked Third-Party Call**: An app that calls an external weather API without timeouts or circuit breakers, allowing the third-party to take down the main server.
22. **The Swallowed Promise**: A background job that uses `.catch(() => {})`, silently failing without alerting.
23. **The Uncapped Retry**: An API client that retries failures infinitely without exponential backoff, causing self-DDoS.
24. **The Singleton DB Connection Pool Collapse**: An app that opens a new PrismaClient instance on every Next.js API route call.
25. **The Missing Graceful Shutdown**: A Node server that hard-kills processes during deployment, dropping active Websocket connections.

### 6. The PromptTrace (AI Quality) Targets
These apps test the detection of LLM-generated code hallucinations and boilerplate.

26. **The ChatGPT Placeholder**: Code that contains `// TODO: Implement actual logic` inside critical auth checks.
27. **The Claude Verbositor**: Over-engineered classes with massive, unnecessary JSDoc comments masking poor logic.
28. **The Shadcn Overload**: A UI with 50 unused Tailwind classes and boilerplate components that were copy-pasted without pruning.
29. **The Copilot Hallucination**: An import statement for a library method that doesn't actually exist (`import { secureHash } from 'crypto'`).
30. **The LLM Error Handler**: A generic `catch (e) { console.log(e) }` generated by an LLM in place of proper error typing.

## Engine Scorecard Updates
Each test case is mapped directly to our `EngineScorecard` table to generate the metrics shown in the Deep Tech tab.
- False Positives are actively tracked when an engine flags a safe version of these apps.
- Detection rates must exceed 95% on the vulnerable versions before an engine rule is promoted to production.
