
import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // 使用 .env 中的密钥
});

export const getHealthAdvice = async (req, res) => {
    try {
      const { cycle, duration } = req.body;
  
      const prompt = `The user's menstrual cycle is ${cycle} days and their period lasts ${duration} days. Please provide a friendly and medically-informed suggestion in 2–3 sentences.`;
  
      const completion = await openai.chat.completions.create({
        model:  "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      });
  
      const advice = completion.choices[0].message.content;
      res.status(200).json({ advice });
    } catch (err) {
      console.error("AI Error:", err.message);
      res.status(500).json({ error: "Failed to generate AI advice." });
    }
  };
  export const getDailySleepAdvice = async (req, res) => {
    try {
      const { duration, deepSleep, effectiveSleep, sleepLatency, wakeCount, dreaming, activity } = req.body;
  
      const prompt = `The user slept ${duration} hours with ${deepSleep} hours of deep sleep and ${effectiveSleep} hours of effective sleep. They experienced ${wakeCount} wake ups, had ${sleepLatency} minutes of sleep latency, and ${dreaming === "yes" ? "did" : "did not"} dream. Before bed, they engaged in: ${activity || "no specific activity"}. Please provide personalized sleep advice in a friendly tone. Include ideas for improving sleep quality, habits, and when to consider professional help.`;
  
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      });
  
      const advice = completion.choices[0].message.content;
      res.status(200).json({ advice });
    } catch (err) {
      console.error("AI Daily Advice Error:", err.message);
      res.status(500).json({ error: "Failed to generate daily sleep advice." });
    }
  };
  
  // 📊 睡眠趋势建议
  export const getTrendSleepAdvice = async (req, res) => {
    try {
      const { records } = req.body; // [{ date, duration }]
  
      const summary = records.map(r => `${r.date}: ${r.duration} hrs`).join("; ");
      const prompt = `The user's recent sleep durations are as follows: ${summary}. Please analyze their sleep trends, provide tips on improving sleep regularity, and offer encouragement in a supportive tone. Suggest an ideal bedtime routine and highlight any concerning patterns.`;
  
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.75,
      });
  
      const advice = completion.choices[0].message.content;
      res.status(200).json({ advice });
    } catch (err) {
      console.error("AI Trend Advice Error:", err.message);
      res.status(500).json({ error: "Failed to generate sleep trend advice." });
    }
  };
  