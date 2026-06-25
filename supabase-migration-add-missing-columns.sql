-- Migration: Add missing columns to scans table that Drizzle schema expects
-- Run this directly in Supabase SQL editor or via psql

ALTER TABLE public.scans
  ADD COLUMN IF NOT EXISTS genome_fingerprint jsonb,
  ADD COLUMN IF NOT EXISTS causal_inference jsonb,
  ADD COLUMN IF NOT EXISTS quantitative_risk jsonb,
  ADD COLUMN IF NOT EXISTS genetic_drift jsonb,
  ADD COLUMN IF NOT EXISTS agent_debate_results jsonb,
  ADD COLUMN IF NOT EXISTS shadow_traffic_insight jsonb,
  ADD COLUMN IF NOT EXISTS developer_twin_profile jsonb,
  ADD COLUMN IF NOT EXISTS topological_analysis jsonb,
  ADD COLUMN IF NOT EXISTS quantum_verification jsonb,
  ADD COLUMN IF NOT EXISTS predictive_smt jsonb,
  ADD COLUMN IF NOT EXISTS zero_trust_enclave jsonb,
  ADD COLUMN IF NOT EXISTS market_readiness_tracker jsonb,
  ADD COLUMN IF NOT EXISTS ux_cognitive_flow jsonb,
  ADD COLUMN IF NOT EXISTS green_light_verdict jsonb,
  ADD COLUMN IF NOT EXISTS engine_scorecards jsonb,
  ADD COLUMN IF NOT EXISTS under_approximation jsonb,
  ADD COLUMN IF NOT EXISTS abstract_confidence jsonb,
  ADD COLUMN IF NOT EXISTS ai_consensus jsonb;
