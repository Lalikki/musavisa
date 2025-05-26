import React, { useState } from 'react';
import axios from 'axios';
import {
  Avatar,
  Box,
  Card,
  IconButton,
  InputAdornment,
  List,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  TextField,
  Tooltip,
} from '@mui/material';
import { useTranslation } from 'react-i18next'; // Import useTranslation
import { ClearAll as ClearAllIcon, YouTube as YouTubeIcon } from '@mui/icons-material';

const API_KEY = process.env.REACT_APP_YOUTUBE_API_KEY; // Make sure to set this in your .env file

const parseArtistAndSong = text => {
  const parts = text.split(' - ').map(str => str.trim());
  if (parts.length < 2) {
    return { artist: '', song: '' };
  }
  return { artist: parts[0], song: parts[1] };
};

const YouTubeSearch = ({ handleSelection, handleQuestionChange, value, index }) => {
  const { t } = useTranslation(); // Initialize translation hook
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState({ loadingVideos: false });

  const searchYouTube = async () => {
    if (videos.length > 0) {
      setVideos([]); // Clear previous results if any
      return;
    }
    try {
      setLoading({ loadingVideos: true });
      const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
        params: {
          part: 'snippet',
          q: value,
          key: API_KEY,
          maxResults: 5,
          type: 'video',
        },
      });
      setVideos(response.data.items);
    } catch (error) {
      console.error('Error fetching YouTube data', error);
    } finally {
      setLoading({ loadingVideos: false });
    }
  };

  const handleVideoSelect = video => {
    const data = {
      songLink: `https://www.youtube.com/watch?v=${video.id.videoId}`,
      songArtist: parseArtistAndSong(video.snippet.title).artist || video.snippet.channelTitle,
      songName: parseArtistAndSong(video.snippet.title).song || video.snippet.title,
    };
    handleSelection(index, data);
    setVideos([]); // Clear the video list after selection
  };

  return (
    <Box>
      <TextField
        label={t('createNewQuizPage.songLinkSearchLabel')}
        id="youtube-search"
        type="text"
        fullWidth
        margin="dense"
        value={value}
        onChange={e => handleQuestionChange(index, 'songLink', e.target.value)}
        slotProps={{
          input: {
            endAdornment: (
              <InputAdornment position="end">
                <Tooltip title={videos.length ? t('createNewQuizPage.emptyVideoList') : t('createNewQuizPage.searchFromYouTube')}>
                  <span>
                    <IconButton aria-label="youtube search" onClick={searchYouTube} loading={loading.loadingVideos} disabled={!value.length}>
                      {videos.length ? <ClearAllIcon /> : <YouTubeIcon />}
                    </IconButton>
                  </span>
                </Tooltip>
              </InputAdornment>
            ),
          },
          inputLabel: { shrink: true },
        }}
      />
      {videos.length > 0 && (
        <Card elevation={5} sx={{ mt: 1, mb: 1 }}>
          <List>
            {videos.map(video => (
              <ListItemButton key={video.id.videoId} onClick={() => handleVideoSelect(video)}>
                <ListItemAvatar>
                  <Avatar>
                    <img src={video.snippet.thumbnails.default.url} alt={video.snippet.title} />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText primary={video.snippet.title} secondary={`${video.snippet.channelTitle}`} />
              </ListItemButton>
            ))}
          </List>
        </Card>
      )}
    </Box>
  );
};

export default YouTubeSearch;
