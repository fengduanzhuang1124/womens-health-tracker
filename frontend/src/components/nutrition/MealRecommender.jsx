import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import API from '../../api';
import '../../styles/MealRecommender.css';
import NutritionTipsPopup from './NutritionTipsPopup';
import useDataCache from '../../hooks/useDataCache';

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
  const [selectedMeal, setSelectedMeal] = useState("breakfast");
  const [preferences, setPreferences] = useState({
    dietaryRestrictions: [],
    allergies: [],
    favoriteFoods: []
  });
  
  const { data: mealPlan, loading: mealPlanLoading, error: mealPlanError, refresh: refreshMealPlan } = useDataCache(
    `meal-plan-${currentWeight}-${goalWeight}-${height}-${age}-${gender}-${activityLevel}-${dietType}`,
    async () => {
      const response = await API.get("/api/meal/recommendations", {
        params: { currentWeight, goalWeight, height, age, gender, activityLevel, dietPreference: dietType }
      });
      return response.data;
    }
  );
  
  const { data: userPreferences, loading: loadingPreferences } = useDataCache(
    `user-preferences-${user?.uid}`,
    async () => {
      const res = await API.get("/api/users/preferences");
      return res.data;
    }
  );
  
  const { data: mealRecommendations, loading: loadingMeals } = useDataCache(
    `meal-recommendations-${user?.uid}-${selectedMeal}`,
    async () => {
      const res = await API.post("/api/meals/recommend", {
        mealType: selectedMeal,
        preferences: userPreferences
      });
      return res.data;
    },
    [selectedMeal, userPreferences]
  );
  
  // Handle diet type change
  const handleDietTypeChange = async (newType, e) => {
    // Prevent any event bubbling
    if (e) e.preventDefault();
    
    console.log(`Diet type button clicked: ${newType}`);
    
    try {
      setDietType(newType);
      console.log(`Diet type changed to: ${newType}`);
      
      //  when user changes diet type, save to backend
      try {
        setLoading(true);
        const response = await API.put("/api/meal/preferences", {
          dietPreference: newType
        });
        console.log("Diet preference saved successfully:", response.data);
        
        // After changing diet type, refresh the meal plan
        await refreshMealPlan();
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
    refreshMealPlan();
  }, [currentWeight, goalWeight, height, age, gender, activityLevel, dietType]);
  
  // When user preferences load, update local state
  useEffect(() => {
    if (userPreferences) {
      setPreferences(userPreferences);
    }
  }, [userPreferences]);
  
  // click "Refresh Meal Plan" button
  const handleRefreshMealPlan = async (e) => {
    // Prevent any event bubbling
    if (e) e.preventDefault();
    
    console.log("Refresh Meal Plan button clicked!");
    
    try {
      setLoading(true);
      setApiStatus({ success: true, message: "" });
      console.log(" refresh meal plan", { currentWeight, goalWeight, height, age, gender, activityLevel, dietType });
      
      await refreshMealPlan();
    } catch (error) {
      console.error("refresh meal plan error: ", error);
      setApiStatus({
        success: false,
        message: `refresh meal plan failed: ${error.message}. please try again later.`
      });
    }
  };
  
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
  
  if (loadingPreferences || loadingMeals) {
    return <div className="meal-recommender-loading">Loading...</div>;
  }
  
  if (mealPlanError) {
    return <div className="meal-recommender-error">Unable to generate meal plan. Please try again later.</div>;
  }
  
  // Calculate total nutritional intake
  const totalCalories = mealPlan.totalCalories || (
    (mealPlan.breakfast.calories || 0) + 
    (mealPlan.lunch.calories || 0) + 
    (mealPlan.dinner.calories || 0) + 
    (mealPlan.snack.calories || 0)
  );
                       
  const totalProtein = mealPlan.totalProtein || (
    (mealPlan.breakfast.protein || 0) + 
    (mealPlan.lunch.protein || 0) + 
    (mealPlan.dinner.protein || 0) + 
    (mealPlan.snack.protein || 0)
  );
                      
  const totalCarbs = mealPlan.totalCarbs || (
    (mealPlan.breakfast.carbs || 0) + 
    (mealPlan.lunch.carbs || 0) + 
    (mealPlan.dinner.carbs || 0) + 
    (mealPlan.snack.carbs || 0)
  );
                    
  const totalFat = mealPlan.totalFat || (
    (mealPlan.breakfast.fat || 0) + 
    (mealPlan.lunch.fat || 0) + 
    (mealPlan.dinner.fat || 0) + 
    (mealPlan.snack.fat || 0)
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
            <button 
              className="refresh-meal-plan" 
              onClick={handleRefreshMealPlan}
            >
              <span role="img" aria-label="refresh">🔄</span> Refresh
            </button>
          </div>
        </div>
        
        {!apiStatus.success && (
          <div className="api-status-message">
            <p>{apiStatus.message}</p>
          </div>
        )}
      </div>
      
      {renderNutritionSummary()}
      
      <div className="meal-cards-row">
        <MealCard meal={mealPlan.breakfast} title="Breakfast" type="breakfast" />
        <MealCard meal={mealPlan.lunch} title="Lunch" type="lunch" />
        <MealCard meal={mealPlan.dinner} title="Dinner" type="dinner" />
        <MealCard meal={mealPlan.snack} title="Snack" type="snack" />
      </div>
      
      <NutritionTipsPopup />
    </div>
  );
};

export default MealRecommender;