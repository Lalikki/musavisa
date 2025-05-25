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
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useTranslation } from 'react-i18next'; // Import useTranslation

const Quiz = () => {
    const { t } = useTranslation(); // Initialize useTranslation
    const [user, setUser] = useState(null);
    const [title, setTitle] = useState("");
    const [rules, setRules] = useState("");
    const [amount, setAmount] = useState("");
    const [success, setSuccess] = useState("");
    const [isReady, setIsReady] = useState(false); // New state for isReady, defaults to false
    const [error, setError] = useState("");
    const [questions, setQuestions] = useState([
        { songLink: "", artist: "", song: "", hint: "", loadingMetadata: false }
    ]);


    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
        });
        return () => unsubscribe();
    }, []);

    const onDragEnd = (result) => {
        // dropped outside the list
        if (!result.destination) {
            return;
        }

        const items = Array.from(questions);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);

        setQuestions(items);
    };

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
        const newQuestions = [...questions, { songLink: "", artist: "", song: "", hint: "", loadingMetadata: false }];
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
                const newQuestionsToAdd = Array(numAmount - currentLength).fill(null).map(() => ({ songLink: "", artist: "", song: "", hint: "", loadingMetadata: false }));
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
                setQuestions([{ songLink: "", artist: "", song: "", hint: "", loadingMetadata: false }]);
            }
        }
    }, [amount]); // Rerun this effect when the 'amount' state changes

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
            setError(t('common.error') + ": " + t('createNewQuizPage.quizTitleLabel') + " " + t('common.isRequired', 'is required')); // Example of combining for more specific error
            return;
        }
        if (!rules.trim()) {
            setError(t('common.error') + ": " + t('createNewQuizPage.rulesOptionalLabel').replace('(Optional)', '').trim() + " " + t('common.isRequired', 'is required'));
            return;
        }
        if (!amount || isNaN(amount) || Number(amount) <= 0) {
            setError(t('common.error') + ": " + t('createNewQuizPage.amountOfSongsLabel') + " " + t('common.mustBePositive', 'must be a positive number'));
            return;
        }
        if (questions.length !== Number(amount)) {
            setError(t('common.error') + ": " + t('createNewQuizPage.songEntriesErrorMismatch', { count: questions.length, amount: amount }));
            return;
        }
        // Optional: Add validation for empty fields within questions
        for (const q of questions) {
            if (!q.artist.trim() || !q.song.trim()) {
                setError(t('common.error') + ": " + t('createNewQuizPage.songEntryFieldsRequired'));
                return;
            }
        }
        try {
            await addDoc(collection(db, "quizzes"), {
                title,
                rules, // Changed from description
                amount: Number(amount),
                createdBy: user ? user.uid : "unknown", // Handle case where user might be null briefly
                creatorName: user ? user.displayName : t('common.unnamedUser', "Unknown"), // Store display name
                createdAt: serverTimestamp(),
                questions,
                isReady // Add isReady field to Firestore document
            });
            setSuccess(t('createNewQuizPage.createQuizSuccess'));
            setTitle("");
            setRules(""); // Changed from setDescription
            setAmount("");
            setQuestions([{ songLink: "", artist: "", song: "", hint: "", loadingMetadata: false }]); // Reset questions
            setIsReady(false); // Reset isReady checkbox
        } catch (err) {
            setError(t('createNewQuizPage.createQuizError') + ": " + err.message);
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
                        {t('createNewQuizPage.pageTitle')}
                    </Typography>
                    <TextField
                        label={t('createNewQuizPage.quizTitleLabel')}
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
                        label={t('createNewQuizPage.rulesOptionalLabel')}
                        variant="outlined"
                        fullWidth
                        margin="dense" // Changed from normal to dense
                        multiline
                        rows={3}
                        value={rules}
                        onChange={e => setRules(e.target.value)}
                        // required // Rules are optional based on label
                        className="form-input-full-width"
                        InputLabelProps={{ shrink: true }}
                    />
                    <TextField
                        label={t('createNewQuizPage.amountOfSongsLabel')}
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
                                {t('createNewQuizPage.songEntriesTitle')}
                            </Typography>
                            <DragDropContext onDragEnd={onDragEnd}>
                                <Droppable droppableId="questionsDroppableQuiz">
                                    {(provided) => (
                                        <Box {...provided.droppableProps} ref={provided.innerRef}>
                                            {questions.map((q, index) => (
                                                <Draggable key={`quiz-question-${index}`} draggableId={`quiz-question-${index}`} index={index}>
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
                                                            <TextField
                                                                label={t('createNewQuizPage.songLinkLabel')}
                                                                variant="outlined"
                                                                fullWidth
                                                                margin="dense"
                                                                value={q.songLink}
                                                                onChange={e => handleQuestionChange(index, "songLink", e.target.value)}
                                                                className={`form-input-question ${q.loadingMetadata ? 'input-loading' : ''}`}
                                                                InputLabelProps={{ shrink: true }}
                                                            />
                                                            <TextField
                                                                label={t('createNewQuizPage.artistLabel')}
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
                                                                label={t('createNewQuizPage.songTitleLabel')}
                                                                variant="outlined"
                                                                fullWidth
                                                                margin="dense"
                                                                value={q.song}
                                                                onChange={e => handleQuestionChange(index, "song", e.target.value)}
                                                                required
                                                                className={`form-input-question ${q.loadingMetadata ? 'input-loading' : ''}`}
                                                                InputLabelProps={{ shrink: true }}
                                                            />
                                                            <TextField
                                                                label={t('createNewQuizPage.hintOptionalLabel')}
                                                                variant="outlined"
                                                                fullWidth
                                                                margin="dense"
                                                                value={q.hint}
                                                                onChange={e => handleQuestionChange(index, "hint", e.target.value)}
                                                                className="form-input-question" // Can reuse class or create a new one
                                                                InputLabelProps={{ shrink: true }}
                                                            />
                                                            {q.loadingMetadata && <Typography variant="caption" className="metadata-loading-indicator" sx={{ ml: 1 }}> {t('createNewQuizPage.fetchingMetadata')}</Typography>}
                                                            {questions.length > 1 && ( // Only show remove if more than one question
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
                            {/* "Add Song Entry" button within the Song Entries Box */}
                            <Button
                                variant="outlined"
                                startIcon={<AddCircleOutlineIcon />}
                                onClick={addQuestion}
                                className="button-add-question"
                                sx={{ mt: 1, mb: 2, }}
                            >
                                {t('createNewQuizPage.addSongEntry')}
                            </Button>
                        </Box>
                    )}
                    <FormControlLabel
                        control={<Checkbox checked={isReady} onChange={e => setIsReady(e.target.checked)} id="isReadyCheckbox" />}
                        label={t('createNewQuizPage.markAsReadyLabel')}
                        className="is-ready-checkbox-container" sx={{ display: 'block', mt: 1, mb: 1 }} // Reduced margins
                    />

                    <Button type="submit" variant="contained" color="primary" fullWidth className="button-submit-quiz">
                        {t('createNewQuizPage.createQuizButton')}
                    </Button>
                    {success && <Typography color="success.main" sx={{ mt: 2 }} className="form-message">{success}</Typography>}
                    {error && <Typography color="error" sx={{ mt: 2 }} className="form-message">{error}</Typography>}
                </Paper>) : (
                <Typography>{t('createNewQuizPage.loginToCreate')}</Typography>
            )}
        </Box>
    );
};

export default Quiz; 