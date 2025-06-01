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
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import { InputLabel } from '@mui/material';
import { useTranslation } from 'react-i18next'; // Import useTranslation
import YTSearch from './components/YTSearch';

const emptyQuestion = { songLink: "", artist: "", song: "", extra: "", correctExtraAnswer: "", hint: "" }; // Default question structure

const EditQuiz = () => {
    const { t } = useTranslation(); // Initialize useTranslation
    const { quizId } = useParams();
    const navigate = useNavigate();

    const [user, setUser] = useState(null);
    const [originalQuizData, setOriginalQuizData] = useState(null); // To store initially fetched quiz for auth check

    // Form state
    const [title, setTitle] = useState("");
    const [rules, setRules] = useState("");
    const [amount, setAmount] = useState("");
    const [maxScorePerSong, setMaxScorePerSong] = useState("1"); // New state, default to 1
    const [questions, setQuestions] = useState([emptyQuestion]);
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
    }, []); // No t needed here

    useEffect(() => {
        if (!quizId || !user) {
            if (!user && quizId) setError(t('common.pleaseLogin')); // Or a more specific "login to edit"
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
                        setError(t('editQuizPage.notFoundError')); // Reusing "not found or not authorized"
                        setOriginalQuizData(null); // Clear any potentially sensitive data
                    } else {
                        setOriginalQuizData(data);
                        setTitle(data.title || "");
                        setRules(data.rules || "");
                        setAmount(data.amount ? String(data.amount) : "");
                        setMaxScorePerSong(data.maxScorePerSong ? String(data.maxScorePerSong) : "1.5"); // Populate maxScorePerSong
                        // Ensure each loaded question has hint and extra fields, defaulting to empty string if not present
                        const loadedQuestions = data.questions ? data.questions.map(q => ({
                            ...emptyQuestion, // Start with defaults to ensure all fields exist
                            ...q, // Spread loaded question data, overwriting defaults
                            extra: q.extra || "", // Explicitly ensure extra exists and defaults
                            correctExtraAnswer: q.correctExtraAnswer || "", // Explicitly ensure correctExtraAnswer exists and defaults
                            hint: q.hint || ""  // Explicitly ensure hint exists
                        })) : [emptyQuestion];
                        setQuestions(loadedQuestions);
                        setIsReady(data.isReady || false); // Populate isReady state
                    }
                } else {
                    setError(t('common.notFound'));
                }
            } catch (err) {
                console.error("Error fetching quiz for editing:", err);
                setError(t('editQuizPage.loadingError') + " " + err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchQuiz();
    }, [quizId, user, t]); // Added t to dependency array

    // Effect to sync questions array with amount input
    useEffect(() => {
        const numAmount = Number(amount);
        if (!isNaN(numAmount) && numAmount >= 0 && questions) { // Allow 0 for amount
            const currentLength = questions.length;
            if (numAmount > currentLength) {
                const newQuestionsToAdd = Array(numAmount - currentLength).fill(null).map(() => (emptyQuestion));
                setQuestions(prevQuestions => [...prevQuestions, ...newQuestionsToAdd]);
            }
            // Decreasing 'amount' in the input field will no longer automatically remove question entries.
            // Users must use the "Remove Song" button for that.
        } else if (amount === "" && questions && questions.length > 0) {
            // If amount is cleared, and questions exist, reset questions array.
            // This is a deliberate action by the user to clear the amount.
            if (questions.length !== 0) {
                setQuestions([]); // Or setQuestions([emptyQuestion]) if 1 is min
            }
        }
    }, [amount]); // Only re-run if amount changes

    const handleYouTubeSearchSelection = (index, data) => {
        const updatedQuestions = [...questions];
        updatedQuestions[index] = {
            ...updatedQuestions[index],
            songLink: data.songLink,
            artist: data.songArtist,
            song: data.songName,
        };
        setQuestions(updatedQuestions);
    };

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
        const newQuestions = [...questions, emptyQuestion];
        setQuestions(newQuestions);
        setAmount(String(newQuestions.length));
    };

    const removeQuestion = (index) => {
        const newQuestions = questions.filter((_, i) => i !== index);
        setQuestions(newQuestions);
        setAmount(String(newQuestions.length));
    };

    const onDragEnd = (result) => {
        // dropped outside the list
        if (!result.destination) {
            return;
        }

        const items = Array.from(questions);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);

        setQuestions(items);
        // Note: We don't need to update 'amount' here as the number of questions hasn't changed,
        // only their order. If 'amount' was strictly tied to the array length for other reasons,
        // you might consider it, but for reordering, it's usually not necessary.
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSuccess("");
        setError("");

        if (!originalQuizData || originalQuizData.createdBy !== user?.uid) {
            setError(t('editQuizPage.authOrLoadError', "Authorization error or quiz data not loaded properly.")); // New key
            return;
        }

        // Validations (similar to Quiz.js)
        if (!title.trim()) { setError(t('common.error') + ": " + t('createNewQuizPage.quizTitleLabel') + " " + t('common.isRequired', 'is required')); return; }
        if (!amount || isNaN(amount) || Number(amount) <= 0) { setError(t('common.error') + ": " + t('createNewQuizPage.amountOfSongsLabel') + " " + t('common.mustBePositive', 'must be a positive number')); return; }
        if (!maxScorePerSong || isNaN(maxScorePerSong) || Number(maxScorePerSong) <= 0) { setError(t('common.error') + ": " + t('createNewQuizPage.maxScorePerSongLabel', 'Max score per song') + " " + t('common.mustBePositive', 'must be a positive number')); return; }
        if (questions.length !== Number(amount)) { setError(t('common.error') + ": " + t('createNewQuizPage.songEntriesErrorMismatch', { count: questions.length, amount: amount })); return; }
        for (const q of questions) {
            if (!q.artist.trim() || !q.song.trim()) { setError(t('common.error') + ": " + t('createNewQuizPage.songEntryFieldsRequired')); return; }
        }

        setSaving(true);
        try {
            const quizDocRef = doc(db, 'quizzes', quizId);

            // Calculate the maximum possible score
            let calculatedMaxScore = 0;
            questions.forEach(q => {
                calculatedMaxScore += 0.5; // For artist
                calculatedMaxScore += 0.5; // For song
                // Only add points for extra if both the question and its correct answer are present
                if (q.extra && q.extra.trim() !== '' && q.correctExtraAnswer && q.correctExtraAnswer.trim() !== '') {
                    calculatedMaxScore += 0.5; // For extra question
                }
            });

            await updateDoc(quizDocRef, {
                title,
                rules,
                amount: Number(amount),
                maxScorePerSong: Number(maxScorePerSong), // Add maxScorePerSong to the update
                questions, // Ensure questions are properly stringified if they contain complex objects not directly supported by Firestore if any
                isReady, // Add isReady to the update
                updatedAt: serverTimestamp(), // Optional: track updates
                calculatedMaxScore // Store the calculated max score
            });
            setSuccess(t('editQuizPage.updateSuccess'));
            setTimeout(() => navigate('/my-quizzes'), 1500); // Redirect after a short delay
        } catch (err) {
            setError(t('editQuizPage.updateError') + " " + err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <Typography sx={{ textAlign: 'center', mt: 3 }}>{t('common.loading')}</Typography>;
    if (error && !originalQuizData) return (
        <Box sx={{ textAlign: 'center', mt: 3 }}>
            <Typography color="error" className="error-text">{error || t('common.error')}</Typography>
            <Button variant="outlined" onClick={() => navigate('/my-quizzes')} sx={{ mt: 1 }}>
                {t('editQuizPage.backToMyQuizzes')}
            </Button>
        </Box>
    );
    if (!user) return <Typography sx={{ textAlign: 'center', mt: 3 }}>{t('common.pleaseLogin')}</Typography>; // Or a more specific "login to edit"
    if (!originalQuizData && !loading) return <Typography sx={{ textAlign: 'center', mt: 3 }}>{t('editQuizPage.authOrLoadError', 'Quiz data could not be loaded or you are not authorized.')}</Typography>;

    // Re-using form structure from Quiz.js, but with state from EditQuiz.js
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
            <Typography variant="h4" component="h1" gutterBottom align="center" sx={{ mb: 2 }}>
                {t('editQuizPage.pageTitle', { quizTitle: originalQuizData?.title || '...' })}
            </Typography>

            <Paper component="form" onSubmit={handleSubmit} className="quiz-creation-form" sx={{ p: { xs: 1.5, sm: 2.5 }, backgroundColor: 'transparent', boxShadow: 'none' }}>
                <TextField
                    label={t('createNewQuizPage.quizTitleLabel')}
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
                    label={t('createNewQuizPage.rulesOptionalLabel')}
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
                    label={t('createNewQuizPage.amountOfSongsLabel')}
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
                <FormControl fullWidth margin="dense" required className="form-input-full-width">
                    <InputLabel id="edit-max-score-per-song-label" shrink>{t('createNewQuizPage.maxScorePerSongLabel', 'Max Score Per Song')}</InputLabel>
                    <Select
                        labelId="edit-max-score-per-song-label"
                        id="edit-max-score-per-song-select"
                        value={maxScorePerSong}
                        label={t('createNewQuizPage.maxScorePerSongLabel', 'Max Score Per Song')}
                        onChange={e => setMaxScorePerSong(e.target.value)}
                    >
                        <MenuItem value="1">1</MenuItem>
                        <MenuItem value="1.5">1.5</MenuItem>
                        <MenuItem value="2">2</MenuItem>
                    </Select>
                </FormControl>


                <Typography variant="h6" component="h3" gutterBottom sx={{ mt: 2, mb: 1 }}>
                    {t('createNewQuizPage.songEntriesTitle')}
                </Typography>
                <DragDropContext onDragEnd={onDragEnd}>
                    <Droppable droppableId="questionsDroppable">
                        {(provided) => (
                            <Box {...provided.droppableProps} ref={provided.innerRef}>
                                {questions.map((q, index) => (
                                    <Draggable key={`question-${index}`} draggableId={`question-${index}`} index={index}>
                                        {(provided) => (
                                            <Paper
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                {...provided.dragHandleProps}
                                                elevation={1}
                                                sx={{ p: { xs: 0.5, sm: 1 }, mb: 1 }}
                                                className="question-entry-box"
                                            >
                                                <Typography variant="subtitle1" component="h4" gutterBottom>
                                                    {t('common.songs')} {index + 1} ({t('common.dragToReorder', 'Drag to reorder')})
                                                </Typography>
                                                <YTSearch handleSelection={handleYouTubeSearchSelection} handleQuestionChange={handleQuestionChange} value={q.songLink} index={index} />
                                                <TextField
                                                    label={t('createNewQuizPage.artistLabel')}
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
                                                    label={t('createNewQuizPage.songTitleLabel')}
                                                    variant="outlined"
                                                    fullWidth
                                                    margin="dense"
                                                    value={q.song}
                                                    onChange={e => handleQuestionChange(index, "song", e.target.value)}
                                                    required
                                                    className="form-input-question"
                                                    InputLabelProps={{ shrink: true }}
                                                />
                                                {Number(maxScorePerSong) >= 1.5 && (
                                                    <>
                                                        <TextField
                                                            label={t('createNewQuizPage.extraLabel', 'Extra Question (Optional)')}
                                                            variant="outlined"
                                                            fullWidth
                                                            margin="dense"
                                                            value={q.extra || ''}
                                                            onChange={e => handleQuestionChange(index, "extra", e.target.value)}
                                                            className="form-input-question"
                                                            InputLabelProps={{ shrink: true }}
                                                        />
                                                        <TextField
                                                            label={t('createNewQuizPage.correctExtraAnswerLabel', 'Correct Answer to Extra Question')}
                                                            variant="outlined"
                                                            fullWidth
                                                            margin="dense"
                                                            value={q.correctExtraAnswer || ''}
                                                            onChange={e => handleQuestionChange(index, "correctExtraAnswer", e.target.value)}
                                                            className="form-input-question"
                                                            InputLabelProps={{ shrink: true }}
                                                        />
                                                    </>
                                                )}
                                                <TextField
                                                    label={t('createNewQuizPage.hintOptionalLabel')}
                                                    variant="outlined"
                                                    fullWidth
                                                    margin="dense"
                                                    value={q.hint || ''} // Ensure value is controlled, default to empty string
                                                    onChange={e => handleQuestionChange(index, "hint", e.target.value)}
                                                    className="form-input-question"
                                                    InputLabelProps={{ shrink: true }}
                                                />
                                                {questions.length > 0 && (
                                                    <Button
                                                        variant="outlined"
                                                        color="error"
                                                        startIcon={<RemoveCircleOutlineIcon />}
                                                        onClick={() => removeQuestion(index)}
                                                        sx={{ mt: 0.5, mb: 0.5 }}
                                                        className="button-remove-question"
                                                    >
                                                        {t('createNewQuizPage.removeSong')}
                                                    </Button>
                                                )}
                                            </Paper>
                                        )}
                                    </Draggable>
                                ))}
                                {provided.placeholder}
                            </Box>
                        )}
                    </Droppable>
                </DragDropContext>
                <Button
                    variant="outlined"
                    startIcon={<AddCircleOutlineIcon />}
                    onClick={addQuestion}
                    className="button-add-question"
                    sx={{ mt: 1, mb: 2 }}
                >
                    {t('createNewQuizPage.addSongEntry')}
                </Button>

                <FormControlLabel
                    control={<Checkbox id="editIsReadyCheckbox" checked={isReady} onChange={e => setIsReady(e.target.checked)} />}
                    label={t('createNewQuizPage.markAsReadyLabel')}
                    className="is-ready-checkbox-container"
                    sx={{ display: 'block', mt: 1, mb: 2 }}
                />
                <Button type="submit" variant="contained" color="primary" fullWidth disabled={saving} className="button-submit-quiz" startIcon={saving ? <CircularProgress size={20} color="inherit" /> : null}>
                    {saving ? t('common.saving') : t('editQuizPage.updateQuizButton')}
                </Button>
                {success && <Typography color="success.main" sx={{ mt: 2, textAlign: 'center' }} className="success-text form-message">{success}</Typography>}
                {error && <Typography color="error" sx={{ mt: 2, textAlign: 'center' }} className="error-text form-message">{error}</Typography>}
            </Paper>
        </Box>
    );
};

export default EditQuiz;