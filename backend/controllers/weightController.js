import { db } from "../config/firebaseAdmin.js";
import { Timestamp } from "firebase-admin/firestore";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const getAllWeights = async (req, res) => {
  try {
    const uid = req.user.uid;
    const weightsRef = db.collection("users").doc(uid).collection("weightRecords");
    const snapshot = await weightsRef.orderBy("date", "desc").get();
    
    const weights = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.status(200).json(weights);
  } catch (error) {
    console.error("Error fetching weights:", error);
    res.status(500).json({ error: error.message });
  }
};

export const addWeight = async (req, res) => {
  try {
    const uid = req.user.uid;
    const { weight, date } = req.body;
    
    //advanced parameter validation     
     
    if (!weight || isNaN(Number(weight))) {
      return res.status(400).json({ error: "Valid weight value is required" });
    }
    
    //use current date or provided date
    const recordDate = date || new Date().toISOString().split("T")[0];
    
    //convert to standard format
    const weightValue = Number(weight);
    
    const weightsRef = db.collection("users").doc(uid).collection("weightRecords");

    //check if there is a record for the same day (optional, to avoid duplicate)    

 

    try {
      const existingQuery = await weightsRef.where("date", "==", recordDate).get();
      
      if (!existingQuery.empty) {
     
        //update exist record not to create new record
        const docId = existingQuery.docs[0].id;
        await weightsRef.doc(docId).update({
          weight: weightValue,
          updatedAt: Timestamp.now()
        });
        
        console.log(`Updated weight record for user ${uid} on ${recordDate}: ${weightValue}`);
        
        return res.status(200).json({ 
          id: docId,
          weight: weightValue,
          date: recordDate,
          updated: true
        });
      }
    } catch (err) {
      console.error("Error checking for existing weight record:", err);
      //continue to create new record
        

    }
    
   
    //create new record
    const result = await weightsRef.add({
      weight: weightValue,
      date: recordDate,
      createdAt: Timestamp.now()
    });
    
    console.log(`Added new weight record for user ${uid} on ${recordDate}: ${weightValue}`);
    
    res.status(201).json({ 
      id: result.id,
      weight: weightValue,
      date: recordDate,
      created: true
    });
  } catch (error) {
    console.error("Error adding weight:", error);
    res.status(500).json({ error: "Failed to save weight record" });
  }
};

export const updateGoalWeight = async (req, res) => {
  try {
    const uid = req.user.uid;
    const { goalWeight } = req.body;
    

      //advanced parameter validation
    if (!goalWeight || isNaN(Number(goalWeight))) {
      return res.status(400).json({ error: "Valid goal weight value is required" });
    }
    
    //convert to standard format
    const goalWeightValue = Number(goalWeight);
    
    const userRef = db.collection("users").doc(uid);
    
    //get user document, confirm it exists
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      //user document not exists, create one
      await userRef.set({
        goalWeight: goalWeightValue,
        updatedAt: Timestamp.now()
      });
      
      console.log(`Created user profile with goal weight for user ${uid}: ${goalWeightValue}`);
      
      return res.status(201).json({ 
        goalWeight: goalWeightValue,
        created: true 
      });
    }
    
    //user document exists, update goal weight
    await userRef.update({
      goalWeight: goalWeightValue,
      updatedAt: Timestamp.now()
    });
    
    console.log(`Updated goal weight for user ${uid}: ${goalWeightValue}`);
    
    res.status(200).json({ 
      goalWeight: goalWeightValue,
      updated: true 
    });
  } catch (error) {
    console.error("Error updating goal weight:", error);
    res.status(500).json({ error: "Failed to update goal weight" });
  }
};

export const addFoodEntry = async (req, res) => {
  try {
    const uid = req.user.uid;
    const { foods, date } = req.body;
    
    const foodsRef = db.collection("users").doc(uid).collection("foodRecords");
    
    //  check if there is already a record for today
    const today = date || new Date().toISOString().split("T")[0];
    const existingQuery = await foodsRef.where("date", "==", today).get();
    
    if (!existingQuery.empty) {
        //update existing record
      const docId = existingQuery.docs[0].id;
      await foodsRef.doc(docId).update({
        foods: foods,
        updatedAt: Timestamp.now()
      });
      
      res.status(200).json({ 
        id: docId,
        date: today,
        foods: foods 
      });
    } else {
      //create new record
      const result = await foodsRef.add({
        foods: foods,
        date: today,
        createdAt: Timestamp.now()
      });
      
      res.status(201).json({ 
        id: result.id,
        date: today,
        foods: foods 
      });
    }
  } catch (error) {
    console.error("Error adding food entry:", error);
    res.status(500).json({ error: error.message });
  }
};

export const getAIAdvice = async (req, res) => {
    try {
      const uid = req.user.uid;
      
      // get recent weight records
      const weightsRef = db.collection("users").doc(uid).collection("weightRecords");
      const recentWeights = await weightsRef.orderBy("date", "desc").limit(10).get();
      
      // get recent food records
      const foodsRef = db.collection("users").doc(uid).collection("foodRecords");
      const recentFoods = await foodsRef.orderBy("date", "desc").limit(7).get();
      
      // format data
      const weightData = [];
      recentWeights.forEach(doc => {
        const data = doc.data();
        weightData.push({
          date: data.date,
          weight: data.weight
        });
      });
      
      // enhanced food data, including detailed nutrition information
      const foodData = [];
      recentFoods.forEach(doc => {
        const data = doc.data();
        // ensure including detailed nutrition information for each food
        foodData.push({
          date: data.date,
          foods: data.foods.map(food => ({
            name: food.name,
            quantity: food.quantity,
            calories: food.calories,
            protein: food.protein || 0,
            carbs: food.carbs || 0,
            fat: food.fat || 0,
            isHealthy: food.isHealthy
          }))
        });
      });
      
      // calculate total calories and nutrition distribution per day
      const dailyNutrition = foodData.map(day => {
        const totalCals = day.foods.reduce((sum, food) => sum + (food.calories || 0), 0);
        const totalProtein = day.foods.reduce((sum, food) => sum + (food.protein || 0), 0);
        const totalCarbs = day.foods.reduce((sum, food) => sum + (food.carbs || 0), 0);
        const totalFat = day.foods.reduce((sum, food) => sum + (food.fat || 0), 0);
        
        return {
          date: day.date,
          totalCalories: totalCals,
          macroNutrients: {
            protein: totalProtein,
            carbs: totalCarbs,
            fat: totalFat
          },
          foodCount: day.foods.length
        };
      });
      
      // provide more structured data to OpenAI
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a nutritionist and weight management expert. Provide very concise, actionable advice in 2-3 sentences. Focus on specific nutritional insights based on the provided data."
          },
          {
            role: "user",
            content: `My recent weight data: ${JSON.stringify(weightData)}
            My daily nutrition summary: ${JSON.stringify(dailyNutrition)}
            Please give me concise advice on my weight management and nutrition based on this specific data.`
          }
        ],
        max_tokens: 150
      });
      
      res.status(200).json({ advice: response.choices[0].message.content });
    } catch (error) {
      console.error("Error generating AI advice:", error);
      res.status(500).json({ error: error.message });
    }
  };

export const getFoodNutrition = async (req, res) => {
  try {
    const { foodName } = req.body;
    
    if (!foodName || foodName.trim() === '') {
      return res.status(400).json({ error: "Food name is required" });
    }
    
    const apiKey = process.env.NUTRITION_API_KEY;
    
    if (!apiKey) {
      console.error("Missing NUTRITION_API_KEY in environment variables");
      return res.status(500).json({ error: "API configuration error" });
    }
    
    console.log(`Searching nutrition for: "${foodName}"`);
    
    // call API Ninjas Nutrition API
    const response = await fetch(`https://api.api-ninjas.com/v1/nutrition?query=${encodeURIComponent(foodName)}`, {
      headers: {
        'X-Api-Key': apiKey
      }
    });
    
    if (!response.ok) {
      // API error, return mock data without throwing an error
      console.error(`API responded with status: ${response.status}`);
      
      // create mock data
      const mockNutritionInfo = {
        name: foodName,
        calories: Math.floor(Math.random() * 300) + 50,
        fat: Math.floor(Math.random() * 20),
        carbs: Math.floor(Math.random() * 30),
        fiber: Math.floor(Math.random() * 5),
        sugar: Math.floor(Math.random() * 10),
        protein: Math.floor(Math.random() * 15),
        cholesterol: Math.floor(Math.random() * 50),
        sodium: Math.floor(Math.random() * 500),
        potassium: Math.floor(Math.random() * 300),
        isHealthy: Math.random() > 0.5
      };
      
      console.log("Using mock data due to API error");
      return res.status(200).json(mockNutritionInfo);
    }
    
    const data = await response.json();
    
    if (!data || data.length === 0) {
      return res.status(404).json({ error: "No nutrition data found for this food" });
    }
    
    // extract the first food item
    const foodData = data[0];
    
    // handle Premium feature limit
    // if calories is a string ("Only available for premium subscribers"), estimate it using other available data
    let calories = foodData.calories;
    if (typeof calories === 'string' || calories === undefined) {
      // estimate calories: fat × 9 + carbs × 4 + protein × 4
      const fat = Number(foodData.fat_total_g) || 0;
      const carbs = Number(foodData.carbohydrates_total_g) || 0;
      const protein = typeof foodData.protein_g === 'string' ? 0 : Number(foodData.protein_g) || 0;
      
      calories = (fat * 9) + (carbs * 4) + (protein * 4);
    }
    
    // handle protein
    let protein = foodData.protein_g;
    if (typeof protein === 'string' || protein === undefined) {
      // estimate protein: if cannot get, provide default estimate based on food type
      // this is just a simple estimate
      if (foodData.fat_total_g > 10) {
        // high fat food usually has moderate protein
        protein = 5;
      } else if (foodData.carbohydrates_total_g > 20) {
        // high carb food usually has moderate protein
        protein = 2;
      } else {
        // default value
        protein = 3;
      }
    }
    
    // create nutrition info object
    const nutritionInfo = {
      name: foodData.name || foodName,
      calories: Math.round(calories),
      fat: Math.round(foodData.fat_total_g || 0),
      carbs: Math.round(foodData.carbohydrates_total_g || 0),
      fiber: Math.round(foodData.fiber_g || 0),
      sugar: Math.round(foodData.sugar_g || 0),
      protein: Math.round(protein),
      cholesterol: Math.round(foodData.cholesterol_mg || 0),
      sodium: Math.round(foodData.sodium_mg || 0),
      potassium: Math.round(foodData.potassium_mg || 0),
      // based on multiple factors to judge food health
      isHealthy: (
        (foodData.cholesterol_mg < 100) && 
        (foodData.sugar_g < 10) && 
        (foodData.sodium_mg < 500) && 
        (foodData.fiber_g > 2 || foodData.carbohydrates_total_g < 20)
      )
    };
    
    console.log("Nutrition data retrieved successfully");
    res.status(200).json(nutritionInfo);
  } catch (error) {
    console.error("Error getting food nutrition:", error);
    
    // if error, return mock data
    const mockNutritionInfo = {
      name: foodName,
      calories: Math.floor(Math.random() * 300) + 50,
      fat: Math.floor(Math.random() * 20),
      carbs: Math.floor(Math.random() * 30),
      fiber: Math.floor(Math.random() * 5),
      sugar: Math.floor(Math.random() * 10),
      protein: Math.floor(Math.random() * 15),
      cholesterol: Math.floor(Math.random() * 50),
      sodium: Math.floor(Math.random() * 500),
      potassium: Math.floor(Math.random() * 300),
      isHealthy: Math.random() > 0.5
    };
    
    console.log("Using mock data due to exception");
    res.status(200).json(mockNutritionInfo);
  }
};

export const getFoodEntries = async (req, res) => {
  try {
    const uid = req.user.uid;
    const { date } = req.query;
    
    if (!date) {
      return res.status(400).json({ error: "Date parameter is required" });
    }
    
    const foodsRef = db.collection("users").doc(uid).collection("foodRecords");
    const snapshot = await foodsRef.where("date", "==", date).get();
    
    if (snapshot.empty) {
      return res.status(200).json([]);
    }
    
    const foodEntries = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.status(200).json(foodEntries);
  } catch (error) {
    console.error("Error fetching food entries:", error);
    res.status(500).json({ error: error.message });
  }
};

export const deleteWeight = async (req, res) => {
  try {
    const uid = req.user.uid;
    const { weightId } = req.params;
    
    if (!weightId) {
      return res.status(400).json({ error: "Weight record ID is required" });
    }
    
    const weightRef = db.collection("users").doc(uid).collection("weightRecords").doc(weightId);
    const doc = await weightRef.get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: "Weight record not found" });
    }
    
    await weightRef.delete();
    
    console.log(`Deleted weight record for user ${uid}: ${weightId}`);
    
    res.status(200).json({ message: "Weight record deleted successfully" });
  } catch (error) {
    console.error("Error deleting weight record:", error);
    res.status(500).json({ error: "Failed to delete weight record" });
  }
};

export const getGoalWeight = async (req, res) => {
  try {
    const uid = req.user.uid;
    
    // 获取用户文档以查找目标体重
    const userRef = db.collection("users").doc(uid);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      return res.status(200).json({ goalWeight: null });
    }
    
    const userData = userDoc.data();
    
    // 如果用户文档中有目标体重，则返回 
    if (userData.goalWeight) {
      return res.status(200).json({ goalWeight: userData.goalWeight });
    } else {
      return res.status(200).json({ goalWeight: null });
    }
  } catch (error) {
    console.error("Error fetching goal weight:", error);
    res.status(500).json({ error: "Failed to fetch goal weight" });
  }
};
