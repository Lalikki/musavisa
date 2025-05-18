import React, { useState, useEffect } from "react";
import { db, auth } from "./firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

const Quiz = () => {
    const [user, setUser] = useState(null);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [amount, setAmount] = useState("");
    const [success, setSuccess] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
        });
        return () => unsubscribe();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSuccess("");
        setError("");
        if (!title.trim()) {
            setError("Title is required");
            return;
        }
        if (!amount || isNaN(amount) || Number(amount) <= 0) {
            setError("Amount of songs must be a positive number");
            return;
        }
        try {
            await addDoc(collection(db, "quizzes"), {
                title,
                description,
                amount: Number(amount),
                createdBy: user.uid,
                createdAt: serverTimestamp(),
                questions: []
            });
            setSuccess("Quiz created successfully!");
            setTitle("");
            setDescription("");
            setAmount("");
        } catch (err) {
            setError("Failed to create quiz: " + err.message);
        }
    };

    return (
        <div className="quiz-container">
            <h1>Quiz Page</h1>
            <p>Quiz features will go here.</p>
            {user ? (
                <form onSubmit={handleSubmit} style={{ maxWidth: 400, margin: "30px auto", textAlign: "left" }}>
                    <h2>Create a New Quiz</h2>
                    <div>
                        <label>Title:</label>
                        <input
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            style={{ width: "100%", padding: 8, marginBottom: 10 }}
                        />
                    </div>
                    <div>
                        <label>Description:</label>
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            style={{ width: "100%", padding: 8, marginBottom: 10 }}
                        />
                    </div>
                    <div>
                        <label>Amount of songs:</label>
                        <input
                            type="number"
                            min="1"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            style={{ width: "100%", padding: 8, marginBottom: 10 }}
                        />
                    </div>
                    <button type="submit">Create Quiz</button>
                    {success && <div style={{ color: "green", marginTop: 10 }}>{success}</div>}
                    {error && <div style={{ color: "red", marginTop: 10 }}>{error}</div>}
                </form>
            ) : (
                <p>Please log in to create a quiz.</p>
            )}
        </div>
    );
};

export default Quiz; 