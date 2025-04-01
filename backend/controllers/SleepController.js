// controllers/sleepController.js
import { db } from "../config/firebaseAdmin.js";
import { Timestamp } from "firebase-admin/firestore";

// POST /api/sleep - create a sleep record
// controllers/sleepController.js

export const addSleepRecord = async (req, res) => {
  try {
    const {
      userId,
      sleepTime,
      wakeTime,
      wakeCount,
      activity,
      duration,
      date,
      dreaming, 
    } = req.body;

    const ref = db.collection("users").doc(userId).collection("sleepRecords");

    await ref.add({
      sleepTime,
      wakeTime,
      wakeCount: Number(wakeCount),
      activity,
      duration: Number(duration),
      dreaming: dreaming || "no", 
      date: date || new Date().toISOString().split("T")[0],
      createdAt: Timestamp.now(),
    });

    res.status(200).json({ message: "Sleep record saved." });
  } catch (error) {
    console.error("[Error] addSleepRecord:", error.message);
    res.status(500).json({ error: error.message });
  }
};


// GET /api/sleep/:uid - get sleep records for user
export const getSleepRecords = async (req, res) => {
  try {
    const uid = req.params.uid;
    const ref = db.collection("users").doc(uid).collection("sleepRecords");
    const snapshot = await ref.orderBy("date", "asc").get();

    const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(records);
  } catch (error) {
    console.error("[Error] getSleepRecords:", error.message);
    res.status(500).json({ error: error.message });
  }
};
