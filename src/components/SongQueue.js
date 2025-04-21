import React, { useEffect, useState, useRef } from "react";
import axios from "axios";

// ✅ Styling injection (Poppins + custom styles)
const style = document.createElement("style");
style.innerHTML = `
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;700&display=swap');

  body {
    background: linear-gradient(135deg, #ff5f6d, #ffc371);
    min-height: 100vh;
    margin: 0;
    font-family: 'Poppins', sans-serif;
    color: white;
    text-align: center;
    padding: 2rem;
    transition: background 1s ease-in-out;
  }

  .party-header {
    font-size: 2.5rem;
    font-weight: bold;
    animation: pulse 2s infinite;
    text-shadow: 2px 2px 6px #000;
  }

  button {
    background: #ff0066;
    color: white;
    border: none;
    padding: 10px 16px;
    margin: 0 6px;
    border-radius: 8px;
    font-weight: bold;
    cursor: pointer;
    transition: transform 0.2s, background 0.3s;
  }

  button:hover {
    background: #ff3385;
    transform: scale(1.05);
  }

  ul {
    list-style: none;
    padding: 0;
  }

  li {
    margin-bottom: 16px;
    font-size: 1.1rem;
  }

  input {
    padding: 10px;
    margin: 6px;
    border: none;
    border-radius: 6px;
    font-size: 1rem;
  }

  a {
    color: #fff;
    text-decoration: none;
    font-weight: bold;
  }

  @keyframes pulse {
    0% { transform: scale(1); color: #fff; }
    50% { transform: scale(1.05); color: #ffeb3b; }
    100% { transform: scale(1); color: #fff; }
  }
`;
document.head.appendChild(style);

// Azure + YouTube config
const SAS_QUERY = "?sv=2024-11-04&ss=t&srt=sco&sp=rdau&se=2025-04-28T14:11:02Z&st=2025-04-21T06:11:02Z&spr=https&sig=X38uzQbzdrzO1Z7YAiJg9gbLDtc7FqT5Y5%2FJDkhaD6g%3D";
const YOUTUBE_API_KEY = "AIzaSyBo7gcS43fBLDPbaq-IOTlR8RQTXLmZlJw";

const SongQueue = () => {
  const [songs, setSongs] = useState([]);
  const [newTitle, setNewTitle] = useState("");
  const [newArtist, setNewArtist] = useState("");
  const [topVideoId, setTopVideoId] = useState(null);
  const videoRef = useRef(null);

  useEffect(() => {
    clearSongs();
  }, []);

  useEffect(() => {
    if (topVideoId && videoRef.current) {
      videoRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [topVideoId]);

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
        headers: {
          "Content-Type": "application/json",
          "If-Match": "*",
        },
      });

      const updatedSongs = [...songs];
      updatedSongs[index].votes += 1;
      updatedSongs.sort((a, b) => parseInt(b.votes) - parseInt(a.votes));
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
        headers: {
          "Content-Type": "application/json",
        },
      });

      const updatedSongs = [
        ...songs,
        {
          title: newTitle,
          artist: newArtist,
          votes: 0,
          rowKey: newRowKey,
          partitionKey: "default",
        },
      ];

      updatedSongs.sort((a, b) => parseInt(b.votes) - parseInt(a.votes));
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
                style={{ marginLeft: "10px" }}
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
