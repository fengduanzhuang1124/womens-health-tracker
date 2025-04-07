// routes/menstrualRoutes.js
import express from "express";
import {
  addMenstrualData,
  getMenstrualRecords,
  deleteMenstrualRecord,
} from "../controllers/menstrualController.js";
import { verifyToken } from "../middleware/auth.js";
const router = express.Router();


router.post("/",verifyToken,addMenstrualData);


router.get("/me",verifyToken,getMenstrualRecords);


router.delete("/:recordId",verifyToken,deleteMenstrualRecord);

export default router;
