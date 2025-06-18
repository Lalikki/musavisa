import { Box, Card, CardContent, Typography, Slider, Fab, CircularProgress, Popover, useTheme, useMediaQuery, LinearProgress, IconButton } from '@mui/material';
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
import YouTube from 'react-youtube';
import { useTranslation } from 'react-i18next'; // For translating "Answer"

export default function MusicPlayer({ artist, song, songNumber, songLink, hint, extraQuestion, correctExtraAnswer, isActive }) {
  const { t } = useTranslation();
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
  }, [player, duration, play, isActive]); // Added isActive

  useEffect(() => {
    if (!isActive && player && play) {
      player.pauseVideo();
      setPlay(false); // Update play state
    }
    // Note: We are not auto-playing when isActive becomes true.
    // User needs to click play. If auto-play is desired, add logic here.
    // Be cautious with auto-play as it can be disruptive.
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
    <Card sx={{ mb: 2, p: 2, position: 'relative', overflow: 'hidden' }} elevation={3}>
      {/* Top row for song number and hint icon */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 1, // Add some margin below this row
          position: 'relative', // For zIndex context if needed later
          zIndex: 2, // Ensure it's above the large background number if we re-add it
        }}
      >
        <Typography variant="h6" component="div" sx={{ fontWeight: 'medium', opacity: 0.7 }}>
          {songNumber}
        </Typography>
        {hint && (
          <IconButton size="small" onClick={e => setPopoverHintAnchorEl(e.currentTarget)} aria-describedby={popoverHintId} sx={{ p: 0.25 }}>
            <HelpOutlineOutlinedIcon sx={{ fontSize: '1.5rem' }} color="disabled" />
          </IconButton>
        )}
      </Box>

      <Box
        id="main-box"
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center', // Center content within the main box
          position: 'relative',
        }}
      >
        <CardContent
          id="card-content"
          sx={{
            display: 'flex',
            flexDirection: 'column', // Stack content vertically
            alignItems: 'center', // Center items horizontally
            width: '100%',
            p: 0, // Remove default CardContent padding, using Card's padding
            '&:last-child': { pb: 0 }, // Remove padding-bottom from last child if CardContent adds it
          }}
        >
          <Box sx={{ textAlign: 'center', mb: 2, width: '100%', minHeight: theme.spacing(16) /* Approx 128px */ }}>
            <Typography component="div" variant="h5"> {/* Increased size for song title */}
              {song}
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
            <Typography variant="h6" component="div" sx={{ color: 'text.secondary' }}> {/* Increased size for artist */}
              {artist}
            </Typography>
            {/* Display Extra Question and Answer directly */}
            {extraQuestion && correctExtraAnswer && (
              <Box sx={{ mt: 1.5, width: '100%' }}>
                <Typography variant="subtitle1" component="div" sx={{ color: theme.palette.primary.main, fontWeight: 'medium' }}>
                  {extraQuestion}
                </Typography>
                <Typography variant="body2" component="div" sx={{ color: 'text.secondary' }}>{correctExtraAnswer}</Typography>
              </Box>
            )}
          </Box>
          {videoId() && (
            <Box
              id="controls-box"
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center', // Center controls
                width: '100%', // Take full width
                mt: 1, // Add some margin top
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1.5 }}>
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
                  style={{ display: 'none' }} // Hide the YouTube player
                />
              </Box>
              <Box
                sx={{
                  alignItems: 'center',
                  display: 'flex',
                  flexDirection: 'row',
                  width: '80%', // Limit width of volume slider
                  maxWidth: '250px', // Max width for the slider
                  mt: 1,
                }}
              >
                <VolumeDownIcon sx={{ mr: 1 }} />
                <Slider aria-label="Volume" value={volume} onChange={handleVolumeChange} disabled={disableControls} />
                <VolumeUpIcon sx={{ ml: 1 }} />
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
