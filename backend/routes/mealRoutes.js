import express from "express";
import { 
  getMealRecommendations, 
  updateDietPreferences, 
  getMealPlanHistory 
} from "../controllers/mealRecommenderController.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

// 获取餐食推荐
router.get('/recommendations', verifyToken, getMealRecommendations);

// 更新饮食偏好
router.put('/preferences', verifyToken, updateDietPreferences);

// 获取餐食计划历史
router.get('/history', verifyToken, getMealPlanHistory);

export default router; 