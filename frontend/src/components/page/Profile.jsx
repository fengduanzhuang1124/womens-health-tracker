import React, { useState, useEffect } from "react";
import MenstrualChart from "../chart/MenstrualChart";
import SleepChart from "../chart/SleepChart";
import MealRecommender from "../nutrition/MealRecommender";
import "../../styles/Profile.css";
import { auth } from "../../firebase";
import API from "../../api";
import partfour from "../../assets/partfour.jpg";

const Profile = ({ setProfileTab }) => {
  const [activeTab, setActiveTab] = useState("menstrual");
  const [isProfileVisible, setIsProfileVisible] = useState(false);

  // 只保留真正用到的 state
  const [menstrualData, setMenstrualData] = useState(null);
  const [loadingMenstrual, setLoadingMenstrual] = useState(true);
  const [errorMenstrual, setErrorMenstrual] = useState(null);

  const [sleep, setSleep] = useState([]);
  const [currentWeight, setCurrentWeight] = useState(null);
  const [goalWeight, setGoalWeight] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [avgCycleLength, setAvgCycleLength] = useState(28);
  const [height, setHeight] = useState(165);
  const [age, setAge] = useState(30);

  const user = auth.currentUser;

  // 获取经期数据
  useEffect(() => {
    const fetchMenstrual = async () => {
      try {
        setLoadingMenstrual(true);
        const res = await API.get("/api/menstrual/me");
        setMenstrualData(res.data);
       
        setErrorMenstrual(null);
        console.log("menstrualData from API:", res.data);
      } catch (err) {
        setErrorMenstrual("Failed to fetch menstrual data");
      } finally {
        setLoadingMenstrual(false);
      }
    };
    fetchMenstrual();
  }, []);

  // 获取睡眠数据
  const fetchSleepData = async () => {
    try {
      const res = await API.get(`/api/sleep/me`);
      setSleep(res.data);
    } catch (err) {
      console.error("Error fetching sleep data:", err);
    }
  };

  // 获取体重、目标体重、用户资料
  useEffect(() => {
    if (!user?.uid) return;
    const fetchUserData = async () => {
      try {
        // 体重
        const weightResponse = await API.get("/api/weight");
        if (weightResponse.data && weightResponse.data.length > 0) {
          const sortedWeights = [...weightResponse.data].sort((a, b) => new Date(b.date) - new Date(a.date));
          setCurrentWeight(sortedWeights[0].weight);
        }
        // 目标体重
        const goalResponse = await API.get("/api/weight/goal");
        if (goalResponse.data && goalResponse.data.goalWeight) {
          setGoalWeight(goalResponse.data.goalWeight);
        }
        // 用户资料
        const profileResponse = await API.get("/api/users/me/profile");
        if (profileResponse.data) {
          if (profileResponse.data.height) setHeight(profileResponse.data.height);
          if (profileResponse.data.age) setAge(profileResponse.data.age);
          setProfileData(profileResponse.data);
        }
      } catch (err) {
        console.error("Error fetching user data:", err);
      }
    };
    fetchUserData();
    fetchSleepData();
  }, [user?.uid]);

  // 个人中心显示控制
  useEffect(() => {
    const savedVisibility = localStorage.getItem("profileInfoVisible");
    if (savedVisibility !== null) {
      setIsProfileVisible(savedVisibility === "true");
    }
  }, []);
  useEffect(() => {
    localStorage.setItem("profileInfoVisible", isProfileVisible.toString());
  }, [isProfileVisible]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setProfileTab(tab);
  };
  const toggleProfileVisibility = () => setIsProfileVisible(!isProfileVisible);

  if (loadingMenstrual) return <div>Loading...</div>;
  if (errorMenstrual) return <div>Error: {errorMenstrual}</div>;

  return (
    <div className={`profile ${activeTab}-theme`}>
      {/* Toggle Button */}
      <div className="profile-toggle-button-container">
        <button onClick={toggleProfileVisibility} className={`toggle-profile-button ${activeTab}-theme`}>
          🎀 {isProfileVisible ? "Hide Personal Center" : "Show Personal Center"}
        </button>
      </div>
      {/* Profile Info Panel */}
      {isProfileVisible && (
        <div className={`profile-info ${activeTab}-theme`}>
          <button onClick={toggleProfileVisibility} className="close-profile-btn" style={{ position: "absolute", top: "10px", right: "10px", background: "none", border: "none", fontSize: "16px", cursor: "pointer" }}>✕</button>
          <h2>🎀 Personal Center</h2>
          <p><strong>Username:</strong> {user?.displayName || "User"}</p>
          <p><strong>Email:</strong> {user?.email}</p>
          <p><strong>Notification settings:</strong> On</p>
          <img src={partfour} alt="avatar" style={{ width: "100px", borderRadius: "50%", marginBottom: "10px" }} />
        </div>
      )}
      {/* Tab Navigation */}
      <div className="health-nav">
        <button onClick={() => handleTabChange("menstrual")} className={activeTab === "menstrual" ? "active" : ""}>🩸 Menstrual Health</button>
        <button onClick={() => handleTabChange("sleep")} className={activeTab === "sleep" ? "active" : ""}>😴 Sleep Health</button>
        <button onClick={() => handleTabChange("weight")} className={activeTab === "weight" ? "active" : ""}>⚖️ Weight Health</button>
      </div>
      {/* Tab Content */}
      <div className="health-content">
        {activeTab === "menstrual" && (
          <MenstrualChart data={menstrualData?.data || []} avgCycleLength={menstrualData?.cycleLength || 28} />
        )}
        {activeTab === "sleep" && (
          <SleepChart showChart={true} data={sleep} onDelete={fetchSleepData} />
        )}
        {activeTab === "weight" && (
          <MealRecommender
            currentWeight={currentWeight}
            goalWeight={goalWeight}
            height={profileData?.height || height}
            age={profileData?.age || age}
            gender={profileData?.gender || "female"}
            activityLevel={profileData?.activityLevel || "moderate"}
          />
        )}
      </div>
    </div>
  );
};

export default Profile;
