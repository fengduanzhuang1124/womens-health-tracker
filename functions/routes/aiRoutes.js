import express from "express";
const router = express.Router();
import {
  getDailySleepAdvice,
  getTrendSleepAdvice,
  getHealthAdvice,
} from "../controllers/aiController.js";
import {verifyToken} from "../middleware/auth.js";
import {
  getSleepBasedMusic,
  saveMusicFeedback,
  getLikedMusic,
  getMusicHistory,
} from "../controllers/musicController.js";


router.post("/ai-advice", verifyToken, getHealthAdvice);
router.post("/ai/sleep/daily", verifyToken, getDailySleepAdvice);
router.post("/ai/sleep/trend", verifyToken, getTrendSleepAdvice);

router.post("/sleep/music", verifyToken, getSleepBasedMusic);
router.post("/sleep/music/feedback", verifyToken, saveMusicFeedback);
router.get("/sleep/music/liked", verifyToken, getLikedMusic);
router.get("/sleep/music/history", verifyToken, getMusicHistory);

export default router;
