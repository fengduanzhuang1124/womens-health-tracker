// SleepTracker.jsx
import React, { useEffect, useState } from "react";
import SleepForm from "../chart/SleepForm";
import SleepChart from "../chart/SleepChart";
import "../../styles/SleepTracker.css";
import API from "../../api";

const SleepTracker = ({ showChart = false }) => {
  const [sleepRecords, setSleepRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSleepRecords = async () => {
    try {
      setLoading(true);
      const res = await API.get(`/api/sleep/me`);
      setSleepRecords(res.data);
      setError(null);
    } catch (err) {
      console.error("Error fetching sleep data:", err);
      setError("Failed to fetch sleep data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSleepRecords();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="sleep-tracker">
      <div className="tracker-container">
        <div className="form-section">
          <SleepForm onSuccess={fetchSleepRecords} />
        </div>
        {showChart && (
          <div className="chart-section">
            <SleepChart data={sleepRecords} onDelete={fetchSleepRecords} />
          </div>
        )}
      </div>
    </div>
  );
};

export default SleepTracker;
