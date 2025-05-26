import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import WeightTrendChart from "../chart/WeightTrendChart";
import API from "../../api";
import "../../styles/WeightTracker.css";
import partthree from "../../assets/partthree.png";
const WeightTracker = () => {
  // States
  const [weights, setWeights] = useState([]);
  const [currentWeight, setCurrentWeight] = useState(null);
  const [initialWeight, setInitialWeight] = useState(null);
  const [goalWeight, setGoalWeight] = useState(null);
  const [newWeight, setNewWeight] = useState("");
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [viewMode, setViewMode] = useState("daily");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [showFoodEntry, setShowFoodEntry] = useState(false);
  const [foodName, setFoodName] = useState("");
  const [foodQuantity, setFoodQuantity] = useState("");
  const [foodEntries, setFoodEntries] = useState([]);
  const [dailyFoods, setDailyFoods] = useState([]);
  
  const [aiAdvice, setAiAdvice] = useState("");
  const [isLoadingAdvice, setIsLoadingAdvice] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  
  // User profile data
  const [height, setHeight] = useState(165);
  const [age, setAge] = useState(30);
  const [gender, setGender] = useState("female");
  const [activityLevel, setActivityLevel] = useState("moderate");
  
  // BMI calculation
  const [bmi, setBmi] = useState(null);
  
  useEffect(() => {
    if (currentWeight) {
      const heightInMeters = height / 100;
      const calculatedBmi = (currentWeight / (heightInMeters * heightInMeters)).toFixed(1);
      setBmi(calculatedBmi);
    }
  }, [currentWeight, height]);
  
  // Fetch weight data
  const fetchWeights = async () => {
    try {
      setLoading(true);
      console.log("Fetching weight data from API...");
      const response = await API.get("/api/weight");
      console.log("Weight API response:", response.data);
      
      if (response.data && Array.isArray(response.data)) {
        setWeights(response.data);
        
        if (response.data.length > 0) {
          setCurrentWeight(response.data[0].weight);
          setInitialWeight(response.data[response.data.length - 1].weight);
          console.log("Current weight set to:", response.data[0].weight);
          console.log("Initial weight set to:", response.data[response.data.length - 1].weight);
        } else {
          console.log("No weight records found in API response");
          loadDemoData();
        }
      } else {
        console.error("Invalid weight data format from API", response.data);
        loadDemoData();
      }
      setError(null);
    } catch (error) {
      console.error("Error fetching weights:", error);
      setError("Failed to fetch weight data");
      loadDemoData();
    } finally {
      setLoading(false);
    }
  };
  
  //  adding demo data to ensure the chart displays correctly
  const loadDemoData = () => {
    console.log("Loading demo weight data for display");
    const today = new Date();
    const demoWeights = [
      {
        id: "demo1",
        weight: 65.5,
        date: format(today, "yyyy-MM-dd")
      },
      {
        id: "demo2",
        weight: 66.2,
        date: format(new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000), "yyyy-MM-dd")
      },
      {
        id: "demo3",
        weight: 67.0,
        date: format(new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000), "yyyy-MM-dd")
      },
      {
        id: "demo4",
        weight: 67.8,
        date: format(new Date(today.getTime() - 21 * 24 * 60 * 60 * 1000), "yyyy-MM-dd")
      }
    ];
    
    setWeights(demoWeights);
    setCurrentWeight(demoWeights[0].weight);
    setInitialWeight(demoWeights[demoWeights.length - 1].weight);
    
    //   setting a goal weight to display the goal line
    if (!goalWeight) {
      setGoalWeight(60);
    }
  };
  
  // Fetch goal weight
  const fetchGoalWeight = async () => {
    try {
      const response = await API.get("/api/users/me/profile");
      setGoalWeight(response.data.goalWeight || null);
    } catch (error) {
      console.error("Error fetching goal weight:", error);
    }
  };
  
  // Fetch today's food records
  const fetchTodaysFoods = async () => {
    try {
      const today = format(new Date(), "yyyy-MM-dd");
      const response = await API.get(`/api/weight/food?date=${today}`);
      
      if (response.data && response.data.length > 0 && response.data[0].foods) {
        setDailyFoods(response.data[0].foods);
      } else {
        setDailyFoods([]);
      }
    } catch (error) {
      console.error("Error fetching today's foods:", error);
      setDailyFoods([]);
    }
  };
  
  // Fetch user profile
  const fetchUserProfile = async () => {
    try {
      const response = await API.get("/api/users/me/profile");
      if (response.data) {
        if (response.data.height) setHeight(response.data.height);
        if (response.data.age) setAge(response.data.age);
        if (response.data.gender) setGender(response.data.gender);
        if (response.data.activityLevel) setActivityLevel(response.data.activityLevel);
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
  };
  
  // Fetch data on component mount
  useEffect(() => {
    console.log("WeightTracker component mounted, fetching data...");
    fetchWeights();
    fetchGoalWeight();
    fetchTodaysFoods();
    fetchUserProfile(); // 获取用户档案
  }, []);
  
  // Add weight record
  const handleAddWeight = async (e) => {
    e.preventDefault();
    
    if (!newWeight || isNaN(newWeight)) {
      alert("Please enter a valid weight");
      return;
    }
    
    try {
      await API.post("/api/weight", {
        weight: parseFloat(newWeight),
        date: selectedDate
      });
      
      setNewWeight("");
      await fetchWeights();
      fetchAIAdvice();
    } catch (error) {
      console.error("Error adding weight:", error);
      alert("Failed to add weight");
    }
  };
  
  // Update goal weight
  const handleUpdateGoal = async (e) => {
    e.preventDefault();
    
    if (!goalWeight || isNaN(goalWeight)) {
      alert("Please enter a valid goal weight");
      return;
    }
    
    try {
      await API.put("/api/weight/goal", {
        goalWeight: parseFloat(goalWeight)
      });
      
      alert("Goal weight updated successfully!");
    } catch (error) {
      console.error("Error updating goal weight:", error);
      alert("Failed to update goal weight");
    }
  };
  
  // Add food
  const handleAddFood = async () => {
    if (!foodName || !foodQuantity) {
      alert("Please enter both food name and quantity");
      return;
    }
    
    try {
      const nutritionResponse = await API.post("/api/weight/food/nutrition", {
        foodName
      });
      
      const newFoodEntry = {
        name: foodName,
        quantity: foodQuantity,
        ...nutritionResponse.data
      };
      
      setFoodEntries([...foodEntries, newFoodEntry]);
      setFoodName("");
      setFoodQuantity("");
    } catch (error) {
      console.error("Error getting nutrition info:", error);
      alert("Failed to get nutrition information");
    }
  };
  
  // Save food records
  const handleSaveDailyFoods = async () => {
    if (foodEntries.length === 0) {
      alert("Please add at least one food item");
      return;
    }
    
    try {
      await API.post("/api/weight/food", {
        foods: foodEntries,
        date: format(new Date(), "yyyy-MM-dd")
      });
      
      setDailyFoods([...foodEntries]);
      setFoodEntries([]);
      setShowFoodEntry(false);
      
      fetchAIAdvice();
    } catch (error) {
      console.error("Error saving food entries:", error);
      alert("Failed to save food entries");
    }
  };
  
  // Get AI advice
  const fetchAIAdvice = async () => {
    setIsLoadingAdvice(true);
    
    try {
      const response = await API.get("/api/weight/advice");
      setAiAdvice(response.data.advice);
    } catch (error) {
      console.error("Error fetching AI advice:", error);
      setAiAdvice("Unable to generate advice at this time. Please try again later.");
    } finally {
      setIsLoadingAdvice(false);
    }
  };
  
  // Filter data based on view mode
  const getFilteredData = () => {
    console.log("getFilteredData called, weights:", weights);
    
    if (weights.length === 0) {
      console.log("No weight data available");
      return [];
    }
    
    if (viewMode === "monthly") {
      const monthlyData = {};
      
      weights.forEach(entry => {
        const monthYear = format(new Date(entry.date), "yyyy-MM");
        
        if (!monthlyData[monthYear]) {
          monthlyData[monthYear] = {
            total: entry.weight,
            count: 1
          };
        } else {
          monthlyData[monthYear].total += entry.weight;
          monthlyData[monthYear].count += 1;
        }
      });
      
      const result = Object.keys(monthlyData).map(monthYear => ({
        date: monthYear,
        weight: (monthlyData[monthYear].total / monthlyData[monthYear].count).toFixed(1)
      }));
      
      console.log("Monthly filtered data:", result);
      return result;
    }
    
    const result = weights.map(entry => ({
      date: format(new Date(entry.date), "yyyy-MM-dd"),
      weight: entry.weight
    }));
    
    console.log("Daily filtered data:", result);
    return result;
  };
  
  // Calculate distance to goal
  const distanceToGoal = goalWeight && currentWeight 
    ? (currentWeight - goalWeight).toFixed(1)
    : null;
  
  // Delete weight record
  const handleDeleteWeight = async (weightId) => {
    if (!weightId) return;
    
    if (!confirm("Are you sure you want to delete this weight record?")) {
      return;
    }
    
    try {
      await API.delete(`/api/weight/${weightId}`);
      await fetchWeights();
    } catch (error) {
      console.error("Error deleting weight record:", error);
      alert("Failed to delete weight record");
    }
  };
  
  // Save profile
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    
    try {
      await API.put("/api/users/profile", {
        height,
        age,
        gender,
        activityLevel
      });
      
      alert("Profile updated successfully!");
      setShowProfileSettings(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Failed to update profile settings");
    }
  };
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="wt-container">
      <div className="wt-header">
        <div className="wt-view-toggle">
          <button 
            className={viewMode === "daily" ? "wt-toggle-btn wt-active" : "wt-toggle-btn"} 
            onClick={() => setViewMode("daily")}
          >
            Daily View
          </button>
          <img src={partthree} alt="decor" className="smallsign" />
          <button 
            className={viewMode === "monthly" ? "wt-toggle-btn wt-active" : "wt-toggle-btn"} 
            onClick={() => setViewMode("monthly")}
          >
            Monthly View
          </button>
        </div>
        
        {/* Stats Row */}
        <div className="wt-stats-card">
          <div className="wt-stats-compact-row">
            <div className="wt-stat-item">
              <span className="wt-stat-icon">⚖️</span>
              <span className="wt-stat-label">Current</span>
              <span className="wt-stat-value">{currentWeight ? `${currentWeight} kg` : "No data"}</span>
            </div>
            <div className="wt-stat-item">
              <span className="wt-stat-icon">🕰️</span>
              <span className="wt-stat-label">Initial</span>
              <span className="wt-stat-value">{initialWeight ? `${initialWeight} kg` : "No data"}</span>
            </div>
            <div className="wt-stat-item">
              <span className="wt-stat-icon">🎯</span>
              <span className="wt-stat-label">Goal</span>
              <span className="wt-stat-value">{goalWeight ? `${goalWeight} kg` : "Not set"}</span>
            </div>
            <div className="wt-stat-item">
              <span className="wt-stat-icon">➡️</span>
              <span className="wt-stat-label">To Goal</span>
              <span className="wt-stat-value">{distanceToGoal ? `${distanceToGoal} kg` : "N/A"}</span>
            </div>
            <div className="wt-stat-item">
              <span className="wt-stat-icon">📊</span>
              <span className="wt-stat-label">BMI</span>
              <span className="wt-stat-value">{bmi || "N/A"}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="wt-content-layout">
        {/* Main section with chart */}
        <div className="wt-main-panel">
          <div className="wt-chart-section">
            <WeightTrendChart  key={showHistory + '-' + showProfileSettings} data={getFilteredData()} viewMode={viewMode} goalWeight={parseFloat(goalWeight)} />
          </div>
          
          {/* Input Forms Row */}
          <div className="wt-input-row">
            <div className="wt-form-group">
              <h4>⚖️ Add Weight</h4>
              <form onSubmit={handleAddWeight} className="wt-form">
                <input
                  type="number"
                  step="0.1"
                  value={newWeight}
                  onChange={(e) => setNewWeight(e.target.value)}
                  placeholder="Enter weight (kg)"
                  className="wt-input"
                  required
                />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="wt-input wt-date-input"
                />
                <button type="submit" className="wt-button wt-save-btn">Save</button>
              </form>
            </div>
            
            <div className="wt-form-group">
              <h4>🎯 Set Goal</h4>
              <form onSubmit={handleUpdateGoal} className="wt-form">
                <input
                  type="number"
                  step="0.1"
                  value={goalWeight || ""}
                  onChange={(e) => setGoalWeight(e.target.value)}
                  placeholder="Enter goal weight (kg)"
                  className="wt-input"
                  required
                />
                <button type="submit" className="wt-button wt-goal-btn">Update</button>
              </form>
            </div>
            
            <div className="wt-toggle-history">
              <button 
                className="wt-button wt-history-btn"
                onClick={() => setShowHistory(!showHistory)}
              >
                {showHistory ? "Hide History" : "Show History"}
              </button>
              <button 
                className="wt-button wt-profile-btn"
                onClick={() => setShowProfileSettings(!showProfileSettings)}
              >
                {showProfileSettings ? "Hide Profile" : "Profile Settings"}
              </button>
            </div>
          </div>
          
          {/* Weight History (Collapsible) */}
          {showHistory && weights.length > 0 && (
            <div className="wt-weight-records">
              <h4 className="wt-section-title">Weight History</h4>
              <div className="wt-records-list">
                {weights.slice(0, 5).map((record) => (
                  <div key={record.id} className="wt-record-item">
                    <span className="wt-record-date">{format(new Date(record.date), "yyyy-MM-dd")}</span>
                    <span className="wt-record-weight">{record.weight} kg</span>
                    <button 
                      onClick={() => handleDeleteWeight(record.id)}
                      className="wt-button wt-delete-btn"
                      title="Delete record"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Profile Settings (Collapsible) */}
          {showProfileSettings && (
            <div className="wt-profile-settings">
              <h4 className="wt-section-title">Profile Settings</h4>
              <form onSubmit={handleSaveProfile} className="wt-profile-form">
                <div className="wt-profile-form-row">
                  <div className="wt-profile-form-group">
                    <label>Height (cm)</label>
                    <input
                      type="number"
                      value={height}
                      onChange={(e) => setHeight(Number(e.target.value))}
                      placeholder="Height in cm"
                      className="wt-input"
                      required
                    />
                  </div>
                  
                  <div className="wt-profile-form-group">
                    <label>Age</label>
                    <input
                      type="number"
                      value={age}
                      onChange={(e) => setAge(Number(e.target.value))}
                      placeholder="Age in years"
                      className="wt-input"
                      required
                    />
                  </div>
                </div>
                
                <div className="wt-profile-form-row">
                  <div className="wt-profile-form-group">
                    <label>Gender</label>
                    <select 
                      value={gender} 
                      onChange={(e) => setGender(e.target.value)}
                      className="wt-input"
                      required
                    >
                      <option value="female">Female</option>
                      <option value="male">Male</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  
                  <div className="wt-profile-form-group">
                    <label>Activity Level</label>
                    <select 
                      value={activityLevel} 
                      onChange={(e) => setActivityLevel(e.target.value)}
                      className="wt-input"
                      required
                    >
                      <option value="sedentary">Sedentary (little or no exercise)</option>
                      <option value="light">Light (light exercise 1-3 days/week)</option>
                      <option value="moderate">Moderate (moderate exercise 3-5 days/week)</option>
                      <option value="active">Active (hard exercise 6-7 days/week)</option>
                      <option value="veryActive">Very Active (very hard exercise & physical job)</option>
                    </select>
                  </div>
                </div>
                
                <button type="submit" className="wt-button wt-save-btn">Save Profile</button>
              </form>
            </div>
          )}
        </div>
        
        {/* Side panel with food tracking */}
        <div className="wt-side-panel">
          <div className="wt-food-card-mini">
            <h3 className="wt-card-title-mini">🍽️ Food</h3>
            
            {!showFoodEntry ? (
              <div className="wt-daily-foods-mini">
                {dailyFoods.length > 0 ? (
                  <div className="wt-food-list-mini">
                    {dailyFoods.map((food, index) => (
                      <div key={index} className="wt-food-item-mini">
                        {food.name} ({food.calories} cal)
                        <span className={food.isHealthy ? "wt-mini-tag wt-healthy" : "wt-mini-tag wt-unhealthy"}>
                          {food.isHealthy ? "✓" : "⚠"}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="wt-no-data-mini">No foods logged</p>
                )}
                <button onClick={() => setShowFoodEntry(true)} className="wt-button wt-food-btn-mini">
                  + Add
                </button>
              </div>
            ) : (
              <div className="wt-food-entry-form">
                <div className="wt-food-input-sticky">
                  <input
                    type="text"
                    value={foodName}
                    onChange={(e) => setFoodName(e.target.value)}
                    placeholder="Food name (e.g., Apple)"
                    className="wt-input"
                  />
                  <input
                    type="text"
                    value={foodQuantity}
                    onChange={(e) => setFoodQuantity(e.target.value)}
                    placeholder="Quantity (e.g., 1 medium)"
                    className="wt-input"
                  />
                  <button onClick={handleAddFood} className="wt-button">Add</button>
                </div>
                
                <div className="wt-entries-container">
                  {foodEntries.length > 0 ? (
                    <div className="wt-food-entries">
                      <h5>Added Items:</h5>
                      <ul className="wt-entry-list">
                        {foodEntries.map((entry, index) => (
                          <li key={index} className="wt-entry-item">
                            {entry.name} ({entry.quantity}) - {entry.calories} kcal
                            {entry.isHealthy !== undefined && (
                              <span className={entry.isHealthy ? "wt-healthy" : "wt-unhealthy"}>
                                {entry.isHealthy ? " (Healthy)" : " (Less Healthy)"}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="wt-no-data-mini">No items added yet</p>
                  )}
                </div>
                
                <div className="wt-entry-actions">
                  <button onClick={handleSaveDailyFoods} className="wt-button" disabled={foodEntries.length === 0}>Save Food Log</button>
                  <button 
                    className="wt-button wt-cancel-btn"
                    onClick={() => {
                      setFoodEntries([]);
                      setShowFoodEntry(false);
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
          
          <div className="wt-advice-card">
            <h3 className="wt-card-title">💡 AI Health Advice</h3>
            {isLoadingAdvice ? (
              <div className="wt-loading-container">
                <div className="wt-loading-spinner"></div>
                <p className="wt-loading-message">Generating advice...</p>
              </div>
            ) : (
              <div className="wt-advice-content">
                {aiAdvice ? (
                  aiAdvice.split('\n').map((line, index) => (
                    <p key={index}>{line}</p>
                  ))
                ) : (
                  <p>Click below for personalized advice based on your data.</p>
                )}
              </div>
            )}
            <button 
              onClick={fetchAIAdvice} 
              disabled={isLoadingAdvice}
              className="wt-button wt-advice-btn"
            >
              🏃‍♂️ {isLoadingAdvice ? "Generating..." : "Get AI Advice"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeightTracker;