import { Router, type IRouter } from "express";
import healthRouter from "./health";
import configRouter from "./config";
import profileRouter from "./profile";
import financialProfileRouter from "./financialProfile";
import goalsRouter from "./goals";
import missionsRouter from "./missions";
import scoreRouter from "./score";
import notificationPreferencesRouter from "./notificationPreferences";
import billsRouter from "./bills";
import briefingsRouter from "./briefings";
import notificationsRouter from "./notifications";
import pushTokensRouter from "./pushTokens";
import expensesRouter from "./expenses";

const router: IRouter = Router();

router.use(healthRouter);
router.use(configRouter);
router.use(profileRouter);
router.use(financialProfileRouter);
router.use(goalsRouter);
router.use(missionsRouter);
router.use(scoreRouter);
router.use(notificationPreferencesRouter);
router.use(billsRouter);
router.use(briefingsRouter);
router.use(notificationsRouter);
router.use(pushTokensRouter);
router.use(expensesRouter);

export default router;
