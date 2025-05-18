import React, { useState, useEffect } from "react";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Button from "@mui/material/Button";
import { Link, useLocation, useNavigate } from "react-router-dom";
import HomeIcon from '@mui/icons-material/Home';
import ListAltIcon from '@mui/icons-material/ListAlt'; // Icon for All Quizzes
import FactCheckIcon from '@mui/icons-material/FactCheck'; // Icon for My Answers
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck'; // Icon for My Quizzes
import QuizIcon from '@mui/icons-material/Quiz';
import LoginIcon from '@mui/icons-material/Login';
import './Navbar.css';
import LogoutIcon from '@mui/icons-material/Logout'; // Import LogoutIcon
import { auth, provider } from "./firebase"; // Import Firebase auth instance and provider
import { onAuthStateChanged, signOut, signInWithPopup } from "firebase/auth";

const Navbar = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
        });
        return () => unsubscribe(); // Cleanup subscription on unmount
    }, []);

    const handleLogout = async () => {
        try {
            await signOut(auth);
            navigate('/'); // Redirect to home page after logout
        } catch (error) {
            console.error("Error signing out: ", error);
        }
    };

    const handleLogin = async () => {
        try {
            await signInWithPopup(auth, provider);
            // Navigation after login can be handled by onAuthStateChanged or by redirecting here if needed
        } catch (error) {
            console.error("Login failed: ", error);
            alert("Login failed: " + error.message); // Optional: show alert to user
        }
    };

    const navItems = [
        { label: "Home", path: "/", icon: <HomeIcon /> },
        { label: "All Quizzes", path: "/quizzes", icon: <ListAltIcon /> },
        { label: "My Quizzes", path: "/my-quizzes", icon: <PlaylistAddCheckIcon /> },
        { label: "My Answers", path: "/my-answers", icon: <FactCheckIcon /> },
        { label: "New Quiz", path: "/quiz", icon: <QuizIcon /> }, // Changed "Quiz" to "New Quiz" for clarity
        // Login/Logout item will be added dynamically below or handled separately
    ];
    return (
        <AppBar position="static" className="navbar-appbar">
            <Toolbar className="navbar-toolbar">
                {navItems.map((item) => (
                    <Button
                        key={item.path}
                        component={Link}
                        to={item.path}
                        className={`navbar-button ${location.pathname === item.path && item.path ? "active" : ""}`}
                        startIcon={item.icon}
                    >
                        {item.label}
                    </Button>
                ))}
                {currentUser ? (
                    <Button
                        onClick={handleLogout}
                        className="navbar-button"
                        startIcon={<LogoutIcon />}
                    >
                        Logout
                    </Button>
                ) : (
                    <Button
                        onClick={handleLogin} // Call handleLogin directly
                        className={`navbar-button ${location.pathname === "/login" ? "active" : ""}`}
                        startIcon={<LoginIcon />}
                    >
                        Login
                    </Button>
                )}
            </Toolbar>
        </AppBar>
    );
};

export default Navbar; 