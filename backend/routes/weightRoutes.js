import express from "express";
import { getAllWeights, addWeight, updateGoalWeight, addFoodEntry, getFoodNutrition, getAIAdvice, getFoodEntries, deleteWeight, getGoalWeight } from "../controllers/weightController.js";

const router = express.Router();
import { verifyToken } from "../middleware/auth.js";
// Weight routes
router.get('/', verifyToken, getAllWeights);
router.get('/me', verifyToken, getAllWeights);
router.get('/goal', verifyToken, getGoalWeight);
router.post('/', verifyToken, addWeight);
router.put('/goal', verifyToken, updateGoalWeight);
router.delete('/:weightId', verifyToken, deleteWeight);

// Food and nutrition routes
router.get('/food', verifyToken, getFoodEntries);
router.post('/food', verifyToken, addFoodEntry);
router.post('/food/nutrition', verifyToken, getFoodNutrition);

// AI advice route
router.get('/advice', verifyToken, getAIAdvice);



export default router;
