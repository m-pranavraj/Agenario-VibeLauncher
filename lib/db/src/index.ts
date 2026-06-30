import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });

async function migrateLegacyScans(pool: pg.Pool) {
  const client = await pool.connect();
  try {
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'scans'
      );
    `);
    if (!tableCheck.rows[0].exists) return;

    const columnsCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'scans';
    `);
    const existingCols = new Set(columnsCheck.rows.map(r => r.column_name));
    
    const COLUMNS_MAP: Record<string, string> = {
      risk_forecast: "riskForecast",
      revenue_intelligence: "revenueIntelligence",
      compliance_results: "complianceResults",
      regression_diff: "regressionDiff",
      benchmark_percentile: "benchmarkPercentile",
      launch_dna: "launchDna",
      shadow_api_findings: "shadowApiFindings",
      launch_replay_steps: "launchReplaySteps",
      secret_scan_results: "secretScanResults",
      package_vulns: "packageVulns",
      cleanup_report: "cleanupReport",
      cleanup_findings: "cleanupFindings",
      digital_twin: "digitalTwin",
      predictive_intel: "predictiveIntel",
      root_cause: "rootCause",
      launch_impact: "launchImpact",
      product_hunt_score: "productHuntScore",
      knowledge_graph: "knowledgeGraph",
      sandbox_meta: "sandboxMeta",
      sbom_data: "sbomData",
      auth_testing_payload: "authTestingPayload",
      dempster_shafer: "dempsterShafer",
      thermodynamic_entropy: "thermodynamicEntropy",
      constraint_solver: "constraintSolver",
      vibe_taint: "vibeTaint",
      sym_cost: "symCost",
      reg_graph: "regGraph",
      fail_safe: "failSafe",
      obs_cover: "obsCover",
      arch_scan: "archScan",
      deploy_safe: "deploySafe",
      prompt_trace: "promptTrace",
      flow_value: "flowValue",
      cog_flow: "cogFlow",
      time_aware_deps: "timeAwareDeps",
      cross_language_taint: "crossLanguageTaint",
      babel_engine: "babelEngine",
      multi_verse_dse: "multiVerseDse",
      zk_snark_proof: "zkSnarkProof",
      big_o_profiler: "bigOProfiler",
      fhe_analyzer: "fheAnalyzer",
      neuromorphic_drift: "neuromorphicDrift",
      tensor_payload_signature: "tensorPayloadSignature",
      post_quantum_readiness: "postQuantumReadiness",
      dna_storage_compiler: "dnaStorageCompiler",
      bft_consensus_graph: "bftConsensusGraph",
      kardashev_latency: "kardashevLatency",
      agi_alignment: "agiAlignment",
      genome_fingerprint: "genomeFingerprint",
      causal_inference: "causalInference",
      quantitative_risk: "quantitativeRisk",
      genetic_drift: "geneticDrift",
      agent_debate_results: "agentDebateResults",
      shadow_traffic_insight: "shadowTrafficInsight",
      developer_twin_profile: "developerTwinProfile",
      topological_analysis: "topologicalAnalysis",
      quantum_verification: "quantumVerification",
      predictive_smt: "predictiveSmt",
      zero_trust_enclave: "zeroTrustEnclave",
      market_readiness_tracker: "marketReadinessTracker",
      ux_cognitive_flow: "uxCognitiveFlow",
      green_light_verdict: "greenLightVerdict",
      engine_scorecards: "engineScorecards",
      under_approximation: "underApproximation",
      abstract_confidence: "abstractConfidence",
      ai_consensus: "aiConsensus",
      product_reality: "productReality"
    };

    const legacyCols = Object.keys(COLUMNS_MAP).filter(col => existingCols.has(col));
    const hasProofEvidence = existingCols.has("proof_evidence");

    if (legacyCols.length === 0 && !hasProofEvidence) {
      return;
    }

    console.log(`[migrate] Auto-migrating ${legacyCols.length} legacy scan columns...`);

    const queryCols = ["id", ...legacyCols];
    if (hasProofEvidence) queryCols.push("proof_evidence");

    const scansQuery = await client.query(`
      SELECT ${queryCols.map(c => `"${c}"`).join(", ")} FROM scans;
    `);

    for (const scan of scansQuery.rows) {
      const scanId = scan.id;

      for (const col of legacyCols) {
        const val = scan[col];
        if (val !== null && val !== undefined) {
          const engineName = COLUMNS_MAP[col];
          const checkExist = await client.query(`
            SELECT id FROM scan_engine_results 
            WHERE scan_id = $1 AND engine_name = $2;
          `, [scanId, engineName]);

          if (checkExist.rows.length === 0) {
            await client.query(`
              INSERT INTO scan_engine_results (scan_id, engine_name, result)
              VALUES ($1, $2, $3);
            `, [scanId, engineName, JSON.stringify(val)]);
          }
        }
      }

      if (hasProofEvidence && scan.proof_evidence) {
        let proofsList = scan.proof_evidence;
        if (typeof proofsList === 'string') {
          try {
            proofsList = JSON.parse(proofsList);
          } catch {
            proofsList = [];
          }
        }
        
        if (Array.isArray(proofsList)) {
          for (const p of proofsList) {
            if (!p || typeof p !== 'object') continue;
            
            const type = p.type || "shadow-api";
            const title = p.title || "Proof Evidence";
            const severity = p.severity || "medium";
            const confidence = p.confidence !== undefined ? p.confidence : 1.0;
            const url = p.url || null;
            const observed = p.observed || "";
            const impact = p.impact || "";
            const codeRef = p.codeRef || null;
            const screenshot = p.screenshot || null;
            const steps = p.steps ? JSON.stringify(p.steps) : null;
            const videoUrl = p.videoUrl || null;
            const engineName = p.engineName || "playwright-proof";

            const checkExist = await client.query(`
              SELECT id FROM scan_proofs 
              WHERE scan_id = $1 AND type = $2 AND title = $3;
            `, [scanId, type, title]);

            if (checkExist.rows.length === 0) {
              await client.query(`
                INSERT INTO scan_proofs (
                  scan_id, type, title, severity, confidence, url, 
                  observed, impact, code_ref, screenshot, engine_name, steps, video_url
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13);
              `, [
                scanId, type, title, severity, confidence, url, 
                observed, impact, codeRef, screenshot, engineName, steps, videoUrl
              ]);
            }
          }
        }
      }
    }
    console.log("[migrate] Successfully completed scan data auto-migration.");
  } catch (err) {
    console.warn("[migrate] Legacy scans auto-migration failed:", (err as Error)?.message);
  } finally {
    client.release();
  }
}

/** Run pending schema migrations on startup */
export async function runMigrations() {
  try {
    await pool.query(`ALTER TABLE scans ADD COLUMN IF NOT EXISTS team_id INTEGER`);
    console.log("[migrate] Added team_id column to scans table");

    await pool.query(`ALTER TABLE scan_proofs ADD COLUMN IF NOT EXISTS video_url TEXT`);
    console.log("[migrate] Added video_url column to scan_proofs table");

    // Ensure status column exists with proper default for legacy tables
    await pool.query(`ALTER TABLE scans ADD COLUMN IF NOT EXISTS status TEXT`);
    await pool.query(`UPDATE scans SET status = 'completed' WHERE score IS NOT NULL AND status IS NULL`);
    console.log("[migrate] Ensured status column on scans table");

    // Ensure unlocked_by_admin column exists
    await pool.query(`ALTER TABLE scans ADD COLUMN IF NOT EXISTS unlocked_by_admin BOOLEAN DEFAULT false`);
    console.log("[migrate] Ensured unlocked_by_admin column on scans table");

    // Auto-migrate legacy scans data if table has legacy columns
    await migrateLegacyScans(pool);
  } catch (err) {
    console.warn("[migrate] Skipped migration:", (err as Error)?.message);
  }
}

export * from "./schema";
