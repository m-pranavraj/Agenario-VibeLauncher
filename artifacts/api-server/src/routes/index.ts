import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import scansRouter from "./scans.js";
import billingRouter from "./billing.js";
import paddleWebhookRouter from "./paddle-webhook.js";
import githubRouter from "./github.js";
import monitoringRouter from "./monitoring.js";
import adminRouter from "./admin.js";
import publicRouter from "./public.js";
import apiKeysRouter from "./api-keys.js";
import automationRouter from "./automation.js";
import compilerRouter from "./compiler.js";
import remediationRouter from "./remediation.js";
import teamsRouter from "./teams.js";
import conversationsRouter from "./conversations.js";
import docsRouter from "./docs.js";
import metricsRouter from "./metrics.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(scansRouter);
router.use(billingRouter);
router.use(paddleWebhookRouter);
router.use(githubRouter);
router.use(monitoringRouter);
router.use(adminRouter);
router.use(publicRouter);
router.use(apiKeysRouter);
router.use(automationRouter);
router.use(compilerRouter);
router.use(remediationRouter); // Phase 11 — Remediation Engine
router.use(teamsRouter);       // Phase 4.2 — Team Workspace
router.use(conversationsRouter); // Phase 4.3 — Conversations/Copilot Chat
router.use(docsRouter);        // Phase 7.3 — OpenAPI Docs
router.use(metricsRouter);     // Phase 8.1 — Prometheus Metrics

export default router;

