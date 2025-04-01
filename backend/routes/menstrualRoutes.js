// routes/menstrualRoutes.js
import express from "express";
import {
  addMenstrualData,
  getMenstrualRecords,
  deleteMenstrualRecord,
} from "../controllers/menstrualController.js";

const router = express.Router();


router.post("/", addMenstrualData);


router.get("/:uid", getMenstrualRecords);


router.delete("/:uid/:recordId", deleteMenstrualRecord);

export default router;
