import express from "express";
import {addSleepRecord, getSleepRecords, deleteSleepRecordById} from "../controllers/SleepController.js";
import {verifyToken} from "../middleware/auth.js";
const router = express.Router();

router.post("/", verifyToken, addSleepRecord);
router.get("/me", verifyToken, getSleepRecords);
router.delete("/:docId", verifyToken, deleteSleepRecordById);
export default router;
