import * as React from "react";
import { useTheme } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import SkipPreviousIcon from "@mui/icons-material/SkipPrevious";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import SkipNextIcon from "@mui/icons-material/SkipNext";

export default function MusicPlayer({ artist, song, songNumber, songLink }) {
  const theme = useTheme();

  return (
    <Card sx={{ display: "flex", m: 1 }}>
      <Box sx={{ display: "flex", flexDirection: "row" }}>
        <CardContent>
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
        <Box sx={{ display: "flex" }}>
          {/* <IconButton aria-label="previous">
            {theme.direction === "rtl" ? (
              <SkipNextIcon />
            ) : (
              <SkipPreviousIcon />
            )}
          </IconButton> */}
          <IconButton
            aria-label="play/pause"
            href={songLink}
            target="_blank"
            rel="noopener noreferrer"
            sx={{ justifySelf: "center" }}
          >
            <PlayArrowIcon sx={{ height: 38, width: 38 }} />
          </IconButton>
          {/* <IconButton aria-label="next">
            {theme.direction === "rtl" ? (
              <SkipPreviousIcon />
            ) : (
              <SkipNextIcon />
            )}
          </IconButton> */}
        </Box>
      </Box>
    </Card>
  );
}
