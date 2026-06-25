-- ============================================================
-- Dempster-Shafer Evidence Fusion — Supabase Migration
-- ============================================================
-- Run in: Supabase Dashboard → SQL Editor → New Query
-- Safe to run multiple times (uses IF NOT EXISTS)
-- ============================================================

-- ── 1. Add dempster_shafer column to scans table ────────────
ALTER TABLE IF EXISTS public.scans
  ADD COLUMN IF NOT EXISTS dempster_shafer jsonb;

-- ── 2. Verify the column exists ─────────────────────────────
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'scans'
  AND column_name = 'dempster_shafer';

-- Expected output:
-- column_name      | data_type | is_nullable
-- dempster_shafer  | jsonb     | YES

-- ── 3. Usage: Query fused evidence for a specific scan ──────
-- SELECT id, score, dempster_shafer->'aggregate'->>'overallConfidence' AS ds_confidence,
--        dempster_shafer->'aggregate'->>'overallBelief' AS ds_belief,
--        dempster_shafer->'aggregate'->>'overallPlausibility' AS ds_plausibility,
--        dempster_shafer->'aggregate'->>'overallConflict' AS ds_conflict,
--        dempster_shafer->'aggregate'->>'verdict' AS ds_verdict
-- FROM public.scans
-- WHERE dempster_shafer IS NOT NULL
-- ORDER BY created_at DESC
-- LIMIT 20;

-- ── 4. How to add to fresh SUPABASE_SETUP.sql (if rebuilding) ──
-- Add this line inside the CREATE TABLE public.scans (...) block:
--   dempster_shafer      jsonb,
-- After the `knowledge_graph` line, before `cert_id`.
