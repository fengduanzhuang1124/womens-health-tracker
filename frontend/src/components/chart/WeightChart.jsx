import React from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const weightData = [
  { week: "Week 1", weight: 55 },
  { week: "Week 2", weight: 56 },
  { week: "Week 3", weight: 55.5 },
  { week: "Week 4", weight: 55.8 },
];

const WeightChart = () => {
  return (
    <div className="health-section">
      <h3>⚖️ Weight Trends</h3>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={weightData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="week" />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="weight" stroke="#32CD32" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>

      <div className="health-advice">
        <h4>💡 Weight Management Tips</h4>
        <ul>
          <li>Current BMI: **21.5 (Healthy range)**.</li>
          <li>Stable weight trend, maintain balanced nutrition.</li>
          <li>Regular physical activity helps in weight stability.</li>
        </ul>
      </div>
    </div>
  );
};

export default WeightChart;
