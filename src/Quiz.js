import React, { useState, useEffect } from "react";
import { db, auth } from "./firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

const Quiz = () => {
    const [user, setUser] = useState(null);
    const [title, setTitle] = useState("");
    const [rules, setRules] = useState(""); // Renamed from description
    const [amount, setAmount] = useState("");
    const [success, setSuccess] = useState("");
    const [error, setError] = useState("");
    const [questions, setQuestions] = useState([
        { songLink: "", artist: "", song: "" } // Updated fields
    ]);


    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
        });
        return () => unsubscribe();
    }, []);

    const handleQuestionChange = (index, field, value) => {
        const updated = [...questions];
        updated[index][field] = value;
        setQuestions(updated);
    };


    const addQuestion = () => {
        setQuestions([...questions, { songLink: "", artist: "", song: "" }]); // Updated fields
    };

    const removeQuestion = (index) => {
        const updated = questions.filter((_, i) => i !== index);
        setQuestions(updated);
    };

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
        if (questions.length !== Number(amount)) {
            setError(`Number of song entries (${questions.length}) must match the 'Amount of songs' field (${amount}).`);
            return;
        }
        // Optional: Add validation for empty fields within questions
        for (const q of questions) {
            if (!q.artist.trim() || !q.song.trim()) {
                setError("Artist and Song fields cannot be empty for any song entry.");
                return;
            }
        }
        try {
            await addDoc(collection(db, "quizzes"), {
                title,
                rules, // Changed from description
                amount: Number(amount),
                createdBy: user ? user.uid : "unknown", // Handle case where user might be null briefly
                creatorName: user ? user.displayName : "Unknown", // Store display name
                createdAt: serverTimestamp(),
                questions
            });
            setSuccess("Quiz created successfully!");
            setTitle("");
            setRules(""); // Changed from setDescription
            setAmount("");
            setQuestions([{ songLink: "", artist: "", song: "" }]); // Reset questions
        } catch (err) {
            setError("Failed to create quiz: " + err.message);
        }
    };

    return (
        <div className="quiz-container">
            <h1>Create New Quiz</h1>
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
                        <label>Rules:</label> {/* Changed label */}
                        <textarea
                            value={rules}
                            onChange={e => setRules(e.target.value)} // Changed state setter
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
                    <h3>Song Entries (Details for checking answers)</h3>
                    {questions.map((q, index) => (
                        <div key={index} style={{ border: "1px solid #ccc", padding: 10, marginBottom: 15 }}>
                            <h4>Song {index + 1}</h4>
                            <label>Song Link (Optional, e.g., YouTube):</label>
                            <input
                                type="text"
                                placeholder="https://youtube.com/watch?v=..."
                                value={q.songLink}
                                onChange={e => handleQuestionChange(index, "songLink", e.target.value)}
                                style={{ width: "100%", padding: 6, marginBottom: 6 }}
                            />

                            <label>Artist:</label>
                            <input
                                type="text"
                                placeholder="Artist Name"
                                value={q.artist}
                                onChange={e => handleQuestionChange(index, "artist", e.target.value)}
                                style={{ width: "100%", padding: 6, marginBottom: 6 }}
                                required
                            />
                            <label>Song Title:</label>
                            <input
                                type="text"
                                placeholder="Song Title"
                                value={q.song}
                                onChange={e => handleQuestionChange(index, "song", e.target.value)}
                                style={{ width: "100%", padding: 6, marginBottom: 6 }}
                                required
                            />

                            {questions.length > 1 && (
                                <button type="button" onClick={() => removeQuestion(index)} style={{ marginTop: 6 }}>
                                    Remove Question
                                </button>
                            )}
                        </div>
                    ))}

                    <button type="button" onClick={addQuestion} style={{ marginRight: '10px' }}>Add Song Entry</button>


                    <button type="submit" style={{ marginTop: '20px', padding: '10px 15px' }}>Create Quiz</button>
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