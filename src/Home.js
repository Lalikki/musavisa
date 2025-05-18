import React from "react";
import { Link } from "react-router-dom";
import Button from "@mui/material/Button";
import ListAltIcon from '@mui/icons-material/ListAlt';
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';

const Home = () => (
    <div className="home-container">
        <h1>Welcome to Musavisa!</h1>
        <p>Test your music knowledge or create your own quizzes.</p>
        <div className="home-navigation-buttons">
            <Button component={Link} to="/quizzes" variant="contained" startIcon={<ListAltIcon />} className="home-nav-button">
                All Quizzes
            </Button>
            <Button component={Link} to="/my-quizzes" variant="contained" startIcon={<PlaylistAddCheckIcon />} className="home-nav-button">
                My Quizzes
            </Button>
            <Button component={Link} to="/my-answers" variant="contained" startIcon={<FactCheckIcon />} className="home-nav-button">
                My Answers
            </Button>
            <Button component={Link} to="/quiz" variant="contained" startIcon={<AddCircleOutlineIcon />} className="home-nav-button">
                Create New Quiz
            </Button>
        </div>
    </div>
);

export default Home; 