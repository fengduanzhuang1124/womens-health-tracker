import React, { useEffect, useState } from "react";
import API from "../../api";
import cup from "../../assets/cup.png";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const MenstrualChart = ({ data, avgCycleLength  }) => {

 
  const validData = Array.isArray(data)
  ? data
      .filter(
        (item) =>
          item &&
          typeof item.duration === "number" &&
          !isNaN(item.duration) &&
          item.startDate 
      )
      .map((item) => ({
        ...item,
        month: new Date(item.startDate).toLocaleDateString("en-GB", {
          year: "numeric",
          month: "short",
          day: "numeric",
        }),
      }))
  : [];
    

  if (validData.length === 0) {
    return (
      <div className="health-section">
        <h3>📊 Menstrual Duration Trends</h3>
        <p>No valid data to display.</p>
      </div>
    );
  }

  const averageDuration = Math.round(
    validData.reduce((sum, d) => sum + d.duration, 0) / validData.length
  );
  const sortedData = [...validData].sort((a, b) =>
    new Date(a.month) < new Date(b.month) ? -1 : 1
  );

  let totalCycleGap = 0;
  for (let i = 0; i < sortedData.length - 1; i++) {
    const currDate = new Date(sortedData[i + 1].month);
    const prevDate = new Date(sortedData[i].month);
    const gap = Math.abs(currDate - prevDate) / (1000 * 60 * 60 * 24);
    totalCycleGap += gap;
  }

  // const avgCycleLength =
  // Math.round(
  //   validData.reduce((sum, d) => sum + (d.cycleLength || 28), 0) / validData.length
  // );
  // get health information
  // const durationTips =
  //   durationAdvice.find((d) => d.condition(averageDuration))?.tips || [];
  // const cycleTips =
  //   cycleAdvice.find((c) => c.condition(avgCycleLength))?.tips || [];

  // const allTips = [...durationTips, ...cycleTips];

  const [aiAdvice, setAiAdvice]= useState("Generating AI suggestion.....")
 
    useEffect(() => {
      if (validData.length > 0) {
        API.post("/api/ai-advice", {
          cycle: avgCycleLength,
          duration: averageDuration
        }).then(res => setAiAdvice(res.data.advice || "No advice available."))
        .catch(() => setAiAdvice("Failed to get AI advice."));
      }
    }, [avgCycleLength, averageDuration]);
  return (
    <div className="health-section">
      <h3><img src={cup} alt="decor" className="smallsign" />  Menstrual Duration Trends</h3>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={validData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="duration"
            stroke="#ff69b4"
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="health-advice-row">
  <div className="health-tips">
    <h4>💡 Health Tips</h4>
    <ul>
      <li>Average period duration: {averageDuration} days</li>
      <li>Average cycle length: {avgCycleLength} days</li>
      {/* {allTips.map((tip, idx) => (
        <li key={idx}>{tip}</li>
      ))} */}
    </ul>
  </div>

  <div className="ai-suggestion">
    <h4>🤖 AI Suggestion</h4>
    <p>{aiAdvice}</p>
  </div>
</div>
</div>
  );
};

export default MenstrualChart;
