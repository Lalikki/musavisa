import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, auth } from './firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { compareTwoStrings } from 'string-similarity'; // Import the library
import { onAuthStateChanged } from 'firebase/auth';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress'; // For loading states in buttons
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import { useTranslation } from 'react-i18next'; // Import useTranslation

// Helper function to capitalize the first letter of a string
const capitalizeFirstLetter = (string) => {
    if (!string) return '';
    return string.charAt(0).toUpperCase() + string.slice(1);
};

const EditAnswer = () => {
    const { t } = useTranslation(); // Initialize useTranslation
    const { answerId } = useParams();
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [quizAnswer, setQuizAnswer] = useState(null);
    const [correctQuizData, setCorrectQuizData] = useState(null); // To store the quiz with correct answers
    const [editedAnswers, setEditedAnswers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState(null);
    const [markingReady, setMarkingReady] = useState(false);
    const [markReadyError, setMarkReadyError] = useState(null);
    const [showSuccessAlert, setShowSuccessAlert] = useState(false);


    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            if (!currentUser && !loading) { // If user logs out while on page
                navigate('/login');
            }
        });
        return () => unsubscribeAuth();
    }, [navigate, loading, t]); // Added t to dependency array

    useEffect(() => {
        const fetchQuizAnswer = async () => {
            if (!user || !answerId) { // Ensure user and answerId are available
                if (!user && answerId) setError("Please log in to edit answers.");
                setLoading(false);
                return;
            } // This error message is not directly displayed, but good practice

            setLoading(true);
            setError(null);
            try {
                const answerDocRef = doc(db, 'quizAnswers', answerId);
                const answerDocSnap = await getDoc(answerDocRef);

                if (answerDocSnap.exists()) {
                    const data = answerDocSnap.data();
                    if (data.answerCreatorId !== user.uid) {
                        setError(t('editAnswerPage.notFoundError')); // Re-using a general "not found or not authorized"
                        setQuizAnswer(null);
                    } else if (data.isChecked) {
                        setError(t('editAnswerPage.alreadyCheckedError', "This answer has already been checked and cannot be edited.")); // New key
                        setQuizAnswer(null);
                    } else {
                        const fetchedQuizAnswer = { id: answerDocSnap.id, ...data };
                        setQuizAnswer(fetchedQuizAnswer);
                        // Ensure each answer object in editedAnswers has an extraAnswer field
                        setEditedAnswers(data.answers.map(a => ({
                            artist: a.artist || '',
                            songName: a.songName || '',
                            extraAnswer: a.extraAnswer || '' // Initialize if not present
                        })));

                        // Now fetch the corresponding quiz document for correct answers
                        const quizDocRefForAnswers = doc(db, 'quizzes', fetchedQuizAnswer.quizId);
                        const quizDocSnapForAnswers = await getDoc(quizDocRefForAnswers);
                        if (quizDocSnapForAnswers.exists()) {
                            setCorrectQuizData(quizDocSnapForAnswers.data());
                        } else {
                            setError(t('editAnswerPage.originalQuizNotFoundError', "Could not find the original quiz data.")); // New key
                            // Potentially clear quizAnswer or handle this state
                        }
                    }
                } else {
                    setError(t('editAnswerPage.notFoundError'));
                }
            } catch (err) {
                console.error("Error fetching quiz answer:", err);
                setError(t('editAnswerPage.loadingError'));
            } finally {
                setLoading(false);
            }
        };

        fetchQuizAnswer();
    }, [answerId, user, t]); // Added t to dependency array

    const handleAnswerChange = (index, field, value) => {
        const newAnswers = [...editedAnswers];
        newAnswers[index] = { ...newAnswers[index], [field]: value };
        setEditedAnswers(newAnswers);
    };

    // Auto-save logic
    const performAutoSave = useCallback(async () => {
        // Conditions to skip auto-save:
        // - No user logged in
        // - No quizAnswer data loaded
        // - Quiz answer is already checked/completed (no further edits allowed)
        // - A manual save/mark ready operation is in progress
        // - No edited answers to save
        if (!user || !quizAnswer || quizAnswer.isChecked || quizAnswer.isCompleted || saving || markingReady || !editedAnswers || editedAnswers.length === 0) {
            // console.log('[AutoSave EditAnswer] Skipped: Conditions not met.');
            return;
        }

        // console.log('[AutoSave EditAnswer] Attempting to auto-save...');

        const autoSaveData = {
            answers: editedAnswers, // Save the currently edited answers
            lastAutoSavedAt: serverTimestamp(), // Timestamp the auto-save
            // We do NOT update isChecked, score, or submittedAt during auto-save
        };

        try {
            const answerDocRef = doc(db, 'quizAnswers', answerId);
            await updateDoc(answerDocRef, autoSaveData);
            // console.log('[AutoSave EditAnswer] Draft updated:', answerId);
        } catch (err) {
            console.error("Error during auto-save in EditAnswer:", err); // Log error silently
        }
    }, [user, quizAnswer, editedAnswers, answerId, saving, markingReady, t]); // Dependencies

    useEffect(() => {
        // Setup interval for auto-save
        const intervalId = setInterval(performAutoSave, 180000); // 180000ms = 3 minutes
        return () => clearInterval(intervalId); // Cleanup interval on unmount
    }, [performAutoSave]); // Re-run effect if performAutoSave changes

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!quizAnswer || !correctQuizData || quizAnswer.isChecked || quizAnswer.answerCreatorId !== user?.uid) {
            setSaveError(t('editAnswerPage.savePreconditionError', "Cannot save changes. Either the answer is checked, not found, or you're not authorized.")); // New key
            return;
        }

        setSaving(true);
        setSaveError(null);
        try {
            const answerDocRef = doc(db, 'quizAnswers', answerId);
            await updateDoc(answerDocRef, {
                answers: editedAnswers,
                lastEditedAt: serverTimestamp() // Mark manual edit time
            });
            setShowSuccessAlert(true); // Show success alert
            setTimeout(() => {
                setShowSuccessAlert(false);
            }, 3000); // Hide after 3 seconds
            // Removed navigation: navigate('/my-answers'); 
            // User will now stay on the EditAnswer page. You might want to show a success message.
        } catch (err) {
            console.error("Error updating answer:", err);
            setSaveError(t('editAnswerPage.saveError') + " " + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleMarkAsReady = async () => {
        if (!quizAnswer || !correctQuizData || quizAnswer.isChecked || quizAnswer.answerCreatorId !== user?.uid) {
            setMarkReadyError(t('editAnswerPage.markReadyPreconditionError', "Cannot mark as ready. Either the answer is already checked, not found, or you're not authorized.")); // New key
            return;
        }

        setMarkingReady(true);
        setMarkReadyError(null);

        // const similarityThreshold = 0.8; // Adjust this value (0.0 to 1.0) as needed
        // // Calculate score
        // let calculatedScore = 0;
        // if (correctQuizData && correctQuizData.questions && editedAnswers) {
        //     editedAnswers.forEach((submittedAnswer, index) => {
        //         const correctAnswer = correctQuizData.questions[index];
        //         if (correctAnswer) {
        //             const submittedArtist = submittedAnswer.artist.toLowerCase().trim();
        //             const correctArtist = correctAnswer.artist.toLowerCase().trim();
        //             const submittedSongName = submittedAnswer.songName.toLowerCase().trim();
        //             // Assuming the correct song title is stored in 'song' field in quiz.questions
        //             const correctSongName = correctAnswer.song.toLowerCase().trim();

        //             if (compareTwoStrings(submittedArtist, correctArtist) >= similarityThreshold) {
        //                 calculatedScore += 0.5;
        //             }
        //             if (compareTwoStrings(submittedSongName, correctSongName) >= similarityThreshold) {
        //                 calculatedScore += 0.5;
        //             }
        //         }
        //     });
        // }

        try {
            const answerDocRef = doc(db, 'quizAnswers', answerId);
            await updateDoc(answerDocRef, {
                answers: editedAnswers, // Save current answers
                isChecked: true,
                markedReadyAt: serverTimestamp() // Mark when it was set to ready
                // Optionally, add a 'markedReadyAt': serverTimestamp() field
            });
            navigate(`/my-answers/${answerId}`); // Navigate to the details page of this answer
        } catch (err) {
            console.error("Error saving and marking answer as ready:", err);
            setMarkReadyError(t('editAnswerPage.markReadyError') + " " + err.message);
        } finally {
            setMarkingReady(false);
        }
    }

    if (loading) return <Typography sx={{ textAlign: 'center', mt: 3 }}>{t('common.loading')}</Typography>;
    if (error) return (
        <Box sx={{ textAlign: 'center', mt: 3 }}>
            <Typography color="error" className="error-text">{error || t('common.error')}</Typography>
            <Button variant="outlined" onClick={() => navigate('/my-answers')} sx={{ mt: 1 }}>
                {t('editAnswerPage.goToMyAnswers')}
            </Button>
        </Box>
    );
    if (!quizAnswer || !correctQuizData) return (
        <Box sx={{ textAlign: 'center', mt: 3 }}>
            <Typography>{t('editAnswerPage.notFoundOrNotEditableError', 'Answer submission or original quiz data not found, or answer is not editable.')}</Typography> {/* New key */}
            <Button variant="outlined" onClick={() => navigate('/my-answers')} sx={{ mt: 1 }}>
                {t('editAnswerPage.goToMyAnswers')}
            </Button>
        </Box>
    );

    return (
        <Box
            className="edit-answer-container" // Keep class if any global styles still apply
            sx={{
                maxWidth: '900px', // Consistent max-width
                margin: '0 auto',  // Center the content
                padding: { xs: 2, sm: 3 }, // Responsive padding
                // Background color will come from theme.palette.background.default via CssBaseline
            }}
        >
            <Typography variant="h4" component="h1" gutterBottom align="center" sx={{ mb: 2 }}>
                {t('editAnswerPage.pageTitle', { quizTitle: quizAnswer.quizTitle })}
            </Typography>
            {correctQuizData?.rules && (
                <Typography variant="body1" paragraph align="center" sx={{ mb: 3 }}>
                    {correctQuizData.rules}
                </Typography>
            )}
            <Paper component="form" onSubmit={handleSubmit} sx={{ p: { xs: 1.5, sm: 2.5 }, backgroundColor: 'transparent', boxShadow: 'none' }} className="edit-answer-form">
                {editedAnswers.map((answer, index) => (
                    <Box key={index} className="song-guess-item" sx={{ mb: 2, p: { xs: 0.5, sm: 1 } }}>
                        <Typography variant="h6" component="h4" gutterBottom>
                            {t('common.song')} {index + 1} {/* New key for "Guess" suffix */}
                        </Typography>
                        <TextField
                            label={t('editAnswerPage.artistGuess')}
                            variant="outlined"
                            fullWidth
                            margin="dense"
                            id={`edit-artist-${index + 1}`}
                            value={answer.artist}
                            onChange={(e) => handleAnswerChange(index, 'artist', e.target.value)}
                            className="artist-input"
                            InputLabelProps={{ shrink: true }}
                        />
                        <TextField
                            label={t('editAnswerPage.songNameGuess')}
                            variant="outlined"
                            fullWidth
                            margin="dense"
                            id={`edit-songName-${index + 1}`}
                            value={answer.songName}
                            onChange={(e) => handleAnswerChange(index, 'songName', e.target.value)}
                            className="songname-input"
                            InputLabelProps={{ shrink: true }}
                        />
                        {/* Display Extra Question from correctQuizData and Answer Field for editedAnswers */}
                        {correctQuizData?.questions?.[index]?.extra && (
                            <>
                                {/* <Typography variant="body2" sx={{ mt: 1, mb: 0.5, fontWeight: 'medium' }}>
                                    {correctQuizData.questions[index].extra}
                                </Typography> */}
                                <TextField
                                    // Use the same label as in AnswerQuiz.js for consistency
                                    label={capitalizeFirstLetter(correctQuizData.questions[index].extra)}
                                    // label={t('}
                                    variant="outlined"
                                    fullWidth
                                    margin="dense"
                                    id={`edit-extraAnswer-${index + 1}`}
                                    value={answer.extraAnswer || ''}
                                    onChange={(e) => handleAnswerChange(index, 'extraAnswer', e.target.value)}
                                    className="extra-answer-input" // Optional: for specific styling
                                    InputLabelProps={{ shrink: true }}
                                />
                            </>
                        )}
                    </Box>
                ))}
                <Box sx={{ mt: 3, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'center', gap: 1 }}>
                    <Button type="submit" variant="contained" color="primary" disabled={saving || markingReady} startIcon={saving ? <CircularProgress size={20} color="inherit" /> : null}>
                        {saving ? t('common.saving') : t('editAnswerPage.saveChanges')}
                    </Button>
                    <Button type="button" variant="outlined" onClick={handleMarkAsReady} disabled={saving || markingReady} className="button-ready-review" startIcon={markingReady ? <CircularProgress size={20} color="inherit" /> : null}>
                        {markingReady ? t('editAnswerPage.markingAsReady') : t('editAnswerPage.readyForReview')}
                    </Button>
                    <Button type="button" variant="text" onClick={() => navigate('/my-answers')} className="button-cancel-edit">
                        {t('common.cancel')}
                    </Button>
                </Box>
                {saveError && <Typography color="error" sx={{ mt: 2, textAlign: 'center' }} className="error-text form-message">{saveError}</Typography>}
                {markReadyError && <Typography color="error" sx={{ mt: 2, textAlign: 'center' }} className="error-text form-message">{markReadyError}</Typography>}
            </Paper>
            <Snackbar open={showSuccessAlert} autoHideDuration={3000} onClose={() => setShowSuccessAlert(false)} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
                <Alert onClose={() => setShowSuccessAlert(false)} severity="success" sx={{ width: '100%' }}>
                    {t('common.saveSuccessMessage', 'Changes saved successfully!')}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default EditAnswer;