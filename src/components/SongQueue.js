import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { QRCodeCanvas } from "qrcode.react";

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

// Azure + YouTube API settings
const SAS_QUERY = "?sv=2024-11-04&ss=t&srt=sco&sp=rdau&se=2025-04-28T14:11:02Z&st=2025-04-21T06:11:02Z&spr=https&sig=X38uzQbzdrzO1Z7YAiJg9gbLDtc7FqT5Y5%2FJDkhaD6g%3D";
const YOUTUBE_API_KEY = "AIzaSyCozK5ogVFMdls4Kuj2_3Wja_xUFDRMkxs";

const SongQueue = () => {
  const [songs, setSongs] = useState([]);
  const [newTitle, setNewTitle] = useState("");
  const [newArtist, setNewArtist] = useState("");
  const [topVideoId, setTopVideoId] = useState(null);
  const [localIP, setLocalIP] = useState("");
  const videoRef = useRef(null);

  useEffect(() => {
    clearSongs();
    getLocalIP(); // ⬅️ Dynamic IP Detection
  }, []);

  useEffect(() => {
    if (topVideoId && videoRef.current) {
      videoRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [topVideoId]);

  const getLocalIP = async () => {
    try {
      const response = await fetch("https://api.ipify.org?format=json");
      const data = await response.json();
      setLocalIP(data.ip);
    } catch (error) {
      console.error("Error fetching IP address:", error);
    }
  };

  const clearSongs = async () => {
    try {
      const res = await axios.get(`/SongQueue()${SAS_QUERY}`);
      const deletePromises = res.data.value.map((item) =>
        axios.delete(
          `/SongQueue(PartitionKey='${item.PartitionKey}',RowKey='${item.RowKey}')${SAS_QUERY}`,
          { headers: { "If-Match": "*" } }
        )
      );
      await Promise.all(deletePromises);
      setSongs([]);
      setTopVideoId(null);
    } catch (err) {
      console.error("Error clearing songs:", err);
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
    } catch (ytErr) {
      console.error("YouTube API error:", ytErr);
    }
  };

  const handleVote = async (index) => {
    const song = songs[index];
    const updatedEntity = {
      PartitionKey: song.partitionKey,
      RowKey: song.rowKey,
      Title: song.title,
      Artist: song.artist,
      Votes: song.votes + 1,
    };
    try {
      const updateUrl = `/SongQueue(PartitionKey='${song.partitionKey}',RowKey='${song.rowKey}')${SAS_QUERY}`;
      await axios.put(updateUrl, updatedEntity, {
        headers: { "Content-Type": "application/json", "If-Match": "*" },
      });
      const updatedSongs = [...songs];
      updatedSongs[index].votes += 1;
      updatedSongs.sort((a, b) => b.votes - a.votes);
      setSongs(updatedSongs);
      updateTopVideo(updatedSongs[0]);
    } catch (err) {
      console.error("Error updating vote:", err);
    }
  };

  const handleAddSong = async (e) => {
    e.preventDefault();
    if (!newTitle || !newArtist) return;
    const newRowKey = Date.now().toString();
    const newSong = {
      PartitionKey: "default",
      RowKey: newRowKey,
      Title: newTitle,
      Artist: newArtist,
      Votes: 0,
    };
    try {
      await axios.post(`/SongQueue${SAS_QUERY}`, newSong, {
        headers: { "Content-Type": "application/json" },
      });
      const updatedSongs = [...songs, {
        title: newTitle,
        artist: newArtist,
        votes: 0,
        rowKey: newRowKey,
        partitionKey: "default",
      }];
      updatedSongs.sort((a, b) => b.votes - a.votes);
      setSongs(updatedSongs);
      setNewTitle("");
      setNewArtist("");
      updateTopVideo(updatedSongs[0]);
    } catch (err) {
      console.error("Error adding song:", err);
    }
  };

  return (
    <div>
      <h2 className="party-header">🎵 Song Queue Party 🎉</h2>

      {/* 🎯 QR Code with dynamic IP */}
      <div style={{ marginBottom: "2rem" }}>
        <h3>📲 Scan to Join</h3>
        {localIP ? (
          <>
            <QRCodeCanvas value={`http://${localIP}:3000`} size={180} />
            <p style={{ fontSize: "0.9rem", marginTop: "0.5rem" }}>
              Make sure you're connected to the same Wi-Fi
            </p>
          </>
        ) : (
          <p>Loading QR Code...</p>
        )}
      </div>

      <button onClick={clearSongs} style={{ marginBottom: "1rem" }}>
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
            frameBorder="0"
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
