import { db } from "../config/firebaseAdmin.js";
import { Timestamp } from "firebase-admin/firestore";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 食物类型和emoji图标映射
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
 * 获取用户的餐食推荐
 * 基于用户的体重、目标体重和其他健康数据生成个性化餐食计划
 */
export const getMealRecommendations = async (req, res) => {
  try {
    const uid = req.user.uid;
    
    // 获取请求中的参数或从用户资料中获取
    let { 
      currentWeight, 
      goalWeight, 
      height, 
      age, 
      gender, 
      activityLevel, 
      dietPreference 
    } = req.query;
    
    // 如果请求中没有参数，从用户资料中获取
    if (!currentWeight || !goalWeight) {
      // 获取用户最新体重记录
      const weightsRef = db.collection("users").doc(uid).collection("weightRecords");
      const weightSnapshot = await weightsRef.orderBy("date", "desc").limit(1).get();
      
      if (!weightSnapshot.empty) {
        currentWeight = weightSnapshot.docs[0].data().weight;
      }
      
      // 获取用户资料信息
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
    
    // 如果仍然缺少必要数据，返回错误
    if (!currentWeight || !goalWeight) {
      return res.status(400).json({ 
        error: "Missing required parameters. Please provide weight data or update your profile." 
      });
    }
    
    // 将参数转换为正确的类型
    currentWeight = Number(currentWeight);
    goalWeight = Number(goalWeight);
    height = Number(height || 165);
    age = Number(age || 30);
    
    // 计算每日所需卡路里
    const calorieNeeds = calculateCalorieNeeds(
      currentWeight, 
      goalWeight, 
      height, 
      age, 
      gender, 
      activityLevel
    );
    
    // 计算宏量营养素分配
    const macros = calculateMacros(calorieNeeds, dietPreference);
    
    // 获取AI生成的餐食计划
    const mealPlan = await generateAIMealPlan(
      currentWeight, 
      goalWeight, 
      calorieNeeds, 
      macros, 
      dietPreference
    );
    
    // 保存用户的餐食计划到数据库
    await saveMealPlan(uid, mealPlan);
    
    res.status(200).json(mealPlan);
  } catch (error) {
    console.error("Error generating meal recommendations:", error);
    res.status(500).json({ error: "Failed to generate meal recommendations" });
  }
};

/**
 * 更新用户的饮食偏好
 */
export const updateDietPreferences = async (req, res) => {
  try {
    const uid = req.user.uid;
    const { dietPreference } = req.body;
    
    // 验证饮食偏好是否有效
    const validPreferences = ['balanced', 'lowCarb', 'highProtein', 'vegetarian', 'vegan'];
    if (!dietPreference || !validPreferences.includes(dietPreference)) {
      return res.status(400).json({ 
        error: "Invalid diet preference. Valid options are: balanced, lowCarb, highProtein, vegetarian, vegan" 
      });
    }
    
    // 更新用户资料
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
 * 获取用户保存的餐食计划历史
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
 * 根据体重目标和身体数据计算每日所需卡路里
 */
function calculateCalorieNeeds(currentWeight, goalWeight, height, age, gender, activityLevel) {
  // 基础代谢率 (BMR)
  let bmr;
  if (gender === 'female') {
    bmr = 655 + (9.6 * currentWeight) + (1.8 * height) - (4.7 * age);
  } else {
    bmr = 66 + (13.7 * currentWeight) + (5 * height) - (6.8 * age);
  }
  
  // 根据活动水平调整
  const activityMultipliers = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    veryActive: 1.9
  };
  
  const tdee = bmr * (activityMultipliers[activityLevel] || 1.2);
  
  // 根据目标调整卡路里
  const weightDifference = goalWeight - currentWeight;
  // 如果目标是减重，每天减少500卡路里；如果是增重，每天增加500卡路里
  const calorieAdjustment = weightDifference < 0 ? -500 : (weightDifference > 0 ? 500 : 0);
  
  return Math.round(tdee + calorieAdjustment);
}

/**
 * 计算宏量营养素分配
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
    protein: Math.round((totalCalories * proteinPercentage) / 4), // 4卡路里每克蛋白质
    carbs: Math.round((totalCalories * carbPercentage) / 4),      // 4卡路里每克碳水
    fat: Math.round((totalCalories * fatPercentage) / 9)          // 9卡路里每克脂肪
  };
}

/**
 * 使用OpenAI生成餐食计划
 */
async function generateAIMealPlan(currentWeight, goalWeight, calorieNeeds, macros, dietPreference) {
  try {
    // 分配卡路里到各餐
    const breakfastCal = Math.round(calorieNeeds * 0.25); // 25% 早餐
    const lunchCal = Math.round(calorieNeeds * 0.35);     // 35% 午餐
    const dinnerCal = Math.round(calorieNeeds * 0.30);    // 30% 晚餐
    const snackCal = Math.round(calorieNeeds * 0.10);     // 10% 零食
    
    // 构建提示
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

    // 解析生成的JSON响应
    const responseContent = completion.choices[0].message.content;
    let mealPlanData;
    
    try {
      mealPlanData = JSON.parse(responseContent);
    } catch (err) {
      console.error("Error parsing OpenAI response:", err);
      // 如果解析失败，返回备用餐食计划
      return getFallbackMealPlan(calorieNeeds, macros, dietPreference);
    }
    
    // 处理并格式化生成的餐食计划
    return formatMealPlan(mealPlanData, calorieNeeds, macros);
  } catch (error) {
    console.error("Error generating AI meal plan:", error);
    return getFallbackMealPlan(calorieNeeds, macros, dietPreference);
  }
}

/**
 * 格式化餐食计划，添加图标和其他必要信息
 */
function formatMealPlan(rawMealPlan, calorieNeeds, macros) {
  // 这个函数处理从OpenAI返回的原始数据，确保格式一致
  const formattedPlan = {
    date: new Date().toISOString().split('T')[0],
    calorieNeeds: calorieNeeds,
    macros: macros,
    breakfast: processMeal(rawMealPlan.breakfast || {}, 'breakfast'),
    lunch: processMeal(rawMealPlan.lunch || {}, 'lunch'),
    dinner: processMeal(rawMealPlan.dinner || {}, 'dinner'),
    snack: processMeal(rawMealPlan.snack || {}, 'snack')
  };
  
  // 计算总摄入量
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
  
  return formattedPlan;
}

/**
 * 处理单个餐食数据，添加图标和其他信息
 */
function processMeal(meal, mealType) {
  // 确保有默认值
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
  
  // 为每个原料添加图标
  if (Array.isArray(processedMeal.ingredients)) {
    processedMeal.ingredients = processedMeal.ingredients.map(ingredient => {
      // 尝试为每个原料分配适当的图标
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
 * 根据原料名称推断食物类型
 */
function getFoodTypeFromIngredient(ingredient) {
  const lowerIngredient = ingredient.toLowerCase();
  
  // 一些简单的判断逻辑
  if (/apple|orange|banana|berry|fruit/i.test(lowerIngredient)) return 'fruit';
  if (/broccoli|spinach|carrot|lettuce|vegetable/i.test(lowerIngredient)) return 'vegetable';
  if (/rice|oat|bread|wheat|grain|pasta/i.test(lowerIngredient)) return 'grain';
  if (/chicken|beef|fish|egg|tofu|meat|protein/i.test(lowerIngredient)) return 'protein';
  if (/milk|yogurt|cheese|dairy/i.test(lowerIngredient)) return 'dairy';
  
  return 'default';
}

/**
 * 获取默认餐食名称
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
 * 获取默认原料
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
 * 获取默认卡路里
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
 * 获取备用餐食计划
 */
function getFallbackMealPlan(calorieNeeds, macros, dietPreference) {
  const breakfastCal = Math.round(calorieNeeds * 0.25);
  const lunchCal = Math.round(calorieNeeds * 0.35);
  const dinnerCal = Math.round(calorieNeeds * 0.30);
  const snackCal = Math.round(calorieNeeds * 0.10);
  
  let breakfast, lunch, dinner, snack;
  
  // 根据饮食偏好选择不同的默认餐食
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
  
  // 处理原料，添加图标
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
 * 保存餐食计划到数据库
 */
async function saveMealPlan(uid, mealPlan) {
  try {
    const mealPlansRef = db.collection("users").doc(uid).collection("mealPlans");
    
    // 检查是否已有当天的计划
    const today = new Date().toISOString().split('T')[0];
    const existingQuery = await mealPlansRef.where("date", "==", today).get();
    
    if (!existingQuery.empty) {
      // 更新现有记录
      const docId = existingQuery.docs[0].id;
      await mealPlansRef.doc(docId).update({
        ...mealPlan,
        updatedAt: Timestamp.now()
      });
      
      return docId;
    } else {
      // 创建新记录
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
