// SleepChart.jsx
import React from "react";
import "../../styles/SleepChart.css";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const SleepChart = ({ data }) => {
  if (!Array.isArray(data) || data.length === 0) {
    return <p>No sleep data to display.</p>;
  }

  // 格式化数据（只显示最近7天）
  const sortedData = [...data]
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(-7)
    .map((d) => ({
      date: d.date,
      hours: d.duration,
    }));

  const averageSleep = (
    sortedData.reduce((sum, d) => sum + d.hours, 0) / sortedData.length
  ).toFixed(1);

  return (
    <div className="sleep-chart">
      <h3>🕗 Sleep Trends</h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={sortedData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="hours" fill="#4B9CD3" />
        </BarChart>
      </ResponsiveContainer>
      <div className="sleep-summary">
        <p>Average sleep: {averageSleep} hrs</p>
        <p>Recommended: 7–9 hrs/night</p>
      </div>
    </div>
  );
};

export default SleepChart;
