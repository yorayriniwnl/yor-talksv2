import { Router } from "express";
import authRouter from "./auth.js";
import docsRouter from "./docs.js";
import healthRouter from "./health.js";
import messageRouter from "./messages.js";
import notificationRouter from "./notifications.js";
import postRouter from "./posts.js";
import userRouter from "./users.js";
const router = Router();
router.use(healthRouter);
router.use(docsRouter);
router.use(authRouter);
router.use(userRouter);
router.use(postRouter);
router.use(messageRouter);
router.use(notificationRouter);
export default router;
//# sourceMappingURL=index.js.map