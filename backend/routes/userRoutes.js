// routes/userRoutes.js
import express from "express";
import {
  createUser,
  getUser,
  getUserProfile
} from "../controllers/userController.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

// Create a user or update login method
router.post("/", createUser);

// Get the specified user
router.get("/:uid", getUser);

// Get current user information (Token verification required)
router.get("/me/profile", verifyToken, getUserProfile);

export default router;
