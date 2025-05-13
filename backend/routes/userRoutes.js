// routes/userRoutes.js
import express from "express";
import {
  createUser,
  getUser,
  getUserProfile,
  updateUserProfile
} from "../controllers/userController.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

// Create a user or update login method
router.post("/", createUser);

// Get the specified user
router.get("/:uid", getUser);

// Get current user information (Token verification required)
router.get("/me/profile", verifyToken, getUserProfile);

// Update user profile (Token verification required)
router.put("/profile", verifyToken, updateUserProfile);

export default router;
