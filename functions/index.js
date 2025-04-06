import functions from "firebase-functions";
import OpenAI from "openai";
import cors from "cors";

const corsHandler = cors({ origin: true });

const openai = new OpenAI({
  apiKey: functions.config().openai.key,
});

export const generateHealthAdvice = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    try {
      const { cycle, duration } = req.body;

      const prompt = `The user's menstrual cycle is ${cycle} days and their period lasts ${duration} days. Please provide a friendly and medically-informed suggestion in 2–3 sentences.`;

      const chatCompletion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      });

      const advice = chatCompletion.choices[0].message.content;
      res.status(200).json({ advice });
    } catch (error) {
      console.error("OpenAI Error:", error.message);
      res.status(500).json({ error: "AI generation failed." });
    }
  });
});
