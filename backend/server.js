
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import menstrualRoutes from "./routes/menstrualRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import sleepRoutes from "./routes/sleepRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
dotenv.config();



const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/menstrual", menstrualRoutes);
app.use("/api/users", userRoutes);

app.use("/api/sleep", sleepRoutes);

app.use("/api", aiRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));