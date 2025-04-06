import axios from "axios";

export const getGPTAdvice = async (cycle, duration) => {
  try {
    const res = await axios.post(
      " https://console.firebase.google.com/project/womens-health-tracker/overview", 
      { cycle, duration }
    );
    return res.data.advice;
  } catch (err) {
    console.error("AI suggestion error:", err.message);
    return "⚠️ AI suggestion could not be generated.";
  }
};
