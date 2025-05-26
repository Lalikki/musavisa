import { Box, Card, CardContent, Typography, Slider, Fab, CircularProgress, Popover, useTheme, useMediaQuery, LinearProgress } from '@mui/material';
import {
  PlayArrow as PlayArrowIcon,
  Pause as PauseIcon,
  VolumeDown as VolumeDownIcon,
  VolumeUp as VolumeUpIcon,
  Replay as ReplayIcon,
  OpenInNew as OpenInNewIcon,
  HelpOutlineOutlined as HelpOutlineOutlinedIcon,
} from '@mui/icons-material';
import { useState, useEffect } from 'react';
import * as React from 'react';
import YouTube from 'react-youtube';

export default function MusicPlayer({ artist, song, songNumber, songLink, hint }) {
  const [play, setPlay] = useState(false);
  const [volume, setVolume] = useState(50); // Default volume level
  const [duration, setDuration] = useState(0); // Default volume level
  const [player, setPlayer] = useState(null); // Store the YouTube player instance
  const [popoverHintAnchorEl, setPopoverHintAnchorEl] = useState(null);
  const [progress, setProgress] = useState(0);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const popoverHintOpen = Boolean(popoverHintAnchorEl);
  const popoverHintId = popoverHintOpen ? 'simple-popover' : undefined;

  const videoId = () => {
    const regex = /(?:youtu\.be\/|youtube\.com\/(?:.*v=|v\/|embed\/|shorts\/))([\w-]{11})/;
    const match = songLink.match(regex);
    return match ? match[1] : null;
  };

  const disableControls = !player || !videoId(); // Disable buttons if player is not ready
  const opts = {
    playerVars: {
      autoplay: 0,
    },
  };

  useEffect(() => {
    if (player && play) {
      const interval = setInterval(() => {
        const curTime = player.getCurrentTime();
        setProgress((curTime / duration) * 100);
      }, 100);

      if (!play) {
        clearInterval(interval); // Clear the interval if not playing
      }

      return () => clearInterval(interval);
    }
  }, [player, duration, play]);

  const handlePlay = () => {
    if (!player) return;
    player.setVolume(volume); // Prevent play if player is not ready
    if (play) {
      player.pauseVideo();
    } else {
      player.playVideo();
    }
    setPlay(!play);
  };

  const handleReplay = () => {
    if (!player) return; // Prevent play if player is not ready
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

  const onPlayerReady = event => {
    setPlayer(event.target);
    setDuration(event.target.getDuration());
  };

  const onPlayerStateChange = event => {
    if (event.data === YouTube.PlayerState.ENDED) {
      setPlay(false); // Stop playback when the video ends
      setProgress(0); // Reset progress
      player.stopVideo(); // Stop the video
    }
  };

  return (
    <Card sx={{ mb: 1 }} elevation={3}>
      <Typography
        variant="h1"
        sx={{
          ml: 1,
          position: 'absolute', // Position it absolutely within the card
          fontWeight: 'bold', // Make it bold for emphasis
          zIndex: 0, // Ensure it stays in the background
          pointerEvents: 'none', // Prevent it from interfering with interactions
          whiteSpace: 'nowrap', // Prevent text wrapping
          opacity: 0.2,
        }}
      >
        {songNumber}
      </Typography>
      <Box
        id="main-box"
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          zIndex: 1,
        }}
      >
        <CardContent
          id="card-content"
          sx={{
            ml: 3,
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            width: '100%',
          }}
        >
          <Box sx={{ mr: 1 }}>
            <Typography component="div" variant="h6">
              {song}
              {hint && <HelpOutlineOutlinedIcon fontSize="small" color="disabled" onClick={e => setPopoverHintAnchorEl(e.currentTarget)} sx={{ ml: 0.5 }} />}
            </Typography>
            <Popover
              id={popoverHintId}
              open={popoverHintOpen}
              anchorEl={popoverHintAnchorEl}
              onClose={() => setPopoverHintAnchorEl(null)}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'left',
              }}
              sx={{ width: isMobile ? '100svw' : '70svw' }}
              disableEnforceFocus
            >
              <Typography sx={{ p: 1 }}>{hint}</Typography>
            </Popover>
            <Typography variant="subtitle1" component="div" sx={{ color: 'text.secondary' }}>
              {artist}
            </Typography>
          </Box>
          {videoId() && (
            <Box
              id="controls-box"
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignSelf: 'center',
                marginLeft: 'auto',
                mr: 1,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Fab color="secondary" aria-label="replay" size="small" sx={{ justifySelf: 'center', mr: 1 }} onClick={handleReplay} disabled={disableControls}>
                  {(!player && <CircularProgress size="50%" color="inherit" />) || <ReplayIcon />}
                </Fab>
                <Fab color="primary" aria-label="play" size="medium" sx={{ justifySelf: 'center', mr: 1 }} onClick={handlePlay} disabled={disableControls}>
                  {(!player && <CircularProgress size="50%" color="inherit" />) || (!play ? <PlayArrowIcon /> : <PauseIcon />)}
                </Fab>
                <Fab color="secondary" aria-label="open-tab" size="small" href={songLink} target="_blank" rel="noopener noreferrer" sx={{ justifySelf: 'center' }} disabled={!songLink}>
                  {<OpenInNewIcon />}
                </Fab>
                <YouTube
                  videoId={videoId()}
                  opts={opts}
                  onReady={onPlayerReady}
                  onStateChange={onPlayerStateChange}
                  onPlaybackRateChange={() => {
                    console.log('Playback rate changed');
                  }}
                  style={{ display: 'none' }} // Hide the YouTube player
                />
              </Box>
              <Box
                sx={{
                  alignItems: 'center',
                  display: 'flex',
                  flexDirection: 'row',
                  width: '100%',
                  mt: 1,
                }}
              >
                <VolumeDownIcon />
                <Slider aria-label="Volume" value={volume} onChange={handleVolumeChange} disabled={disableControls} />
                <VolumeUpIcon />
              </Box>
            </Box>
          )}
        </CardContent>
        <Box sx={{ width: '100%' }}>
          <LinearProgress variant="determinate" value={progress} />
        </Box>
      </Box>
    </Card>
  );
}
