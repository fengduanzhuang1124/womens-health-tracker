import functions from "firebase-functions";

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

//  initialize the Express application
const app = express();
app.use(cors({origin: true}));
app.use(express.json());

// 在请求处理前添加日志
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`, {
      query: req.query,
      body: req.body,
      user: req.user?.uid
    });
    next();
  });
  
  // 在错误处理中添加日志
  app.use((error, req, res, next) => {
    console.error(`[ERROR] ${error.message}`, error);
    res.status(500).json({ error: error.message });
  });
// import the routes
import menstrualRoutes from "./routes/menstrualRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import sleepRoutes from "./routes/sleepRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import weightRoutes from "./routes/weightRoutes.js";
import mealRoutes from "./routes/mealRoutes.js";



// set the routes  
app.use("/api/menstrual", menstrualRoutes);
app.use("/api/users", userRoutes);
app.use("/api/sleep", sleepRoutes);
app.use("/api", aiRoutes);
app.use("/api/weight", weightRoutes);
app.use("/api/meal", mealRoutes);

//  export the API as a Firebase cloud function
export const api = functions.https.onRequest(app);
