import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { db, auth } from './firebase'; // Import auth
import { doc, getDoc, updateDoc, serverTimestamp, runTransaction } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { compareTwoStrings } from 'string-similarity'; // Import for fuzzy matching
import { format } from 'date-fns';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Rating from '@mui/material/Rating'; // Import Rating
import Snackbar from '@mui/material/Snackbar'; // Import Snackbar
import Alert from '@mui/material/Alert'; // Import Alert
import { TextField } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom'; // For MUI Link component
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next'; // Import useTranslation


const AnswerDetails = () => {
    const { t } = useTranslation(); // Initialize useTranslation
    const { answerId } = useParams();
    const navigate = useNavigate();
    const [quizAnswer, setQuizAnswer] = useState(null);
    const [correctQuizData, setCorrectQuizData] = useState(null);
    const [selfAssessedSongScores, setSelfAssessedSongScores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [isSavingAssessment, setIsSavingAssessment] = useState(false);
    const [isCompleting, setIsCompleting] = useState(false);
    const [isAutoCalculating, setIsAutoCalculating] = useState(false); // Keep this for button text
    const [quizRating, setQuizRating] = useState(0); // User's rating for the quiz
    const [isSubmittingRating, setIsSubmittingRating] = useState(false);
    const [ratingFeedback, setRatingFeedback] = useState({ open: false, message: '', severity: 'info' });
    const [saveFeedback, setSaveFeedback] = useState({ open: false, message: '', severity: 'info' }); // New state for save feedback
    const theme = useTheme(); // theme is used, keep it

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const fetchQuizAnswer = async () => {
            if (!answerId) {
                setError(t('answerDetailsPage.noAnswerIdError', "No answer ID provided.")); // New key
                setLoading(false);
                return;
            }

            setLoading(true);
            setError(null);
            try {
                const answerDocRef = doc(db, 'quizAnswers', answerId);
                const answerDocSnap = await getDoc(answerDocRef);

                if (answerDocSnap.exists()) {
                    const data = answerDocSnap.data();
                    const fetchedQuizAnswer = { id: answerDocSnap.id, ...data };
                    setQuizAnswer(fetchedQuizAnswer);

                    // Initialize selfAssessedSongScores
                    if (fetchedQuizAnswer.answers && fetchedQuizAnswer.answers.length > 0) {
                        const initialScores = fetchedQuizAnswer.selfAssessedSongScores && fetchedQuizAnswer.selfAssessedSongScores.length === fetchedQuizAnswer.answers.length
                            ? [...fetchedQuizAnswer.selfAssessedSongScores]
                            : Array(fetchedQuizAnswer.answers.length).fill(0);
                        setSelfAssessedSongScores(initialScores);
                    }

                    // Fetch the corresponding quiz document for correct answers
                    const quizDocRefForAnswers = doc(db, 'quizzes', fetchedQuizAnswer.quizId);
                    const quizDocSnapForAnswers = await getDoc(quizDocRefForAnswers);

                    if (quizDocSnapForAnswers.exists()) {
                        const quizDetails = quizDocSnapForAnswers.data();
                        setCorrectQuizData(quizDetails);
                        // Check if current user has already rated this quiz
                        if (currentUser && quizDetails.ratings) {
                            const userRatingEntry = quizDetails.ratings.find(r => r.userId === currentUser.uid);
                            if (userRatingEntry) setQuizRating(userRatingEntry.value);
                        }
                    } else {
                        setError(t('editAnswerPage.originalQuizNotFoundError', "Could not find the original quiz data to display correct answers.")); // Reusing key
                    }
                } else {
                    setError(t('editAnswerPage.notFoundError')); // Reusing key
                }
            } catch (err) {
                console.error("Error fetching quiz answer details:", err);
                setError(t('answerDetailsPage.loadingError'));
            } finally {
                setLoading(false);
            }
        };

        fetchQuizAnswer();
    }, [answerId, t, currentUser]); // Added currentUser to dependency array

    const handleSelfAssessedScoreChange = (index, scoreValue) => {
        const newScores = [...selfAssessedSongScores];
        newScores[index] = Number(scoreValue);
        setSelfAssessedSongScores(newScores);
    };

    const totalSelfAssessedScore = selfAssessedSongScores.reduce((sum, score) => sum + score, 0);

    const handleSaveAssessment = async () => {
        if (!canSelfAssess) {
            setSaveFeedback({ open: true, message: t('answerDetailsPage.cannotSaveAssessmentError', "You cannot save this assessment at this time."), severity: 'error' });
            return;
        }
        setIsSavingAssessment(true);
        setSaveFeedback({ open: false, message: '', severity: 'info' }); // Clear previous feedback
        try {
            const answerDocRef = doc(db, 'quizAnswers', answerId);
            await updateDoc(answerDocRef, {
                selfAssessedSongScores: selfAssessedSongScores,
                score: totalSelfAssessedScore, // Save total self-assessed score to the main 'score' field
                lastSelfAssessedAt: serverTimestamp()
            });
            setSaveFeedback({ open: true, message: t('answerDetailsPage.saveAssessmentSuccess'), severity: 'success' });
            // Update local quizAnswer state to reflect the saved score
            setQuizAnswer(prev => ({
                ...prev,
                selfAssessedSongScores: [...selfAssessedSongScores], // Ensure new array for re-render
                score: totalSelfAssessedScore
            }));
        } catch (err) {
            console.error("Error saving self-assessment:", err);
            setSaveFeedback({ open: true, message: t('answerDetailsPage.saveAssessmentError'), severity: 'error' });
        } finally {
            setIsSavingAssessment(false);
        }
    };

    const handleSaveAndCompleteAssessment = async () => {
        if (!canSelfAssess) {
            setSaveFeedback({ open: true, message: t('answerDetailsPage.cannotCompleteAssessmentError', "You cannot complete this assessment at this time."), severity: 'error' });
            return;
        }
        setIsCompleting(true);
        setSaveFeedback({ open: false, message: '', severity: 'info' }); // Clear previous feedback
        try {
            const answerDocRef = doc(db, 'quizAnswers', answerId);
            await updateDoc(answerDocRef, {
                selfAssessedSongScores: selfAssessedSongScores,
                score: totalSelfAssessedScore, // Save total self-assessed score to the main 'score' field
                lastSelfAssessedAt: serverTimestamp(),
                isCompleted: true, // Mark as completed
                // isChecked might remain true, or you could set it to false if needed
            });
            setSaveFeedback({ open: true, message: t('answerDetailsPage.saveAndCompleteSuccess', "Your assessment has been saved and marked as completed!"), severity: 'success' });
            // Redirect to My Answers page
            setTimeout(() => navigate('/my-answers'), 1500); // Delay redirect to show message
        } catch (err) {
            console.error("Error saving and completing assessment:", err);
            setSaveFeedback({ open: true, message: t('answerDetailsPage.completeError'), severity: 'error' });
        } finally {
            setIsCompleting(false);
        }
    };

    const handleAutoCalculateScore = async () => { // Make it async
        if (!correctQuizData || !quizAnswer || !quizAnswer.answers || !canSelfAssess) {
            setSaveFeedback({ open: true, message: t('answerDetailsPage.cannotAutoCalcError', "Cannot auto-calculate score at this time."), severity: 'warning' });
            return;
        }

        // Use isSavingAssessment for the loading state of this combined calculate & save operation
        setIsSavingAssessment(true);
        setSaveFeedback({ open: false, message: '', severity: 'info' });

        setIsAutoCalculating(true);
        const similarityThreshold = 0.8; // Or make this configurable
        const newScores = quizAnswer.answers.map((submittedAnswer, index) => {
            const correctAnswer = correctQuizData.questions?.[index];
            let songScore = 0;
            if (correctAnswer) {
                const submittedArtist = (submittedAnswer.artist || "").toLowerCase().trim();
                const correctArtist = (correctAnswer.artist || "").toLowerCase().trim();
                const submittedSongName = (submittedAnswer.songName || "").toLowerCase().trim();
                const correctSongName = (correctAnswer.song || "").toLowerCase().trim();

                if (compareTwoStrings(submittedArtist, correctArtist) >= similarityThreshold) {
                    songScore += 0.5;
                }
                if (compareTwoStrings(submittedSongName, correctSongName) >= similarityThreshold) {
                    songScore += 0.5;
                }
            }
            return songScore;
        });
        const calculatedTotalScore = newScores.reduce((sum, score) => sum + score, 0);

        try {
            const answerDocRef = doc(db, 'quizAnswers', answerId);
            await updateDoc(answerDocRef, {
                selfAssessedSongScores: newScores,
                score: calculatedTotalScore, // Save total auto-calculated score to the main 'score' field
                lastSelfAssessedAt: serverTimestamp()
            });
            setSelfAssessedSongScores([...newScores]); // Update local state for song scores, ensure new array
            setQuizAnswer(prev => ({ ...prev, score: calculatedTotalScore, selfAssessedSongScores: [...newScores] })); // Update local state for total score
            setSaveFeedback({ open: true, message: t('answerDetailsPage.autoCalcSuccess', "Scores auto-calculated and saved successfully!"), severity: 'success' });
        } catch (err) {
            console.error("Error auto-calculating and saving score:", err);
            setSaveFeedback({ open: true, message: t('answerDetailsPage.autoCalcError', "Failed to auto-calculate and save score. Please try again."), severity: 'error' });
        } finally {
            setIsAutoCalculating(false); // Reset this specific flag
            setIsSavingAssessment(false); // Reset the general saving flag
        }

    };

    const handleQuizRatingChange = async (event, newValue) => {
        if (!currentUser || !quizAnswer || !quizAnswer.quizId) {
            setRatingFeedback({ open: true, message: t('answerDetailsPage.ratingLoginError', 'You must be logged in to rate.'), severity: 'error' });
            return;
        }
        if (newValue === null) return; // User cleared the rating

        setIsSubmittingRating(true);
        setRatingFeedback({ open: false, message: '', severity: 'info' }); // Clear previous feedback

        const quizDocRef = doc(db, 'quizzes', quizAnswer.quizId);

        try {
            await runTransaction(db, async (transaction) => {
                const quizDoc = await transaction.get(quizDocRef);
                if (!quizDoc.exists()) {
                    throw new Error(t('answerDetailsPage.ratingQuizNotFoundError', "Quiz not found for rating."));
                }

                const quizData = quizDoc.data();
                let ratings = quizData.ratings || [];
                const existingRatingIndex = ratings.findIndex(r => r.userId === currentUser.uid);

                if (existingRatingIndex > -1) {
                    ratings[existingRatingIndex].value = newValue;
                    ratings[existingRatingIndex].ratedAt = new Date(); // Update timestamp using client time
                } else {
                    ratings.push({ userId: currentUser.uid, value: newValue, ratedAt: new Date() }); // Use client time
                }

                // We are no longer calculating averageRating and ratingCount here.
                // This will be handled in a view where all ratings are aggregated.
                transaction.update(quizDocRef, {
                    ratings: ratings,
                    // averageRating and ratingCount will be updated by a separate process or view
                    lastRatedAt: serverTimestamp()
                });

                // Update local state immediately for better UX
                setQuizRating(newValue);
            });
            setRatingFeedback({ open: true, message: t('answerDetailsPage.ratingSuccess', 'Your rating has been submitted!'), severity: 'success' });
        } catch (error) {
            console.error("Error submitting quiz rating:", error);
            setRatingFeedback({ open: true, message: error.message || t('answerDetailsPage.ratingError', 'Failed to submit rating.'), severity: 'error' });
        } finally {
            setIsSubmittingRating(false);
        }
    };

    const getTeamDisplayString = (answer) => {
        if (!answer || !answer.teamSize || answer.teamSize <= 1) {
            return answer?.answerCreatorName || t('answerQuizPage.player'); // Reusing key
        }
        const members = [answer.answerCreatorName]; // Logged-in user (submitter) is always first
        if (answer.teamMembers && Array.isArray(answer.teamMembers)) {
            answer.teamMembers.forEach(member => {
                if (member && typeof member === 'string' && member.trim() !== '') {
                    members.push(member.trim());
                }
            });
        }
        return members.join(', ');
    };

    if (loading) return <Typography sx={{ textAlign: 'center', mt: 3 }}>{t('common.loading')}</Typography>;
    if (error) return <Box sx={{ textAlign: 'center', mt: 3 }}><Typography color="error" className="error-text">{error || t('common.error')}</Typography> <Button variant="outlined" onClick={() => navigate('/my-answers')} sx={{ ml: 1 }}>{t('answerDetailsPage.backToMyAnswers')}</Button></Box>;
    if (!quizAnswer) return <Box sx={{ textAlign: 'center', mt: 3 }}><Typography>{t('editAnswerPage.notFoundError')}</Typography> <Button variant="outlined" onClick={() => navigate('/my-answers')} sx={{ ml: 1 }}>{t('answerDetailsPage.backToMyAnswers')}</Button></Box>;


    // User can self-assess if they are the creator of the answer.
    // The "isChecked" status (Ready for Review) is the state in which they perform this self-assessment.
    // If a host later "officially checks" it, we might add another flag to disable this.
    const canSelfAssess = currentUser && quizAnswer && currentUser.uid === quizAnswer.answerCreatorId && !quizAnswer.isCompleted;

    return (
        <Box
            className="answer-details-container" // Keep class if any global styles still apply
            sx={{
                maxWidth: '900px', // Consistent max-width
                margin: '0 auto',  // Center the content
                padding: { xs: 2, sm: 3 }, // Responsive padding
                // Background color will come from theme.palette.background.default via CssBaseline
            }}
        >
            <Typography variant="h4" component="h1" gutterBottom align="center">
                {t('answerDetailsPage.pageTitle', { quizTitle: quizAnswer.quizTitle })}
            </Typography>
            <Paper elevation={1} sx={{ p: { xs: 1.5, sm: 2.5 }, mb: 3, backgroundColor: 'background.paper' }} className="answer-summary">
                <Typography variant="body1"><strong>{t('answerDetailsPage.submittedBy')}:</strong> {quizAnswer.answerCreatorName || t('common.unnamedUser', 'Anonymous')}</Typography>
                {quizAnswer.teamSize > 1 && <Typography variant="body1"><strong>{t('common.team')}:</strong> {getTeamDisplayString(quizAnswer)}</Typography>}
                <Typography variant="body1"><strong>{t('answerDetailsPage.submittedAt')}:</strong> {quizAnswer.submittedAt ? format(quizAnswer.submittedAt.toDate(), 'dd.MM.yyyy HH:mm') : 'N/A'}</Typography>
                <Typography variant="body1"><strong>{t('common.status')}:</strong>
                    {quizAnswer.isCompleted ? ` ${t('answerDetailsPage.statusCompleted')}` :
                        quizAnswer.isChecked ? ` ${t('answerDetailsPage.statusReadyForReview')}` :
                            ` ${t('answerDetailsPage.statusInProgress')}`}
                </Typography>
                <Typography variant="body1"><strong>{t('common.score')}:</strong> {quizAnswer.score} / {correctQuizData?.amount ? correctQuizData.amount * (correctQuizData.maxScorePerSong || 1) : 'N/A'}</Typography>

                {/* Moved Auto-Calculate button here */}
                {canSelfAssess && !quizAnswer.isCompleted && (
                    <Button
                        variant="contained"
                        onClick={handleAutoCalculateScore}
                        disabled={isSavingAssessment || isCompleting || isAutoCalculating}
                        className="button-auto-calculate"
                        sx={{ mt: 2, display: 'block', mx: 'auto' }} // Added display:block and mx:auto for centering
                    >
                        {isAutoCalculating || isSavingAssessment ? t('answerDetailsPage.calculatingAndSaving') : t('answerDetailsPage.autoCalcButton')}
                    </Button>
                )}
            </Paper>

            {/* Quiz Rating Section - Show if user is the answer creator */}
            {currentUser && quizAnswer && correctQuizData && currentUser.uid === quizAnswer.answerCreatorId && (
                <Paper elevation={1} sx={{ p: { xs: 1.5, sm: 2.5 }, mt: 3, mb: 3, backgroundColor: 'background.paper', textAlign: 'center' }} className="quiz-rating-section">
                    <Typography variant="h6" component="h3" gutterBottom>
                        {t('answerDetailsPage.rateThisQuizTitle', 'Rate this Quiz')}
                    </Typography>
                    <Rating
                        name="quiz-rating"
                        value={quizRating}
                        onChange={handleQuizRatingChange}
                        precision={0.5} // Or 1 if you prefer whole stars
                        size="large"
                        disabled={isSubmittingRating}
                    />
                    {isSubmittingRating && <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>{t('common.saving', 'Saving...')}</Typography>}
                </Paper>
            )}


            <Typography variant="h5" component="h2" gutterBottom align="center">{t('answerDetailsPage.yourGuessesTitle')}</Typography>
            <Paper // New Paper wrapper for the "Your Guesses" section
                elevation={0}
                sx={{
                    p: { xs: 1.5, sm: 2.5 }, // Consistent padding with other main Paper sections
                    // backgroundColor: 'transparent', // We'll use the gradient instead
                    backgroundImage: 'var(--Paper-overlay)', // Apply the gradient as background
                    backgroundSize: 'cover', // Ensure the gradient covers the area
                    boxShadow: 'none',
                    mt: 3, // Add some margin-top to separate from the section above
                }}
            >
                {quizAnswer.answers && quizAnswer.answers.length > 0 ? (
                    <List className="answer-guesses-list" sx={{ padding: 0 }}>
                        {quizAnswer.answers.map((guess, index) => {
                            const correctAnswer = correctQuizData?.questions?.[index];
                            return (
                                <ListItem key={index} sx={{ p: 0, mb: 2 }}>
                                    <Paper // This is the Paper for each individual guess item
                                        elevation={0}
                                        sx={{
                                            p: { xs: 1, sm: 2 },
                                            width: '100%',
                                            backgroundColor: 'transparent', // Individual guess items are also transparent
                                            boxShadow: 'none',
                                            // border: `1px solid ${theme.palette.divider}`, // Keep border for individual items
                                            // borderRadius: theme.shape.borderRadius,
                                        }}
                                        className="answer-guess-item detailed-guess-item"
                                    >
                                        <Typography variant="h6" component="h4" gutterBottom>{t('common.song')} {index + 1}</Typography>
                                        <TextField
                                            label={t('editAnswerPage.artistGuess')}
                                            // Ensure id is unique
                                            id={`guess-artist-${index}`}
                                            variant="outlined"
                                            fullWidth
                                            margin="dense"
                                            value={guess.artist || ''}
                                            disabled // Keep disabled prop
                                            InputLabelProps={{ shrink: true }}
                                            sx={{
                                                '& .MuiInputBase-input.Mui-disabled': {
                                                    WebkitTextFillColor: theme.palette.text.secondary, // Ensures text color is applied correctly in WebKit browsers
                                                    color: theme.palette.text.secondary, // More prominent disabled text color
                                                },
                                                '& .MuiOutlinedInput-root.Mui-disabled .MuiOutlinedInput-notchedOutline': {
                                                    borderColor: theme.palette.action.disabledBackground, // Slightly different border
                                                },
                                                '& .MuiInputBase-root.Mui-disabled': {
                                                    backgroundColor: theme.palette.action.disabledBackground, // Subtle background change
                                                },
                                            }}
                                        />
                                        <TextField
                                            label={t('editAnswerPage.songNameGuess')}
                                            // Ensure id is unique
                                            id={`guess-songName-${index}`}
                                            variant="outlined"
                                            fullWidth
                                            margin="dense"
                                            value={guess.songName || ''}
                                            disabled // Keep disabled prop
                                            InputLabelProps={{ shrink: true }}
                                            sx={{
                                                '& .MuiInputBase-input.Mui-disabled': {
                                                    WebkitTextFillColor: theme.palette.text.secondary,
                                                    color: theme.palette.text.secondary,
                                                },
                                                '& .MuiOutlinedInput-root.Mui-disabled .MuiOutlinedInput-notchedOutline': {
                                                    borderColor: theme.palette.action.disabledBackground,
                                                },
                                                '& .MuiInputBase-root.Mui-disabled': {
                                                    backgroundColor: theme.palette.action.disabledBackground,
                                                }
                                            }}
                                        />
                                        {/* Correct answer display can be added here if needed, using Typography and MUI Link */}
                                        <FormControl fullWidth margin="dense" variant="outlined" className="manual-score-input" sx={{ mt: 1 }}>
                                            {(() => {
                                                // Determine the maximum score for this specific quiz, defaulting to 1 if not specified
                                                const maxScoreForThisQuiz = (typeof correctQuizData?.maxScorePerSong === 'number' && correctQuizData.maxScorePerSong > 0)
                                                    ? correctQuizData.maxScorePerSong
                                                    : 1; // Default max score if not found or invalid
                                                const scoreOptions = [];
                                                for (let i = 0; i <= maxScoreForThisQuiz; i += 0.5) {
                                                    scoreOptions.push(i);
                                                }

                                                return (
                                                    <>
                                                        <InputLabel id={`manual-score-label-${index}`}>{t('common.score')}</InputLabel>
                                                        <Select
                                                            labelId={`manual-score-label-${index}`}
                                                            id={`manual-score-${index}`}
                                                            value={selfAssessedSongScores[index] !== undefined ? selfAssessedSongScores[index] : 0}
                                                            onChange={(e) => handleSelfAssessedScoreChange(index, e.target.value)}
                                                            disabled={!canSelfAssess || quizAnswer.isCompleted || (!guess.artist && !guess.songName)}
                                                            IconComponent={(!canSelfAssess || quizAnswer.isCompleted || (!guess.artist && !guess.songName)) ? () => null : undefined}
                                                            sx={quizAnswer.isCompleted ? {
                                                                '& .MuiInputBase-input.Mui-disabled': { // Target the input part for text color
                                                                    WebkitTextFillColor: theme.palette.text.secondary,
                                                                    color: theme.palette.text.secondary,
                                                                },
                                                                '& .MuiOutlinedInput-root.Mui-disabled .MuiOutlinedInput-notchedOutline': {
                                                                    borderColor: theme.palette.action.disabledBackground,
                                                                },
                                                                '& .MuiOutlinedInput-root.Mui-disabled': { // Target MuiOutlinedInput-root for background
                                                                    backgroundColor: theme.palette.action.disabledBackground,
                                                                },
                                                            } : {}}
                                                            label={t('common.score')}
                                                        >
                                                            {scoreOptions.map(scoreValue => (
                                                                <MenuItem key={scoreValue} value={scoreValue}>
                                                                    {scoreValue}
                                                                </MenuItem>
                                                            ))}
                                                        </Select>
                                                    </>
                                                );
                                            })()}
                                        </FormControl>
                                    </Paper>
                                </ListItem>
                            );
                        })}
                    </List>
                ) : (
                    <Typography sx={{ textAlign: 'center', mt: 2 }}>{t('answerDetailsPage.noGuessesRecorded')}</Typography>
                )}
            </Paper>
            {canSelfAssess && !quizAnswer.isCompleted && (

                <Box
                    className="save-assessment-section"
                    sx={{
                        mt: 3,
                        display: 'flex',
                        flexDirection: { xs: 'column', sm: 'row' },
                        justifyContent: 'center',
                        alignItems: 'center', // Align items nicely in a row
                        gap: 2 // Increased gap for better spacing (16px)
                    }}
                >
                    <Button
                        variant="outlined"
                        onClick={handleSaveAssessment}
                        disabled={isSavingAssessment}
                        className="button-save-assessment"
                    // sx prop can be removed if default gap is sufficient
                    > {/* Changed to common.save and common.saving */}
                        {isSavingAssessment ? t('common.saving') : t('common.save')}
                    </Button>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleSaveAndCompleteAssessment}
                        disabled={isCompleting || isSavingAssessment}
                        className="button-save-complete-assessment"
                    // sx prop can be removed if default gap is sufficient
                    > {/* Changed to use completing and saveAndComplete keys */}
                        {isCompleting ? t('answerDetailsPage.completing') : t('answerDetailsPage.saveAndComplete')}
                    </Button>
                    <Button component={RouterLink} to="/my-answers" variant="text" className="back-link">{t('common.cancel')}</Button>
                </Box>
            )}
            {/* Snackbar for Rating Feedback */}
            {ratingFeedback.open && (
                <Snackbar open={ratingFeedback.open} autoHideDuration={4000} onClose={() => setRatingFeedback(prev => ({ ...prev, open: false }))} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
                    <Alert onClose={() => setRatingFeedback(prev => ({ ...prev, open: false }))} severity={ratingFeedback.severity} sx={{ width: '100%' }}>{ratingFeedback.message}</Alert>
                </Snackbar>
            )}
            {/* Snackbar for Save/Complete/Auto-Calc Feedback */}
            {saveFeedback.open && (
                <Snackbar open={saveFeedback.open} autoHideDuration={4000} onClose={() => setSaveFeedback(prev => ({ ...prev, open: false }))} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
                    <Alert onClose={() => setSaveFeedback(prev => ({ ...prev, open: false }))} severity={saveFeedback.severity} sx={{ width: '100%' }}>{saveFeedback.message}</Alert>
                </Snackbar>
            )}
        </Box>
    );
};

export default AnswerDetails;