-- Fix missing column that causes "Report not found" error
ALTER TABLE public.scan_proofs ADD COLUMN IF NOT EXISTS steps jsonb;

-- Also ensure scan_engine_results has the right columns (should already exist, but just in case)
ALTER TABLE public.scan_engine_results ADD COLUMN IF NOT EXISTS duration_ms integer;
