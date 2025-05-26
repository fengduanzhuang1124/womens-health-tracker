import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import API from '../../api';
import '../../styles/MealRecommender.css';
import NutritionTipsPopup from './NutritionTipsPopup';

// Food icon mapping
const FOOD_ICONS = {
  fruit: '🍎',
  vegetable: '🥦',
  grain: '🍚',
  protein: '🍗',
  dairy: '🥛',
  snack: '🥨',
  dessert: '🍰',
  breakfast: '🍳',
  lunch: '🥪',
  dinner: '🍲',
  default: '🍽️'
};

// Get icon based on food type
const getFoodIcon = (foodType) => {
  return FOOD_ICONS[foodType.toLowerCase()] || FOOD_ICONS.default;
};

/**
 * MealRecommender component
 * 
 * This component provides meal recommendations based on current weight,
 * goal weight, and dietary preferences.
 */
const MealRecommender = ({ 
  currentWeight = 65, 
  goalWeight = 60, 
  height = 165, 
  age = 30,
  gender = 'female',
  activityLevel = 'moderate',
  dietPreference = 'balanced'
}) => {
  const [dailyPlan, setDailyPlan] = useState(null);
  const [calorieNeeds, setCalorieNeeds] = useState(0);
  const [macros, setMacros] = useState({ protein: 0, carbs: 0, fat: 0 });
  const [loading, setLoading] = useState(true);
  const [dietType, setDietType] = useState(dietPreference);
  const [apiStatus, setApiStatus] = useState({ success: true, message: "" });
  
  // Generate meal recommendations
  const fetchMealRecommendations = async () => {
    try {
      setLoading(true);
      setApiStatus({ success: true, message: "" });
      
      console.log("Refreshing meal plan with params:", {
        currentWeight,
        goalWeight,
        height,
        age,
        gender,
        activityLevel,
        dietPreference: dietType
      });
      
      const response = await API.get("/api/meal/recommendations", {
        params: {
          currentWeight,
          goalWeight,
          height,
          age,
          gender,
          activityLevel,
          dietPreference: dietType
        }
      });
      
      console.log("API response:", response);
      
      if (response.data) {
        console.log("Meal plan data:", response.data);
        console.log("Breakfast nutrition:", response.data.breakfast);
        console.log("Lunch nutrition:", response.data.lunch);
        console.log("Dinner nutrition:", response.data.dinner);
        console.log("Snack nutrition:", response.data.snack);
        console.log("Total macros:", response.data.macros);
        
        setCalorieNeeds(response.data.calorieNeeds);
        setMacros(response.data.macros);
        setDailyPlan({
          date: response.data.date,
          breakfast: response.data.breakfast,
          lunch: response.data.lunch,
          dinner: response.data.dinner,
          snack: response.data.snack,
          totalProtein: response.data.totalProtein,
          totalCarbs: response.data.totalCarbs,
          totalFat: response.data.totalFat,
          totalCalories: response.data.totalCalories
        });
      } else {
        throw new Error("Empty response from meal recommendation API");
      }
    } catch (error) {
      console.error('Error fetching meal recommendations:', error);
      console.error('Error details:', error.response ? error.response.data : 'No response data');
      setApiStatus({
        success: false,
        message: `Could not fetch meal recommendations: ${error.message}. Please try again later.`
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Handle diet type change
  const handleDietTypeChange = async (newType, e) => {
    if (e) e.preventDefault();
    
    console.log(`Diet type button clicked: ${newType}`);
    
    try {
      setDietType(newType);
      console.log(`Diet type changed to: ${newType}`);
      
      try {
        setLoading(true);
        const response = await API.put("/api/meal/preferences", {
          dietPreference: newType
        });
        console.log("Diet preference saved successfully:", response.data);
        
        await fetchMealRecommendations();
      } catch (error) {
        console.error("Error saving diet preference:", error);
        setApiStatus({
          success: false,
          message: `Could not save diet preference: ${error.message}. Recommendations may not reflect your preferences.`
        });
        setLoading(false);
      }
    } catch (error) {
      console.error("Error in diet type change:", error);
      setLoading(false);
    }
  };
  
  // Load recommendations on initial load and when props change
  useEffect(() => {
    fetchMealRecommendations();
  }, [currentWeight, goalWeight, height, age, gender, activityLevel, dietType]);
  
  // based on ingredient name to infer food type
  const getFoodTypeFromIngredient = (ingredient) => {
    if (!ingredient) return 'default';
    
    const lowerIngredient = ingredient.toLowerCase();
    
    // some simple judgment logic
    if (/apple|orange|banana|berry|fruit/i.test(lowerIngredient)) return 'fruit';
    if (/broccoli|spinach|carrot|lettuce|vegetable/i.test(lowerIngredient)) return 'vegetable';
    if (/rice|oat|bread|wheat|grain|pasta/i.test(lowerIngredient)) return 'grain';
    if (/chicken|beef|fish|egg|tofu|meat|protein/i.test(lowerIngredient)) return 'protein';
    if (/milk|yogurt|cheese|dairy/i.test(lowerIngredient)) return 'dairy';
    
    return 'default';
  };
  
  if (loading) {
    return <div className="meal-recommender-loading">Generating your personalized meal plan...</div>;
  }
  
  if (!apiStatus.success) {
    return <div className="meal-recommender-error">{apiStatus.message}</div>;
  }
  
  // Calculate total nutritional intake
  const totalCalories = dailyPlan.totalCalories || (
    (dailyPlan.breakfast.calories || 0) + 
    (dailyPlan.lunch.calories || 0) + 
    (dailyPlan.dinner.calories || 0) + 
    (dailyPlan.snack.calories || 0)
  );
                       
  const totalProtein = dailyPlan.totalProtein || (
    (dailyPlan.breakfast.protein || 0) + 
    (dailyPlan.lunch.protein || 0) + 
    (dailyPlan.dinner.protein || 0) + 
    (dailyPlan.snack.protein || 0)
  );
                      
  const totalCarbs = dailyPlan.totalCarbs || (
    (dailyPlan.breakfast.carbs || 0) + 
    (dailyPlan.lunch.carbs || 0) + 
    (dailyPlan.dinner.carbs || 0) + 
    (dailyPlan.snack.carbs || 0)
  );
                    
  const totalFat = dailyPlan.totalFat || (
    (dailyPlan.breakfast.fat || 0) + 
    (dailyPlan.lunch.fat || 0) + 
    (dailyPlan.dinner.fat || 0) + 
    (dailyPlan.snack.fat || 0)
  );
  
  // Render nutrition summary
  const renderNutritionSummary = () => (
    <div className="meal-nutrition-summary">
      <h3>Daily Nutrition Summary</h3>
      <div className="nutrition-summary-row">
        <div className="nutrition-item">
          <span className="nutrition-label">Total Calories</span>
          <span className="nutrition-value">{totalCalories} / {calorieNeeds} cal</span>
          <div className="nutrition-progress-bar">
            <div 
              className="nutrition-progress" 
              style={{width: `${Math.min(100, (totalCalories / calorieNeeds) * 100)}%`}}
            ></div>
          </div>
        </div>
        
        <div className="nutrition-item">
          <span className="nutrition-label">Protein</span>
          <span className="nutrition-value">{totalProtein}g / {macros.protein}g</span>
          <div className="nutrition-progress-bar">
            <div 
              className="nutrition-progress protein-progress" 
              style={{width: `${Math.min(100, (totalProtein / macros.protein) * 100)}%`}}
            ></div>
          </div>
        </div>
        
        <div className="nutrition-item">
          <span className="nutrition-label">Carbohydrates</span>
          <span className="nutrition-value">{totalCarbs}g / {macros.carbs}g</span>
          <div className="nutrition-progress-bar">
            <div 
              className="nutrition-progress carbs-progress" 
              style={{width: `${Math.min(100, (totalCarbs / macros.carbs) * 100)}%`}}
            ></div>
          </div>
        </div>
        
        <div className="nutrition-item">
          <span className="nutrition-label">Fat</span>
          <span className="nutrition-value">{totalFat}g / {macros.fat}g</span>
          <div className="nutrition-progress-bar">
            <div 
              className="nutrition-progress fat-progress" 
              style={{width: `${Math.min(100, (totalFat / macros.fat) * 100)}%`}}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
  
  // Render diet type selector
  const renderDietTypeSelector = () => (
    <div className="diet-type-selector">
      <div className="diet-type-options">
        <button 
          className={`diet-type-btn ${dietType === 'balanced' ? 'active' : ''}`}
          onClick={(e) => handleDietTypeChange('balanced', e)}
          title="Balanced Diet"
        >
          <span role="img" aria-label="balanced">⚖️</span>
        </button>
        <button 
          className={`diet-type-btn ${dietType === 'lowCarb' ? 'active' : ''}`}
          onClick={(e) => handleDietTypeChange('lowCarb', e)}
          title="Low Carb Diet"
        >
          <span role="img" aria-label="low carb">🥦</span>
        </button>
        <button 
          className={`diet-type-btn ${dietType === 'highProtein' ? 'active' : ''}`}
          onClick={(e) => handleDietTypeChange('highProtein', e)}
          title="High Protein Diet"
        >
          <span role="img" aria-label="high protein">🥩</span>
        </button>
      </div>
    </div>
  );
  
  // Meal card component with animation
  const MealCard = ({ meal, title, type }) => (
    <div className="meal-card">
      <div className="meal-header">
        <span className="meal-icon">{getFoodIcon(type)}</span>
        <h4>{title}</h4>
        <span className="meal-calories">{meal.calories || 0} cal</span>
      </div>
      <div className="meal-content">
        <div className="meal-icon-container">
          <span className="meal-big-icon">{getFoodIcon(type)}</span>
        </div>
        <h5>{meal.name}</h5>
        <div className="meal-ingredients">
          {Array.isArray(meal.ingredients) ? 
            meal.ingredients.map((ingredient, idx) => {
              const name = typeof ingredient === 'object' ? ingredient.name : ingredient;
              const icon = typeof ingredient === 'object' ? ingredient.icon : getFoodIcon(getFoodTypeFromIngredient(ingredient));
              return (
                <span key={idx} className="ingredient-tag">
                  {icon} {name}
                </span>
              );
            }) : 
            <span className="ingredient-tag">No ingredients data</span>
          }
        </div>
        <div className="meal-macros">
          <span className="macro-item">Protein: {meal.protein || 0}g</span>
          <span className="macro-item">Carbs: {meal.carbs || 0}g</span>
          <span className="macro-item">Fat: {meal.fat || 0}g</span>
        </div>
      </div>
    </div>
  );
  
  return (
    <div className="meal-recommender-container">
      <div className="meal-plan-header">
        <h2><span role="img" aria-label="meal plan">🍽️</span> Weight-Goal Based Meal Plan</h2>
        <p className="meal-plan-goal">
          {goalWeight < currentWeight 
            ? <><span role="img" aria-label="weight loss">⬇️</span> Weight Loss Goal: Reach {goalWeight}kg ({calorieNeeds} calories daily)</>
            : goalWeight > currentWeight 
              ? <><span role="img" aria-label="weight gain">⬆️</span> Weight Gain Goal: Reach {goalWeight}kg ({calorieNeeds} calories daily)</>
              : <><span role="img" aria-label="maintain weight">⚖️</span> Maintain Weight: {currentWeight}kg ({calorieNeeds} calories daily)</>}
        </p>
        
        <div className="meal-plan-options">
          <div className="diet-options-row">
            <span className="diet-type-label">Diet Type:</span>
            {renderDietTypeSelector()}
          </div>
          <button
            className="refresh-meal-plan"
            onClick={fetchMealRecommendations}
            style={{ marginLeft: "10px" }}
          >
            <span role="img" aria-label="refresh">🔄</span> Refresh
          </button>
        </div>
        
        {!apiStatus.success && (
          <div className="api-status-message">
            <p>{apiStatus.message}</p>
          </div>
        )}
      </div>
      
      {renderNutritionSummary()}
      
      <div className="meal-cards-row">
        <MealCard meal={dailyPlan.breakfast} title="Breakfast" type="breakfast" />
        <MealCard meal={dailyPlan.lunch} title="Lunch" type="lunch" />
        <MealCard meal={dailyPlan.dinner} title="Dinner" type="dinner" />
        <MealCard meal={dailyPlan.snack} title="Snack" type="snack" />
      </div>
      
      <NutritionTipsPopup />
    </div>
  );
};

export default MealRecommender;