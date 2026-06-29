# Architectural Decision Record: Unified Combined Semantic Graph & Normalization

## Context & Problem Statement
Agenario runs multiple codebase security and telemetry analyses (VibeTaint, SymCost, ArchScan, etc.). Historically, security scanners run separate scanners independently, which parses files repeatedly, slows down execution, and hits memory/CPU limits quickly. 
Additionally, storing large JSON dumps from multiple analysis engines and browser replay proofs directly in a single wide SQL table (`scans`) created database locking overhead and hindered analytical indexing.

## Decisions

### 1. Unified Combined Semantic Graph (CSG)
- **Decision:** All AST parser passes, Control Flow Graphs (CFG), and Data Flow Graphs (DFG) are parsed exactly once per file and merged into a single traversable graph object (`CSG`).
- **Rationale:** Domain-specific analysis walkers (e.g. VibeTaint interprocedural tracker, SymCost compiler) traverse this shared structure. This reduces CPU load and achieves sub-second analysis passes.

### 2. Database Normalization & Decoupling
- **Decision:** Decouple the wide `scans` table into:
  - `scan_engine_results`: Stores key-value JSONB telemetry per engine.
  - `scan_proofs`: Stores repeatable proof steps and reproduction paths.
- **Rationale:** Prevents lock contention on the primary scans table, enables modular scan engine expansions, and supports faster scans queries.

### 3. Isolated Sandbox Playwright Pool
- **Decision:** Playwright browser instances are managed in a bounded process pool, disabling `--no-sandbox` flags in production for container isolation, and registering SIGINT/exit hooks to prevent zombie processes.
- **Rationale:** Hardens runtime security and ensures stable container lifecycles in serverless environments.

## Consequences
- Single-pass AST parsing yields 10x faster execution.
- Read/write query overhead on the DB drops significantly.
- Standardized error mapping and observability (Prometheus/Sentry) ensure production robustness.
