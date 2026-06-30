import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not defined in .env file");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString });

const COLUMNS_MAP = {
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

async function migrate() {
  const client = await pool.connect();
  try {
    console.log("Checking database connection and table columns...");
    
    // Check if scans table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'scans'
      );
    `);
    if (!tableCheck.rows[0].exists) {
      console.log("scans table does not exist. Nothing to migrate.");
      return;
    }

    // Check which columns exist in the scans table
    const columnsCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'scans';
    `);
    const existingCols = new Set(columnsCheck.rows.map(r => r.column_name));
    
    const legacyCols = Object.keys(COLUMNS_MAP).filter(col => existingCols.has(col));
    const hasProofEvidence = existingCols.has("proof_evidence");

    if (legacyCols.length === 0 && !hasProofEvidence) {
      console.log("No legacy columns found in the scans table. Migration has already been applied or columns dropped.");
      return;
    }

    console.log(`Found ${legacyCols.length} legacy JSONB columns and ${hasProofEvidence ? 'proof_evidence' : 'no proof_evidence'} column to migrate.`);

    // Fetch all scans containing data
    const queryCols = ["id", ...legacyCols];
    if (hasProofEvidence) queryCols.push("proof_evidence");
    
    const scansQuery = await client.query(`
      SELECT ${queryCols.map(c => `"${c}"`).join(", ")} FROM scans;
    `);

    console.log(`Retrieved ${scansQuery.rows.length} scan records to process.`);

    let engineInsertsCount = 0;
    let proofInsertsCount = 0;

    for (const scan of scansQuery.rows) {
      const scanId = scan.id;

      // 1. Migrate engine results
      for (const col of legacyCols) {
        const val = scan[col];
        if (val !== null && val !== undefined) {
          const engineName = COLUMNS_MAP[col];
          
          // Check if already exists in scan_engine_results
          const checkExist = await client.query(`
            SELECT id FROM scan_engine_results 
            WHERE scan_id = $1 AND engine_name = $2;
          `, [scanId, engineName]);

          if (checkExist.rows.length === 0) {
            await client.query(`
              INSERT INTO scan_engine_results (scan_id, engine_name, result)
              VALUES ($1, $2, $3);
            `, [scanId, engineName, JSON.stringify(val)]);
            engineInsertsCount++;
          }
        }
      }

      // 2. Migrate proof evidence
      if (hasProofEvidence && scan.proof_evidence) {
        let proofsList = scan.proof_evidence;
        if (typeof proofsList === 'string') {
          try {
            proofsList = JSON.parse(proofsList);
          } catch (e) {
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

            // Check if already exists in scan_proofs
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
              proofInsertsCount++;
            }
          }
        }
      }
    }

    console.log(`Migration completed successfully!`);
    console.log(`- Migrated ${engineInsertsCount} engine results to scan_engine_results table.`);
    console.log(`- Migrated ${proofInsertsCount} proof items to scan_proofs table.`);
    console.log(`\nNow it is safe to apply the columns drop migration (0001_fat_maelstrom.sql) to remove the 60+ legacy columns.`);

  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
