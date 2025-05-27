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
import { auth, provider, db } from "./firebase"; // Assuming provider and db are exported
import { onAuthStateChanged, signOut, signInWithPopup } from "firebase/auth";
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore"; // Import Firestore functions
import { useTranslation } from 'react-i18next'; // Import useTranslation

const Navbar = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [mobileOpen, setMobileOpen] = useState(false);
    const { t, i18n } = useTranslation(); // Hook for translations
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
            console.log("Attempting login..."); // New log: Entry point
            const result = await signInWithPopup(auth, provider);
            const user = result.user;

            console.log("signInWithPopup successful, result.user:", user); // Log user object
            console.log("Firestore db instance:", db); // New log: Check db instance

            if (user) {
                // Check if user exists in Firestore 'users' collection
                const userDocRef = doc(db, "users", user.uid);
                console.log("Attempting to get user document from Firestore for UID:", user.uid);
                const docSnap = await getDoc(userDocRef);

                if (!docSnap.exists()) {
                    console.log("User document does not exist. Creating new document...");
                    // User doesn't exist, create a new document
                    await setDoc(userDocRef, {
                        uid: user.uid,
                        displayName: user.displayName || "Anonymous",
                        email: user.email,
                        createdAt: serverTimestamp(), // Optional: timestamp of creation
                        // You can add any other default fields here
                    });
                    console.log("SUCCESS: User document CREATED in Firestore for UID:", user.uid);
                } else {
                    console.log("INFO: User document ALREADY EXISTS for UID:", user.uid, docSnap.data());
                }
            }
            // onAuthStateChanged will update currentUser state and handle UI updates
        } catch (error) {
            console.error("ERROR in handleLogin (Login or Firestore operation): ", error);
            alert("Login failed or could not save user data: " + error.message + "\nCheck console for more details.");
        }
    };

    const navItems = [
        { labelKey: "navbar.home", path: "/", icon: <HomeIcon /> },
        { labelKey: "navbar.allQuizzes", path: "/quizzes", icon: <ListAltIcon /> },
        { labelKey: "navbar.myQuizzes", path: "/my-quizzes", icon: <PlaylistAddCheckIcon />, requiresAuth: true },
        { labelKey: "navbar.myAnswers", path: "/my-answers", icon: <FactCheckIcon />, requiresAuth: true },
        { labelKey: "navbar.newQuiz", path: "/quiz", icon: <QuizIcon />, requiresAuth: true },
        { labelKey: "navbar.highscores", path: "/highscores", icon: <EmojiEventsIcon />, requiresAuth: true },
    ];

    const handleLanguageChange = (event) => {
        const lang = event.target.value;
        i18n.changeLanguage(lang);
    };

    const drawer = (
        <div onClick={handleDrawerToggle} className="mobile-drawer">
            <List>
                {navItems.map((item) => (
                    // Conditionally render based on requiresAuth for mobile drawer
                    (!item.requiresAuth || currentUser) && (
                        <ListItem key={item.path} disablePadding>
                            <ListItemButton component={Link} to={item.path} selected={location.pathname === item.path}>
                                <ListItemIcon className="mobile-drawer-icon">
                                    {item.icon}
                                </ListItemIcon>
                                <ListItemText primary={t(item.labelKey)} className="mobile-drawer-text" />
                            </ListItemButton>
                        </ListItem>
                    )
                ))}
                {currentUser ? (
                    <ListItem disablePadding>
                        <ListItemButton onClick={handleLogout}>
                            <ListItemIcon className="mobile-drawer-icon">
                                <LogoutIcon />
                            </ListItemIcon>
                            <ListItemText primary={t('navbar.logout')} className="mobile-drawer-text" />
                        </ListItemButton>
                    </ListItem>
                ) : (
                    <ListItem disablePadding>
                        <ListItemButton onClick={handleLogin}>
                            <ListItemIcon className="mobile-drawer-icon">
                                <LoginIcon />
                            </ListItemIcon>
                            <ListItemText primary={t('navbar.login')} className="mobile-drawer-text" />
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
                                >{t(item.labelKey)}</Button>
                            )
                        ))}
                        {currentUser ? (
                            <Button onClick={handleLogout} className="navbar-button" startIcon={<LogoutIcon />}>
                                {t('navbar.logout')}
                            </Button>
                        ) : (
                            <Button onClick={handleLogin} className={`navbar-button`} startIcon={<LoginIcon />}>
                                {t('navbar.login')}
                            </Button>
                        )}
                    </div>
                    <FormControl sx={{ m: 1, minWidth: 100, '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.23) !important' }, '& .MuiSvgIcon-root': { color: 'white' } }} size="small">
                        {/* <InputLabel id="language-select-label" sx={{color: 'white'}}>Language</InputLabel> // Optional label */}
                        <Select
                            labelId="language-select-label"
                            id="language-select"
                            value={i18n?.language?.split('-')[0] || ''} // Use base language (e.g., 'en' from 'en-US')
                            onChange={handleLanguageChange}
                            // label={t('navbar.language')} // Optional label, if you use InputLabel
                            sx={{ color: 'white', '.MuiSelect-select': { paddingRight: '24px' } }} // Ensure text is white
                            variant="outlined" // Or "standard" / "filled" if you prefer
                        >
                            <MenuItem value="fi">FI</MenuItem>
                            <MenuItem value="en">EN</MenuItem>
                        </Select>
                    </FormControl>
                </Toolbar>
            </AppBar>
            <Drawer open={mobileOpen} onClose={handleDrawerToggle} ModalProps={{ keepMounted: true /* Better open performance on mobile. */ }}>
                {drawer}
            </Drawer>
        </>
    );
};

export default Navbar; 