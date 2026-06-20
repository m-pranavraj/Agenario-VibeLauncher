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
-- scans         |  37
-- session       |   3
-- users         |  10
