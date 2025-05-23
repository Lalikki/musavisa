import { useTheme } from "@mui/material/styles";
import {
  Box,
  Card,
  CardContent,
  IconButton,
  Typography,
  Button,
  Modal,
  Stack,
  Slider,
  Fab,
  CircularProgress,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import {
  SkipPrevious as SkipPreviousIcon,
  PlayArrow as PlayArrowIcon,
  SkipNext as SkipNextIcon,
  Pause as PauseIcon,
  VolumeDown as VolumeDownIcon,
  VolumeUp as VolumeUpIcon,
  Replay as ReplayIcon,
  OpenInNew as OpenInNewIcon,
} from "@mui/icons-material";
import { useEffect, useState } from "react";
import * as React from "react";
import YouTube from "react-youtube";
import { computeHeadingLevel } from "@testing-library/dom";

export default function MusicPlayer({ artist, song, songNumber, songLink }) {
  const [play, setPlay] = useState(false);
  const [volume, setVolume] = useState(50); // Default volume level
  const [player, setPlayer] = useState(null); // Store the YouTube player instance
  const [playerCounter, setPlayerCounter] = useState(0); // Counter to track player readiness

  const videoId = songLink ? songLink.split("v=")[1] : ""; // Extract video ID from the link
  const disableControls = playerCounter < 2 || !videoId; // Disable buttons if player is not ready
  const opts = {
    width: "0",
    height: "0",
    playerVars: {
      autoplay: 0,
    },
  };

  const handlePlay = () => {
    if (playerCounter < 2) return; // Prevent play if player is not ready
    if (play) {
      player.pauseVideo();
    } else {
      player.playVideo();
    }
    setPlay(!play);
  };

  const handleReplay = () => {
    if (playerCounter < 2) return; // Prevent play if player is not ready
    console.log(player);
    player.stopVideo();
    player.playVideo();
    setPlay(true);
    // if (play && player) {
    //   player.pauseVideo();
    // } else if (player) {
    //   player.playVideo();
    // }
    // setPlay(!play);
  };

  const handleVolumeChange = (event, newValue) => {
    setVolume(newValue); // Update the volume state
    if (player) {
      player.setVolume(newValue); // Set the volume of the player
    }
  };

  const onPlayerReady = (event) => {
    // if (player) return;
    event.target.setVolume(volume);
    setPlayer(event.target);
    setPlayerCounter(playerCounter + 1); // Increment the player counter since YouTube component is rendered twice
  };

  const onPlayerStateChange = (event) => {
    // Handle player state changes
  };

  return (
    <Card sx={{ m: 1 }}>
      <Box id="main-box" sx={{ display: "flex", flexDirection: "row" }}>
        <CardContent sx={{ flex: "1 0 auto" }}>
          <Typography component="div" variant="h6">
            {songNumber} - {song}
          </Typography>
          <Typography
            variant="subtitle1"
            component="div"
            sx={{ color: "text.secondary" }}
          >
            {artist}
          </Typography>
        </CardContent>
        <Box
          sx={{
            alignContent: "center",
            display: "flex",
            flexDirection: "row",
            m: 1,
          }}
        >
          <VolumeUpIcon sx={{ alignSelf: "center" }} />
          <Slider
            aria-label="Volume"
            orientation="vertical"
            value={volume}
            onChange={handleVolumeChange}
            disabled={disableControls}
            valueLabelDisplay="auto"
          />
        </Box>
        <Box
          sx={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            mr: 1,
          }}
        >
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
        </Box>
      </Box>
      <YouTube
        videoId={videoId}
        opts={opts}
        seekTo={20}
        onReady={onPlayerReady}
        onStateChange={onPlayerStateChange}
        style={{ display: "none" }} // Hide the YouTube player
      />
      {/* <Modal
        open={openPlayer}
        onClose={handleClose}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description"
      >
        <Box id="youtube-player" sx={{ justifySelf: "center" }}>
          <YouTube
            videoId={videoId}
            opts={opts}
            seekTo={20}
            onReady={onPlayerReady}
            onStateChange={onPlayerStateChange}
          />
        </Box>
      </Modal> */}
    </Card>
  );
}
