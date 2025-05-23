import React, { useState, useEffect } from "react";
import { db, auth } from "./firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';

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

    const addQuestion = () => {
        const newQuestions = [...questions, { songLink: "", artist: "", song: "", loadingMetadata: false }];
        setQuestions(newQuestions);
        setAmount(String(newQuestions.length)); // Update the amount field to reflect the new total
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
        <Box
            className="quiz-container" // Keep class if any global styles still apply
            sx={{
                maxWidth: '900px', // Consistent max-width
                margin: '0 auto',  // Center the content
                padding: { xs: 2, sm: 3 }, // Responsive padding
                // Background color will come from theme.palette.background.default via CssBaseline
            }}
        >
            {user ? (
                <Paper component="form" onSubmit={handleSubmit} className="quiz-creation-form" sx={{ p: { xs: 1.5, sm: 2.5 }, backgroundColor: 'transparent', boxShadow: 'none' }}> {/* Adjusted padding, transparent, no shadow */}
                    <Typography variant="h5" component="h2" gutterBottom align="center">
                        Create a New Quiz
                    </Typography>
                    <TextField
                        label="Title"
                        variant="outlined"
                        fullWidth
                        margin="dense" // Changed from normal to dense
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        required
                        className="form-input-full-width"
                        InputLabelProps={{ shrink: true }}
                    />
                    <TextField
                        label="Rules"
                        variant="outlined"
                        fullWidth
                        margin="dense" // Changed from normal to dense
                        multiline
                        rows={3}
                        value={rules}
                        onChange={e => setRules(e.target.value)}
                        required
                        className="form-input-full-width"
                        InputLabelProps={{ shrink: true }}
                    />
                    <TextField
                        label="Amount of songs"
                        type="number"
                        variant="outlined"
                        fullWidth
                        margin="dense" // Changed from normal to dense
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                        required
                        className="form-input-full-width"
                        InputProps={{ inputProps: { min: 1 } }}
                        InputLabelProps={{ shrink: true }}
                    />

                    {Number(amount) > 0 && (
                        <Box sx={{ mt: 1, mb: 1 }}> {/* Reduced top margin */}
                            <Typography variant="h6" component="h3" gutterBottom>
                                Song Entries
                            </Typography>
                            {questions.map((q, index) => (
                                <Paper key={index} elevation={4} sx={{ p: 1, mb: 1 }} className="question-entry-box"> {/* Reduced padding, margin, and elevation */}
                                    <Typography variant="subtitle1" component="h4" gutterBottom>
                                        Song {index + 1}
                                    </Typography>
                                    <TextField
                                        label="Song Link (Youtube/Spotify)"
                                        variant="outlined"
                                        fullWidth
                                        margin="dense"
                                        value={q.songLink}
                                        onChange={e => handleQuestionChange(index, "songLink", e.target.value)}
                                        required
                                        className={`form-input-question ${q.loadingMetadata ? 'input-loading' : ''}`}
                                        InputLabelProps={{ shrink: true }}
                                    />
                                    <TextField
                                        label="Artist"
                                        variant="outlined"
                                        fullWidth
                                        margin="dense"
                                        value={q.artist}
                                        onChange={e => handleQuestionChange(index, "artist", e.target.value)}
                                        required
                                        className={`form-input-question ${q.loadingMetadata ? 'input-loading' : ''}`}
                                        InputLabelProps={{ shrink: true }}
                                    />
                                    <TextField
                                        label="Song Title"
                                        variant="outlined"
                                        fullWidth
                                        margin="dense"
                                        value={q.song}
                                        onChange={e => handleQuestionChange(index, "song", e.target.value)}
                                        required
                                        className={`form-input-question ${q.loadingMetadata ? 'input-loading' : ''}`}
                                        InputLabelProps={{ shrink: true }}
                                    />
                                    {/* {q.loadingMetadata && <Typography variant="caption" className="metadata-loading-indicator" sx={{ ml: 1 }}> Fetching...</Typography>} */}
                                    {questions.length > 1 && (
                                        <Button
                                            variant="outlined"
                                            color="error"
                                            startIcon={<RemoveCircleOutlineIcon />}
                                            onClick={() => removeQuestion(index)}
                                            sx={{ mt: 0.5, mb: 0.5 }} // Reduced margin
                                            className="button-remove-question"
                                        >
                                            Remove Song
                                        </Button>
                                    )}
                                </Paper>
                            ))}
                            {/* "Add Song Entry" button within the Song Entries Box */}
                            <Button
                                variant="outlined"
                                startIcon={<AddCircleOutlineIcon />}
                                onClick={addQuestion}
                                className="button-add-question"
                                sx={{ mt: 1, mb: 2, }}
                            >
                                Add Song Entry
                            </Button>
                        </Box>
                    )}
                    <FormControlLabel
                        control={<Checkbox checked={isReady} onChange={e => setIsReady(e.target.checked)} id="isReadyCheckbox" />}
                        label="Mark as Ready"
                        className="is-ready-checkbox-container" sx={{ display: 'block', mt: 1, mb: 1 }} // Reduced margins
                    />

                    <Button type="submit" variant="contained" color="primary" fullWidth className="button-submit-quiz">
                        Create Quiz
                    </Button>
                    {success && <Typography color="success.main" sx={{ mt: 2 }} className="form-message">{success}</Typography>}
                    {error && <Typography color="error" sx={{ mt: 2 }} className="form-message">{error}</Typography>}
                </Paper>) : (
                <Typography>Please log in to create a quiz.</Typography>
            )}
        </Box>
    );
};

export default Quiz; 