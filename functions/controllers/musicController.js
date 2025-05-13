// controllers/musicController.js
import fetch from "node-fetch";

import {db} from "../config/firebaseAdmin.js";
import {Timestamp} from "firebase-admin/firestore";
import {OpenAI} from "openai";


console.log("✅ Using API Key:", process.env.FREESOUND_API_KEY ? "API Key found" : "API Key missing");
const openai = new OpenAI({apiKey: process.env.OPENAI_API_KEY});

export const getSleepBasedMusic = async (req, res) => {
  try {
    const uid = req.user.uid; // Get UID from authenticated user
    const {records, likedTracks = []} = req.body; // [{ date, duration }]

    if (!records || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({error: "No sleep records provided"});
    }

    // step 1: extract user's preferred tags
    let likedTags = [];

    // From request liked tracks
    if (likedTracks.length > 0) {
      likedTags = likedTracks
          .flatMap((track) => track.tags ? track.tags.split(",") : [])
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0);
    }
    // From database if needed
    else {
      try {
        const likedTracksRef = db.collection("users").doc(uid).collection("musicFeedback")
            .where("liked", "==", true);
        const likedTracksSnapshot = await likedTracksRef.get();

        if (!likedTracksSnapshot.empty) {
          const dbLikedTracks = [];
          likedTracksSnapshot.forEach((doc) => {
            dbLikedTracks.push(doc.data());
          });

          likedTags = dbLikedTracks
              .flatMap((track) => track.tags ? track.tags.split(",") : [])
              .map((tag) => tag.trim())
              .filter((tag) => tag.length > 0);
        }
      } catch (err) {
        console.error("Error fetching user's liked music tags:", err);
      }
    }

    // step 2: count the most used tags (max 5)
    const tagCount = {};
    likedTags.forEach((tag) => {
      tagCount[tag] = (tagCount[tag] || 0) + 1;
    });

    const topTags = Object.entries(tagCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map((entry) => entry[0]);

    // step 3: use OpenAI to generate keywords
    const summary = records.map((r) => `${r.date}: ${r.duration} hrs`).join("; ");
    const tagString = topTags.length > 0 ? topTags.join(", ") : "no specific preference";

    const prompt = `
      The user has the following sleep durations: ${summary}.
      Their preferred music tags are: ${tagString}.
      Please suggest 3-5 search keywords that match relaxing or sleep-enhancing music.
      Use short, lowercase keywords suitable for querying a sound API.
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{role: "user", content: prompt}],
      temperature: 0.6,
    });

    const responseText = completion.choices[0].message.content;
    const aiKeywords = responseText
        .split(/[,;\n]/)
        .map((k) => k.trim().toLowerCase())
        .filter((k) => k.length > 0);

    console.log(`AI generated keywords: ${aiKeywords.join(", ")}`);

    // step 4: build the query - use the AI generated keywords
    const query = aiKeywords.slice(0, 3).join(" "); // use the first 3 keywords

    console.log(`Generated music query from AI: "${query}"`);

    // step 5: call the Freesound API
    const url = `https://freesound.org/apiv2/search/text/?query=${encodeURIComponent(query)}&filter=duration:[30 TO 180]&fields=name,previews,tags,description,id&sort=rating_desc`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Token ${process.env.FREESOUND_API_KEY}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API request failed with status ${response.status}:`, errorText);
      throw new Error(`API request failed with status ${response.status}`);
    }

    const musicData = await response.json();

    // 后续逻辑与原代码相同...
    // 处理音乐数据，格式化结果，保存到历史记录等

    // check if there are enough results, if not, fallback to a broader query
    let trackResults = [];
    if (!musicData.results || musicData.results.length < 3) {
      // use the first AI keyword as fallback query
      const fallbackQuery = aiKeywords.length > 0 ? aiKeywords[0] : "relaxing";
      const fallbackUrl = `https://freesound.org/apiv2/search/text/?query=${encodeURIComponent(fallbackQuery)}&filter=duration:[30 TO 180]&fields=name,previews,tags,description,id&sort=rating_desc`;

      console.log(`Primary query returned insufficient results, using fallback query: "${fallbackQuery}"`);

      const fallbackResponse = await fetch(fallbackUrl, {
        headers: {
          Authorization: `Token ${process.env.FREESOUND_API_KEY}`,
        },
      });

      if (!fallbackResponse.ok) {
        const errorText = await fallbackResponse.text();
        console.error(`Fallback API request failed with status ${fallbackResponse.status}:`, errorText);
        throw new Error(`Fallback API request failed with status ${fallbackResponse.status}`);
      }

      const fallbackData = await fallbackResponse.json();
      trackResults = fallbackData.results || [];
    } else {
      trackResults = musicData.results;
    }

    // extract track information and handle missing data
    const allTracks = trackResults
        .filter((item) => item && item.previews && item.previews["preview-hq-mp3"])
        .map((item) => ({
          id: item.id ? String(item.id) : `track-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          name: item.name || "Unknown Track",
          src: item.previews["preview-hq-mp3"],
          description: item.description ? item.description.substring(0, 100) : "",
          tags: item.tags && Array.isArray(item.tags) ? item.tags.slice(0, 5).join(", ") : "",
        }));

    // randomize tracks to increase diversity
    const randomizedTracks = [];
    const trackCount = Math.min(5, allTracks.length);

    const tracksCopy = [...allTracks]; // create a copy to avoid modifying the original data
    for (let i = 0; i < trackCount; i++) {
      if (tracksCopy.length > 0) {
        const randomIndex = Math.floor(Math.random() * tracksCopy.length);
        randomizedTracks.push(tracksCopy[randomIndex]);
        tracksCopy.splice(randomIndex, 1); // remove the selected track
      }
    }

    console.log(`Returning ${randomizedTracks.length} tracks`);

    // save the recommendation history to Firebase
    try {
      const cleanTracks = randomizedTracks.map((track) => {
        return Object.entries(track).reduce((obj, [key, value]) => {
          if (value !== undefined && value !== null) {
            obj[key] = value;
          }
          return obj;
        }, {});
      });

      // create history record, including statistics
      const historyRecord = {
        timestamp: Timestamp.now(),
        query: query,
        aiKeywords: aiKeywords, // save the AI generated keywords, for review
        tracks: cleanTracks,
        sleepStats: {
          average: Number(records.reduce((sum, r) => sum + r.duration, 0) / records.length) || 0,
          variation: Number(Math.max(...records.map((r) => r.duration)) - Math.min(...records.map((r) => r.duration))) || 0,
          latest: Number(records[records.length - 1].duration) || 0,
        },
      };

      // verify the history record, ensure it is compatible with Firebase
      Object.entries(historyRecord.sleepStats).forEach(([key, value]) => {
        if (isNaN(value)) {
          historyRecord.sleepStats[key] = 0;
        }
      });

      // save it to Firebase
      await db.collection("users").doc(uid).collection("musicHistory").add(historyRecord);
      console.log("Music recommendation history saved successfully");
    } catch (err) {
      console.error("Failed to save music recommendation history:", err);
    }

    // return success response and tracks
    return res.status(200).json({
      tracks: randomizedTracks,
      query: query,
      stats: {
        average: records.reduce((sum, r) => sum + r.duration, 0) / records.length,
        variation: Math.max(...records.map((r) => r.duration)) - Math.min(...records.map((r) => r.duration)),
        latest: records[records.length - 1].duration,
      },
    });
  } catch (error) {
    console.error("Error in getSleepBasedMusic:", error);
    return res.status(500).json({error: "Failed to get music recommendations"});
  }
};

/**
 * Save user feedback on music tracks
 * @param {Object} req - Request with user ID, track ID, track data, and liked status
 * @param {Object} res - Response object
 */
export const saveMusicFeedback = async (req, res) => {
  try {
    const uid = req.user.uid;
    const {trackId, liked, track} = req.body;

    if (!trackId) {
      return res.status(400).json({error: "Track ID is required"});
    }

    // Validate track data
    if (!track || typeof track !== "object") {
      return res.status(400).json({error: "Valid track data is required"});
    }

    // Ensure we have a clean track object
    const cleanTrack = Object.entries(track).reduce((obj, [key, value]) => {
      if (value !== undefined && value !== null) {
        obj[key] = value;
      }
      return obj;
    }, {});

    // Add feedback document
    await db.collection("users").doc(uid).collection("musicFeedback").doc(trackId).set({
      trackId: trackId,
      liked: Boolean(liked),
      track: cleanTrack,
      timestamp: Timestamp.now(),
    });

    console.log(`User ${uid} ${liked ? "liked" : "disliked"} track ${trackId}`);

    return res.status(200).json({success: true});
  } catch (error) {
    console.error("Error saving music feedback:", error);
    return res.status(500).json({error: "Failed to save feedback"});
  }
};

/**
 * Get user's liked music tracks
 * @param {Object} req - Request with user ID
 * @param {Object} res - Response object
 */
export const getLikedMusic = async (req, res) => {
  try {
    const uid = req.user.uid;

    const likedTracksRef = db.collection("users").doc(uid).collection("musicFeedback")
        .where("liked", "==", true)
        .orderBy("timestamp", "desc")
        .limit(20);

    const likedTracksSnapshot = await likedTracksRef.get();

    const tracks = [];
    likedTracksSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.track) {
        tracks.push(data.track);
      }
    });

    return res.status(200).json({tracks});
  } catch (error) {
    console.error("Error getting liked music:", error);
    return res.status(500).json({error: "Failed to get liked music"});
  }
};

/**
 * Get music recommendation history
 * @param {Object} req - Request with user ID and optional limit
 * @param {Object} res - Response object
 */
export const getMusicHistory = async (req, res) => {
  try {
    const uid = req.user.uid;
    const limit = parseInt(req.query.limit) || 10;

    const historyRef = db.collection("users").doc(uid).collection("musicHistory")
        .orderBy("timestamp", "desc")
        .limit(limit);

    const historySnapshot = await historyRef.get();

    const history = [];
    historySnapshot.forEach((doc) => {
      const data = doc.data();
      // Convert Firestore Timestamp to JS Date for easier frontend handling
      if (data.timestamp) {
        data.timestamp = data.timestamp.toDate();
      }
      history.push(data);
    });

    return res.status(200).json({history});
  } catch (error) {
    console.error("Error getting music history:", error);
    return res.status(500).json({error: "Failed to get music history"});
  }
};
