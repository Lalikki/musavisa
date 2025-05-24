import {
  Box,
  Card,
  CardContent,
  Typography,
  Slider,
  Fab,
  CircularProgress,
} from "@mui/material";
import {
  PlayArrow as PlayArrowIcon,
  Pause as PauseIcon,
  VolumeDown as VolumeDownIcon,
  VolumeUp as VolumeUpIcon,
  Replay as ReplayIcon,
  OpenInNew as OpenInNewIcon,
} from "@mui/icons-material";
import { useState } from "react";
import * as React from "react";
import YouTube from "react-youtube";

export default function MusicPlayer({ artist, song, songNumber, songLink }) {
  const [play, setPlay] = useState(false);
  const [volume, setVolume] = useState(50); // Default volume level
  const [player, setPlayer] = useState(null); // Store the YouTube player instance
  const [playerCounter, setPlayerCounter] = useState(0); // Counter to track player readiness

  const videoId = songLink ? songLink.split("v=")[1] : ""; // Extract video ID from the link
  const disableControls = playerCounter < 2 || !videoId; // Disable buttons if player is not ready
  const opts = {
    playerVars: {
      autoplay: 0,
    },
  };

  const handlePlay = () => {
    if (playerCounter < 2) return;
    player.setVolume(volume); // Prevent play if player is not ready
    if (play) {
      player.pauseVideo();
    } else {
      player.playVideo();
    }
    setPlay(!play);
  };

  const handleReplay = () => {
    if (playerCounter < 2) return; // Prevent play if player is not ready
    player.stopVideo();
    player.playVideo();
    setPlay(true);
  };

  const handleVolumeChange = (event, newValue) => {
    setVolume(newValue); // Update the volume state
    if (player) {
      player.setVolume(newValue); // Set the volume of the player
    }
  };

  const onPlayerReady = (event) => {
    setPlayer(event.target);
    setPlayerCounter(playerCounter + 1);
    // Increment the player counter since YouTube component is rendered twice
  };

  const onPlayerStateChange = (event) => {
    // Handle player state changes
  };

  return (
    <Card sx={{ mb: 1 }}>
      <Typography
        variant="h1"
        sx={{
          ml: 1,
          position: "absolute", // Position it absolutely within the card
          fontWeight: "bold", // Make it bold for emphasis
          zIndex: 0, // Ensure it stays in the background
          pointerEvents: "none", // Prevent it from interfering with interactions
          whiteSpace: "nowrap", // Prevent text wrapping
          opacity: 0.2,
        }}
      >
        {songNumber}
      </Typography>
      <Box
        id="main-box"
        sx={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          zIndex: 1,
        }}
      >
        <CardContent
          id="card-content"
          sx={{
            ml: 3,
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            width: "100%",
          }}
        >
          <Box sx={{ mr: 1 }}>
            <Typography component="div" variant="h6">
              {song}
            </Typography>
            <Typography
              variant="subtitle1"
              component="div"
              sx={{ color: "text.secondary" }}
            >
              {artist}
            </Typography>
          </Box>
          {videoId && (
            <Box
              id="controls-box"
              sx={{
                display: "flex",
                flexDirection: "column",
                alignSelf: "center",
                marginLeft: "auto",
                mr: 1,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <Fab
                  color="secondary"
                  aria-label="replay"
                  size="small"
                  sx={{ justifySelf: "center", mr: 1 }}
                  onClick={handleReplay}
                  disabled={disableControls}
                >
                  {(playerCounter < 2 && (
                    <CircularProgress size="50%" color="inherit" />
                  )) || <ReplayIcon />}
                </Fab>
                <Fab
                  color="primary"
                  aria-label="play"
                  size="medium"
                  sx={{ justifySelf: "center", mr: 1 }}
                  onClick={handlePlay}
                  disabled={disableControls}
                >
                  {(playerCounter < 2 && (
                    <CircularProgress size="50%" color="inherit" />
                  )) ||
                    (!play ? <PlayArrowIcon /> : <PauseIcon />)}
                </Fab>
                <Fab
                  color="secondary"
                  aria-label="open-tab"
                  size="small"
                  href={songLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ justifySelf: "center" }}
                  disabled={!songLink}
                >
                  {<OpenInNewIcon />}
                </Fab>
                <YouTube
                  videoId={videoId}
                  opts={opts}
                  onReady={onPlayerReady}
                  onStateChange={onPlayerStateChange}
                  style={{ display: "none" }} // Hide the YouTube player
                />
              </Box>
              <Box
                sx={{
                  alignItems: "center",
                  display: "flex",
                  flexDirection: "row",
                  width: "100%",
                  mt: 1,
                }}
              >
                <VolumeDownIcon />
                <Slider
                  aria-label="Volume"
                  value={volume}
                  onChange={handleVolumeChange}
                  disabled={disableControls}
                />
                <VolumeUpIcon />
              </Box>
            </Box>
          )}
        </CardContent>
      </Box>
    </Card>
  );
}
