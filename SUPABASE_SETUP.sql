-- ============================================================
-- AGENARIO — Complete Supabase SQL Setup Script
-- Run this entire file in: Supabase Dashboard → SQL Editor → New Query
-- Safe to run multiple times (all statements use IF NOT EXISTS / OR REPLACE)
-- ============================================================


-- ── 1. SEQUENCES (auto-increment IDs) ────────────────────────────────────

CREATE SEQUENCE IF NOT EXISTS users_id_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS scans_id_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS scan_issues_id_seq START WITH 1 INCREMENT BY 1;


-- ── 2. USERS TABLE ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.users (
  id               integer   NOT NULL DEFAULT nextval('users_id_seq'::regclass),
  email            text      NOT NULL,
  name             text      NOT NULL,
  password_hash    text      NOT NULL,
  plan             text      NOT NULL DEFAULT 'free',
  phone            text,
  phone_verified   boolean   DEFAULT false,
  razorpay_customer_id text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_email_unique UNIQUE (email),
  CONSTRAINT users_phone_unique UNIQUE (phone)
);


-- ── 3. SCANS TABLE ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.scans (
  id                   integer     NOT NULL DEFAULT nextval('scans_id_seq'::regclass),
  user_id              integer     NOT NULL,
  source_type          text        NOT NULL,
  source_input         text        NOT NULL,
  app_description      text,
  status               text        NOT NULL DEFAULT 'pending',
  score                integer,
  summary              text,
  launch_verdict       text,
  framework            text,
  vibe_tool            text,
  business_type        text,
  issue_counts         jsonb,
  risk_forecast        jsonb,
  revenue_intelligence jsonb,
  compliance_results   jsonb,
  proof_evidence       jsonb,
  regression_diff      jsonb,
  benchmark_percentile jsonb,
  launch_dna           jsonb,
  cofounder_narrative  text,
  shadow_api_findings  jsonb,
  launch_replay_steps  jsonb,
  secret_scan_results  jsonb,
  package_vulns        jsonb,
  cleanup_report       jsonb,
  cleanup_findings     jsonb,
  digital_twin         jsonb,
  predictive_intel     jsonb,
  root_cause           jsonb,
  launch_impact        jsonb,
  product_hunt_score   jsonb,
  knowledge_graph      jsonb,
  sandbox_meta         jsonb,
  cert_id              text,

  -- ── Enhanced Math Engine Columns ─────────────────────────────
  thermodynamic_entropy jsonb,   -- Shannon-Entropy Data Leakage Bounds results
  constraint_solver     jsonb,   -- Constraint-Based Exploit Solver results
  vibe_taint            jsonb,
  sym_cost              jsonb,
  reg_graph             jsonb,
  fail_safe             jsonb,
  obs_cover             jsonb,
  arch_scan             jsonb,
  deploy_safe           jsonb,
  cog_flow              jsonb,
  time_aware_deps       jsonb,
  prompt_trace          jsonb,
  flow_value            jsonb,
  dempster_shafer       jsonb,
  reality_check         jsonb,
  cross_language_taint  jsonb,   -- Cross-Language Taint Boundary Inference results

  created_at           timestamptz NOT NULL DEFAULT now(),
  completed_at         timestamptz,
  CONSTRAINT scans_pkey PRIMARY KEY (id),
  CONSTRAINT scans_user_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);


-- ── 4. SCAN ISSUES TABLE ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.scan_issues (
  id                  integer NOT NULL DEFAULT nextval('scan_issues_id_seq'::regclass),
  scan_id             integer NOT NULL,
  agent_name          text    NOT NULL,
  severity            text    NOT NULL,
  title               text    NOT NULL,
  description         text    NOT NULL,
  fix_prompt          text    NOT NULL,
  auto_fix_code       text,
  confidence          integer,
  evidence            text,
  file_path           text,
  line_number         integer,
  code_snippet        text,
  impact_statement    text,
  retest_result       text,
  source_evidence     text,
  finding_id          text,
  function_name       text,
  route_path          text,
  reproduction_steps  jsonb,
  blast_radius        jsonb,
  video_url           text,
  retest_status       text    DEFAULT 'pending',
  CONSTRAINT scan_issues_pkey PRIMARY KEY (id),
  CONSTRAINT scan_issues_scan_id_fk FOREIGN KEY (scan_id) REFERENCES public.scans(id) ON DELETE CASCADE
);


-- ── 5. CONVERSATIONS TABLE (chat / cofounder Q&A history) ─────────────────

CREATE SEQUENCE IF NOT EXISTS conversations_id_seq START WITH 1 INCREMENT BY 1;

CREATE TABLE IF NOT EXISTS public.conversations (
  id         integer   NOT NULL DEFAULT nextval('conversations_id_seq'::regclass),
  title      text      NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT conversations_pkey PRIMARY KEY (id)
);


-- ── 6. MESSAGES TABLE (individual messages within conversations) ──────────

CREATE SEQUENCE IF NOT EXISTS messages_id_seq START WITH 1 INCREMENT BY 1;

CREATE TABLE IF NOT EXISTS public.messages (
  id              integer   NOT NULL DEFAULT nextval('messages_id_seq'::regclass),
  conversation_id integer   NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  role            text      NOT NULL,
  content         text      NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT messages_pkey PRIMARY KEY (id)
);


-- ── 7. SESSION TABLE (required by connect-pg-simple) ─────────────────────
-- IMPORTANT: Do NOT use createTableIfMissing:true in the app — it fails
-- after esbuild bundling. This manual creation is the correct approach.

CREATE TABLE IF NOT EXISTS public.session (
  sid    text      NOT NULL,
  sess   json      NOT NULL,
  expire timestamp NOT NULL,  -- intentionally WITHOUT time zone (connect-pg-simple requirement)
  CONSTRAINT session_pkey PRIMARY KEY (sid)
);

-- Required index for connect-pg-simple session cleanup (prune expired sessions)
CREATE INDEX IF NOT EXISTS idx_session_expire ON public.session (expire);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages (conversation_id);


-- ── 8. PERFORMANCE INDEXES ───────────────────────────────────────────────

-- Scans: look up by user (dashboard list)
CREATE INDEX IF NOT EXISTS idx_scans_user_id ON public.scans (user_id);

-- Scans: sort by creation date
CREATE INDEX IF NOT EXISTS idx_scans_created_at ON public.scans (created_at DESC);

-- Scans: public cert lookup
CREATE INDEX IF NOT EXISTS idx_scans_cert_id ON public.scans (cert_id) WHERE cert_id IS NOT NULL;

-- Scan issues: look up all issues for a scan
CREATE INDEX IF NOT EXISTS idx_scan_issues_scan_id ON public.scan_issues (scan_id);

-- Scan issues: filter by severity
CREATE INDEX IF NOT EXISTS idx_scan_issues_severity ON public.scan_issues (severity);

-- Users: fast email lookup on login
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users (email);


-- ── 8. ROW LEVEL SECURITY (RLS) ──────────────────────────────────────────
-- Supabase enables RLS by default. Since Agenario uses its own session-based
-- auth (not Supabase Auth), we connect via DATABASE_URL with the service-role
-- connection string (bypasses RLS). No RLS policies needed.
-- If you want extra safety, keep RLS disabled on these tables:

ALTER TABLE public.users         DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.scans         DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.scan_issues   DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages      DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.session       DISABLE ROW LEVEL SECURITY;


-- ── 9. VERIFY EVERYTHING IS CORRECT ──────────────────────────────────────
-- After running the script, run this to confirm all tables exist:

SELECT
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns c
   WHERE c.table_name = t.table_name AND c.table_schema = 'public') AS column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Expected output:
-- conversations |   3
-- messages      |   4
-- scan_issues   |  23
-- scans         |  38
-- session       |   3
-- users         |  10


-- ============================================================
-- 10. HOMOMORPHIC AST FINGERPRINT PATTERNS
-- Stores known vulnerability AST topology signatures
-- ============================================================

CREATE SEQUENCE IF NOT EXISTS ast_patterns_id_seq START WITH 1 INCREMENT BY 1;

CREATE TABLE IF NOT EXISTS public.ast_patterns (
  id                 integer   NOT NULL DEFAULT nextval('ast_patterns_id_seq'::regclass),
  pattern_id         text      NOT NULL,
  name               text      NOT NULL,
  vulnerability_class text     NOT NULL,
  cwe                text      NOT NULL,
  severity           text      NOT NULL,
  structural_signature text   NOT NULL,
  required_node_types  jsonb   NOT NULL DEFAULT '[]',
  forbidden_node_types jsonb   NOT NULL DEFAULT '[]',
  min_depth           integer  NOT NULL DEFAULT 1,
  max_depth           integer  NOT NULL DEFAULT 50,
  min_nodes           integer  NOT NULL DEFAULT 1,
  atomic_propositions jsonb    NOT NULL DEFAULT '[]',
  ltl_property        text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ast_patterns_pkey PRIMARY KEY (id),
  CONSTRAINT ast_patterns_pattern_id_unique UNIQUE (pattern_id)
);

CREATE INDEX IF NOT EXISTS idx_ast_patterns_class ON public.ast_patterns (vulnerability_class);
CREATE INDEX IF NOT EXISTS idx_ast_patterns_severity ON public.ast_patterns (severity);


-- ============================================================
-- 11. AST FINGERPRINT SCAN RESULTS
-- Stores per-function fingerprints from scans
-- ============================================================

CREATE SEQUENCE IF NOT EXISTS ast_fingerprints_id_seq START WITH 1 INCREMENT BY 1;

CREATE TABLE IF NOT EXISTS public.ast_fingerprints (
  id                 integer   NOT NULL DEFAULT nextval('ast_fingerprints_id_seq'::regclass),
  scan_id            integer   NOT NULL,
  function_name      text      NOT NULL,
  file_path          text,
  line_start         integer,
  line_end           integer,
  structural_hash    text      NOT NULL,
  topological_shape  text      NOT NULL,
  minhash_sig        jsonb     NOT NULL DEFAULT '[]',
  node_type_histogram jsonb   NOT NULL DEFAULT '{}',
  depth              integer   NOT NULL,
  node_count         integer   NOT NULL,
  matched_pattern_id text,
  match_score        real,
  is_zero_day        boolean   DEFAULT false,
  created_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ast_fingerprints_pkey PRIMARY KEY (id),
  CONSTRAINT ast_fingerprints_scan_id_fk FOREIGN KEY (scan_id) REFERENCES public.scans(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ast_fingerprints_scan ON public.ast_fingerprints (scan_id);
CREATE INDEX IF NOT EXISTS idx_ast_fingerprints_hash ON public.ast_fingerprints (structural_hash);
CREATE INDEX IF NOT EXISTS idx_ast_fingerprints_matched ON public.ast_fingerprints (matched_pattern_id);


-- ============================================================
-- 12. FSM STATE MACHINE STORAGE
-- Stores finite state machines extracted from code
-- ============================================================

CREATE SEQUENCE IF NOT EXISTS fsm_models_id_seq START WITH 1 INCREMENT BY 1;

CREATE TABLE IF NOT EXISTS public.fsm_models (
  id                 integer   NOT NULL DEFAULT nextval('fsm_models_id_seq'::regclass),
  scan_id            integer   NOT NULL,
  name               text      NOT NULL,
  state_count        integer   NOT NULL,
  transition_count   integer   NOT NULL,
  proposition_count  integer   NOT NULL,
  states_json        jsonb     NOT NULL DEFAULT '{}',
  events_json        jsonb     NOT NULL DEFAULT '[]',
  initial_state      text      NOT NULL,
  accepting_states   jsonb     NOT NULL DEFAULT '[]',
  created_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fsm_models_pkey PRIMARY KEY (id),
  CONSTRAINT fsm_models_scan_id_fk FOREIGN KEY (scan_id) REFERENCES public.scans(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_fsm_models_scan ON public.fsm_models (scan_id);


-- ============================================================
-- 13. LTL VERIFICATION RESULTS
-- Stores temporal property verification outcomes
-- ============================================================

CREATE SEQUENCE IF NOT EXISTS ltl_verifications_id_seq START WITH 1 INCREMENT BY 1;

CREATE TABLE IF NOT EXISTS public.ltl_verifications (
  id                  integer   NOT NULL DEFAULT nextval('ltl_verifications_id_seq'::regclass),
  fsm_model_id        integer   NOT NULL,
  scan_id             integer   NOT NULL,
  property            text      NOT NULL,
  property_formatted  text      NOT NULL,
  holds               boolean   NOT NULL,
  verified_states     integer   NOT NULL,
  violating_states    integer   NOT NULL,
  counterexample      jsonb,
  buchi_states        integer,
  time_ms             integer,
  created_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ltl_verifications_pkey PRIMARY KEY (id),
  CONSTRAINT ltl_verifications_fsm_fk FOREIGN KEY (fsm_model_id) REFERENCES public.fsm_models(id) ON DELETE CASCADE,
  CONSTRAINT ltl_verifications_scan_fk FOREIGN KEY (scan_id) REFERENCES public.scans(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ltl_verifications_fsm ON public.ltl_verifications (fsm_model_id);
CREATE INDEX IF NOT EXISTS idx_ltl_verifications_scan ON public.ltl_verifications (scan_id);
CREATE INDEX IF NOT EXISTS idx_ltl_verifications_property ON public.ltl_verifications (property);
CREATE INDEX IF NOT EXISTS idx_ltl_verifications_holds ON public.ltl_verifications (holds);


-- ============================================================
-- 14. STATE-SPACE ANALYSIS RESULTS
-- Stores deadlock, unreachable-state, and race-condition reports
-- ============================================================

CREATE SEQUENCE IF NOT EXISTS state_analysis_id_seq START WITH 1 INCREMENT BY 1;

CREATE TABLE IF NOT EXISTS public.state_analysis (
  id                  integer   NOT NULL DEFAULT nextval('state_analysis_id_seq'::regclass),
  fsm_model_id        integer   NOT NULL,
  scan_id             integer   NOT NULL,
  unreachable_states  jsonb     NOT NULL DEFAULT '[]',
  deadlock_states     jsonb     NOT NULL DEFAULT '[]',
  race_conditions     jsonb     NOT NULL DEFAULT '[]',
  state_count         integer   NOT NULL,
  transition_count    integer   NOT NULL,
  overall_secure      boolean   NOT NULL DEFAULT false,
  vulnerability_summary jsonb  NOT NULL DEFAULT '[]',
  created_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT state_analysis_pkey PRIMARY KEY (id),
  CONSTRAINT state_analysis_fsm_fk FOREIGN KEY (fsm_model_id) REFERENCES public.fsm_models(id) ON DELETE CASCADE,
  CONSTRAINT state_analysis_scan_fk FOREIGN KEY (scan_id) REFERENCES public.scans(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_state_analysis_scan ON public.state_analysis (scan_id);


-- ============================================================
-- 15. USEFUL QUERIES
-- ============================================================

-- Find all zero-day vulnerability detections (high match but not exact):
-- SELECT af.function_name, af.file_path, ap.name AS pattern_name, af.match_score
-- FROM ast_fingerprints af
-- JOIN ast_patterns ap ON af.matched_pattern_id = ap.pattern_id
-- WHERE af.is_zero_day = true
-- ORDER BY af.match_score DESC;

-- Find all LTL property violations across scans:
-- SELECT lv.property, lv.holds, lv.violating_states, s.id AS scan_id
-- FROM ltl_verifications lv
-- JOIN scans s ON lv.scan_id = s.id
-- WHERE lv.holds = false
-- ORDER BY lv.violating_states DESC;

-- Find deadlock-prone FSM models:
-- SELECT fm.name, sa.deadlock_states, sa.state_count, sa.transition_count
-- FROM state_analysis sa
-- JOIN fsm_models fm ON sa.fsm_model_id = fm.id
-- WHERE jsonb_array_length(sa.deadlock_states) > 0
-- ORDER BY jsonb_array_length(sa.deadlock_states) DESC;

-- Find structural clone groups (same hash = same topology):
-- SELECT structural_hash, COUNT(*) AS clone_count,
--        array_agg(function_name) AS functions
-- FROM ast_fingerprints
-- GROUP BY structural_hash
-- HAVING COUNT(*) > 1
-- ORDER BY clone_count DESC;


-- ============================================================
-- 16. ENHANCED MATH ENGINE QUERIES
-- ============================================================

-- Query all shannon-entropy leaks across scans (ordered by highest entropy):
-- SELECT s.id AS scan_id, te->>'avgEntropy' AS avg_entropy,
--        jsonb_array_length(te->'entropyLeaks') AS leak_count
-- FROM scans s, LATERAL (SELECT s.thermodynamic_entropy AS te) sub
-- WHERE s.thermodynamic_entropy IS NOT NULL
--   AND jsonb_array_length(te->'entropyLeaks') > 0
-- ORDER BY (te->>'avgEntropy')::numeric DESC
-- LIMIT 20;

-- Find files with the highest-entropy string literals (potential hardcoded secrets):
-- SELECT
--   leak->>'file' AS file_path,
--   (leak->>'entropy')::numeric AS entropy,
--   leak->>'patternType' AS pattern_type,
--   leak->>'snippet' AS snippet,
--   s.id AS scan_id
-- FROM scans s,
--      jsonb_array_elements(s.thermodynamic_entropy->'entropyLeaks') AS leak
-- WHERE s.thermodynamic_entropy IS NOT NULL
-- ORDER BY entropy DESC
-- LIMIT 50;

-- Query all constraint-based bypasses found by the exploit solver:
-- SELECT
--   bypass->>'file' AS file_path,
--   bypass->>'constraint' AS constraint_code,
--   bypass->>'payload' AS exploit_payload,
--   bypass->>'conditionType' AS condition_type,
--   bypass->>'bypassType' AS bypass_type,
--   s.id AS scan_id
-- FROM scans s,
--      jsonb_array_elements(s.constraint_solver->'constraintBypasses') AS bypass
-- WHERE s.constraint_solver IS NOT NULL
-- ORDER BY s.id DESC
-- LIMIT 50;

-- Summary of constraint by type distribution:
-- SELECT
--   cs->>'scanDate' AS scan_date,
--   cs->>'totalBypasses' AS total_bypasses,
--   cs->'byConditionType' AS by_condition_type,
--   cs->'byBypassType' AS by_bypass_type
-- FROM scans
-- WHERE constraint_solver IS NOT NULL
--   AND (constraint_solver->>'totalBypasses')::int > 0
-- ORDER BY created_at DESC
-- LIMIT 10;

-- Find scans with critical entropy leaks + constraint bypasses:
-- SELECT s.id, s.score, s.status,
--        jsonb_array_length(s.thermodynamic_entropy->'entropyLeaks') AS leak_count,
--        (s.constraint_solver->>'totalBypasses')::int AS bypass_count
-- FROM scans s
-- WHERE s.thermodynamic_entropy IS NOT NULL
--   AND s.constraint_solver IS NOT NULL
--   AND jsonb_array_length(s.thermodynamic_entropy->'entropyLeaks') > 0
--   AND (s.constraint_solver->>'totalBypasses')::int > 0
-- ORDER BY (s.constraint_solver->>'totalBypasses')::int DESC
-- LIMIT 20;


-- ============================================================
-- 17. REALITYCHECK MIGRATION (if table already exists)
-- ============================================================

ALTER TABLE scans ADD COLUMN IF NOT EXISTS reality_check jsonb;

-- RealityCheck queries:
-- Find scans with critical mockup/hardcoded issues:
-- SELECT id, reality_check->>'score' AS reality_score,
--        reality_check->>'mockDataCount' AS mock_data,
--        reality_check->>'fakeEndpointCount' AS fake_endpoints,
--        reality_check->>'dummyAuthCount' AS dummy_auth
-- FROM scans WHERE reality_check IS NOT NULL
-- ORDER BY (reality_check->>'score')::int ASC
-- LIMIT 20;

-- Get full product reality narrative for a scan:
-- SELECT id, reality_check->>'productRealityNarrative' AS narrative
-- FROM scans WHERE reality_check IS NOT NULL AND id = <scan_id>;
