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
    const [isReady, setIsReady] = useState(false); // New state for isReady, defaults to false
    const [error, setError] = useState("");
    const [questions, setQuestions] = useState([
        { songLink: "", artist: "", song: "", loadingMetadata: false } // Added loadingMetadata
    ]);


    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
        });
        return () => unsubscribe();
    }, []);

    // Helper function to parse YouTube video ID
    // const getYouTubeID = (url) => {
    //     const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    //     const match = url.match(regExp);
    //     return (match && match[2].length === 11) ? match[2] : null;
    // };

    // Helper function to parse Spotify track ID
    // const getSpotifyTrackID = (url) => {
    //     const regExp = /^(?:spotify:track:|https:\/\/[a-z]+\.spotify\.com\/track\/)([a-zA-Z0-9]+)/;
    //     const match = url.match(regExp);
    //     return match ? match[1] : null;
    // };

    // Placeholder for actual API call to your backend/cloud function
    // const fetchMetadataFromAPI = async (linkType, id) => {
    //     // Simulate API call
    //     return new Promise(resolve => {
    //         setTimeout(() => {
    //             if (linkType === "youtube") {
    //                 // In a real scenario, you'd call your backend which calls YouTube API
    //                 // Example: YouTube title might be "Artist Name - Song Title (Official Video)"
    //                 // You'd need to parse this.
    //                 if (id === "dQw4w9WgXcQ") { // Rick Astley example ID
    //                     resolve({ artist: "Rick Astley", song: "Never Gonna Give You Up" });
    //                 } else {
    //                     resolve({ artist: "YouTube Artist (Demo)", song: "YouTube Song (Demo)" });
    //                 }
    //             } else if (linkType === "spotify") {
    //                 // In a real scenario, you'd call your backend which calls Spotify API
    //                 if (id === "0sNOj6fL7K652VvtfEenjA") { // Example Spotify ID
    //                     resolve({ artist: "Daft Punk", song: "Get Lucky" });
    //                 } else {
    //                     resolve({ artist: "Spotify Artist (Demo)", song: "Spotify Song (Demo)" });
    //                 }
    //             } else {
    //                 resolve({ artist: "", song: "" }); // No match
    //             }
    //         }, 1500); // Simulate network delay
    //     });
    // };

    const handleQuestionChange = (index, field, value) => {
        const updated = questions.map((q, i) => {
            if (i === index) {
                return { ...q, [field]: value, loadingMetadata: field === "songLink" ? true : q.loadingMetadata };
            }
            return q;
        });
        setQuestions(updated);

        if (field === "songLink" && value.trim() !== "") {
            // fetchAndSetSongMetadata(value, index);
        }
    };

    useEffect(() => {
        const numAmount = Number(amount);
        // Only adjust if numAmount is a positive number
        if (!isNaN(numAmount) && numAmount > 0) {
            const currentLength = questions.length;
            if (numAmount > currentLength) {
                // Add new empty question objects
                const newQuestionsToAdd = Array(numAmount - currentLength).fill(null).map(() => ({ songLink: "", artist: "", song: "", loadingMetadata: false }));
                setQuestions(prevQuestions => [...prevQuestions, ...newQuestionsToAdd]);
            } else if (numAmount < currentLength) {
                // Remove questions from the end
                setQuestions(prevQuestions => prevQuestions.slice(0, numAmount));
            }
        } else if (amount === "" && questions.length > 0) {
            // Optional: If amount is cleared, you might want to reset to 1 question or do nothing.
            // For now, let's reset to one question if the field is cleared and there were questions.
            // If you prefer it to do nothing, you can remove this else-if block.
            if (questions.length !== 1) { // Avoid unnecessary re-render if already 1
                setQuestions([{ songLink: "", artist: "", song: "", loadingMetadata: false }]);
            }
        }
    }, [amount]); // Rerun this effect when the 'amount' state changes

    // const fetchAndSetSongMetadata = async (url, index) => {
    //     let linkType = null;
    //     let id = null;

    //     const youtubeID = getYouTubeID(url);
    //     if (youtubeID) {
    //         linkType = "youtube";
    //         id = youtubeID;
    //     } else {
    //         const spotifyID = getSpotifyTrackID(url);
    //         if (spotifyID) {
    //             linkType = "spotify";
    //             id = spotifyID;
    //         }
    //     }

    //     if (linkType && id) {
    //         const metadata = await fetchMetadataFromAPI(linkType, id);
    //         setQuestions(prevQuestions => prevQuestions.map((q, i) => {
    //             if (i === index) {
    //                 return { ...q, artist: metadata.artist || q.artist, song: metadata.song || q.song, loadingMetadata: false };
    //             }
    //             return q;
    //         }));
    //     } else {
    //         // If not a valid link or no ID found, just stop loading
    //         setQuestions(prevQuestions => prevQuestions.map((q, i) => i === index ? { ...q, loadingMetadata: false } : q));
    //     }
    // };

    const removeQuestion = (index) => {
        const updatedQuestions = questions.filter((_, i) => i !== index);
        setQuestions(updatedQuestions);
        setAmount(String(updatedQuestions.length)); // Update the amount field
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSuccess("");
        setError("");
        if (!title.trim()) {
            setError("Title is required");
            return;
        }
        if (!rules.trim()) {
            setError("Rules are required");
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
                questions,
                isReady // Add isReady field to Firestore document
            });
            setSuccess("Quiz created successfully!");
            setTitle("");
            setRules(""); // Changed from setDescription
            setAmount("");
            setQuestions([{ songLink: "", artist: "", song: "", loadingMetadata: false }]); // Reset questions
            setIsReady(false); // Reset isReady checkbox
        } catch (err) {
            setError("Failed to create quiz: " + err.message);
        }
    };

    return (
        <div className="quiz-container">
            <h1>Create New Quiz</h1>
            {user ? (
                <form onSubmit={handleSubmit} className="quiz-creation-form">
                    <h2>Create a New Quiz</h2>
                    <div>
                        <label>Title: <span style={{ color: 'red' }}>*</span></label>
                        <input
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            className="form-input-full-width"
                        />
                    </div>
                    <div>
                        <label>Rules: <span style={{ color: 'red' }}>*</span></label>
                        <textarea
                            value={rules}
                            onChange={e => setRules(e.target.value)} // Changed state setter
                            className="form-input-full-width"
                        />
                    </div>
                    <div>
                        <label>Amount of songs: <span style={{ color: 'red' }}>*</span></label>
                        <input
                            type="number"
                            min="1"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            className="form-input-full-width"
                        />
                    </div>

                    {Number(amount) > 0 && (
                        <>
                            <h3>Song Entries (Details for checking answers)</h3>
                            {questions.map((q, index) => (
                                <div key={index} className="question-entry-box">
                                    <h4>Song {index + 1}</h4>
                                    <label>Song Link (Optional, e.g., YouTube):</label>
                                    <input
                                        type="text"
                                        placeholder="https://youtube.com/watch?v=..."
                                        value={q.songLink}
                                        onChange={e => handleQuestionChange(index, "songLink", e.target.value)}
                                        className={`form-input-question ${q.loadingMetadata ? 'input-loading' : ''}`}
                                    />

                                    <label>Artist: <span style={{ color: 'red' }}>*</span></label>
                                    <input
                                        type="text"
                                        placeholder="Artist Name"
                                        value={q.artist}
                                        onChange={e => handleQuestionChange(index, "artist", e.target.value)}
                                        className={`form-input-question ${q.loadingMetadata ? 'input-loading' : ''}`}
                                        required
                                    />
                                    <label>Song Title: <span style={{ color: 'red' }}>*</span></label>
                                    <input
                                        type="text"
                                        placeholder="Song Title"
                                        value={q.song}
                                        onChange={e => handleQuestionChange(index, "song", e.target.value)}
                                        className={`form-input-question ${q.loadingMetadata ? 'input-loading' : ''}`}
                                        required
                                    />
                                    {q.loadingMetadata && <span className="metadata-loading-indicator"> Fetching...</span>}
                                    {questions.length > 1 && (
                                        <button type="button" onClick={() => removeQuestion(index)} className="button-remove-question">
                                            Remove Song
                                        </button>
                                    )}
                                </div>
                            ))}

                        </>
                    )}

                    <div className="is-ready-checkbox-container">
                        <label htmlFor="isReadyCheckbox" className="is-ready-checkbox-label">
                            Mark as Ready:
                        </label>
                        <input
                            type="checkbox"
                            id="isReadyCheckbox"
                            checked={isReady}
                            onChange={e => setIsReady(e.target.checked)}
                        />
                    </div>

                    <button type="submit" className="button-submit-quiz">Create Quiz</button>
                    {success && <div className="success-text form-message">{success}</div>}
                    {error && <div className="error-text form-message">{error}</div>}
                </form>
            ) : (
                <p>Please log in to create a quiz.</p>
            )}
        </div>
    );
};

export default Quiz; 