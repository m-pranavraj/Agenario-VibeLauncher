# Agenario vs Competitors — Technical Comparison

| Capability | Snyk | Semgrep | SonarQube | Claude Code Review | Agenario ✅ | Agenario Evidence |
|---|---|---|---|---|---|---|
| **Static code analysis (SAST)** | ✅ | ✅ | ✅ | ◐ (LLM-driven, not deterministic) | ✅ | VibeTaint: 24 sources → 21 sinks + CSG (1005L AST→CFG builder) |
| **Data-flow / taint tracking** | ✅ | ✅ (paid tier) | ✅ | ◐ | ✅ | Dual-crawler taint + cross-language taint (502L) + Babel engine (116L) |
| **Runtime exploit proof** | ❌ | ❌ | ❌ | ❌ | ✅ | Playwright proof engine (980L): HTTP probes, browser automation, screenshots |
| **Sandbox execution** | ❌ | ❌ | ❌ | ❌ | ✅ | sandbox-runner.ts (246L): install, start, probe, kill with timeout |
| **AI/prompt injection detection** | ❌ | ◐ (custom rules) | ❌ | ◐ | ✅ | PromptTrace (280L): OpenAI/Anthropic/Groq API call detection, taint source-sink |
| **Cross-language taint** | ◐ | ❌ | ❌ | ❌ | ✅ | Cross-language-taint.ts (502L): frontend→backend boundary matching |
| **Compliance (GDPR/PCI/HIPAA)** | ◐ | ◐ (custom rules) | ✅ | ❌ | ✅ | RegGraph (395L): 4 frameworks, AST pattern search, penalty estimates |
| **SBOM generation** | ✅ | ◐ | ◐ | ❌ | ✅ | sbom-generator.ts: CycloneDX/SPDX export |
| **Dependency/CVE scanning** | ✅ | ✅ | ◐ | ❌ | ◐ | time-aware-deps.ts (270L): decay scoring, but CVE DB is hardcoded |
| **Secrets scanning** | ✅ | ✅ | ✅ | ❌ | ✅ | secret-scanner-v2.ts: regex-based secret detection |
| **IaC/container scanning** | ✅ | ◐ | ◐ | ❌ | ✅ | DeploySafe (287L): Dockerfile multi-stage, USER, pinned images, CI/CD YAML |
| **Architecture smell detection** | ❌ | ❌ | ◐ | ❌ | ✅ | ArchScan (260L): Martin's instability metric I=fanOut/(fanIn+fanOut), Tarjan SCC |
| **Resilience analysis** | ❌ | ❌ | ❌ | ❌ | ✅ | FailSafe (241L): try/catch tracing, retry/circuit-breaker detection |
| **Observability coverage** | ❌ | ❌ | ❌ | ❌ | ✅ | ObsCover (199L): logger/metrics/tracing proximity scan |
| **Cognitive load analysis** | ❌ | ❌ | ❌ | ❌ | ◐ | CogFlow (229L): Hick's Law + Shannon entropy + WCAG checks |
| **Evidence fusion** | ❌ | ❌ | ❌ | ❌ | ✅ | Dempster-Shafer (469L): proper mass functions, belief/plausibility, conflict K |
| **AST fingerprinting** | ❌ | ❌ | ❌ | ❌ | ✅ | Structural analysis (846L): SHA-256 MinHash 64-perm, Jaccard similarity |
| **Constraint solving** | ❌ | ❌ | ❌ | ❌ | ◐ | DPLL-style SAT patterns (not real Z3/SMT) |
| **Revenue risk analysis** | ❌ | ❌ | ❌ | ❌ | ◐ | FlowValue (266L): AARRR mapping, but traffic/LTV values are defaults |
| **Auto-fix / remediation PR** | ✅ | ✅ | ◐ | ◐ | ❌ | auto-remediation-deployer.ts (54L): sandbox verification is mocked (`const sandboxPassed = true`) |
| **PR/CI workflow integration** | ✅ | ✅ | ✅ | ✅ | ◐ | GitHub panel in UI, but no actual PR creation or CI gate hooks |
| **Real-time certification/seal** | ❌ | ❌ | ◐ | ❌ | ◐ | cert.ts page exists, but backend cert issuance is not wired |
| **LLM agent integration** | ◐ | ◐ | ◐ | ✅ | ✅ | agents.ts: Groq SDK + dynamic Anthropic/OpenAI imports + multi-agent debate (350L) |
| **Attack pack generation** | ❌ | ❌ | ❌ | ❌ | ✅ | attack-packs.ts: security probe payload generation for IDOR/XSS/CORS |
| **Zero-knowledge proofs** | ❌ | ❌ | ❌ | ❌ | ◐ | zk-attestation.ts: circuit generation exists, but no real proof verification |
| **Monte Carlo risk simulation** | ❌ | ❌ | ❌ | ❌ | ◐ | quantitative-finance-risk.ts: uses Math.random() for simulation parameters |
| **GPU/enclave attestation** | ❌ | ❌ | ❌ | ❌ | ❌ | gpu-ast-integrity.ts (renamed from gpu-tensor-bridge.ts): simulated, no real GPU ops |
| **Cleanup/debt analysis** | ◐ | ◐ | ✅ | ❌ | ✅ | cleanup-agent.ts + cleanup-report findings in scan results |

**Status:**
- ✅ = Strong native capability with real code implementation
- ◐ = Partial / depends on config / has caveats
- ❌ = Not implemented or mocked

## Key Differentiators

Agenario has unique capabilities that no competitor offers:

| Unique Feature | What It Does | Evidence |
|---|---|---|
| **Runtime exploit proof** | Actually proves vulnerabilities are real by running HTTP/browser probes | playwright-proof.ts: 980 lines of real probe logic |
| **Cross-language taint tracking** | Traces data flow from frontend fetch/axios → backend route → DB | cross-language-taint.ts: 502 lines, matches frontend calls to backend routes |
| **Dempster-Shafer evidence fusion** | Combines multi-source evidence with mathematically rigorous belief functions | dempster-shafer.ts: 469 lines, mathematically correct Dempster's Rule |
| **Architecture smell detection** | Martin's instability metric, Tarjan's SCC for circular imports | arch-scan.ts: 260 lines, real software engineering metrics |
| **AI safety (PromptTrace)** | Detects unsanitized LLM calls, prompt injection risks | prompt-trace.ts: 280 lines, traces user input → LLM sink |
| **Compliance via AST** | GDPR/PCI/HIPAA rules mapped to actual code patterns | reg-graph.ts: 394 lines, 4 frameworks with penalty estimates |

## Competitive Gaps vs Established Players

| Gap | Impact | What Competitor Does Better |
|---|---|---|
| **No real Z3/SMT solver** | Constraint solving is simplified pattern matching | Snyk/Semgrep use real SMT for path feasibility |
| **No real CVE API integration** | CVE database is hardcoded, not live | Snyk queries NVD/GitHub Advisory DB in real-time |
| **No real auto-fix PR creation** | "Auto-remediation" is a mock (`sandboxPassed = true`) | Snyk creates real PRs with fixes; Semgrep generates validated fix suggestions |
| **No CI/CD gate hooks** | Can't block PRs based on scan results | Semgrep/SonarQube have native CI quality gates |
| **Hardcoded traffic/LTV values** | Revenue risk is estimated from defaults, not real data | Not applicable (Agenario is unique here) |
| **Simulated GPU/enclave** | Enclave attestation is string manipulation, not real AWS Nitro | No competitor claims this either |
