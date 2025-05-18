import React, { useState, useEffect } from "react";
import { auth, provider } from "./firebase";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";

const Login = () => {
    const [user, setUser] = useState(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
        });
        return () => unsubscribe();
    }, []);

    const handleLogin = async () => {
        try {
            await signInWithPopup(auth, provider);
        } catch (error) {
            alert("Login failed: " + error.message);
        }
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            alert("Logout failed: " + error.message);
        }
    };

    return (
        <div className="login-container">
            {user ? (
                <div>
                    <h2>Welcome, {user.displayName}</h2>
                    <p>{user.email}</p>
                    <img src={user.photoURL} alt="User avatar" className="user-avatar" />
                    <br />
                    <button onClick={handleLogout} className="logout-button">Logout</button>
                </div>
            ) : (
                <button onClick={handleLogin}>Sign in with Google</button>
            )}
        </div>
    );
};

export default Login; 