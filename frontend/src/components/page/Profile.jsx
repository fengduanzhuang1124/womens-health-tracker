import React, { useState, useEffect } from "react";
import MenstrualChart from "../chart/MenstrualChart";
import SleepChart from "../chart/SleepChart";
import MealRecommender from "../nutrition/MealRecommender";
import "../../styles/Profile.css";
import { db, auth } from "../../firebase";
import API from "../../api";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import avatarGirl from "../../assets/avatar-girl.png";

const Profile = ({ setProfileTab }) => {
  const [activeTab, setActiveTab] = useState("menstrual");
  const [menstrualData, setMenstrualData] = useState([]);
  const [avgCycleLength, setAvgCycleLength] = useState(28);
  const [sleepData, setSleepData] = useState([]);
  const [weightData, setWeightData] = useState([]);
  const [isProfileVisible, setIsProfileVisible] = useState(true);
  const [currentWeight, setCurrentWeight] = useState(null);
  const [goalWeight, setGoalWeight] = useState(null);
  const [height, setHeight] = useState(165); // height in cm
  const [age, setAge] = useState(30); // default age

  const user = auth.currentUser;

  // Load visibility preference from localStorage on mount
  useEffect(() => {
    const savedVisibility = localStorage.getItem("profileInfoVisible");
    if (savedVisibility !== null) {
      setIsProfileVisible(savedVisibility === "true");
    }
  }, []);

  // Save visibility preference whenever it changes
  useEffect(() => {
    localStorage.setItem("profileInfoVisible", isProfileVisible.toString());
  }, [isProfileVisible]);

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

    const fetchUserData = async () => {
      try {
        // Fetch weight data
        const weightResponse = await API.get("/api/weight/me");
        if (weightResponse.data.weights && weightResponse.data.weights.length > 0) {
          const sortedWeights = [...weightResponse.data.weights].sort((a, b) => 
            new Date(b.date) - new Date(a.date)
          );
          setCurrentWeight(sortedWeights[0].weight);
        }
        
        // Fetch goal weight
        const goalResponse = await API.get("/api/weight/goal");
        if (goalResponse.data && goalResponse.data.goalWeight) {
          setGoalWeight(goalResponse.data.goalWeight);
        }
        
        // Fetch user profile for height and age if available
        const profileResponse = await API.get("/api/users/profile");
        if (profileResponse.data) {
          if (profileResponse.data.height) setHeight(profileResponse.data.height);
          if (profileResponse.data.age) setAge(profileResponse.data.age);
        }
      } catch (err) {
        console.error("Error fetching user data:", err);
      }
    };

    fetchUserData();
    fetchMenstrual();
    fetchSleepData();
  }, [user?.uid]);

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

  const toggleProfileVisibility = () => {
    setIsProfileVisible(!isProfileVisible);
  };

  return (
    <div className={`profile ${activeTab}-theme`}>
      {/* Toggle Button in the upper right */}
      <div className="profile-toggle-button-container">
        <button
          onClick={toggleProfileVisibility}
          className={`toggle-profile-button ${activeTab}-theme`}
        >
          🎀{" "}
          {isProfileVisible ? "Hide Personal Center" : "Show Personal Center"}
        </button>
      </div>

      {/* Fixed position profile info panel */}
      {isProfileVisible && (
        <div className={`profile-info ${activeTab}-theme`}>
          {/* Close button */}
          <button
            onClick={toggleProfileVisibility}
            className="close-profile-btn"
            style={{
              position: "absolute",
              top: "10px",
              right: "10px",
              background: "none",
              border: "none",
              fontSize: "16px",
              cursor: "pointer",
            }}
          >
            ✕
          </button>

          <h2>🎀 Personal Center</h2>
          <p>
            <strong>Username:</strong> {user?.displayName || "User"}
          </p>
          <p>
            <strong>Email:</strong> {user?.email}
          </p>
          <p>
            <strong>Notification settings:</strong> On
          </p>
          <img
            src={avatarGirl}
            alt="avatar"
            style={{
              width: "100px",
              borderRadius: "50%",
              marginBottom: "10px",
            }}
          />
        </div>
      )}

      <div className="health-nav">
        <button
          onClick={() => handleTabChange("menstrual")}
          className={activeTab === "menstrual" ? "active" : ""}
        >
          🩸 Menstrual Health
        </button>
        <button
          onClick={() => handleTabChange("sleep")}
          className={activeTab === "sleep" ? "active" : ""}
        >
          😴 Sleep Health
        </button>
        <button
          onClick={() => handleTabChange("weight")}
          className={activeTab === "weight" ? "active" : ""}
        >
          ⚖️ Weight Health
        </button>
      </div>

      <div className="health-content">
        {activeTab === "menstrual" && (
          <MenstrualChart
            data={menstrualData}
            avgCycleLength={avgCycleLength}
          />
        )}
        {activeTab === "sleep" && (
          <SleepChart
            showChart={true}
            data={sleepData}
            onDelete={fetchSleepData}
          />
        )}
        {activeTab === "weight" && (
          <div className="health-section">
            <h3 className="health-section-title">Weight Management Overview</h3>
            <div className="health-chart">
              <MealRecommender 
                currentWeight={currentWeight || 65} 
                goalWeight={goalWeight || 60}
                height={height}
                age={age}
                gender="female"
                activityLevel="moderate"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
