// SleepTracker.jsx
import React, { useEffect, useState } from "react";
import SleepForm from "../chart/SleepForm";
// import SleepChart from "../chart/SleepChart";
import "../../styles/SleepTracker.css";


import API from "../../api";

const SleepTracker = ({ userId }) => {
  const [ setSleepRecords] = useState([]);

  const fetchSleepRecords = async () => {
    try {
      const res = await API.get(`/api/sleep/${userId}`);
      setSleepRecords(res.data);
    } catch (err) {
      console.error("Error fetching sleep data:", err);
    }
  };

  useEffect(() => {
    if (userId) fetchSleepRecords();
  }, [userId]);

  return (
    <div className="sleep-tracker">
      <div className="tracker-container">
        <div className="form-section">
        <SleepForm userId={userId} onSuccess={fetchSleepRecords} />
        </div>
        {/* <div className="chart-section">
          <SleepChart data={sleepRecords} />
        </div> */}
      </div>
    </div>
  );
};

export default SleepTracker;
