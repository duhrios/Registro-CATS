import { Router, type IRouter } from "express";
import healthRouter from "./health";
import providersRouter from "./providers";
import authRouter from "./auth";
import settingsRouter from "./settings";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(settingsRouter);
router.use(providersRouter);

export default router;
