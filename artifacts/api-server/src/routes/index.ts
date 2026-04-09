import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import projectsRouter from "./projects";
import configsRouter from "./configs";
import validationsRouter from "./validations";
import observabilityRouter from "./observability";
import promptsRouter from "./prompts";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(projectsRouter);
router.use(configsRouter);
router.use(validationsRouter);
router.use(observabilityRouter);
router.use(promptsRouter);

export default router;
