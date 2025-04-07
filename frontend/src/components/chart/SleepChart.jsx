import React, { useEffect, useState } from "react";
import "../../styles/SleepChart.css";
import API from "../../api";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const SleepChart = ({ data, onDelete }) => {
  const [aiAdvice, setAiAdvice] = useState("");

  const sortedData = [...data]
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(-7);

  const averageSleep = (
    sortedData.reduce((sum, d) => sum + d.duration, 0) / sortedData.length
  ).toFixed(1);

  const handleDelete = async (docId) => {
    if (window.confirm("Delete this record?")) {
      try {
        await API.delete(`/api/sleep/${docId}`);
        if (onDelete) onDelete();
      } catch (err) {
        console.error("Delete failed:", err);
        alert("Failed to delete the record.");
      }
    }
  };

  useEffect(() => {
    const fetchTrendAdvice = async () => {
      try {
        const res = await API.post("/api/ai/sleep/trend", {
          records: sortedData.map(({ date, duration }) => ({ date, duration })),
        });
        setAiAdvice(res.data.advice);
      } catch (err) {
        console.error("Failed to fetch AI trend advice", err);
        setAiAdvice("⚠️ Unable to load AI advice.");
      }
    };
    if (sortedData.length > 0) fetchTrendAdvice();
  }, [data]);

  if (!Array.isArray(data) || data.length === 0) {
    return <p>No sleep data to display.</p>;
  }

  return (
    <div className="sleep-ai-layout">
      <div className="chart-left">
        <h3>🕗 Sleep Trends</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={sortedData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="duration" fill="#4B9CD3" />
          </BarChart>
        </ResponsiveContainer>

        <div className="sleep-summary">
          <p>Average sleep: {averageSleep} hrs</p>
          <p>Recommended: 7–9 hrs/night</p>
        </div>

        <div className="sleep-record-list">
          {sortedData.map((record) => (
            <div key={record.id} className="record-item">
              <span>
                {record.date} - {record.duration} hrs
              </span>
              <button onClick={() => handleDelete(record.id ?? "")}>🗑</button>
            </div>
          ))}
        </div>
      </div>

      <div className="ai-right-panel">
        <div className="ai-suggestion-box">
          <h4>
            <span className="ai-icon">🤖</span> AI Suggestion
          </h4>

          <div className="ai-content">
            {aiAdvice.split("\n").map((line, idx) => (
              <p key={idx}>{line}</p>
            ))}
          </div>
        </div>

        <div className="music-recommendation-box">
          <h4>🎵 Music Recommendation</h4>
          <p style={{ color: "#666" }}>
            Coming soon: personalized music suggestions based on your sleep
            pattern.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SleepChart;
