import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import API from '../../api';
import '../../styles/MealRecommender.css';

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

// Calculate daily calorie needs based on weight goals
const calculateCalorieNeeds = (currentWeight, goalWeight, height, age, gender, activityLevel) => {
  // Basal Metabolic Rate (BMR)
  let bmr;
  if (gender === 'female') {
    bmr = 655 + (9.6 * currentWeight) + (1.8 * height) - (4.7 * age);
  } else {
    bmr = 66 + (13.7 * currentWeight) + (5 * height) - (6.8 * age);
  }
  
  // Adjust based on activity level
  const activityMultipliers = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    veryActive: 1.9
  };
  
  const tdee = bmr * (activityMultipliers[activityLevel] || 1.2);
  
  // Adjust calories based on goal
  const weightDifference = goalWeight - currentWeight;
  // If goal is to lose weight, reduce by 500 calories; if to gain weight, add 500 calories
  const calorieAdjustment = weightDifference < 0 ? -500 : (weightDifference > 0 ? 500 : 0);
  
  return Math.round(tdee + calorieAdjustment);
};

// Macronutrient distribution
const calculateMacros = (totalCalories, dietType = 'balanced') => {
  let proteinPercentage, carbPercentage, fatPercentage;
  
  switch (dietType) {
    case 'lowCarb':
      proteinPercentage = 0.30;
      carbPercentage = 0.20;
      fatPercentage = 0.50;
      break;
    case 'highProtein':
      proteinPercentage = 0.40;
      carbPercentage = 0.30;
      fatPercentage = 0.30;
      break;
    case 'balanced':
    default:
      proteinPercentage = 0.25;
      carbPercentage = 0.50;
      fatPercentage = 0.25;
      break;
  }
  
  return {
    protein: Math.round((totalCalories * proteinPercentage) / 4), // 4 calories per gram of protein
    carbs: Math.round((totalCalories * carbPercentage) / 4),      // 4 calories per gram of carbs
    fat: Math.round((totalCalories * fatPercentage) / 9)         // 9 calories per gram of fat
  };
};

// Spoonacular API key - replace with your own API key
// In a production app, this should be stored in environment variables
const SPOONACULAR_API_KEY = "YOUR_API_KEY"; 

// Recipe API service
const RecipeService = {
  async getMealsByNutrients(calories, minProtein, maxCarbs, mealType) {
    try {
      const params = {
        apiKey: SPOONACULAR_API_KEY,
        minCalories: Math.max(50, calories - 100),
        maxCalories: calories + 100,
        minProtein,
        maxCarbs,
        number: 3,
        type: mealType,
        random: true
      };
      
      const response = await API.get('https://api.spoonacular.com/recipes/findByNutrients', { params });
      
      if (response.data && response.data.length > 0) {
        // Get detailed recipe information including ingredients
        const recipe = response.data[0];
        const detailResponse = await API.get(`https://api.spoonacular.com/recipes/${recipe.id}/information`, {
          params: {
            apiKey: SPOONACULAR_API_KEY,
            includeNutrition: true
          }
        });
        
        if (detailResponse.data) {
          const ingredients = detailResponse.data.extendedIngredients.map(ing => ing.name);
          
          // Extract macronutrients
          let protein = recipe.protein || 0;
          let carbs = recipe.carbs || 0;
          let fat = recipe.fat || 0;
          
          if (typeof protein === 'string') protein = parseInt(protein.replace('g', ''));
          if (typeof carbs === 'string') carbs = parseInt(carbs.replace('g', ''));
          if (typeof fat === 'string') fat = parseInt(fat.replace('g', ''));
          
          return {
            id: recipe.id,
            name: detailResponse.data.title,
            calories: recipe.calories,
            protein,
            carbs,
            fat,
            type: mealType,
            imageUrl: detailResponse.data.image,
            ingredients: ingredients.slice(0, 4) // Limit to top 4 ingredients for UI display
          };
        }
      }
      
      // Fallback to sample data if API fails or returns no results
      return this.getFallbackRecipe(calories, minProtein, maxCarbs, mealType);
    } catch (error) {
      console.error("Error fetching recipes from API:", error);
      // Fallback to sample data
      return this.getFallbackRecipe(calories, minProtein, maxCarbs, mealType);
    }
  },
  
  // Fallback recipes when API fails or quota exceeded
  getFallbackRecipe(calories, minProtein, maxCarbs, mealType) {
    const fallbackRecipes = {
      breakfast: { 
        name: 'Oatmeal with Blueberries', 
        calories, 
        protein: Math.round(minProtein),
        carbs: Math.round(maxCarbs * 0.8),
        fat: Math.round(calories / 9 * 0.25),
        type: 'breakfast',
        ingredients: ['Oats', 'Milk', 'Blueberries', 'Honey'],
        imageUrl: 'https://images.unsplash.com/photo-1517673132405-a56a62b18caf?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80'
      },
      lunch: {
        name: 'Chicken Salad with Quinoa', 
        calories, 
        protein: Math.round(minProtein * 1.2),
        carbs: Math.round(maxCarbs * 0.6),
        fat: Math.round(calories / 9 * 0.25),
        type: 'lunch',
        ingredients: ['Chicken breast', 'Quinoa', 'Mixed vegetables', 'Olive oil'],
        imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80'
      },
      dinner: {
        name: 'Baked Salmon with Vegetables', 
        calories, 
        protein: Math.round(minProtein * 1.1),
        carbs: Math.round(maxCarbs * 0.5),
        fat: Math.round(calories / 9 * 0.3),
        type: 'dinner',
        ingredients: ['Salmon', 'Carrots', 'Zucchini', 'Olive oil'],
        imageUrl: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80'
      },
      snack: {
        name: 'Greek Yogurt with Nuts', 
        calories, 
        protein: Math.round(minProtein * 0.8),
        carbs: Math.round(maxCarbs * 0.3),
        fat: Math.round(calories / 9 * 0.4),
        type: 'snack',
        ingredients: ['Greek yogurt', 'Mixed nuts', 'Honey'],
        imageUrl: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80'
      }
    };
    
    return fallbackRecipes[mealType] || fallbackRecipes.snack;
  }
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
      
      console.log("开始获取餐食推荐...");
      
      // 调用后端API获取餐食推荐
      try {
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
        
        console.log("API响应:", response);
        
        // 如果API调用成功，使用返回的数据
        if (response.data) {
          setCalorieNeeds(response.data.calorieNeeds);
          setMacros(response.data.macros);
          setDailyPlan({
            date: response.data.date,
            breakfast: response.data.breakfast,
            lunch: response.data.lunch,
            dinner: response.data.dinner,
            snack: response.data.snack
          });
        } else {
          throw new Error("Empty response from meal recommendation API");
        }
      } catch (apiError) {
        console.error('API调用失败:', apiError);
        console.log("使用本地计算的备用餐食计划...");
        // 计算卡路里需求
        const calories = calculateCalorieNeeds(
          currentWeight, 
          goalWeight,
          height, 
          age,
          gender,
          activityLevel
        );
        
        setCalorieNeeds(calories);
        
        // 计算宏量营养素分配
        const macroDistribution = calculateMacros(calories, dietType);
        setMacros(macroDistribution);
        
        // 使用辅助函数生成备用餐食计划
        await generateFallbackPlan(calories, macroDistribution);
      }
    } catch (error) {
      console.error('Error generating meal recommendations:', error);
      console.error('Error details:', error.response ? error.response.data : 'No response data');
      setApiStatus({
        success: false,
        message: `Could not fetch meal recommendations: ${error.message}. Using fallback data.`
      });
      
      // 如果出错，确保使用备用方案
      console.log("错误发生，使用本地计算的备用餐食计划...");
      // 计算卡路里需求
      const calories = calculateCalorieNeeds(
        currentWeight, 
        goalWeight,
        height, 
        age,
        gender,
        activityLevel
      );
      
      setCalorieNeeds(calories);
      
      // 计算宏量营养素分配
      const macroDistribution = calculateMacros(calories, dietType);
      setMacros(macroDistribution);
      
      // 使用辅助函数生成备用餐食计划
      await generateFallbackPlan(calories, macroDistribution);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle diet type change
  const handleDietTypeChange = async (newType, e) => {
    // Prevent any event bubbling
    if (e) e.preventDefault();
    
    console.log(`Diet type button clicked: ${newType}`);
    
    try {
      setDietType(newType);
      console.log(`Diet type changed to: ${newType}`);
      
      // 当用户改变饮食类型时，保存到后端
      try {
        setLoading(true);
        const response = await API.put("/api/meal/preferences", {
          dietPreference: newType
        });
        console.log("Diet preference saved successfully:", response.data);
        
        // After changing diet type, refresh the meal plan
        await fetchMealRecommendations();
      } catch (error) {
        console.error("Error saving diet preference:", error);
        setApiStatus({
          success: false,
          message: `Could not save diet preference: ${error.message}. Recommendations may not reflect your preferences.`
        });
        
        // Even if saving fails, we still generate a local meal plan with the new diet type
        // 计算卡路里需求
        const calories = calculateCalorieNeeds(
          currentWeight, 
          goalWeight,
          height, 
          age,
          gender,
          activityLevel
        );
        
        setCalorieNeeds(calories);
        
        // 计算新饮食类型的宏量营养素分配
        const macroDistribution = calculateMacros(calories, newType);
        setMacros(macroDistribution);
        
        // 使用辅助函数生成备用餐食计划
        await generateFallbackPlan(calories, macroDistribution);
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
  
  // 点击"Refresh Meal Plan"按钮时的处理函数
  const handleRefreshMealPlan = async (e) => {
    // Prevent any event bubbling
    if (e) e.preventDefault();
    
    console.log("Refresh Meal Plan button clicked!");
    
    try {
      setLoading(true);
      setApiStatus({ success: true, message: "" });
      console.log("手动刷新餐食计划...", { currentWeight, goalWeight, height, age, gender, activityLevel, dietType });
      
      // 使用 API 实例调用后端接口
      try {
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
        
        if (response.data) {
          console.log("API response success:", response.data);
          setCalorieNeeds(response.data.calorieNeeds);
          setMacros(response.data.macros);
          setDailyPlan({
            date: response.data.date,
            breakfast: response.data.breakfast,
            lunch: response.data.lunch,
            dinner: response.data.dinner,
            snack: response.data.snack
          });
          console.log("餐食计划刷新成功:", response.data);
        } else {
          throw new Error("服务器返回空数据");
        }
      } catch (apiError) {
        console.error("API调用失败:", apiError);
        
        // Display detailed error for debugging
        if (apiError.response) {
          console.error("Error response:", apiError.response.status, apiError.response.data);
        }
        
        console.log("使用本地计算的备用餐食计划...");
        // Use local calculation as fallback
        const calories = calculateCalorieNeeds(
          currentWeight, 
          goalWeight,
          height, 
          age,
          gender,
          activityLevel
        );
        
        setCalorieNeeds(calories);
        
        // 计算宏量营养素分配
        const macroDistribution = calculateMacros(calories, dietType);
        setMacros(macroDistribution);
        
        // Generate fallback meal plan
        await generateFallbackPlan(calories, macroDistribution);
      }
    } catch (error) {
      console.error("刷新餐食计划时出错:", error);
      setApiStatus({
        success: false,
        message: `刷新失败: ${error.message}. 使用备用数据。`
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Helper function to generate fallback meal plan to avoid code duplication
  const generateFallbackPlan = async (calories, macroDistribution) => {
    // 分配卡路里到各餐
    const breakfastCal = Math.round(calories * 0.25); // 25% 早餐
    const lunchCal = Math.round(calories * 0.35);     // 35% 午餐
    const dinnerCal = Math.round(calories * 0.30);    // 30% 晚餐
    const snacksCal = Math.round(calories * 0.10);    // 10% 零食
    
    // 使用本地备用数据
    const plan = {
      date: format(new Date(), 'yyyy-MM-dd'),
      breakfast: RecipeService.getFallbackRecipe(
        breakfastCal, 
        macroDistribution.protein * 0.25, 
        macroDistribution.carbs * 0.25,
        'breakfast'
      ),
      lunch: RecipeService.getFallbackRecipe(
        lunchCal, 
        macroDistribution.protein * 0.35, 
        macroDistribution.carbs * 0.35,
        'lunch'
      ),
      dinner: RecipeService.getFallbackRecipe(
        dinnerCal, 
        macroDistribution.protein * 0.30, 
        macroDistribution.carbs * 0.30,
        'dinner'
      ),
      snack: RecipeService.getFallbackRecipe(
        snacksCal, 
        macroDistribution.protein * 0.10, 
        macroDistribution.carbs * 0.10,
        'snack'
      )
    };
    
    setDailyPlan(plan);
  };
  
  if (loading) {
    return <div className="meal-recommender-loading">Generating your personalized meal plan...</div>;
  }
  
  if (!dailyPlan) {
    return <div className="meal-recommender-error">Unable to generate meal plan. Please try again later.</div>;
  }
  
  // Calculate total nutritional intake
  const totalCalories = dailyPlan.breakfast.calories + dailyPlan.lunch.calories + 
                       dailyPlan.dinner.calories + dailyPlan.snack.calories;
                       
  const totalProtein = dailyPlan.breakfast.protein + dailyPlan.lunch.protein + 
                      dailyPlan.dinner.protein + dailyPlan.snack.protein;
                      
  const totalCarbs = dailyPlan.breakfast.carbs + dailyPlan.lunch.carbs + 
                    dailyPlan.dinner.carbs + dailyPlan.snack.carbs;
                    
  const totalFat = dailyPlan.breakfast.fat + dailyPlan.lunch.fat + 
                  dailyPlan.dinner.fat + dailyPlan.snack.fat;
  
  // Render nutrition summary
  const renderNutritionSummary = () => (
    <div className="meal-nutrition-summary">
      <h3>Daily Nutrition Summary</h3>
      <div className="nutrition-summary-grid">
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
      <span className="diet-type-label">Diet Type:</span>
      <div className="diet-type-options">
        <button 
          className={`diet-type-btn ${dietType === 'balanced' ? 'active' : ''}`}
          onClick={(e) => handleDietTypeChange('balanced', e)}
        >
          Balanced
        </button>
        <button 
          className={`diet-type-btn ${dietType === 'lowCarb' ? 'active' : ''}`}
          onClick={(e) => handleDietTypeChange('lowCarb', e)}
        >
          Low Carb
        </button>
        <button 
          className={`diet-type-btn ${dietType === 'highProtein' ? 'active' : ''}`}
          onClick={(e) => handleDietTypeChange('highProtein', e)}
        >
          High Protein
        </button>
      </div>
    </div>
  );
  
  // Render recipe component
  const MealCard = ({ meal, title, type }) => (
    <div className="meal-card">
      <div className="meal-header">
        <span className="meal-icon">{getFoodIcon(type)}</span>
        <h4>{title}</h4>
        <span className="meal-calories">{meal.calories} cal</span>
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
          <span className="macro-item">Protein: {meal.protein}g</span>
          <span className="macro-item">Carbs: {meal.carbs}g</span>
          <span className="macro-item">Fat: {meal.fat}g</span>
        </div>
      </div>
    </div>
  );
  
  // 根据原料名称推断食物类型
  const getFoodTypeFromIngredient = (ingredient) => {
    if (!ingredient) return 'default';
    
    const lowerIngredient = ingredient.toLowerCase();
    
    // 一些简单的判断逻辑
    if (/apple|orange|banana|berry|fruit/i.test(lowerIngredient)) return 'fruit';
    if (/broccoli|spinach|carrot|lettuce|vegetable/i.test(lowerIngredient)) return 'vegetable';
    if (/rice|oat|bread|wheat|grain|pasta/i.test(lowerIngredient)) return 'grain';
    if (/chicken|beef|fish|egg|tofu|meat|protein/i.test(lowerIngredient)) return 'protein';
    if (/milk|yogurt|cheese|dairy/i.test(lowerIngredient)) return 'dairy';
    
    return 'default';
  };
  
  return (
    <div className="meal-recommender-container">
      <div className="meal-plan-header">
        <h2>Weight-Goal Based Meal Plan</h2>
        <p className="meal-plan-goal">
          {goalWeight < currentWeight 
            ? `Weight Loss Goal: Reach ${goalWeight}kg (${calorieNeeds} calories daily)` 
            : goalWeight > currentWeight 
              ? `Weight Gain Goal: Reach ${goalWeight}kg (${calorieNeeds} calories daily)`
              : `Maintain Weight: ${currentWeight}kg (${calorieNeeds} calories daily)`}
        </p>
        
        {renderDietTypeSelector()}
        
        <button 
          className="refresh-meal-plan" 
          onClick={handleRefreshMealPlan}
        >
          Refresh Meal Plan
        </button>
        
        {!apiStatus.success && (
          <div className="api-status-message">
            <p>{apiStatus.message}</p>
          </div>
        )}
      </div>
      
      {renderNutritionSummary()}
      
      <div className="meal-bento-box">
        <MealCard meal={dailyPlan.breakfast} title="Breakfast" type="breakfast" />
        <MealCard meal={dailyPlan.lunch} title="Lunch" type="lunch" />
        <MealCard meal={dailyPlan.dinner} title="Dinner" type="dinner" />
        <MealCard meal={dailyPlan.snack} title="Snack" type="snack" />
      </div>
      
      <div className="meal-plan-tips">
        <h3>Healthy Eating Tips</h3>
        <ul>
          <li>Try to eat at the same time each day to maintain regular eating habits</li>
          <li>Chew slowly during each meal, taking at least 20 minutes to enjoy your food</li>
          <li>Stay well hydrated by drinking at least 8 glasses of water daily</li>
          <li>Combine with appropriate exercise for optimal health results</li>
        </ul>
      </div>
    </div>
  );
};

export default MealRecommender; 