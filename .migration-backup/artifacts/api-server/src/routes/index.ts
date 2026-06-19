import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import scansRouter from "./scans.js";
import billingRouter from "./billing.js";
import githubRouter from "./github.js";
import monitoringRouter from "./monitoring.js";
import adminRouter from "./admin.js";
import publicRouter from "./public.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(scansRouter);
router.use(billingRouter);
router.use(githubRouter);
router.use(monitoringRouter);
router.use(adminRouter);
router.use(publicRouter);

export default router;
