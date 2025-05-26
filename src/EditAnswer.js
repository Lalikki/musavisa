import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, auth } from './firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { compareTwoStrings } from 'string-similarity'; // Import the library
import { onAuthStateChanged } from 'firebase/auth';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress'; // For loading states in buttons
import { useTranslation } from 'react-i18next'; // Import useTranslation

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
                        setEditedAnswers(data.answers.map(a => ({ ...a }))); // Deep copy

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
                // Optionally, add a lastEditedAt: serverTimestamp() field
            });
            navigate('/my-answers'); // Navigate back to My Answers page after saving
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
                // score: calculatedScore,
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
        </Box>
    );
};

export default EditAnswer;