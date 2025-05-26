import functions from "firebase-functions";

import express from "express";
import cors from "cors";
require('dotenv').config();
// import the routes
import menstrualRoutes from "./routes/menstrualRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import sleepRoutes from "./routes/sleepRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import weightRoutes from "./routes/weightRoutes.js";
import mealRoutes from "./routes/mealRoutes.js";

//  initialize the Express application
const app = express();
app.use(cors({origin: true}));
app.use(express.json());

// set the routes  
app.use("/api/menstrual", menstrualRoutes);
app.use("/api/users", userRoutes);
app.use("/api/sleep", sleepRoutes);
app.use("/api", aiRoutes);
app.use("/api/weight", weightRoutes);
app.use("/api/meal", mealRoutes);

//  export the API as a Firebase cloud function
export const api = functions.https.onRequest(app);
