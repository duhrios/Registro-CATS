import { Router, type IRouter } from "express";
import healthRouter from "./health";
import providersRouter from "./providers";
import storageRouter from "./storage";

const router: IRouter = Router();

router.use(healthRouter);
router.use(providersRouter);
router.use(storageRouter);

export default router;
