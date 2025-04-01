// controllers/menstrualController.js
import { db } from "../config/firebaseAdmin.js";
import { Timestamp } from "firebase-admin/firestore";

// record period
export const addMenstrualData = async (req, res) => {
  try {
    const { userId, startDate, endDate, flowIntensity, symptoms } = req.body;
    const userRef = db.collection("users").doc(userId).collection("menstrualData");

    let cycleLength = 28; // Default cycle
    const previous = await userRef.orderBy("startDate", "desc").limit(1).get();
    if (!previous.empty) {
      const last = previous.docs[0].data();
      const diff = (new Date(startDate) - new Date(last.endDate)) / (1000 * 60 * 60 * 24);
      if (diff > 0) cycleLength = Math.round(diff);
    }

    let duration = Math.round((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)) + 1;
    if (duration < 1) duration = 1;

    await userRef.add({
      startDate: Timestamp.fromDate(new Date(startDate)),
      endDate: Timestamp.fromDate(new Date(endDate)),
      cycleLength,
      duration,
      flowIntensity: flowIntensity || "medium",
      symptoms: symptoms || [],
    });

    res.status(200).json({ message: "Data saved successfully", cycleLength });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


export const getMenstrualRecords = async (req, res) => {
  try {
    const uid = req.params.uid;
   // console.log("[GET] menstrual records for:", uid);
    const ref = db.collection("users").doc(uid).collection("menstrualData");
    const snapshot = await ref.orderBy("startDate", "desc").get();

    const data = [];
    const calendarData = [];

    //  First extract all startDates and sort them in ascending order of time
    const startDates = snapshot.docs
      .map(doc => doc.data().startDate.toDate())
      .sort((a, b) => a - b);

    // Calculate the total period using startDates
    let totalCycle = 0;
    for (let i = 1; i < startDates.length; i++) {
      const diff = (startDates[i] - startDates[i - 1]) / (1000 * 60 * 60 * 24);
     // console.log(`[Cycle Difference] ${startDates[i - 1].toISOString()} → ${startDates[i].toISOString()} = ${diff} 天`);
      totalCycle += diff;
    }

    const avgCycle = startDates.length > 1 ? Math.round(totalCycle / (startDates.length - 1)) : 28;
    // console.log("📌 snapshot.size", snapshot.size);
    // console.log("📌 totalCycle", totalCycle);
    // console.log("📌 avgCycle", avgCycle);

    // Traversing records to generate history + calendar marking
    snapshot.forEach(doc => {
      const raw = doc.data();
      const startDate = raw.startDate.toDate();
      const endDate = raw.endDate?.toDate?.();
      const cycleLength = raw.cycleLength;

      //listory
      data.push({
        id: doc.id,
        startDate,
        endDate,
        duration: raw.duration,
        cycleLength,
      });

      // Period Marker
      let curr = new Date(startDate);
      while (curr <= endDate) {
        calendarData.push({ date: new Date(curr), type: "past" });
        curr.setDate(curr.getDate() + 1);
      }

      // Ovulation markers
      const ovulationStart = new Date(startDate);
      ovulationStart.setDate(ovulationStart.getDate() + Math.floor(cycleLength / 2) - 5);
      const ovulationEnd = new Date(ovulationStart);
      ovulationEnd.setDate(ovulationEnd.getDate() + 6);
      let ovulDate = new Date(ovulationStart);
      while (ovulDate <= ovulationEnd) {
        calendarData.push({ date: new Date(ovulDate), type: "ovulation" });
        ovulDate.setDate(ovulDate.getDate() + 1);
      }
    });

    //  predict next time
    let nextPeriodDays = null;
    if (data.length > 0) {
      const lastPeriod = data[0];
      if (lastPeriod.endDate) {
        const predictedNextStart = new Date(lastPeriod.endDate);
        predictedNextStart.setDate(predictedNextStart.getDate() + avgCycle);

        const today = new Date();
        const diff = Math.ceil((predictedNextStart - today) / (1000 * 60 * 60 * 24));
        nextPeriodDays = diff > 0 ? diff : 0;

        // console.log(" lastPeriod.endDate", lastPeriod.endDate);
        // console.log(" predictedNextStart", predictedNextStart);
        // console.log(" today", today);
        // console.log("nextPeriodDays", nextPeriodDays);

        calendarData.push({ date: predictedNextStart, type: "predicted" });
      }
    }

    // return data
    res.status(200).json({
      data,
      calendarData,
      nextPeriodDays,
      cycleLength: avgCycle,
    });
  } catch (error) {
    console.error("❌ Error in getMenstrualRecords:", error.message);
    res.status(500).json({ error: error.message });
  }
};

  
// deleterecord
export const deleteMenstrualRecord = async (req, res) => {
  try {
    const { uid, recordId } = req.params;
    const recordRef = db.collection("users").doc(uid).collection("menstrualData").doc(recordId);
    const recordDoc = await recordRef.get();

    if (!recordDoc.exists) return res.status(404).json({ message: "Record not found" });

    await recordRef.delete();
    res.status(200).json({ message: "Record deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
