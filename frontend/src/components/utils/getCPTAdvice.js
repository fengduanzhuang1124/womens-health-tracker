// utils/getCPTAdvice.js
import API from "../../api";
import { getToken } from "./getAuthToken";

// 🧠 Analyze cycle & duration into health advice summary
const analyzeMenstrualHealth = (cycleLength, duration) => {
  const result = {
    cycleStatus: "normal",
    durationStatus: "normal",
    adviceTags: [],
  };

  if (cycleLength < 21) {
    result.cycleStatus = "short";
    result.adviceTags.push("Short cycle, possibly related to luteal phase issues. Monitor ovulation closely.");
  } else if (cycleLength > 35) {
    result.cycleStatus = "long";
    result.adviceTags.push("Long cycle, which may be linked to PCOS or hormonal imbalances.");
  } else {
    result.adviceTags.push("Normal cycle. Maintain a healthy lifestyle and routine.");
  }

  if (duration < 3) {
    result.durationStatus = "short";
    result.adviceTags.push("Short menstruation. Pay attention to whether the flow is unusually light or ends too quickly.");
  } else if (duration > 7) {
    result.durationStatus = "long";
    result.adviceTags.push("Long menstruation. Consider screening for fibroids or endometrial issues if symptoms persist.");
  } else {
    result.adviceTags.push("Normal menstruation. Gentle exercise and relaxation are recommended.");
  }

  return result;
};

// 🌸 Build English-language GPT prompt
const buildMenstrualPrompt = (cycleLength, duration) => {
  const summary = analyzeMenstrualHealth(cycleLength, duration);
  return `
Here is the menstrual health data:
- Average cycle length: ${cycleLength} days
- Average period duration: ${duration} days
- System assessment: ${summary.adviceTags.join("; ")}

Please provide a warm and empathetic personalized suggestion (total 80-100 words), covering these 5 aspects:
1. Daily self-care
2. Nutrition and hydration
3. Sleep and emotional well-being
4. Gentle exercise or relaxation practices
5. Medical attention if needed

Style: kind, encouraging, supportive — suitable for young women.
`;
};

export const getGPTAdvice = async (cycle, duration) => {
  try {
    const token = await getToken();
    const prompt = buildMenstrualPrompt(cycle, duration);

    const res = await API.post(
      "/api/ai-advice",
      { cycle, duration, prompt },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return res.data.advice;
  } catch (err) {
    console.error("AI suggestion error:", err.message);
    return "⚠️ AI suggestion could not be generated.";
  }
};
