import React from "react";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import { Link, useLocation } from "react-router-dom";
import HomeIcon from '@mui/icons-material/Home';
import ListAltIcon from '@mui/icons-material/ListAlt'; // Icon for All Quizzes
import QuizIcon from '@mui/icons-material/Quiz';
import LoginIcon from '@mui/icons-material/Login';

const navItems = [
    { label: "Home", path: "/", icon: <HomeIcon /> },
    { label: "All Quizzes", path: "/quizzes", icon: <ListAltIcon /> },
    { label: "Quiz", path: "/quiz", icon: <QuizIcon /> },
    { label: "Login", path: "/login", icon: <LoginIcon /> },
];

const Navbar = () => {
    const location = useLocation();

    return (
        <AppBar position="static" color="primary">
            <Toolbar>
                <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                    Musavisa
                </Typography>
                {navItems.map((item) => (
                    <Button
                        key={item.path}
                        component={Link}
                        to={item.path}
                        color={location.pathname === item.path ? "secondary" : "inherit"}
                        startIcon={item.icon}
                        sx={{ mx: 1 }}
                    >
                        {item.label}
                    </Button>
                ))}
            </Toolbar>
        </AppBar>
    );
};

export default Navbar; 