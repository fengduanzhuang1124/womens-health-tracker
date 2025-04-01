// src/data/menstrualAdvice.js

export const durationAdvice = [
    {
      condition: (avg) => avg < 3,
      tips: [
        "⚠️ Periods are shorter than average. May indicate hormonal imbalance.",
        "🩸 Consider checking hormone levels with a doctor.",
      ],
    },
    {
      condition: (avg) => avg > 7,
      tips: [
        "⚠️ Periods longer than 7 days may signal underlying health issues.",
        "🧘‍♀️ Manage stress and monitor flow regularly.",
      ],
    },
    {
      condition: (avg) => avg >= 3 && avg <= 7,
      tips: ["✅ Your period duration is within the typical range (3–7 days)."],
    },
  ];
  
  export const cycleAdvice = [
    {
      condition: (cycle) => cycle < 21,
      tips: [
        "📉 Short cycles (<21 days) may suggest ovulatory issues.",
        "🍲 Eat iron-rich foods (like spinach, lentils) and track fatigue.",
      ],
    },
    {
      condition: (cycle) => cycle > 35,
      tips: [
        "📈 Long cycles (>35 days) might be linked to PCOS or thyroid issues.",
        "🔍 Consider tracking ovulation and reviewing with a specialist.",
      ],
    },
    {
      condition: (cycle) => cycle >= 21 && cycle <= 35,
      tips: [
        "🌿 Cycle length is in the normal range (21–35 days).",
        "💧 Stay hydrated and keep a consistent sleep schedule.",
      ],
    },
  ];
  