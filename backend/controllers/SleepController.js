// controllers/sleepController.js
import { db } from "../config/firebaseAdmin.js";
import { Timestamp } from "firebase-admin/firestore";

// POST /api/sleep - create a sleep record
// controllers/sleepController.js

export const addSleepRecord = async (req, res) => {
  try {
    const  uid= req.user.uid;
    const {
      sleepTime,
      wakeTime,
      wakeCount,
      activity,
      duration,
      date,
      dreaming, 
    } = req.body;
    const recordDate = date || new Date().toISOString().split("T")[0];
    const ref = db.collection("users").doc(uid).collection("sleepRecords");

    // 🔒 Check if a record already exists for this date
    const existingSnap = await ref.where("date", "==", recordDate).get();
    if (!existingSnap.empty) {
      return res.status(400).json({ error: "A sleep record for this date already exists." });
    }

    // const ref = db.collection("users").doc(uid).collection("sleepRecords");

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
    const uid = req.user.uid;
    const ref = db.collection("users").doc(uid).collection("sleepRecords");
    const snapshot = await ref.orderBy("date", "asc").get();

    const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(records);
  } catch (error) {
    console.error("[Error] getSleepRecords:", error.message);
    res.status(500).json({ error: error.message });
  }
};
export const deleteSleepRecordById = async (req, res) => {
  const uid = req.user.uid;
  const { docId } = req.params;

  try {
    const ref = db.collection("users").doc(uid).collection("sleepRecords").doc(docId);
    const snapshot = await ref.get();

    if (!snapshot.exists) {
      return res.status(404).json({ error: "Record not found." });
    }

    await ref.delete();
    res.status(200).json({ message: "Sleep record deleted." });
  } catch (err) {
    console.error("Delete Error:", err.message);
    res.status(500).json({ error: "Failed to delete record." });
  }
};
