import React, { useState, useEffect } from "react";
// import { Link } from "react-router-dom"; // No longer needed for Login button
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import ListAltIcon from '@mui/icons-material/ListAlt';
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import LoginIcon from '@mui/icons-material/Login';
import { auth } from './firebase';
import { onAuthStateChanged, signInWithPopup } from 'firebase/auth'; // Import signInWithPopup
import { provider } from './firebase'; // Import Firebase provider
import { Link } from "react-router-dom"; // Keep for other buttons

const Home = ({ handleLoginOpen }) => { // Receive handleLoginOpen as a prop
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
        });
        return () => unsubscribe(); // Cleanup subscription on unmount
    }, []);

    const handleLogin = async () => {
        try {
            await signInWithPopup(auth, provider);
            // User is signed in. onAuthStateChanged will update currentUser.
            // No explicit navigation needed here as onAuthStateChanged handles UI updates.
        } catch (error) {
            console.error("Login failed: ", error);
            alert("Login failed: " + error.message); // Optional: show alert to user
        }
    };

    return (
        <Box className="home-container" sx={{ textAlign: 'center', py: 4, px: 2 }}>
            <Typography variant="h3" component="h1" gutterBottom>
                Welcome to Musavisa!
            </Typography>
            <Typography variant="h6" component="p" color="text.secondary" sx={{ mb: 4 }}>
                Test your music knowledge or create your own quizzes.
            </Typography>
            <Box className="home-navigation-buttons" sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, maxWidth: '300px', margin: '0 auto' }}>
                <Button component={Link} to="/quizzes" variant="contained" startIcon={<ListAltIcon />} className="home-nav-button" fullWidth>
                    All Quizzes
                </Button>
                {currentUser && (
                    <>
                        <Button component={Link} to="/my-quizzes" variant="contained" startIcon={<PlaylistAddCheckIcon />} className="home-nav-button" fullWidth>
                            My Quizzes
                        </Button>
                        <Button component={Link} to="/my-answers" variant="contained" startIcon={<FactCheckIcon />} className="home-nav-button" fullWidth>
                            My Answers
                        </Button>
                        <Button component={Link} to="/quiz" variant="contained" startIcon={<AddCircleOutlineIcon />} className="home-nav-button" fullWidth>
                            Create New Quiz
                        </Button>
                    </>
                )}
                {!currentUser && (
                    <Button
                        variant="outlined"
                        startIcon={<LoginIcon />}
                        className="home-nav-button"
                        fullWidth
                        onClick={handleLogin} // Call the passed-in function
                    >
                        Login
                    </Button>
                )}
            </Box>
        </Box>
    );
};

export default Home; 