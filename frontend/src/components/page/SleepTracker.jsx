// SleepTracker.jsx
import React, { useEffect, useState } from "react";
import SleepForm from "../chart/SleepForm";
import SleepChart from "../chart/SleepChart";
import "../../styles/SleepTracker.css";


import API from "../../api";

const SleepTracker = ({ showChart = false }) => {
  const [sleepRecords, setSleepRecords] = useState([]);

  const fetchSleepRecords = async () => {
    try {
      const res = await API.get(`/api/sleep/me`);
      setSleepRecords(res.data);
    } catch (err) {
      console.error("Error fetching sleep data:", err);
    }
  };

  useEffect(() => {
    fetchSleepRecords();
  },[]);

  return (
    <div className="sleep-tracker">
      <div className="tracker-container">
        <div className="form-section">
        <SleepForm onSuccess={fetchSleepRecords} />
        </div>
        { showChart && (
          <div className="chart-section">
          <SleepChart data={sleepRecords}  onDelete={fetchSleepRecords} />
        </div> )}
      </div>
    </div>
  );
};

export default SleepTracker;
