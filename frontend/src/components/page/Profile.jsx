import React, { useState, useEffect } from "react";
import MenstrualChart from "../chart/MenstrualChart";
import SleepChart from "../chart/SleepChart";
import MealRecommender from "../nutrition/MealRecommender";
import "../../styles/Profile.css";
import { db, auth } from "../../firebase";
import API from "../../api";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import avatarGirl from "../../assets/avatar-girl.png";
import useDataCache from "../../hooks/useDataCache";

const Profile = ({ setProfileTab }) => {
  const [activeTab, setActiveTab] = useState("period");
  const [isProfileVisible, setIsProfileVisible] = useState(false);
  const [weights, setWeights] = useState([]);
  const [sleep, setSleep] = useState([]);
  const [currentWeight, setCurrentWeight] = useState(null);
  const [initialWeight, setInitialWeight] = useState(null);
  const [goalWeight, setGoalWeight] = useState(null);
  const [periods, setPeriods] = useState([]);
  const [profileData, setProfileData] = useState(null);
  const [avgCycleLength, setAvgCycleLength] = useState(28);
  const [height, setHeight] = useState(165); // height in cm
  const [age, setAge] = useState(30); // default age
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    age: "",
    height: "",
    weight: "",
    goalWeight: "",
    activityLevel: "moderate",
    gender: "female"
  });

  const user = auth.currentUser;

  const { data: menstrualData, loading: loadingMenstrual, error: errorMenstrual, refresh: refreshMenstrual } = useDataCache(
    `menstrual-data-${user?.uid}`,
    async () => {
      const res = await API.get("/api/menstrual/me");
      return res.data;
    }
  );

  const { data: userData, loading: loadingUser } = useDataCache(
    `user-profile-${user?.uid}`,
    async () => {
      const res = await API.get("/api/users/me/profile");
      return res.data;
    }
  );

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

    const fetchUserData = async () => {
      try {
        // Fetch weight data
        const weightResponse = await API.get("/api/weight");
        if (weightResponse.data && weightResponse.data.length > 0) {
          const sortedWeights = [...weightResponse.data].sort((a, b) => 
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

  const fetchSleepData = async () => {
    try {
      const res = await API.get(`/api/sleep/me`);
      setSleep(res.data);
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

  // Fetch user profile data
  const fetchProfileData = async () => {
    try {
      const response = await API.get("/api/users/me/profile");
      if (response.data) {
        setProfileData(response.data);
      }
    } catch (error) {
      console.error("Error fetching profile data:", error);
    }
  };

  const fetchWeights = async () => {
    try {
      const response = await API.get("/api/weight");
      setWeights(response.data);
    } catch (error) {
      console.error("Error fetching weights:", error);
    }
  };

  // 添加获取目标体重的方法
  const fetchGoalWeight = async () => {
    try {
      const response = await API.get("/api/weight/goal");
      if (response.data && response.data.goalWeight) {
        setGoalWeight(response.data.goalWeight);
      }
    } catch (error) {
      console.error("Error fetching goal weight:", error);
    }
  };

  // 添加获取经期数据的方法
  const fetchUserPeriods = async () => {
    try {
      if (!user?.uid) return;
      
      const res = await API.get("/api/menstrual/me");
      if (res.data && res.data.data) {
        setPeriods(res.data.data);
        
        if (res.data.cycleLength) {
          setAvgCycleLength(res.data.cycleLength);
        }
      }
    } catch (error) {
      console.error("Error fetching menstrual data:", error);
    }
  };

  // Fetch data on component mount
  useEffect(() => {
    if (user) {
      fetchWeights();
      fetchGoalWeight();
      fetchSleepData();
      fetchUserPeriods();
      fetchProfileData();
    }
  }, [user]);

  // 当用户数据加载完成时，更新表单数据
  useEffect(() => {
    if (userData) {
      setFormData({
        name: userData.name || "",
        age: userData.age || "",
        height: userData.height || "",
        weight: userData.weight || "",
        goalWeight: userData.goalWeight || "",
        activityLevel: userData.activityLevel || "moderate",
        gender: userData.gender || "female"
      });
    }
  }, [userData]);

  // 处理表单提交
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await API.put("/api/users/profile", formData);
      setIsEditing(false);
      // 触发数据刷新
      refreshMenstrual();
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Failed to update profile");
    }
  };

  if (loadingMenstrual || loadingUser) return <div>Loading...</div>;
  if (errorMenstrual) return <div>Error: {errorMenstrual}</div>;

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
            data={sleep}
            onDelete={fetchSleepData}
          />
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
