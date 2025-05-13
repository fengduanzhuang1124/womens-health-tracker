import { db } from "../config/firebaseAdmin.js";
import { Timestamp } from "firebase-admin/firestore";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

//  food type and emoji icon mapping
const FOOD_ICONS = {
  fruit: "🍎",
  vegetable: "🥦",
  grain: "🍚",
  protein: "🍗",
  dairy: "🥛",
  snack: "🥨",
  dessert: "🍰",
  breakfast: "🍳",
  lunch: "🥪",
  dinner: "🍲",
  default: "🍽️"
};

/**
 *  get user's meal recommendations
 *  based on user's weight, goal weight and other health data to generate personalized meal plan
 */
export const getMealRecommendations = async (req, res) => {
  try {
    const uid = req.user.uid;
    
    // get parameters from request or from user profile
    let { 
      currentWeight, 
      goalWeight, 
      height, 
      age, 
      gender, 
      activityLevel, 
      dietPreference 
    } = req.query;
    
    // if there is no parameters in request, get from user profile
    if (!currentWeight || !goalWeight) {
      // get user's latest weight record
      const weightsRef = db.collection("users").doc(uid).collection("weightRecords");
      const weightSnapshot = await weightsRef.orderBy("date", "desc").limit(1).get();
      
      if (!weightSnapshot.empty) {
        currentWeight = weightSnapshot.docs[0].data().weight;
      }
      
      // get user's profile information
      const userRef = db.collection("users").doc(uid);
      const userDoc = await userRef.get();
      
      if (userDoc.exists) {
        const userData = userDoc.data();
        goalWeight = goalWeight || userData.goalWeight;
        height = height || userData.height;
        age = age || userData.age;
        gender = gender || userData.gender || 'female';
        activityLevel = activityLevel || userData.activityLevel || 'moderate';
        dietPreference = dietPreference || userData.dietPreference || 'balanced';
      }
    }
    
    // if still missing required data, return error
    if (!currentWeight || !goalWeight) {
      return res.status(400).json({ 
        error: "Missing required parameters. Please provide weight data or update your profile." 
      });
    }
    
    // convert parameters to correct types
    currentWeight = Number(currentWeight);
    goalWeight = Number(goalWeight);
    height = Number(height || 165);
    age = Number(age || 30);
    
    // calculate daily calorie needs
    const calorieNeeds = calculateCalorieNeeds(
      currentWeight, 
      goalWeight, 
      height, 
      age, 
      gender, 
      activityLevel
    );
    
    // calculate macros distribution
    const macros = calculateMacros(calorieNeeds, dietPreference);
    
    // get AI generated meal plan
    const mealPlan = await generateAIMealPlan(
      currentWeight, 
      goalWeight, 
      calorieNeeds, 
      macros, 
      dietPreference
    );
    
    // save user's meal plan to database
    await saveMealPlan(uid, mealPlan);
    
    res.status(200).json(mealPlan);
  } catch (error) {
    console.error("Error generating meal recommendations:", error);
    res.status(500).json({ error: "Failed to generate meal recommendations" });
  }
};

/**
 *  update user's diet preferences
 */
export const updateDietPreferences = async (req, res) => {
  try {
    const uid = req.user.uid;
    const { dietPreference } = req.body;
    
    // validate if the diet preference is valid
    const validPreferences = ['balanced', 'lowCarb', 'highProtein', 'vegetarian', 'vegan'];
    if (!dietPreference || !validPreferences.includes(dietPreference)) {
      return res.status(400).json({ 
        error: "Invalid diet preference. Valid options are: balanced, lowCarb, highProtein, vegetarian, vegan" 
      });
    }
    
    // update user's profile
    const userRef = db.collection("users").doc(uid);
    await userRef.update({
      dietPreference: dietPreference,
      updatedAt: Timestamp.now()
    });
    
    res.status(200).json({ 
      dietPreference: dietPreference,
      updated: true 
    });
  } catch (error) {
    console.error("Error updating diet preferences:", error);
    res.status(500).json({ error: "Failed to update diet preferences" });
  }
};

/**
 *  get user's saved meal plan history
 */
export const getMealPlanHistory = async (req, res) => {
  try {
    const uid = req.user.uid;
    const { limit = 5 } = req.query;
    
    const mealPlansRef = db.collection("users").doc(uid).collection("mealPlans");
    const snapshot = await mealPlansRef
      .orderBy("createdAt", "desc")
      .limit(Number(limit))
      .get();
    
    const mealPlans = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.status(200).json(mealPlans);
  } catch (error) {
    console.error("Error fetching meal plan history:", error);
    res.status(500).json({ error: "Failed to fetch meal plan history" });
  }
};

/**
* based on weight goal and body data to calculate daily calorie needs
 */
function calculateCalorieNeeds(currentWeight, goalWeight, height, age, gender, activityLevel) {
  // (BMR) the basal metabolic rate
  let bmr;
  if (gender === 'female') {
    bmr = 655 + (9.6 * currentWeight) + (1.8 * height) - (4.7 * age);
  } else {
    bmr = 66 + (13.7 * currentWeight) + (5 * height) - (6.8 * age);
  }
  
  // adjust based on activity level
  const activityMultipliers = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    veryActive: 1.9
  };
  
  const tdee = bmr * (activityMultipliers[activityLevel] || 1.2);
  
  // adjust based on weight goal
  const weightDifference = goalWeight - currentWeight;
  // if the goal is to lose weight, reduce 500 calories per day; if the goal is to gain weight, increase 500 calories per day
  const calorieAdjustment = weightDifference < 0 ? -500 : (weightDifference > 0 ? 500 : 0);
  
  return Math.round(tdee + calorieAdjustment);
}

/**
 *  calculate macros distribution
 */
function calculateMacros(totalCalories, dietType = 'balanced') {
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
    case 'vegetarian':
    case 'vegan':
      proteinPercentage = 0.20;
      carbPercentage = 0.55;
      fatPercentage = 0.25;
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
    fat: Math.round((totalCalories * fatPercentage) / 9)          // 9 calories per gram of fat
  };
}

/**
*  based on user's weight, goal weight, calorie needs and diet preference to generate meal plan
 */
async function generateAIMealPlan(currentWeight, goalWeight, calorieNeeds, macros, dietPreference) {
  try {
    // distribute calories to each meal
    const breakfastCal = Math.round(calorieNeeds * 0.25); // 25% breakfast
    const lunchCal = Math.round(calorieNeeds * 0.35);     // 35% lunch
    const dinnerCal = Math.round(calorieNeeds * 0.30);    // 30% dinner
    const snackCal = Math.round(calorieNeeds * 0.10);     // 10% snack
    
    // build prompt
    const prompt = `
Generate a healthy meal plan for a person with the following characteristics:
- Current weight: ${currentWeight} kg
- Goal weight: ${goalWeight} kg
- Daily calorie need: ${calorieNeeds} calories
- Diet preference: ${dietPreference}
- Macros: Protein ${macros.protein}g, Carbs ${macros.carbs}g, Fat ${macros.fat}g

Please create a full day meal plan with the following structure:
1. Breakfast (approx. ${breakfastCal} calories)
2. Lunch (approx. ${lunchCal} calories)
3. Dinner (approx. ${dinnerCal} calories)
4. Snack (approx. ${snackCal} calories)

For each meal, provide:
- Name of the dish
- Brief list of main ingredients (3-5 items)
- Approximate calories
- Macronutrients (protein, carbs, fat in grams)
- Food categories (e.g., protein, grain, vegetable)

Format as JSON with no additional text.
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    // parse the generated JSON response
    const responseContent = completion.choices[0].message.content;
    let mealPlanData;
    
    try {
      mealPlanData = JSON.parse(responseContent);
    } catch (err) {
      console.error("Error parsing OpenAI response:", err);
      // if parsing fails, return fallback meal plan
      return getFallbackMealPlan(calorieNeeds, macros, dietPreference);
    }
    
    // process and format the generated meal plan
    return formatMealPlan(mealPlanData, calorieNeeds, macros);
  } catch (error) {
    console.error("Error generating AI meal plan:", error);
    return getFallbackMealPlan(calorieNeeds, macros, dietPreference);
  }
}

/**
 *  format meal plan, add icon and other necessary information
 */
function formatMealPlan(rawMealPlan, calorieNeeds, macros) {
  // this function processes the original data returned from OpenAI, ensuring consistency
  const formattedPlan = {
    date: new Date().toISOString().split('T')[0],
    calorieNeeds: calorieNeeds,
    macros: macros,
    breakfast: processMeal(rawMealPlan.breakfast || {}, 'breakfast'),
    lunch: processMeal(rawMealPlan.lunch || {}, 'lunch'),
    dinner: processMeal(rawMealPlan.dinner || {}, 'dinner'),
    snack: processMeal(rawMealPlan.snack || {}, 'snack')
  };
  
  // calculate total calories
  formattedPlan.totalCalories = 
    formattedPlan.breakfast.calories + 
    formattedPlan.lunch.calories + 
    formattedPlan.dinner.calories + 
    formattedPlan.snack.calories;
    
  formattedPlan.totalProtein = 
    formattedPlan.breakfast.protein + 
    formattedPlan.lunch.protein + 
    formattedPlan.dinner.protein + 
    formattedPlan.snack.protein;
    
  formattedPlan.totalCarbs = 
    formattedPlan.breakfast.carbs + 
    formattedPlan.lunch.carbs + 
    formattedPlan.dinner.carbs + 
    formattedPlan.snack.carbs;
    
  formattedPlan.totalFat = 
    formattedPlan.breakfast.fat + 
    formattedPlan.lunch.fat + 
    formattedPlan.dinner.fat + 
    formattedPlan.snack.fat;
  
  // Log the formatted plan to check values
  console.log("Formatted meal plan (macros check):");
  console.log(`Breakfast - Protein: ${formattedPlan.breakfast.protein}g, Carbs: ${formattedPlan.breakfast.carbs}g, Fat: ${formattedPlan.breakfast.fat}g`);
  console.log(`Lunch - Protein: ${formattedPlan.lunch.protein}g, Carbs: ${formattedPlan.lunch.carbs}g, Fat: ${formattedPlan.lunch.fat}g`);
  console.log(`Dinner - Protein: ${formattedPlan.dinner.protein}g, Carbs: ${formattedPlan.dinner.carbs}g, Fat: ${formattedPlan.dinner.fat}g`);
  console.log(`Snack - Protein: ${formattedPlan.snack.protein}g, Carbs: ${formattedPlan.snack.carbs}g, Fat: ${formattedPlan.snack.fat}g`);
  console.log(`Totals - Protein: ${formattedPlan.totalProtein}g, Carbs: ${formattedPlan.totalCarbs}g, Fat: ${formattedPlan.totalFat}g`);
  
  // Make sure values are numbers, not strings
  formattedPlan.breakfast.protein = Number(formattedPlan.breakfast.protein || 0);
  formattedPlan.breakfast.carbs = Number(formattedPlan.breakfast.carbs || 0);
  formattedPlan.breakfast.fat = Number(formattedPlan.breakfast.fat || 0);
  
  formattedPlan.lunch.protein = Number(formattedPlan.lunch.protein || 0);
  formattedPlan.lunch.carbs = Number(formattedPlan.lunch.carbs || 0);
  formattedPlan.lunch.fat = Number(formattedPlan.lunch.fat || 0);
  
  formattedPlan.dinner.protein = Number(formattedPlan.dinner.protein || 0);
  formattedPlan.dinner.carbs = Number(formattedPlan.dinner.carbs || 0);
  formattedPlan.dinner.fat = Number(formattedPlan.dinner.fat || 0);
  
  formattedPlan.snack.protein = Number(formattedPlan.snack.protein || 0);
  formattedPlan.snack.carbs = Number(formattedPlan.snack.carbs || 0);
  formattedPlan.snack.fat = Number(formattedPlan.snack.fat || 0);
  
  // Set fallback values if nutritional data is missing or zero
  if (!formattedPlan.breakfast.protein && !formattedPlan.breakfast.carbs && !formattedPlan.breakfast.fat) {
    formattedPlan.breakfast.protein = Math.round(macros.protein * 0.25);
    formattedPlan.breakfast.carbs = Math.round(macros.carbs * 0.30);
    formattedPlan.breakfast.fat = Math.round(macros.fat * 0.15);
  }
  
  if (!formattedPlan.lunch.protein && !formattedPlan.lunch.carbs && !formattedPlan.lunch.fat) {
    formattedPlan.lunch.protein = Math.round(macros.protein * 0.35);
    formattedPlan.lunch.carbs = Math.round(macros.carbs * 0.35);
    formattedPlan.lunch.fat = Math.round(macros.fat * 0.30);
  }
  
  if (!formattedPlan.dinner.protein && !formattedPlan.dinner.carbs && !formattedPlan.dinner.fat) {
    formattedPlan.dinner.protein = Math.round(macros.protein * 0.30);
    formattedPlan.dinner.carbs = Math.round(macros.carbs * 0.25);
    formattedPlan.dinner.fat = Math.round(macros.fat * 0.40);
  }
  
  if (!formattedPlan.snack.protein && !formattedPlan.snack.carbs && !formattedPlan.snack.fat) {
    formattedPlan.snack.protein = Math.round(macros.protein * 0.10);
    formattedPlan.snack.carbs = Math.round(macros.carbs * 0.10);
    formattedPlan.snack.fat = Math.round(macros.fat * 0.15);
  }
  
  // Recalculate totals after fixes
  formattedPlan.totalProtein = 
    formattedPlan.breakfast.protein + 
    formattedPlan.lunch.protein + 
    formattedPlan.dinner.protein + 
    formattedPlan.snack.protein;
    
  formattedPlan.totalCarbs = 
    formattedPlan.breakfast.carbs + 
    formattedPlan.lunch.carbs + 
    formattedPlan.dinner.carbs + 
    formattedPlan.snack.carbs;
    
  formattedPlan.totalFat = 
    formattedPlan.breakfast.fat + 
    formattedPlan.lunch.fat + 
    formattedPlan.dinner.fat + 
    formattedPlan.snack.fat;
  
  console.log("After fix - Meal plan (macros check):");
  console.log(`Breakfast - Protein: ${formattedPlan.breakfast.protein}g, Carbs: ${formattedPlan.breakfast.carbs}g, Fat: ${formattedPlan.breakfast.fat}g`);
  console.log(`Lunch - Protein: ${formattedPlan.lunch.protein}g, Carbs: ${formattedPlan.lunch.carbs}g, Fat: ${formattedPlan.lunch.fat}g`);
  console.log(`Dinner - Protein: ${formattedPlan.dinner.protein}g, Carbs: ${formattedPlan.dinner.carbs}g, Fat: ${formattedPlan.dinner.fat}g`);
  console.log(`Snack - Protein: ${formattedPlan.snack.protein}g, Carbs: ${formattedPlan.snack.carbs}g, Fat: ${formattedPlan.snack.fat}g`);
  console.log(`Totals - Protein: ${formattedPlan.totalProtein}g, Carbs: ${formattedPlan.totalCarbs}g, Fat: ${formattedPlan.totalFat}g`);
  
  return formattedPlan;
}

/**
 * deal with single meal data, add icon and other information
 */
function processMeal(meal, mealType) {
  // ensure default values
  const processedMeal = {
    name: meal.name || getDefaultMealName(mealType),
    ingredients: Array.isArray(meal.ingredients) ? meal.ingredients : getDefaultIngredients(mealType),
    calories: meal.calories || getDefaultCalories(mealType),
    protein: meal.protein || 0,
    carbs: meal.carbs || 0,
    fat: meal.fat || 0,
    type: mealType,
    icon: FOOD_ICONS[mealType] || FOOD_ICONS.default
  };
  
  // add icon to each ingredient
  if (Array.isArray(processedMeal.ingredients)) {
    processedMeal.ingredients = processedMeal.ingredients.map(ingredient => {
      // try to assign appropriate icon to each ingredient
      const foodType = getFoodTypeFromIngredient(ingredient);
      return {
        name: ingredient,
        icon: FOOD_ICONS[foodType] || FOOD_ICONS.default
      };
    });
  }
  
  return processedMeal;
}

/**
 *  based on ingredient name to infer food type
 */
function getFoodTypeFromIngredient(ingredient) {
  const lowerIngredient = ingredient.toLowerCase();
  
  // some simple judgment logic
  if (/apple|orange|banana|berry|fruit/i.test(lowerIngredient)) return 'fruit';
  if (/broccoli|spinach|carrot|lettuce|vegetable/i.test(lowerIngredient)) return 'vegetable';
  if (/rice|oat|bread|wheat|grain|pasta/i.test(lowerIngredient)) return 'grain';
  if (/chicken|beef|fish|egg|tofu|meat|protein/i.test(lowerIngredient)) return 'protein';
  if (/milk|yogurt|cheese|dairy/i.test(lowerIngredient)) return 'dairy';
  
  return 'default';
}

/**
 *  get default meal name
 */
function getDefaultMealName(mealType) {
  switch (mealType) {
    case 'breakfast': return 'Oatmeal with Fruits';
    case 'lunch': return 'Chicken Salad with Quinoa';
    case 'dinner': return 'Grilled Fish with Vegetables';
    case 'snack': return 'Greek Yogurt with Nuts';
    default: return 'Healthy Meal';
  }
}

/**
 *  get default ingredients
 */
function getDefaultIngredients(mealType) {
  switch (mealType) {
    case 'breakfast': return ['Oats', 'Milk', 'Fruits', 'Honey'];
    case 'lunch': return ['Chicken breast', 'Quinoa', 'Mixed vegetables', 'Olive oil'];
    case 'dinner': return ['Fish', 'Brown rice', 'Broccoli', 'Lemon'];
    case 'snack': return ['Greek yogurt', 'Mixed nuts', 'Honey'];
    default: return ['Mixed ingredients'];
  }
}

/**
 *  get default calories
 */
function getDefaultCalories(mealType) {
  switch (mealType) {
    case 'breakfast': return 400;
    case 'lunch': return 600;
    case 'dinner': return 500;
    case 'snack': return 200;
    default: return 400;
  }
}

/**
 *  get fallback meal plan
 */
function getFallbackMealPlan(calorieNeeds, macros, dietPreference) {
  const breakfastCal = Math.round(calorieNeeds * 0.25);
  const lunchCal = Math.round(calorieNeeds * 0.35);
  const dinnerCal = Math.round(calorieNeeds * 0.30);
  const snackCal = Math.round(calorieNeeds * 0.10);
  
  let breakfast, lunch, dinner, snack;
  
  // based on diet preference to choose different default meal
  if (dietPreference === 'vegan' || dietPreference === 'vegetarian') {
    breakfast = {
      name: 'Plant-based Yogurt with Berries and Granola',
      ingredients: ['Plant yogurt', 'Mixed berries', 'Granola', 'Maple syrup'],
      calories: breakfastCal,
      protein: Math.round(macros.protein * 0.2),
      carbs: Math.round(macros.carbs * 0.3),
      fat: Math.round(macros.fat * 0.15),
      type: 'breakfast',
      icon: FOOD_ICONS.breakfast
    };
    
    lunch = {
      name: 'Quinoa Bowl with Roasted Vegetables',
      ingredients: ['Quinoa', 'Roasted vegetables', 'Chickpeas', 'Tahini dressing'],
      calories: lunchCal,
      protein: Math.round(macros.protein * 0.3),
      carbs: Math.round(macros.carbs * 0.35),
      fat: Math.round(macros.fat * 0.3),
      type: 'lunch',
      icon: FOOD_ICONS.lunch
    };
    
    dinner = {
      name: 'Lentil and Vegetable Stew',
      ingredients: ['Lentils', 'Mixed vegetables', 'Tomato sauce', 'Herbs'],
      calories: dinnerCal,
      protein: Math.round(macros.protein * 0.35),
      carbs: Math.round(macros.carbs * 0.25),
      fat: Math.round(macros.fat * 0.3),
      type: 'dinner',
      icon: FOOD_ICONS.dinner
    };
    
    snack = {
      name: 'Mixed Nuts and Dried Fruits',
      ingredients: ['Almonds', 'Walnuts', 'Dried apricots', 'Pumpkin seeds'],
      calories: snackCal,
      protein: Math.round(macros.protein * 0.15),
      carbs: Math.round(macros.carbs * 0.1),
      fat: Math.round(macros.fat * 0.25),
      type: 'snack',
      icon: FOOD_ICONS.snack
    };
  } else if (dietPreference === 'lowCarb') {
    breakfast = {
      name: 'Scrambled Eggs with Avocado',
      ingredients: ['Eggs', 'Avocado', 'Spinach', 'Olive oil'],
      calories: breakfastCal,
      protein: Math.round(macros.protein * 0.25),
      carbs: Math.round(macros.carbs * 0.15),
      fat: Math.round(macros.fat * 0.3),
      type: 'breakfast',
      icon: FOOD_ICONS.breakfast
    };
    
    lunch = {
      name: 'Grilled Chicken Salad',
      ingredients: ['Chicken breast', 'Mixed greens', 'Cucumber', 'Olive oil'],
      calories: lunchCal,
      protein: Math.round(macros.protein * 0.4),
      carbs: Math.round(macros.carbs * 0.2),
      fat: Math.round(macros.fat * 0.3),
      type: 'lunch',
      icon: FOOD_ICONS.lunch
    };
    
    dinner = {
      name: 'Baked Salmon with Vegetables',
      ingredients: ['Salmon', 'Broccoli', 'Cauliflower', 'Butter'],
      calories: dinnerCal,
      protein: Math.round(macros.protein * 0.35),
      carbs: Math.round(macros.carbs * 0.15),
      fat: Math.round(macros.fat * 0.4),
      type: 'dinner',
      icon: FOOD_ICONS.dinner
    };
    
    snack = {
      name: 'Cheese and Olives',
      ingredients: ['Cheese', 'Olives', 'Nuts'],
      calories: snackCal,
      protein: Math.round(macros.protein * 0.15),
      carbs: Math.round(macros.carbs * 0.05),
      fat: Math.round(macros.fat * 0.25),
      type: 'snack',
      icon: FOOD_ICONS.snack
    };
  } else {
    // balanced or highProtein
    breakfast = {
      name: 'Oatmeal with Blueberries',
      ingredients: ['Oats', 'Milk', 'Blueberries', 'Honey'],
      calories: breakfastCal,
      protein: Math.round(macros.protein * 0.25),
      carbs: Math.round(macros.carbs * 0.3),
      fat: Math.round(macros.fat * 0.15),
      type: 'breakfast',
      icon: FOOD_ICONS.breakfast
    };
    
    lunch = {
      name: 'Chicken Salad with Quinoa',
      ingredients: ['Chicken breast', 'Quinoa', 'Mixed vegetables', 'Olive oil'],
      calories: lunchCal,
      protein: Math.round(macros.protein * 0.35),
      carbs: Math.round(macros.carbs * 0.35),
      fat: Math.round(macros.fat * 0.3),
      type: 'lunch',
      icon: FOOD_ICONS.lunch
    };
    
    dinner = {
      name: 'Baked Salmon with Vegetables',
      ingredients: ['Salmon', 'Brown rice', 'Vegetables', 'Olive oil'],
      calories: dinnerCal,
      protein: Math.round(macros.protein * 0.3),
      carbs: Math.round(macros.carbs * 0.25),
      fat: Math.round(macros.fat * 0.4),
      type: 'dinner',
      icon: FOOD_ICONS.dinner
    };
    
    snack = {
      name: 'Greek Yogurt with Nuts',
      ingredients: ['Greek yogurt', 'Mixed nuts', 'Honey'],
      calories: snackCal,
      protein: Math.round(macros.protein * 0.1),
      carbs: Math.round(macros.carbs * 0.1),
      fat: Math.round(macros.fat * 0.15),
      type: 'snack',
      icon: FOOD_ICONS.snack
    };
  }
  
  // process ingredients, add icon
  const processIngredients = (ingredients) => {
    return ingredients.map(ingredient => {
      const foodType = getFoodTypeFromIngredient(ingredient);
      return {
        name: ingredient,
        icon: FOOD_ICONS[foodType] || FOOD_ICONS.default
      };
    });
  };
  
  breakfast.ingredients = processIngredients(breakfast.ingredients);
  lunch.ingredients = processIngredients(lunch.ingredients);
  dinner.ingredients = processIngredients(dinner.ingredients);
  snack.ingredients = processIngredients(snack.ingredients);
  
  const fallbackPlan = {
    date: new Date().toISOString().split('T')[0],
    calorieNeeds: calorieNeeds,
    macros: macros,
    breakfast,
    lunch,
    dinner,
    snack,
    totalCalories: breakfastCal + lunchCal + dinnerCal + snackCal,
    totalProtein: breakfast.protein + lunch.protein + dinner.protein + snack.protein,
    totalCarbs: breakfast.carbs + lunch.carbs + dinner.carbs + snack.carbs,
    totalFat: breakfast.fat + lunch.fat + dinner.fat + snack.fat
  };
  
  return fallbackPlan;
}

/**
 *  save meal plan to database
 */
async function saveMealPlan(uid, mealPlan) {
  try {
    const mealPlansRef = db.collection("users").doc(uid).collection("mealPlans");
    
    // check if there is already a plan for today
    const today = new Date().toISOString().split('T')[0];
    const existingQuery = await mealPlansRef.where("date", "==", today).get();
    
    if (!existingQuery.empty) {
      // update existing record
      const docId = existingQuery.docs[0].id;
      await mealPlansRef.doc(docId).update({
        ...mealPlan,
        updatedAt: Timestamp.now()
      });
      
      return docId;
    } else {
      // create new record
      const result = await mealPlansRef.add({
        ...mealPlan,
        createdAt: Timestamp.now()
      });
      
      return result.id;
    }
  } catch (error) {
    console.error("Error saving meal plan:", error);
    throw error;
  }
}
