import React, { useEffect, useState } from "react";
import "../../styles/SleepChart.css";
import API from "../../api";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

/**
 * SleepChart Component - Displays sleep data visualization and personalized recommendations
 *
 * Features:
 * - Visualizes sleep patterns with interactive charts
 * - Provides AI-generated sleep advice
 * - Offers personalized music recommendations based on sleep quality
 * - Allows users to like/dislike tracks for better recommendations
 * - Shows recommendation history
 *
 * @param {Array} data - Array of sleep records
 * @param {Function} onDelete - Callback function when a record is deleted
 */
const SleepChart = ({ data, onDelete }) => {
  // State for AI advice and music panel
  const [aiAdvice, setAiAdvice] = useState("");
  const [showMusicPanel, setShowMusicPanel] = useState(false);

  // State for music tracks and playback
  const [musicTracks, setMusicTracks] = useState([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // State for user preferences and history
  const [likedTracks, setLikedTracks] = useState([]);
  const [musicHistory, setMusicHistory] = useState([]);
  const [showMusicHistory, setShowMusicHistory] = useState(false);

  // Take the most recent 7 days of sleep data
  const sortedData =
    data && data.length
      ? [...data].sort((a, b) => new Date(a.date) - new Date(b.date)).slice(-7)
      : [];

  // Calculate average sleep duration
  const averageSleep =
    sortedData.length > 0
      ? (
          sortedData.reduce((sum, d) => sum + d.duration, 0) / sortedData.length
        ).toFixed(1)
      : "N/A";

  /**
   * Handle deletion of sleep records
   * @param {string} docId - Document ID to delete
   */
  const handleDelete = async (docId) => {
    if (window.confirm("Delete this sleep record?")) {
      try {
        await API.delete(`/api/sleep/${docId}`);
        if (onDelete) onDelete();
      } catch (err) {
        console.error("Delete failed:", err);
        alert("Failed to delete the record.");
      }
    }
  };

  /**
   * Fetch music recommendation history
   */
  const fetchMusicHistory = async () => {
    try {
      const res = await API.get("/api/sleep/music/history?limit=10");
      if (res.data && res.data.history) {
        // Ensure the history items are properly formatted and filtered for valid data
        const validHistory = res.data.history.filter(
          (item) =>
            item && item.timestamp && item.query && Array.isArray(item.tracks)
        );
        setMusicHistory(validHistory);
        console.log(
          "Music history fetched successfully:",
          validHistory.length,
          "items"
        );
      } else {
        console.warn("No music history data returned from API");
        setMusicHistory([]);
      }
    } catch (err) {
      console.error("Failed to fetch music history:", err);
      setMusicHistory([]);
    }
  };

  /**
   * Load a specific recommendation from history
   * @param {Object} historyItem - History item containing tracks
   */
  const loadHistoricalRecommendation = (historyItem) => {
    if (historyItem && historyItem.tracks && historyItem.tracks.length > 0) {
      setMusicTracks(historyItem.tracks);
      setCurrentTrackIndex(0);
      console.log(
        "Loaded historical recommendation with",
        historyItem.tracks.length,
        "tracks"
      );
    } else {
      console.warn(
        "Cannot load historical recommendation - invalid data",
        historyItem
      );
    }
  };

  /**
   * Fetch new music recommendations based on sleep data
   */
  const fetchMusicRecommendations = async () => {
    if (sortedData.length === 0) {
      alert("No sleep data available to base recommendations on");
      return;
    }

    setIsLoading(true);
    try {
      const res = await API.post("/api/sleep/music", {
        records: sortedData.map(({ date, duration }) => ({ date, duration })),
        likedTracks: likedTracks, // Send user's liked music for personalized recommendations
      });

      if (res.data.tracks && res.data.tracks.length > 0) {
        setMusicTracks(res.data.tracks);
        setCurrentTrackIndex(0);
        // Immediately fetch updated history after getting new recommendations
        await fetchMusicHistory();
        console.log(
          "Music recommendations fetched successfully:",
          res.data.tracks.length,
          "tracks"
        );
      } else {
        alert("No music tracks found. Please try again.");
      }
    } catch (err) {
      console.error("Failed to fetch music recommendations:", err);
      alert("Failed to get music recommendations. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Send feedback for liked/disliked tracks
   * @param {Object} track - Track to like/dislike
   * @param {boolean} liked - Whether the track is liked
   */
  const handleLikeTrack = async (track, liked) => {
    try {
      // Validate track data
      if (!track || (!track.id && !track.name)) {
        console.error("Invalid track data:", track);
        alert(
          "Cannot process feedback for this track. Missing required information."
        );
        return;
      }

      // Clean track object (remove undefined values)
      const cleanTrack = Object.entries(track).reduce((obj, [key, value]) => {
        if (value !== undefined) {
          obj[key] = value;
        }
        return obj;
      }, {});

      // Ensure track has an ID (use name as fallback)
      const trackId = cleanTrack.id || `track-${Date.now()}-${cleanTrack.name}`;

      // Send feedback to backend
      await API.post("/api/sleep/music/feedback", {
        trackId: trackId,
        liked: Boolean(liked),
        track: cleanTrack,
      });

      // Update local state
      if (liked) {
        setLikedTracks((prev) => [
          ...prev.filter((t) => t.id !== trackId && t.name !== track.name),
          { ...cleanTrack, id: trackId },
        ]);
      } else {
        setLikedTracks((prev) =>
          prev.filter((t) => t.id !== trackId && t.name !== track.name)
        );
      }

      // Show feedback message
      alert(liked ? "Added to your liked music!" : "Thanks for your feedback!");
    } catch (err) {
      console.error("Failed to send feedback:", err);
      alert("Could not save your feedback. Please try again.");
    }
  };

  /**
   * Navigate to next track
   */
  const handleNextTrack = () => {
    if (musicTracks.length > 0) {
      setCurrentTrackIndex((prev) => (prev + 1) % musicTracks.length);
    }
  };

  /**
   * Navigate to previous track
   */
  const handlePrevTrack = () => {
    if (musicTracks.length > 0) {
      setCurrentTrackIndex((prev) =>
        prev === 0 ? musicTracks.length - 1 : prev - 1
      );
    }
  };

  /**
   * Format date/time for display
   * @param {string|Date} dateString - Date to format
   * @returns {string} Formatted date string
   */
  const formatDateTime = (dateString) => {
    try {
      const date =
        dateString instanceof Date ? dateString : new Date(dateString);
      return date.toLocaleString();
    } catch (err) {
      console.error("Error formatting date:", dateString, err);
      return "Invalid date";
    }
  };

  // Load initial data when component mounts or data changes
  useEffect(() => {
    // Fetch AI advice based on sleep trend
    const fetchTrendAdvice = async () => {
      if (sortedData.length > 0) {
        try {
          const res = await API.post("/api/ai/sleep/trend", {
            records: sortedData.map(({ date, duration }) => ({
              date,
              duration,
            })),
          });
          setAiAdvice(res.data.advice);
        } catch (err) {
          console.error("Failed to fetch AI trend advice:", err);
          setAiAdvice("⚠️ Unable to load AI advice. Please try again later.");
        }
      }
    };

    // Initial music recommendation
    const initialFetchMusic = async () => {
      if (sortedData.length > 0) {
        try {
          const res = await API.post("/api/sleep/music", {
            records: sortedData.map(({ date, duration }) => ({
              date,
              duration,
            })),
          });
          if (res.data.tracks && res.data.tracks.length > 0) {
            setMusicTracks(res.data.tracks);
          }
        } catch (err) {
          console.error("Failed to fetch initial music recommendations:", err);
        }
      }
    };

    // Fetch liked tracks
    const fetchLikedTracks = async () => {
      try {
        const res = await API.get("/api/sleep/music/liked");
        if (res.data && res.data.tracks) {
          setLikedTracks(res.data.tracks);
        }
      } catch (err) {
        console.error("Failed to fetch liked tracks:", err);
      }
    };

    // Execute all data fetches if we have sleep data
    if (sortedData.length > 0) {
      fetchTrendAdvice();
      initialFetchMusic();
      fetchLikedTracks();
      fetchMusicHistory();
    }
  }, [data]); // Re-fetch when data changes

  // Show message if no data
  if (!Array.isArray(data) || data.length === 0) {
    return (
      <p className="no-data-message">
        No sleep data available. Add some sleep records to get started.
      </p>
    );
  }

  // Get current track
  const currentTrack =
    musicTracks.length > 0 ? musicTracks[currentTrackIndex] : null;

  return (
    <div className="sleep-ai-layout">
      {/* Sleep chart and records section */}
      <div className="chart-left">
        <h3>🕗 Sleep Trends</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={sortedData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis domain={[0, 12]} />
            <Tooltip />
            <Bar dataKey="duration" fill="#4B9CD3" />
          </BarChart>
        </ResponsiveContainer>

        <div className="sleep-summary">
          <p>Average sleep: {averageSleep} hrs</p>
          <p>Recommended: 7–9 hrs/night</p>
        </div>

        <div className="sleep-record-list">
          {sortedData.map((record) => (
            <div key={record.id || record.date} className="record-item">
              <span>
                {record.date} - {record.duration} hrs
                {record.wakeCount > 0 && ` - Woke up ${record.wakeCount} times`}
              </span>
              <button
                onClick={() => handleDelete(record.id || "")}
                aria-label="Delete record"
              >
                🗑
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* AI advice and music recommendation section */}
      <div className="ai-right-panel">
        <div className="ai-suggestion-box">
          <h4>
            <span className="ai-icon">🤖</span> AI Suggestion
          </h4>

          <div className="ai-content">
            {aiAdvice ? (
              aiAdvice.split("\n").map((line, idx) => <p key={idx}>{line}</p>)
            ) : (
              <p>Loading AI suggestions based on your sleep data...</p>
            )}
          </div>
        </div>

        {/* Music recommendation toggle button */}
        {!showMusicPanel ? (
          <div className="music-toggle-btn">
            <button onClick={() => setShowMusicPanel(true)}>
              Need some music to help you sleep?
            </button>
          </div>
        ) : (
          <div className="music-recommendation-box">
            <div className="music-header">
              <h4>🎵 Music Recommendation</h4>
              <button
                className="refresh-btn"
                onClick={fetchMusicRecommendations}
                disabled={isLoading}
              >
                {isLoading ? "Loading..." : "🔄 New Recommendations"}
              </button>
              <button
                className="history-btn"
                onClick={() => {
                  setShowMusicHistory(!showMusicHistory);
                  if (!showMusicHistory) {
                    fetchMusicHistory(); // Refresh history when showing
                  }
                }}
              >
                {showMusicHistory ? "Hide History" : "Show History"}
              </button>
            </div>

            {/* Music recommendation history */}
            {showMusicHistory && (
              <div className="music-history-container">
                <h7>Recent Recommendations</h7>
                {musicHistory && musicHistory.length > 0 ? (
                  <ul className="sleephistory-list">
                    {musicHistory.map((item, index) => (
                      <li key={index} className="sleephistory-item">
                        <div className="sleephistory-item-header">
                          <span className="history-date">
                            {formatDateTime(item.timestamp)}
                          </span>
                          <button
                            className="load-history-btn"
                            onClick={() => loadHistoricalRecommendation(item)}
                          >
                            Load
                          </button>
                        </div>
                        {
                          <div className="history-query">
                            <small>song: {item.query || "N/A"}</small>
                          </div>
                        }
                        {/* <div className="history-query">
                          <small>song: {item.query || "N/A"}</small>
                        </div>
                        <div className="history-stats">
                          <small>
                            Sleep:{" "}
                            {item.sleepStats?.latest?.toFixed(1) || "N/A"}h,
                            Avg: {item.sleepStats?.average?.toFixed(1) || "N/A"}
                            h
                          </small>
                        </div> */}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>No recommendation history available yet</p>
                )}
              </div>
            )}

            {/* Music player */}
            {currentTrack ? (
              <div className="music-player-container">
                <div className="track-info">
                  <h5>{currentTrack.name}</h5>
                  {currentTrack.tags && (
                    <p className="track-tags">Tags: {currentTrack.tags}</p>
                  )}
                  {/* {currentTrack.description && (
                    <p className="track-description">
                      {currentTrack.description}
                    </p>
                  )} */}
                </div>

                <div className="audio-controls">
                  <audio
                    controls
                    src={currentTrack.src}
                    className="audio-player"
                    autoPlay={false}
                  >
                    Your browser does not support the audio element.
                  </audio>

                  <div className="track-navigation">
                    <button onClick={handlePrevTrack}>⬅️ Previous</button>
                    <span>
                      {currentTrackIndex + 1}/{musicTracks.length}
                    </span>
                    <button onClick={handleNextTrack}>Next ➡️</button>
                  </div>
                </div>

                <div className="feedback-buttons">
                  <button
                    className="like-btn"
                    onClick={() => handleLikeTrack(currentTrack, true)}
                  >
                    👍 Like
                  </button>
                  <button
                    className="dislike-btn"
                    onClick={() => handleLikeTrack(currentTrack, false)}
                  >
                    👎 Dislike
                  </button>
                </div>
              </div>
            ) : (
              <p>
                No music tracks available. Click "New Recommendations" to get
                music suggestions based on your sleep patterns.
              </p>
            )}

            {/* List of all recommended tracks */}
            {musicTracks.length > 1 && (
              <div className="music-list">
                <h5>All Recommendations:</h5>
                <ul>
                  {musicTracks.map((track, index) => (
                    <li
                      key={track.id || index}
                      className={index === currentTrackIndex ? "active" : ""}
                      onClick={() => setCurrentTrackIndex(index)}
                    >
                      {track.name}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Liked tracks section */}
            {likedTracks.length > 0 && (
              <div className="liked-tracks">
                <h5>Your Favorite Tracks:</h5>
                <ul>
                  {likedTracks.slice(0, 3).map((track, index) => (
                    <li key={track.id || index}>{track.name}</li>
                  ))}
                  {likedTracks.length > 3 && (
                    <li>...and {likedTracks.length - 3} more</li>
                  )}
                </ul>
              </div>
            )}

            <button
              className="close-music-btn"
              onClick={() => setShowMusicPanel(false)}
            >
              Close Music Panel
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SleepChart;
