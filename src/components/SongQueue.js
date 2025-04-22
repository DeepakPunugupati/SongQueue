import React, { useEffect, useState, useRef } from "react";
import axios from "axios";

// Inject party-style CSS
const style = document.createElement("style");
style.innerHTML = `
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;700&display=swap');

  body {
    background: radial-gradient(circle at top, #0f0f0f 0%, #1a1a1a 100%);
    color: #f0f0f0;
    font-family: 'Poppins', sans-serif;
    margin: 0;
    padding: 2rem;
    text-align: center;
    min-height: 100vh;
  }

  .party-header {
    font-size: 2.8rem;
    font-weight: bold;
    margin-bottom: 1rem;
    color: #00e6e6;
    text-shadow: 0 0 10px #00e6e6, 0 0 20px #00e6e6;
  }

  button {
    background: #ff2d75;
    border: none;
    color: white;
    padding: 10px 20px;
    margin: 0.5rem;
    border-radius: 30px;
    font-size: 1rem;
    font-weight: bold;
    box-shadow: 0 0 10px #ff2d75;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  button:hover {
    background: #ff5c94;
    box-shadow: 0 0 20px #ff5c94;
    transform: scale(1.05);
  }

  input {
    padding: 12px 16px;
    margin: 8px;
    border: none;
    border-radius: 20px;
    background: rgba(255, 255, 255, 0.1);
    color: #f0f0f0;
    font-size: 1rem;
    width: 240px;
    backdrop-filter: blur(5px);
    outline: none;
    transition: 0.3s ease-in-out;
  }

  input::placeholder {
    color: #ccc;
  }

  ul {
    list-style: none;
    padding: 0;
  }

  li {
    background: rgba(255, 255, 255, 0.05);
    margin: 1rem auto;
    padding: 1rem;
    border-radius: 12px;
    width: 90%;
    max-width: 600px;
    box-shadow: 0 0 10px #111;
    font-size: 1.1rem;
    backdrop-filter: blur(4px);
  }

  a {
    color: #00e6e6;
    font-weight: bold;
    text-decoration: none;
    margin-left: 10px;
  }

  iframe {
    border: none;
    border-radius: 12px;
    box-shadow: 0 0 30px rgba(0, 230, 230, 0.4);
  }
`;
document.head.appendChild(style);

const YOUTUBE_API_KEY = "AIzaSyBo7gcS43fBLDPbaq-IOTlR8RQTXLmZlJw";

const SongQueue = () => {
  const [songs, setSongs] = useState([]);
  const [newTitle, setNewTitle] = useState("");
  const [newArtist, setNewArtist] = useState("");
  const [topVideoId, setTopVideoId] = useState(null);
  const videoRef = useRef(null);

  useEffect(() => {
    fetchSongs();
  }, []);

  useEffect(() => {
    if (topVideoId && videoRef.current) {
      videoRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [topVideoId]);

  const fetchSongs = async () => {
    try {
      const res = await axios.get("/api/getSongs");
      const sorted = res.data.sort((a, b) => parseInt(b.votes) - parseInt(a.votes));
      setSongs(sorted);
      updateTopVideo(sorted[0]);
    } catch (err) {
      console.error("Error fetching songs:", err);
    }
  };

  const updateTopVideo = async (topSong) => {
    if (!topSong) return;
    const query = `${topSong.title} ${topSong.artist}`;
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=1&q=${encodeURIComponent(query)}&key=${YOUTUBE_API_KEY}`;
    try {
      const ytRes = await axios.get(searchUrl);
      const videoId = ytRes.data.items[0]?.id?.videoId;
      setTopVideoId(videoId);
    } catch (err) {
      console.error("YouTube API error:", err);
    }
  };

  const handleAddSong = async (e) => {
    e.preventDefault();
    if (!newTitle || !newArtist) return;

    const newSong = {
      PartitionKey: "default",
      RowKey: Date.now().toString(),
      Title: newTitle,
      Artist: newArtist,
      Votes: 0,
    };

    try {
      await axios.post("/api/addSong", newSong);
      setNewTitle("");
      setNewArtist("");
      fetchSongs();
    } catch (err) {
      console.error("Error adding song:", err);
    }
  };

  const handleVote = async (index) => {
    const song = songs[index];
    try {
      await axios.post("/api/voteSong", {
        RowKey: song.rowKey,
        PartitionKey: song.partitionKey,
      });
      fetchSongs();
    } catch (err) {
      console.error("Error voting:", err);
    }
  };

  const resetQueue = async () => {
    try {
      await axios.post("/api/resetSongs");
      setSongs([]);
      setTopVideoId(null);
    } catch (err) {
      console.error("Error resetting queue:", err);
    }
  };

  return (
    <div>
      <h2 className="party-header">🎵 Song Queue Party 🎉</h2>

      <button onClick={resetQueue} style={{ marginBottom: "1rem" }}>
        🔄 Reset Queue
      </button>

      {topVideoId && (
        <div style={{ marginBottom: "1rem" }} ref={videoRef}>
          <h3>Now Playing</h3>
          <iframe
            width="560"
            height="315"
            src={`https://www.youtube.com/embed/${topVideoId}?autoplay=1`}
            title="Top Song"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
        </div>
      )}

      <form onSubmit={handleAddSong} style={{ marginBottom: "1rem" }}>
        <input
          type="text"
          placeholder="Song Title"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="Artist"
          value={newArtist}
          onChange={(e) => setNewArtist(e.target.value)}
          required
        />
        <button type="submit">Add Song</button>
      </form>

      {songs.length === 0 ? (
        <p>No songs found.</p>
      ) : (
        <ul>
          {songs.map((song, index) => (
            <li key={index}>
              {song.title} by {song.artist} — {song.votes} votes
              <button onClick={() => handleVote(index)}>Vote</button>
              <a
                href={`https://www.youtube.com/results?search_query=${encodeURIComponent(
                  `${song.title} ${song.artist}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                ▶️ Watch
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default SongQueue;
