import React, { useState } from "react";
import axios from "axios";

const API_KEY = process.env.REACT_APP_YOUTUBE_API_KEY; // Make sure to set this in your .env file

const YouTubeSearch = () => {
  const [query, setQuery] = useState("");
  const [videos, setVideos] = useState([]);

  const searchYouTube = async () => {
    try {
      const response = await axios.get(
        "https://www.googleapis.com/youtube/v3/search",
        {
          params: {
            part: "snippet",
            q: query,
            key: API_KEY,
            maxResults: 10,
            type: "video",
          },
        }
      );
      setVideos(response.data.items);
    } catch (error) {
      console.error("Error fetching YouTube data", error);
    }
  };

  return (
    <div>
      <input
        type="text"
        placeholder="Search YouTube"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <button onClick={searchYouTube}>Search</button>
      <ul>
        {videos.map((video) => (
          <li key={video.id.videoId}>
            <p>{video.snippet.title}</p>
            <img
              src={video.snippet.thumbnails.default.url}
              alt={video.snippet.title}
            />
          </li>
        ))}
      </ul>
    </div>
  );
};

export default YouTubeSearch;
