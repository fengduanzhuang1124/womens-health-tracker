// SleepForm.jsx
import React, { useState } from "react";
import API from "../../api";
import DatePicker, { registerLocale } from "react-datepicker";
import enGB from "date-fns/locale/en-GB";
import "react-datepicker/dist/react-datepicker.css";
import "../../styles/SleepForm.css";
import { PieChart, Pie, Cell } from "recharts";
registerLocale("en-GB", enGB);

const SleepForm = ({ onSuccess }) => {
  const [sleepTime, setSleepTime] = useState("");
  const [wakeTime, setWakeTime] = useState("");
  const [wakeCount, setWakeCount] = useState(0);
  const [activity, setActivity] = useState("");
  const [dreaming, setDreaming] = useState("no");
  const [sleepLatency, setSleepLatency] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isDuplicateDate, setIsDuplicateDate] = useState(false);
  const [invalidTimeRange, setInvalidTimeRange] = useState(false);

  const [analysis, setAnalysis] = useState(() => {
    const saved = localStorage.getItem("sleep_analysis");
    return saved ? JSON.parse(saved) : null;
  });
  const [aiAdvice, setAiAdvice] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!sleepTime || !wakeTime) {
      alert("Please fill in all required fields");
      return;
    }

    const sleep = new Date(sleepTime);
    const wake = new Date(wakeTime);
    const duration = Math.round((wake - sleep) / (1000 * 60 * 60) * 10) / 10;

    const deepSleep = Math.max(1.2, duration * 0.2);
    const effectiveSleep = Math.max(0, duration - wakeCount * 0.15 - sleepLatency / 60);
    const deepRatio = duration > 0 ? ((deepSleep / duration) * 100).toFixed(1) : 0;
    const sleepScore = Math.max(
      0,
      Math.min(
        100,
        100 - wakeCount * 5 - sleepLatency * 0.5 - (dreaming === "yes" ? 3 : 0)
      )
    );

    const newAnalysis = {
      duration,
      deepSleep: deepSleep.toFixed(1),
      effectiveSleep: effectiveSleep.toFixed(1),
      deepRatio,
      wakeCount,
      sleepLatency,
      sleepScore,
      dreaming,
    };

    setAnalysis(newAnalysis);
    localStorage.setItem("sleep_analysis", JSON.stringify(newAnalysis));

    try {
      const res = await API.post("/api/ai/sleep/daily", {
        duration,
        deepSleep,
        effectiveSleep,
        latency: sleepLatency,
        wakeCount,
        dreaming,
        activity,
      });
      console.log("AI returned:", res.data); 
      setAiAdvice(res.data.advice);
    } catch (err) {
      setAiAdvice("⚠️ Failed to load AI suggestion.");
      console.error("AI advice error:", err);
    }

    setLoading(true);
    try {
      await API.post("/api/sleep", {
        sleepTime: sleep.toISOString(),
        wakeTime: wake.toISOString(),
        wakeCount: parseInt(wakeCount, 10),
        activity,
        duration,
        sleepLatency,
        dreaming,
        date: sleep.toISOString().split("T")[0],
      });
      alert("Sleep record saved!");
      setSleepTime("");
      setWakeTime("");
      setWakeCount(0);
      setSleepLatency(0);
      setActivity("");
      setDreaming("no");
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error("Failed to save sleep record:", err);
      alert("Error saving data");
    } finally {
      setLoading(false);
    }
  };

  const scoreData = [
    { name: "Score", value: analysis ? analysis.sleepScore : 0 },
    { name: "Rest", value: analysis ? 100 - analysis.sleepScore : 100 },
  ];
  const COLORS = ["#FFB6C1", "#ffe0e0"];
  const getScoreStyle = (score) => {
    if (score >= 81) return "great-score";
    if (score >= 60) return "good-score";
    return "low-score";
  };

  return (
    <div className="sleep-form-layout-grid">
      <form className="sleep-form" onSubmit={handleSubmit}>
        <h3>🛌 Record Sleep</h3>

        <label>Sleep Time:</label>
        <DatePicker
          selected={sleepTime}
          
          onChange={async (date) => 
          {
            setSleepTime(date);
            if (date) {
              const formattedDate = date.toISOString().split("T")[0];
              try {
                const res = await API.get("/api/sleep/me");
                const exists = res.data.some(record => record.date === formattedDate);
                setIsDuplicateDate(exists);
                if (exists) {
                  console.log("Duplicate sleep date selected.");
                }
              } catch (err) {
                console.error("Failed to check existing sleep records", err);
              }
            }
            if(wakeTime && date && wakeTime<date){
              setInvalidTimeRange(true);
            }else{
              setInvalidTimeRange(false);
            }
          }}
          showTimeSelect
          timeIntervals={1}
          dateFormat="Pp"
          placeholderText="Select sleep time"
          locale="en-GB"
        />
  
{isDuplicateDate && (
  <div className="duplicate-warning">
    <span className="emoji">😴💤</span>
    You’ve already added a sleep record for this date.
  </div>
)}
{invalidTimeRange && (
  <div className="duplicate-warning">
    <span className="emoji">⏰</span>
    Wake time cannot be earlier than sleep time.
  </div>
)}
        <label>Wake Time:</label>
        <DatePicker
          selected={wakeTime}
          onChange={(date) => {
            setWakeTime(date)
            if (sleepTime && date < sleepTime) {
              setInvalidTimeRange(true);
            } else {
              setInvalidTimeRange(false);
            }
 
          }}

          showTimeSelect
          timeIntervals={1}
          dateFormat="Pp"
          placeholderText="Select wake time"
          locale="en-GB"
        />

        <label>Wake Ups (times):</label>
        <input
          className="input-box"
          type="number"
          value={wakeCount}
          onChange={(e) => setWakeCount(e.target.value)}
          min={0}
        />

        <label>Sleep Latency (minutes):</label>
        <input
          className="input-box"
          type="number"
          value={sleepLatency}
          onChange={(e) => setSleepLatency(e.target.value)}
          min={0}
        />

        <label>Pre-sleep Activity:</label>
        <input
          className="input-box"
          type="text"
          value={activity}
          onChange={(e) => setActivity(e.target.value)}
          placeholder="e.g. scrolling phone"
        />

        <label>Did you dream?</label>
        <select
          className="dream-select"
          value={dreaming}
          onChange={(e) => setDreaming(e.target.value)}
        >
          <option value="no">No</option>
          <option value="yes">Yes</option>
        </select>

        <button type="submit" disabled={loading  || isDuplicateDate || invalidTimeRange}>
          {loading ? "Saving..." : "Save Record"}
        </button>
      </form>

      <div className="sleep-analysis-card">
        <h4>🧠 Sleep Analysis</h4>
        {analysis ? (
          <>
            <div className={`score-ring ${getScoreStyle(analysis.sleepScore)}`}>
              <PieChart width={100} height={100}>
                <Pie
                  data={scoreData}
                  cx="50%"
                  cy="50%"
                  innerRadius={30}
                  outerRadius={40}
                  startAngle={90}
                  endAngle={-270}
                  dataKey="value"
                >
                  {scoreData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
              <div className="score-text">{analysis.sleepScore}</div>
            </div>

            <div className="sleep-stats">
              <p><strong>🕗 Total Sleep:</strong> {analysis.duration} hrs</p>
              <p><strong>🌙 Deep Sleep:</strong> {analysis.deepSleep} hrs</p>
              <p><strong>💤 Effective Sleep:</strong> {analysis.effectiveSleep} hrs</p>
              <p><strong>📉 Deep Sleep Ratio:</strong> {analysis.deepRatio}%</p>
              <p><strong>🚨 Wake Ups:</strong> {analysis.wakeCount} times</p>
              <p><strong>⏱️ Sleep Latency:</strong> {analysis.sleepLatency} min</p>
              <p><strong>😴 Dreamed:</strong> {analysis.dreaming === "yes" ? "Yes" : "No"}</p>
            </div>
            {aiAdvice && (
  <div className="ai-advice-box">
  <h5><span className="bouncing-icon">🤖</span> AI Suggestion</h5>
    {aiAdvice.split('\n').map((line, idx) => (
      <p key={idx}>{line}</p>
    ))}
  </div>
)}

          </>
        ) : (
          <p>Fill in the form and submit to get your sleep report.</p>
        )}
      </div>
    </div>
  );
};

export default SleepForm;
