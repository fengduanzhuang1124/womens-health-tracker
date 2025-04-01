import express from "express";
import { addSleepRecord, getSleepRecords } from "../controllers/SleepController.js";

const router = express.Router();

router.post("/", addSleepRecord);
router.get("/:uid", getSleepRecords);

export default router;
