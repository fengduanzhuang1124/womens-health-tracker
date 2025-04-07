
import React, { useState, useEffect } from "react";
import MenstrualChart from "../chart/MenstrualChart";
import SleepChart from "../chart/SleepChart";
import WeightChart from "../chart/WeightChart";
import "../../styles/Profile.css";
import { db, auth } from "../../firebase";
import API from "../../api";
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
} from "firebase/firestore";
import avatarGirl from "../../assets/avatar-girl.png";

const Profile = ({ setProfileTab }) => {
  const [activeTab, setActiveTab] = useState("menstrual");
  const [menstrualData, setMenstrualData] = useState([]);
  const [avgCycleLength, setAvgCycleLength] = useState(28);
  const [sleepData, setSleepData] = useState([]);
  const [weightData, setWeightData] = useState([]);
  const user = auth.currentUser;

  useEffect(() => {
    if (!user?.uid) return;

    const fetchMenstrual = async () => {
      try {
        const res = await API.get("/api/menstrual/me");
        const { data, cycleLength } = res.data;

        const chartPoints = data.map((period) => ({
          month: new Date(period.startDate).toLocaleDateString("en-GB", {
            year: "numeric",
            month: "short",
            day: "numeric",
          }),
          duration: period.duration || 0,
        }));

        setMenstrualData(chartPoints);
        setAvgCycleLength(cycleLength); 
      } catch (error) {
        console.error("Error fetching menstrual data in profile:", error);
      }
    };
    // const fetchSleep = async () => {
    //   const ref = collection(db, "users", user.uid, "sleepRecords");
    //   const q = query(ref, orderBy("date", "desc"), limit(20));
    //   const snap = await getDocs(q);
    //   const records = [];
    //   snap.forEach((doc) => {
    //     const d = doc.data();
    //     records.push({
    //       id: doc.id,
    //       date: d.date || (d.sleepTime && new Date(d.sleepTime.seconds * 1000).toISOString().split("T")[0]),
    //       duration: d.duration,
    //     });
    //   });
    //   console.log("Fetched Sleep Records:", records); 
    //   setSleepData(records);
    // };
    

    const fetchWeight = async () => {
      const ref = collection(db, "users", user.uid, "weightData");
      const q = query(ref, orderBy("date", "desc"), limit(10));
      const snap = await getDocs(q);
      const records = [];
      snap.forEach((doc) => {
        const d = doc.data();
        records.push(d);
      });
      setWeightData(records);
    };

    if (activeTab === "menstrual") fetchMenstrual();
    if (activeTab === "sleep")  fetchSleepData();
    if (activeTab === "weight") fetchWeight();
  }, [user, activeTab]);
  const fetchSleepData = async () => {
    try {
      const res = await API.get(`/api/sleep/me`);
      setSleepData(res.data);
    } catch (err) {
      console.error("Error fetching sleep data:", err);
    }
  };
  

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setProfileTab(tab);
  };

  return (
    <div className={`profile ${activeTab}-theme`}>
      <div className={`profile-info ${activeTab}-theme`}>
        <h2>🎀 Personal Center</h2>
        <p><strong>Username:</strong> {user?.displayName || "User"}</p>
        <p><strong>Email:</strong> {user?.email}</p>
        <p><strong>Notification settings:</strong> On</p>
        <img
          src={avatarGirl}
          alt="avatar"
          style={{ width: "100px", borderRadius: "50%", marginBottom: "10px" }}
        />
      </div>

      <div className="health-nav">
        <button onClick={() => handleTabChange("menstrual")} className={activeTab === "menstrual" ? "active" : ""}>
          🩸 Menstrual Health
        </button>
        <button onClick={() => handleTabChange("sleep")} className={activeTab === "sleep" ? "active" : ""}>
          😴 Sleep Health
        </button>
        <button onClick={() => handleTabChange("weight")} className={activeTab === "weight" ? "active" : ""}>
          ⚖️ Weight Health
        </button>
      </div>

      <div className="health-content">
        {activeTab === "menstrual" && <MenstrualChart data={menstrualData} avgCycleLength={avgCycleLength}  />}
        {activeTab === "sleep" && <SleepChart showChart={true} data={sleepData} onDelete={fetchSleepData} />}
        {activeTab === "weight" && <WeightChart data={weightData} />}
      </div>
    </div>
  );
};

export default Profile;
