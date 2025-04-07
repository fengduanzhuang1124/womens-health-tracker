
import express from "express";
const router = express.Router();
import {getDailySleepAdvice,getTrendSleepAdvice, getHealthAdvice } from"../controllers/aiController.js";
import { verifyToken } from "../middleware/auth.js";


router.post("/ai-advice", verifyToken, getHealthAdvice);
router.post("/ai/sleep/daily", verifyToken, getDailySleepAdvice);
router.post("/ai/sleep/trend", verifyToken, getTrendSleepAdvice);
export default router;