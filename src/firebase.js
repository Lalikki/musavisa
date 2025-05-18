import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyAXwmi5yIpt9zdxL9b8E4BAzplzpFvEpXw",
    authDomain: "musavisa-d7d74.firebaseapp.com",
    projectId: "musavisa-d7d74",
    storageBucket: "musavisa-d7d74.firebasestorage.app",
    messagingSenderId: "186156347103",
    appId: "1:186156347103:web:052cb7842bf93405be836a"
    // Add the rest of your config values here
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app); 