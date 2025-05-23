import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, auth } from './firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';

const EditQuiz = () => {
    const { quizId } = useParams();
    const navigate = useNavigate();

    const [user, setUser] = useState(null);
    const [originalQuizData, setOriginalQuizData] = useState(null); // To store initially fetched quiz for auth check

    // Form state
    const [title, setTitle] = useState("");
    const [rules, setRules] = useState("");
    const [amount, setAmount] = useState("");
    const [questions, setQuestions] = useState([{ songLink: "", artist: "", song: "" }]);
    const [isReady, setIsReady] = useState(false); // New state for isReady

    // UI state
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState("");

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!quizId || !user) {
            if (!user && quizId) setError("Please log in to edit quizzes.");
            // Don't set loading to false here if user is null yet, wait for auth state
            return;
        }

        const fetchQuiz = async () => {
            setLoading(true);
            setError("");
            try {
                const quizDocRef = doc(db, 'quizzes', quizId);
                const quizDocSnap = await getDoc(quizDocRef);

                if (quizDocSnap.exists()) {
                    const data = quizDocSnap.data();
                    if (data.createdBy !== user.uid) {
                        setError("You are not authorized to edit this quiz.");
                        setOriginalQuizData(null); // Clear any potentially sensitive data
                    } else {
                        setOriginalQuizData(data);
                        setTitle(data.title || "");
                        setRules(data.rules || "");
                        setAmount(data.amount ? String(data.amount) : "");
                        setQuestions(data.questions && data.questions.length > 0 ? data.questions.map(q => ({ ...q })) : [{ songLink: "", artist: "", song: "" }]);
                        setIsReady(data.isReady || false); // Populate isReady state
                    }
                } else {
                    setError("Quiz not found.");
                }
            } catch (err) {
                console.error("Error fetching quiz for editing:", err);
                setError("Failed to load quiz data. " + err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchQuiz();
    }, [quizId, user]);

    // Effect to sync questions array with amount input
    useEffect(() => {
        const numAmount = Number(amount);
        if (!isNaN(numAmount) && numAmount >= 0 && questions) { // Allow 0 for amount
            const currentLength = questions.length;
            if (numAmount > currentLength) {
                const newQuestionsToAdd = Array(numAmount - currentLength).fill(null).map(() => ({ songLink: "", artist: "", song: "" }));
                setQuestions(prevQuestions => [...prevQuestions, ...newQuestionsToAdd]);
            }
            // Decreasing 'amount' in the input field will no longer automatically remove question entries.
            // Users must use the "Remove Song" button for that.
        } else if (amount === "" && questions && questions.length > 0) {
            // If amount is cleared, and questions exist, reset questions array.
            // This is a deliberate action by the user to clear the amount.
            if (questions.length !== 0) {
                setQuestions([]); // Or setQuestions([{ songLink: "", artist: "", song: "" }]) if 1 is min
            }
        }
    }, [amount]); // Only re-run if amount changes

    const handleQuestionChange = (index, field, value) => {
        const updatedQuestions = questions.map((q, i) => {
            if (i === index) {
                return { ...q, [field]: value };
            }
            return q;
        });
        setQuestions(updatedQuestions);
    };

    const addQuestion = () => {
        const newQuestions = [...questions, { songLink: "", artist: "", song: "" }];
        setQuestions(newQuestions);
        setAmount(String(newQuestions.length));
    };

    const removeQuestion = (index) => {
        const newQuestions = questions.filter((_, i) => i !== index);
        setQuestions(newQuestions);
        setAmount(String(newQuestions.length));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSuccess("");
        setError("");

        if (!originalQuizData || originalQuizData.createdBy !== user?.uid) {
            setError("Authorization error or quiz data not loaded properly.");
            return;
        }

        // Validations (similar to Quiz.js)
        if (!title.trim()) { setError("Title is required"); return; }
        if (!amount || isNaN(amount) || Number(amount) <= 0) { setError("Amount of songs must be a positive number"); return; }
        if (questions.length !== Number(amount)) { setError(`Number of song entries (${questions.length}) must match 'Amount of songs' (${amount}).`); return; }
        for (const q of questions) {
            if (!q.artist.trim() || !q.song.trim()) { setError("Artist and Song fields cannot be empty for any song entry."); return; }
        }

        setSaving(true);
        try {
            const quizDocRef = doc(db, 'quizzes', quizId);
            await updateDoc(quizDocRef, {
                title,
                rules,
                amount: Number(amount),
                questions,
                isReady, // Add isReady to the update
                updatedAt: serverTimestamp() // Optional: track updates
            });
            setSuccess("Quiz updated successfully!");
            setTimeout(() => navigate('/my-quizzes'), 1500); // Redirect after a short delay
        } catch (err) {
            setError("Failed to update quiz: " + err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <Typography sx={{ textAlign: 'center', mt: 3 }}>Loading quiz for editing...</Typography>;
    if (error && !originalQuizData) return (
        <Box sx={{ textAlign: 'center', mt: 3 }}>
            <Typography color="error" className="error-text">{error}</Typography>
            <Button variant="outlined" onClick={() => navigate('/my-quizzes')} sx={{ mt: 1 }}>
                Back to My Quizzes
            </Button>
        </Box>
    );
    if (!user) return <Typography sx={{ textAlign: 'center', mt: 3 }}>Please log in to edit quizzes.</Typography>;
    if (!originalQuizData && !loading) return <Typography sx={{ textAlign: 'center', mt: 3 }}>Quiz data could not be loaded or you are not authorized.</Typography>;

    // Re-using form structure from Quiz.js, but with state from EditQuiz.js
    return (
        <div className="quiz-container"> {/* Can reuse .quiz-container or make .edit-quiz-container */}
            <Typography variant="h4" component="h1" gutterBottom align="center" sx={{ mb: 2 }}>
                Edit Quiz: {originalQuizData?.title}
            </Typography>
            <Paper component="form" onSubmit={handleSubmit} className="quiz-creation-form" sx={{ p: { xs: 1.5, sm: 2.5 }, backgroundColor: 'transparent', boxShadow: 'none' }}>
                <TextField
                    label="Title"
                    variant="outlined"
                    fullWidth
                    margin="dense"
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
                    margin="dense"
                    multiline
                    rows={3}
                    value={rules}
                    onChange={e => setRules(e.target.value)}
                    className="form-input-full-width"
                    InputLabelProps={{ shrink: true }}
                />
                <TextField
                    label="Amount of songs"
                    type="number"
                    variant="outlined"
                    fullWidth
                    margin="dense"
                    value={amount}
                    readOnly
                    disabled
                    className="form-input-full-width"
                    InputLabelProps={{ shrink: true }}
                />

                <Typography variant="h6" component="h3" gutterBottom sx={{ mt: 2, mb: 1 }}>
                    Song Entries
                </Typography>
                {questions.map((q, index) => (
                    <Paper key={index} elevation={1} sx={{ p: { xs: 0.5, sm: 1 }, mb: 1 }} className="question-entry-box">
                        <Typography variant="subtitle1" component="h4" gutterBottom>
                            Song {index + 1}
                        </Typography>
                        <TextField
                            label="Song Link (Optional)"
                            variant="outlined"
                            fullWidth
                            margin="dense"
                            value={q.songLink}
                            onChange={e => handleQuestionChange(index, "songLink", e.target.value)}
                            className="form-input-question"
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
                            className="form-input-question"
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
                            className="form-input-question"
                            InputLabelProps={{ shrink: true }}
                        />
                        {questions.length > 0 && ( // Show remove only if there are questions
                            <Button
                                variant="outlined"
                                color="error"
                                startIcon={<RemoveCircleOutlineIcon />}
                                onClick={() => removeQuestion(index)}
                                sx={{ mt: 0.5, mb: 0.5 }}
                                className="button-remove-question"
                            >
                                Remove Song
                            </Button>
                        )}
                    </Paper>
                ))}
                <Button
                    variant="outlined"
                    startIcon={<AddCircleOutlineIcon />}
                    onClick={addQuestion}
                    className="button-add-question"
                    sx={{ mt: 1, mb: 2 }}
                >
                    Add Song Entry
                </Button>

                <FormControlLabel
                    control={<Checkbox id="editIsReadyCheckbox" checked={isReady} onChange={e => setIsReady(e.target.checked)} />}
                    label="Mark as Ready"
                    className="is-ready-checkbox-container"
                    sx={{ display: 'block', mt: 1, mb: 2 }}
                />
                <Button type="submit" variant="contained" color="primary" fullWidth disabled={saving} className="button-submit-quiz" startIcon={saving ? <CircularProgress size={20} color="inherit" /> : null}>
                    {saving ? 'Saving...' : 'Save Changes'}
                </Button>
                {success && <Typography color="success.main" sx={{ mt: 2, textAlign: 'center' }} className="success-text form-message">{success}</Typography>}
                {error && <Typography color="error" sx={{ mt: 2, textAlign: 'center' }} className="error-text form-message">{error}</Typography>}
            </Paper>
        </div>
    );
};

export default EditQuiz;