-- =============================================================================
-- Agenario 10/10 Transformation — Database Migration
-- Run this against your Supabase/PostgreSQL database.
-- =============================================================================

-- Phase 0.4 — Coupons table (replaces hardcoded VALID_COUPONS in billing.ts)
CREATE TABLE IF NOT EXISTS coupons (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  discount REAL NOT NULL CHECK (discount > 0 AND discount <= 1),
  label TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  usage_limit INTEGER NOT NULL DEFAULT 0,   -- 0 = unlimited
  usage_count INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed the previously hardcoded coupons so they still work after migration
INSERT INTO coupons (code, discount, label, enabled) VALUES
  ('LAUNCH50', 0.50, '50% launch discount', true),
  ('EARLY20',  0.20, '20% early bird',      true),
  ('FOUND30',  0.30, '30% founder offer',   true),
  ('VIBECODE', 0.25, '25% vibe coder',      true)
ON CONFLICT (code) DO NOTHING;

-- Phase 2.1 — Normalized engine results (replaces 20+ JSONB columns on scans)
CREATE TABLE IF NOT EXISTS scan_engine_results (
  id SERIAL PRIMARY KEY,
  scan_id INTEGER NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
  engine_name TEXT NOT NULL,
  result JSONB,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_engine_results_scan_id ON scan_engine_results(scan_id);
CREATE INDEX IF NOT EXISTS idx_engine_results_engine ON scan_engine_results(engine_name);

-- Phase 2.1 — Normalized scan proofs (replaces flat arrays in scans table)
CREATE TABLE IF NOT EXISTS scan_proofs (
  id SERIAL PRIMARY KEY,
  scan_id INTEGER NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  severity TEXT NOT NULL,
  confidence REAL,
  url TEXT,
  observed TEXT,
  impact TEXT,
  code_ref TEXT,
  screenshot TEXT,
  steps JSONB,
  video_url TEXT,
  engine_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_proofs_scan_id ON scan_proofs(scan_id);
CREATE INDEX IF NOT EXISTS idx_proofs_severity ON scan_proofs(severity);
CREATE INDEX IF NOT EXISTS idx_proofs_engine ON scan_proofs(engine_name);

-- Phase 2.2 — Add indexes to the existing scans table
CREATE INDEX IF NOT EXISTS idx_scans_user_id ON scans(user_id);
CREATE INDEX IF NOT EXISTS idx_scans_status ON scans(status);
CREATE INDEX IF NOT EXISTS idx_scans_created_at ON scans(created_at DESC);

-- Phase 11 — Remediation Engine tables

CREATE TABLE IF NOT EXISTS scan_fixes (
  id TEXT PRIMARY KEY,
  scan_id INTEGER NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
  issue_id INTEGER REFERENCES scan_issues(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','generating','testing','ready','applied','failed','rolled_back')),
  strategy TEXT NOT NULL DEFAULT 'ai'
    CHECK (strategy IN ('ai','rule','hybrid')),
  original_code TEXT NOT NULL DEFAULT '',
  patched_code TEXT NOT NULL DEFAULT '',
  diff TEXT NOT NULL DEFAULT '',
  explanation TEXT,
  safety_notes TEXT,
  test_result JSONB,
  pr_url TEXT,
  branch_name TEXT,
  applied_at TIMESTAMPTZ,
  rolled_back_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scan_fixes_scan_id ON scan_fixes(scan_id);
CREATE INDEX IF NOT EXISTS idx_scan_fixes_issue_id ON scan_fixes(issue_id);
CREATE INDEX IF NOT EXISTS idx_scan_fixes_status ON scan_fixes(status);

CREATE TABLE IF NOT EXISTS fix_templates (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  language TEXT NOT NULL,
  framework TEXT,
  pattern TEXT NOT NULL,
  replacement TEXT NOT NULL,
  description TEXT,
  severity TEXT[],
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS remediation_batches (
  id TEXT PRIMARY KEY,
  scan_id INTEGER NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','running','completed','failed')),
  total_issues INTEGER NOT NULL DEFAULT 0,
  fixed_issues INTEGER NOT NULL DEFAULT 0,
  failed_issues INTEGER NOT NULL DEFAULT 0,
  auto_apply BOOLEAN NOT NULL DEFAULT false,
  create_pr BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_remediation_batches_scan_id ON remediation_batches(scan_id);
CREATE INDEX IF NOT EXISTS idx_remediation_batches_user_id ON remediation_batches(user_id);

-- =============================================================================
-- Done. Run once against your Supabase SQL editor or psql.
-- =============================================================================
