import { Router, type IRouter } from "express";
import healthRouter from "./health";
import generationsRouter from "./generations/index.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(generationsRouter);

export default router;
