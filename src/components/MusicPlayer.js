import { Box, Card, CardContent, Typography, Slider as MuiSlider, Fab, CircularProgress, Popover, useTheme, useMediaQuery, IconButton } from '@mui/material';
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

const formatTime = (timeInSeconds) => {
  if (isNaN(timeInSeconds) || timeInSeconds === 0) return '0:00';
  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = Math.floor(timeInSeconds % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};


export default function MusicPlayer({ artist, song, songNumber, songLink, hint, extraQuestion, correctExtraAnswer, isActive }) {
  const { t } = useTranslation();
  const [play, setPlay] = useState(false);
  const [volume, setVolume] = useState(50); // Default volume level
  const [duration, setDuration] = useState(0); // Default volume level
  const [currentTime, setCurrentTime] = useState(0);
  const [player, setPlayer] = useState(null); // Store the YouTube player instance
  const [isSeeking, setIsSeeking] = useState(false);
  const [popoverHintAnchorEl, setPopoverHintAnchorEl] = useState(null);
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
    if (player && play && !isSeeking) {
      const interval = setInterval(() => {
        const curTime = player.getCurrentTime();
        setCurrentTime(curTime);
      }, 250); // Update every 250ms

      return () => clearInterval(interval);
    }
  }, [player, play, isSeeking, isActive]);

  useEffect(() => {
    if (!isActive && player && play) {
      player.pauseVideo();
      setPlay(false); // Update play state
    }
  }, [isActive, player, play]);

  const handlePlay = () => {
    if (!player) return;
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

  const handleSeek = (event, newValue) => {
    setCurrentTime(newValue);
  };

  const handleSeekCommitted = (event, newValue) => {
    if (player) {
      player.seekTo(newValue, true);
    }
    setIsSeeking(false);
  };
  const handleSeekMouseDown = () => {
    setIsSeeking(true);
  };

  const onPlayerReady = event => {
    setPlayer(event.target);
    setDuration(event.target.getDuration());
    event.target.setVolume(volume); // Set initial volume when player is ready
  };

  const onPlayerStateChange = event => {
    if (event.data === YouTube.PlayerState.ENDED) {
      setPlay(false); // Stop playback when the video ends
      setCurrentTime(0);
      player.stopVideo(); // Stop the video
    }
  };

  const onPlayerError = (event) => {
    console.error(`YouTube Player Error for videoId: ${videoId()}`, event.data);
    // TODO: Optionally set an error state here to show a message to the user
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
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
                  onError={onPlayerError}
                  style={{ display: 'none' }} // Hide the YouTube player
                />
              </Box>
              <Box
                sx={{
                  alignItems: 'center',
                  display: 'flex',
                  flexDirection: 'row',
                  width: { xs: '60%', sm: '80%' }, // Make it narrower on mobile
                  maxWidth: { xs: '180px', sm: '250px' }, // And have a smaller max-width on mobile
                  mt: 1,
                }}
                onMouseDown={e => e.stopPropagation()} // Stop drag events from propagating to the carousel
                onTouchStart={e => e.stopPropagation()} // Stop touch events from propagating to the carousel
              >
                <VolumeDownIcon sx={{ mr: 1 }} />
                <MuiSlider aria-label="Volume" value={volume} onChange={handleVolumeChange} disabled={disableControls} />
                <VolumeUpIcon sx={{ ml: 1 }} />
              </Box>
              <Box
                sx={{ width: '100%', display: 'flex', alignItems: 'center', gap: 2, px: { xs: 0, sm: 1 }, mt: 1.5 }}
                onMouseDown={e => e.stopPropagation()} // Stop drag events from propagating to the carousel
                onTouchStart={e => e.stopPropagation()} // Stop touch events from propagating to the carousel
              >
                <Typography variant="body2" sx={{ color: 'text.secondary', minWidth: '40px' }}>{formatTime(currentTime)}</Typography>
                <MuiSlider
                  aria-label="time-indicator"
                  size="small"
                  value={currentTime}
                  min={0}
                  step={1}
                  max={duration > 0 ? duration : 0}
                  onChange={handleSeek}
                  onChangeCommitted={handleSeekCommitted}
                  onMouseDown={handleSeekMouseDown}
                  disabled={disableControls || duration === 0}
                  sx={{ height: 6, '& .MuiSlider-thumb': { width: 14, height: 14 } }}
                />
                <Typography variant="body2" sx={{ color: 'text.secondary', minWidth: '40px' }}>{formatTime(duration)}</Typography>
              </Box>
            </Box>
          )}
        </CardContent>
      </Box>
    </Card>
  );
}
