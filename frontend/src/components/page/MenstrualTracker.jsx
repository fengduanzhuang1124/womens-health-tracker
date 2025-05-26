import React, { useState, useEffect } from "react";
// import axios from "axios";
import API from "../../api";
import { db } from "../../firebase";
//import { collection, query, orderBy, getDocs } from "firebase/firestore";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "../../styles/MenstrualTracker.css";
import moment from "moment";
import cute from "../../assets/cute.png";
import moon from "../../assets/moon.png";
import catsmeil from "../../assets/catsmeil.png";
import cup from "../../assets/cup.png";
moment.locale("en-gb");

const MenstrualTracker = () => {
  const [nextPeriodDays, setNextPeriodDays] = useState(null);
  const [cycleLength, setCycleLength] = useState(28);
  const [calendarData, setCalendarData] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [periodHistory, setPeriodHistory] = useState([]);
  const [tempStartDate, setTempStartDate] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Get data when the component loads
  useEffect(() => {
    fetchMenstrualData();
  }, []);

  // get data from Firestore
  const fetchMenstrualData = async () => {
    try {
      setLoading(true);
      const res = await API.get("/api/menstrual/me");
      const { data, calendarData, nextPeriodDays, cycleLength } = res.data;

      setPeriodHistory(data);
      setCalendarData(calendarData);
      setNextPeriodDays(nextPeriodDays);
      setCycleLength(cycleLength);

      // Chart transform data
      const chartPoints = data.map((period) => ({
        month: new Date(period.startDate).toLocaleDateString("en-GB", {
          year: "numeric",
          month: "short",
          day: "numeric",
        }),
        duration: period.duration || 0,
        cycleLength: period.cycleLength || cycleLength,
      }));
      setChartData(chartPoints);
      setError(null);
    } catch (error) {
      console.error("Failed to fetch menstrual data:", error);
      setError("Failed to fetch menstrual data");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading menstrual data...</div>;
  }

  if (error) {
    return (
      <div className="error">
        Error loading data. Please try again.
        <button onClick={fetchMenstrualData}>Retry</button>
      </div>
    );
  }

  // Handling Calendar Clicks
  const handleCalendarClick = (date) => {
    setSelectedDate(date);
  };

  // Click "Start Period"
  const handleStartPeriod = () => {
    setTempStartDate(selectedDate);
    alert(`Period start date selected：${selectedDate.toDateString()}`);
  };

  // Click "end of period" => send start and end dates to backend
  const handleEndPeriod = async () => {
    if (!tempStartDate) {
      alert("Please record the date your period starts!");
      return;
    }
    if (selectedDate < tempStartDate) {
      alert("End date cannot be earlier than start date!");
      return;
    }

    try {
      // Call the backend interface (example: POST /api/menstrualData）
      await API.post("/api/menstrual", {
        startDate: tempStartDate,
        endDate: selectedDate,
        flowIntensity: "medium",
        symptoms: [],
      });

      alert("Period data saved!");
      setTempStartDate(null);
      fetchMenstrualData();
    } catch (error) {
      console.error("Error saving period data:", error);
      alert(
        "Failed to save, please check the backend service or network connection"
      );
    }
  };
  const handleDeletePeriod = async (recordId) => {
    console.log("Delete button clicked, recordId:", recordId);
    if (!recordId) return;

    const confirmDelete = window.confirm(
      "Are you sure you want to delete this menstrual period record?"
    );
    if (!confirmDelete) return;

    try {
      // await API.delete(`/api/menstrual/${userId}/${recordId}`);

      await API.delete(`/api/menstrual/${recordId}`);
      alert("Menstrual record deleted!");
      fetchMenstrualData();
    } catch (error) {
      console.error("Deletion failed:", error);
      alert("Deletion failed, please check the network or backend service");
    }
  };
  console.log("📊 chartData:", chartData);

  return (
    <div className="menstrual-tracker">
      <div className="tracker-container">
        {/* calender */}
        <div className="calendar-section">
          <h3><img src={cup} alt="decor" className="smallsign" /> Menstrual Calendar</h3>
          <Calendar
            locale="en-US"
            onClickDay={handleCalendarClick}
            value={selectedDate}
            tileClassName={({ date, view }) => {
              if (view === "month") {
                let matchedDay = calendarData.find(
                  (entry) =>
                    moment(entry.date).format("YYYY-MM-DD") ===
                    moment(date).format("YYYY-MM-DD")
                );
                if (matchedDay) {
                  if (matchedDay.type === "past") return "past-period";
                  if (matchedDay.type === "predicted")
                    return "predicted-period";
                  if (matchedDay.type === "ovulation")
                    return "ovulation-period";
                }
              }
              return null;
            }}
          />
          {/* <div className="selected-date">
            <strong>Selected Date:</strong> {selectedDate.toDateString()}
          </div> */}
          <div className="period-buttons">
            <button className="period-btn start" onClick={handleStartPeriod}>
              {" "}
              <img src={cute} alt="cute" className="cute-icon" />
              Start time
            </button>
            <button className="period-btn end" onClick={handleEndPeriod}>
              {" "}
              <img src={cute} alt="cute" className="cute-icon" />
              End time
            </button>
          </div>
        </div>

        {/*listroy record */}
        <div className="history-section">
          <h3>Menstrual Record</h3>
          <div className="countdown">
            <img src={catsmeil} alt="cat smile" className="catsmeil-icon" />
            <span className="countdown-text">Next Period in:</span>
            <span className="days">
              {nextPeriodDays !== null ? nextPeriodDays : "--"}
            </span>
            <span className="countdown-days-text">days</span>
          </div>

          <h4>Average Cycle: {cycleLength} days</h4>

          <div className="history-list">
            {periodHistory.length > 0 ? (
              periodHistory.map((period, index) => (
                <div key={index} className="history-item">
                  <img src={moon} alt="moon" className="moon-icon" />
                  <div className="record-info">
                    <span className="record-dates">
                      <strong>
                        {new Date(period.startDate).toLocaleDateString()}
                      </strong>
                      {" - "}
                      {new Date(period.endDate).toLocaleDateString()} (
                      {period.duration || "?"} days)
                    </span>
                  </div>
                  <button
                    className="delete-btn"
                    onClick={() => handleDeletePeriod(period.id)}
                  >
                    ❌
                  </button>
                </div>
              ))
            ) : (
              <p>No recorded data</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MenstrualTracker;
