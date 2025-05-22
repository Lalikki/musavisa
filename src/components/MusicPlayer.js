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
} from "@mui/material";
import { styled } from "@mui/material/styles";
import {
  SkipPrevious as SkipPreviousIcon,
  PlayArrow as PlayArrowIcon,
  SkipNext as SkipNextIcon,
  Pause as PauseIcon,
  VolumeDown as VolumeDownIcon,
  VolumeUp as VolumeUpIcon,
} from "@mui/icons-material";
import { useEffect, useState } from "react";
import * as React from "react";
import YouTube from "react-youtube";

export default function MusicPlayer({ artist, song, songNumber, songLink }) {
  const [play, setPlay] = useState(false);
  const [volume, setVolume] = useState(50); // Default volume level
  const [player, setPlayer] = useState(null); // Store the YouTube player instance
  const [playerCounter, setPlayerCounter] = useState(0);

  const videoId = songLink.split("v=")[1];
  const opts = {
    width: "0",
    height: "0",
    playerVars: {
      autoplay: 0,
    },
  };

  const handlePlay = () => {
    if (play && player) {
      player.pauseVideo();
    } else if (player) {
      console.log("player", player);
      player.playVideo();
    }
    setPlay(!play);
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
    setPlayerCounter(playerCounter + 1);
  };

  const onPlayerStateChange = (event) => {
    const player = event.target;
    // if (play) {
    //   player.playVideo();
    // }
    // player.playVideo();
  };

  return (
    <Card sx={{ m: 1 }}>
      <Box id="main-box" sx={{ display: "flex", flexDirection: "row" }}>
        <CardContent sx={{ flex: "1 0 auto" }}>
          <Typography component="div" variant="h5">
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
        <Box sx={{ width: 200, alignContent: "center" }}>
          <Stack spacing={2} direction="row" sx={{ alignItems: "center" }}>
            <VolumeDownIcon />
            <Slider
              aria-label="Volume"
              value={volume}
              onChange={handleVolumeChange}
              disabled={playerCounter < 2}
              valueLabelDisplay="auto"
            />
            <VolumeUpIcon />
          </Stack>
        </Box>
        <Box sx={{ marginLeft: "auto", display: "flex", alignItems: "center" }}>
          <IconButton
            aria-label="play/pause"
            size="large"
            sx={{ justifySelf: "center" }}
            onClick={handlePlay}
            loading={playerCounter < 2}
          >
            {!play ? <PlayArrowIcon /> : <PauseIcon />}
          </IconButton>
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
