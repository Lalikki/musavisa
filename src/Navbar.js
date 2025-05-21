import React, { useState, useEffect } from "react";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Button from "@mui/material/Button"; // Keep for desktop
import IconButton from "@mui/material/IconButton"; // For hamburger icon
import MenuIcon from "@mui/icons-material/Menu"; // Hamburger icon
import Drawer from "@mui/material/Drawer"; // For the mobile menu
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import { Link, useLocation, useNavigate } from "react-router-dom";
import HomeIcon from '@mui/icons-material/Home';
import ListAltIcon from '@mui/icons-material/ListAlt'; // Icon for All Quizzes
import FactCheckIcon from '@mui/icons-material/FactCheck'; // Icon for My Answers
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck'; // Icon for My Quizzes
import QuizIcon from '@mui/icons-material/Quiz';
import LoginIcon from '@mui/icons-material/Login';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'; // Icon for Highscores
import './Navbar.css';
import LogoutIcon from '@mui/icons-material/Logout'; // Import LogoutIcon
import { auth, provider } from "./firebase"; // Import Firebase auth instance and provider
import { onAuthStateChanged, signOut, signInWithPopup } from "firebase/auth";

const Navbar = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
        });
        return () => unsubscribe(); // Cleanup subscription on unmount
    }, []);

    const handleDrawerToggle = () => {
        setMobileOpen(!mobileOpen);
    };

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
        { label: "New Quiz", path: "/quiz", icon: <QuizIcon />, requiresAuth: true }, // Requires auth
        { label: "Highscores", path: "/highscores", icon: <EmojiEventsIcon />, requiresAuth: true }, // Requires auth
    ];

    const drawer = (
        <div onClick={handleDrawerToggle} className="mobile-drawer">
            <List>
                {navItems.map((item) => (
                    <ListItem key={item.path} disablePadding>
                        <ListItemButton component={Link} to={item.path} selected={location.pathname === item.path}>
                            <ListItemIcon className="mobile-drawer-icon">
                                {item.icon}
                            </ListItemIcon>
                            <ListItemText primary={item.label} className="mobile-drawer-text" />
                        </ListItemButton>
                    </ListItem>
                ))}
                {currentUser ? (
                    <ListItem disablePadding>
                        <ListItemButton onClick={handleLogout}>
                            <ListItemIcon className="mobile-drawer-icon">
                                <LogoutIcon />
                            </ListItemIcon>
                            <ListItemText primary="Logout" className="mobile-drawer-text" />
                        </ListItemButton>
                    </ListItem>
                ) : (
                    <ListItem disablePadding>
                        <ListItemButton onClick={handleLogin}>
                            <ListItemIcon className="mobile-drawer-icon">
                                <LoginIcon />
                            </ListItemIcon>
                            <ListItemText primary="Login" className="mobile-drawer-text" />
                        </ListItemButton>
                    </ListItem>
                )}
            </List>
        </div>
    );

    return (
        <>
            <AppBar position="static" className="navbar-appbar">
                <Toolbar className="navbar-toolbar">
                    <IconButton
                        color="inherit"
                        aria-label="open drawer"
                        edge="start"
                        onClick={handleDrawerToggle}
                        className="menu-button"
                    >
                        <MenuIcon />
                    </IconButton>
                    <div className="desktop-nav-items">
                        {navItems.map((item) => (
                            // Conditionally render based on requiresAuth
                            (!item.requiresAuth || currentUser) && (
                                <Button
                                    key={item.path}
                                    component={Link}
                                    to={item.path}
                                    className={`navbar-button ${location.pathname === item.path && item.path ? "active" : ""}`}
                                    startIcon={item.icon}
                                >{item.label}</Button>
                            )
                        ))}
                        {currentUser ? (
                            <Button onClick={handleLogout} className="navbar-button" startIcon={<LogoutIcon />}>
                                Logout
                            </Button>
                        ) : (
                            <Button onClick={handleLogin} className={`navbar-button`} startIcon={<LoginIcon />}>
                                Login
                            </Button>
                        )}
                    </div>
                </Toolbar>
            </AppBar>
            <Drawer open={mobileOpen} onClose={handleDrawerToggle} ModalProps={{ keepMounted: true /* Better open performance on mobile. */ }}>
                {drawer}
            </Drawer>
        </>
    );
};

export default Navbar; 