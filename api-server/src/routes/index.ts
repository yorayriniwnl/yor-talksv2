import { Router, type IRouter } from "express";
import achievementRouter from "./achievements.js";
import articleRouter from "./articles.js";
import authRouter from "./auth.js";
import communityRouter from "./communities.js";
import docsRouter from "./docs.js";
import eventRouter from "./events.js";
import healthRouter from "./health.js";
import messageRouter from "./messages.js";
import notificationRouter from "./notifications.js";
import postRouter from "./posts.js";
import productRouter from "./products.js";
import searchRouter from "./search.js";
import storyRouter from "./stories.js";
import streamRouter from "./streams.js";
import userRouter from "./users.js";
import videoRouter from "./videos.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(docsRouter);
router.use(authRouter);
router.use(userRouter);
router.use(postRouter);
router.use(messageRouter);
router.use(notificationRouter);
router.use(communityRouter);
router.use(searchRouter);
router.use(eventRouter);
router.use(productRouter);
router.use(articleRouter);
router.use(videoRouter);
router.use(storyRouter);
router.use(streamRouter);
router.use(achievementRouter);

export default router;
