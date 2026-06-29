CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text NOT NULL,
	"plan" text DEFAULT 'free' NOT NULL,
	"phone" text,
	"phone_verified" boolean DEFAULT false,
	"razorpay_customer_id" text,
	"scan_limit" integer,
	"reset_token" text,
	"reset_token_expiry" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE "scans" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"team_id" integer,
	"source_type" text NOT NULL,
	"source_input" text NOT NULL,
	"app_description" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"score" integer,
	"summary" text,
	"launch_verdict" text,
	"framework" text,
	"vibe_tool" text,
	"business_type" text,
	"issue_counts" jsonb,
	"risk_forecast" jsonb,
	"revenue_intelligence" jsonb,
	"compliance_results" jsonb,
	"proof_evidence" jsonb,
	"regression_diff" jsonb,
	"benchmark_percentile" jsonb,
	"launch_dna" jsonb,
	"cofounder_narrative" text,
	"shadow_api_findings" jsonb,
	"launch_replay_steps" jsonb,
	"secret_scan_results" jsonb,
	"package_vulns" jsonb,
	"cleanup_report" jsonb,
	"cleanup_findings" jsonb,
	"digital_twin" jsonb,
	"predictive_intel" jsonb,
	"root_cause" jsonb,
	"launch_impact" jsonb,
	"product_hunt_score" jsonb,
	"knowledge_graph" jsonb,
	"sandbox_meta" jsonb,
	"cert_id" text,
	"unlocked_by_admin" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"sbom_data" jsonb,
	"genome_fingerprint" jsonb,
	"causal_inference" jsonb,
	"quantitative_risk" jsonb,
	"genetic_drift" jsonb,
	"agent_debate_results" jsonb,
	"shadow_traffic_insight" jsonb,
	"developer_twin_profile" jsonb,
	"topological_analysis" jsonb,
	"quantum_verification" jsonb,
	"predictive_smt" jsonb,
	"zero_trust_enclave" jsonb,
	"market_readiness_tracker" jsonb,
	"ux_cognitive_flow" jsonb,
	"green_light_verdict" jsonb,
	"babel_engine" jsonb,
	"multi_verse_dse" jsonb,
	"zk_snark_proof" jsonb,
	"big_o_profiler" jsonb,
	"fhe_analyzer" jsonb,
	"neuromorphic_drift" jsonb,
	"tensor_payload_signature" jsonb,
	"engine_scorecards" jsonb,
	"auth_testing_payload" jsonb,
	"url_audit_score" integer,
	"post_quantum_readiness" jsonb,
	"dna_storage_compiler" jsonb,
	"bft_consensus_graph" jsonb,
	"kardashev_latency" jsonb,
	"agi_alignment" jsonb,
	"thermodynamic_entropy" jsonb,
	"vibe_taint" jsonb,
	"sym_cost" jsonb,
	"reg_graph" jsonb,
	"fail_safe" jsonb,
	"obs_cover" jsonb,
	"arch_scan" jsonb,
	"deploy_safe" jsonb,
	"prompt_trace" jsonb,
	"flow_value" jsonb,
	"dempster_shafer" jsonb,
	"constraint_solver" jsonb,
	"cross_language_taint" jsonb,
	"under_approximation" jsonb,
	"abstract_confidence" jsonb,
	"ai_consensus" jsonb,
	"time_aware_deps" jsonb,
	"product_reality" jsonb
);
--> statement-breakpoint
CREATE TABLE "scan_issues" (
	"id" serial PRIMARY KEY NOT NULL,
	"scan_id" integer NOT NULL,
	"agent_name" text NOT NULL,
	"severity" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"fix_prompt" text NOT NULL,
	"auto_fix_code" text,
	"confidence" integer,
	"evidence" text,
	"file_path" text,
	"line_number" integer,
	"code_snippet" text,
	"impact_statement" text,
	"retest_result" text,
	"source_evidence" text,
	"finding_id" text,
	"function_name" text,
	"route_path" text,
	"reproduction_steps" jsonb,
	"blast_radius" jsonb,
	"video_url" text,
	"retest_status" text DEFAULT 'pending',
	"evidence_level" text
);
--> statement-breakpoint
CREATE TABLE "session" (
	"sid" text PRIMARY KEY NOT NULL,
	"sess" json NOT NULL,
	"expire" timestamp (6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"prefix" text NOT NULL,
	"key_hash" text NOT NULL,
	"name" text DEFAULT 'default' NOT NULL,
	"last_used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "webhook_secrets" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"secret_hash" text NOT NULL,
	"name" text DEFAULT 'default' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "automation_artifacts" (
	"id" text PRIMARY KEY NOT NULL,
	"run_id" text NOT NULL,
	"artifact_type" text NOT NULL,
	"label" text NOT NULL,
	"storage_file_id" text,
	"storage_path" text,
	"mime_type" text,
	"byte_size" integer,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb,
	"base_64_data" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "automation_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"target_url" text,
	"source_type" text NOT NULL,
	"source_ref" text,
	"archive_name" text,
	"status" text DEFAULT 'queued' NOT NULL,
	"requested_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"worker_id" text,
	"worker_heartbeat_at" timestamp with time zone,
	"priority" integer DEFAULT 50 NOT NULL,
	"requested_capabilities" jsonb,
	"execution_plan" jsonb,
	"result_summary" jsonb,
	"error_message" text
);
--> statement-breakpoint
CREATE TABLE "coupons" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"discount" real NOT NULL,
	"label" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"usage_limit" serial NOT NULL,
	"usage_count" serial DEFAULT 0 NOT NULL,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "coupons_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "scan_engine_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"scan_id" integer NOT NULL,
	"engine_name" text NOT NULL,
	"result" jsonb,
	"duration_ms" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "scan_proofs" (
	"id" serial PRIMARY KEY NOT NULL,
	"scan_id" integer NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"severity" text NOT NULL,
	"confidence" real,
	"url" text,
	"observed" text,
	"impact" text,
	"code_ref" text,
	"screenshot" text,
	"steps" jsonb,
	"video_url" text,
	"engine_name" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "fix_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"language" text NOT NULL,
	"framework" text,
	"pattern" text NOT NULL,
	"replacement" text NOT NULL,
	"description" text,
	"severity" text[],
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "remediation_batches" (
	"id" text PRIMARY KEY NOT NULL,
	"scan_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"total_issues" integer DEFAULT 0 NOT NULL,
	"fixed_issues" integer DEFAULT 0 NOT NULL,
	"failed_issues" integer DEFAULT 0 NOT NULL,
	"auto_apply" boolean DEFAULT false NOT NULL,
	"create_pr" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "scan_fixes" (
	"id" text PRIMARY KEY NOT NULL,
	"scan_id" integer NOT NULL,
	"issue_id" integer,
	"status" text DEFAULT 'pending' NOT NULL,
	"strategy" text DEFAULT 'ai' NOT NULL,
	"original_code" text DEFAULT '' NOT NULL,
	"patched_code" text DEFAULT '' NOT NULL,
	"diff" text DEFAULT '' NOT NULL,
	"explanation" text,
	"safety_notes" text,
	"test_result" jsonb,
	"pr_url" text,
	"branch_name" text,
	"applied_at" timestamp,
	"rolled_back_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "team_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "uq_team_user" UNIQUE("team_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"creator_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversation_id" integer NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "scans" ADD CONSTRAINT "scans_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_secrets" ADD CONSTRAINT "webhook_secrets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_artifacts" ADD CONSTRAINT "automation_artifacts_run_id_automation_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."automation_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scan_engine_results" ADD CONSTRAINT "scan_engine_results_scan_id_scans_id_fk" FOREIGN KEY ("scan_id") REFERENCES "public"."scans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scan_proofs" ADD CONSTRAINT "scan_proofs_scan_id_scans_id_fk" FOREIGN KEY ("scan_id") REFERENCES "public"."scans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "remediation_batches" ADD CONSTRAINT "remediation_batches_scan_id_scans_id_fk" FOREIGN KEY ("scan_id") REFERENCES "public"."scans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "remediation_batches" ADD CONSTRAINT "remediation_batches_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scan_fixes" ADD CONSTRAINT "scan_fixes_scan_id_scans_id_fk" FOREIGN KEY ("scan_id") REFERENCES "public"."scans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scan_fixes" ADD CONSTRAINT "scan_fixes_issue_id_scan_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."scan_issues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_engine_results_scan_id" ON "scan_engine_results" USING btree ("scan_id");--> statement-breakpoint
CREATE INDEX "idx_engine_results_engine" ON "scan_engine_results" USING btree ("engine_name");--> statement-breakpoint
CREATE INDEX "idx_proofs_scan_id" ON "scan_proofs" USING btree ("scan_id");--> statement-breakpoint
CREATE INDEX "idx_proofs_severity" ON "scan_proofs" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "idx_proofs_engine" ON "scan_proofs" USING btree ("engine_name");--> statement-breakpoint
CREATE INDEX "idx_remediation_batches_scan_id" ON "remediation_batches" USING btree ("scan_id");--> statement-breakpoint
CREATE INDEX "idx_remediation_batches_user_id" ON "remediation_batches" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_scan_fixes_scan_id" ON "scan_fixes" USING btree ("scan_id");--> statement-breakpoint
CREATE INDEX "idx_scan_fixes_issue_id" ON "scan_fixes" USING btree ("issue_id");--> statement-breakpoint
CREATE INDEX "idx_scan_fixes_status" ON "scan_fixes" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_team_members_team_id" ON "team_members" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "idx_team_members_user_id" ON "team_members" USING btree ("user_id");