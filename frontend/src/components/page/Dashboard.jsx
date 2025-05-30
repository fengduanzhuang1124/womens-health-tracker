import React, { useState, useEffect, lazy, Suspense } from "react";
import { auth } from "../../firebase";
import { useNavigate } from "react-router-dom";
import "../../styles/Dashboard.css";
import headerDecor from "../../assets/avatar-girl.gif";


const MenstrualTracker = lazy(() => import("./MenstrualTracker"));
const SleepTracker = lazy(() => import("./SleepTracker"));
const WeightTracker = lazy(() => import("./weightTracker"));
const Profile = lazy(() => import("./Profile"));

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("menstrual");
  const [profileTab, setProfileTab] = useState("menstrual");
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (!currentUser) {
        navigate("/");
      } else {
        setUser(currentUser);
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const effectiveTheme = activeTab === "profile" ? profileTab : activeTab;

  useEffect(() => {
    document.body.className = `${effectiveTheme}-theme-body`;
    return () => {
      document.body.className = "";
    };
  }, [effectiveTheme]);

  const renderContent = () => {
    return (
      <Suspense fallback={<div className="loading">Loading...</div>}>
        {activeTab === "menstrual" && <MenstrualTracker key="menstrual" />}
        {activeTab === "sleep" && <SleepTracker key="sleep" showChart={false} />}
        {activeTab === "weight" && <WeightTracker key="weight" />}
        {activeTab === "profile" && (
          <Profile key="profile" themeColor={effectiveTheme} setProfileTab={setProfileTab} />
        )}
      </Suspense>
    );
  };

  return (
    <div className={`dashboard ${effectiveTheme}-theme`}>
      <img src={headerDecor} alt="decor" className="header-decor" />
      <h2 className={`dashboard-title ${effectiveTheme}-theme`}>
        Welcome to your health inn!
      </h2>
      
      {user ? (
        <>
          <p className="welcome-text">Hi, {user.email}!</p>
          <div className={`nav-bar ${effectiveTheme}-theme`}>
            <button
              onClick={() => setActiveTab("menstrual")}
              className={activeTab === "menstrual" ? "active" : ""}
            >
              Menstrual record
            </button>
            <button
              onClick={() => setActiveTab("sleep")}
              className={activeTab === "sleep" ? "active" : ""}
            >
              Sleep record
            </button>
            <button
              onClick={() => setActiveTab("weight")}
              className={activeTab === "weight" ? "active" : ""}
            >
              Weight record
            </button>
            <button
              onClick={() => setActiveTab("profile")}
              className={activeTab === "profile" ? "active" : ""}
            >
              Personal center
            </button>
          </div>

          <div className="content">{renderContent()}</div>

          <button
            className="logout"
            onClick={() => auth.signOut().then(() => navigate("/"))}
          >
            Logout
          </button>
        </>
      ) : (
        <p>Loading user data...</p>
      )}
    </div>
  );
};

export default Dashboard;
