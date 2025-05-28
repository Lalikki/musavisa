import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { db, auth } from './firebase'; // Import auth
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
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
    const [saveAssessmentError, setSaveAssessmentError] = useState(null);
    const [saveAssessmentSuccess, setSaveAssessmentSuccess] = useState('');
    const [isCompleting, setIsCompleting] = useState(false);
    const [completeError, setCompleteError] = useState(null);
    const [isAutoCalculating, setIsAutoCalculating] = useState(false); // Keep this for button text
    const theme = useTheme(); // theme is used, keep it

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
        });
        return () => unsubscribe();
    }, []); // No t needed here

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
                        setCorrectQuizData(quizDocSnapForAnswers.data());
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
    }, [answerId, t]); // Added t to dependency array

    const handleSelfAssessedScoreChange = (index, scoreValue) => {
        const newScores = [...selfAssessedSongScores];
        newScores[index] = Number(scoreValue);
        setSelfAssessedSongScores(newScores);
    };

    const totalSelfAssessedScore = selfAssessedSongScores.reduce((sum, score) => sum + score, 0);

    const handleSaveAssessment = async () => {
        if (!canSelfAssess) {
            setSaveAssessmentError(t('answerDetailsPage.cannotSaveAssessmentError', "You cannot save this assessment at this time.")); // New key
            return;
        }
        setIsSavingAssessment(true);
        setSaveAssessmentError(null);
        setSaveAssessmentSuccess('');
        try {
            const answerDocRef = doc(db, 'quizAnswers', answerId);
            await updateDoc(answerDocRef, {
                selfAssessedSongScores: selfAssessedSongScores,
                score: totalSelfAssessedScore, // Save total self-assessed score to the main 'score' field
                lastSelfAssessedAt: serverTimestamp()
            });
            setSaveAssessmentSuccess(t('answerDetailsPage.saveAssessmentSuccess'));
            // Update local quizAnswer state to reflect the saved score
            setQuizAnswer(prev => ({
                ...prev,
                selfAssessedSongScores: [...selfAssessedSongScores], // Ensure new array for re-render
                score: totalSelfAssessedScore
            }));
        } catch (err) {
            console.error("Error saving self-assessment:", err);
            setSaveAssessmentError(t('answerDetailsPage.saveAssessmentError'));
        } finally {
            setIsSavingAssessment(false);
        }
    };

    const handleSaveAndCompleteAssessment = async () => {
        if (!canSelfAssess) {
            setCompleteError(t('answerDetailsPage.cannotCompleteAssessmentError', "You cannot complete this assessment at this time.")); // New key
            return;
        }
        setIsCompleting(true);
        setCompleteError(null);
        setSaveAssessmentSuccess(''); // Clear success message from regular save
        try {
            const answerDocRef = doc(db, 'quizAnswers', answerId);
            await updateDoc(answerDocRef, {
                selfAssessedSongScores: selfAssessedSongScores,
                score: totalSelfAssessedScore, // Save total self-assessed score to the main 'score' field
                lastSelfAssessedAt: serverTimestamp(),
                isCompleted: true, // Mark as completed
                // isChecked might remain true, or you could set it to false if needed
            });
            setSaveAssessmentSuccess(t('answerDetailsPage.saveAndCompleteSuccess', "Your assessment has been saved and marked as completed!")); // New key
            // Redirect to My Answers page
            navigate('/my-answers');
        } catch (err) {
            console.error("Error saving and completing assessment:", err);
            setCompleteError(t('answerDetailsPage.completeError'));
        } finally {
            setIsCompleting(false);
        }
    };

    const handleAutoCalculateScore = async () => { // Make it async
        if (!correctQuizData || !quizAnswer || !quizAnswer.answers || !canSelfAssess) {
            setSaveAssessmentError(t('answerDetailsPage.cannotAutoCalcError', "Cannot auto-calculate score at this time.")); // New key
            return;
        }

        // Use isSavingAssessment for the loading state of this combined calculate & save operation
        setIsSavingAssessment(true);
        setSaveAssessmentError(null);
        setSaveAssessmentSuccess('');

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
            setSaveAssessmentSuccess(t('answerDetailsPage.autoCalcSuccess', "Scores auto-calculated and saved successfully!")); // New key
        } catch (err) {
            console.error("Error auto-calculating and saving score:", err);
            setSaveAssessmentError(t('answerDetailsPage.autoCalcError', "Failed to auto-calculate and save score. Please try again.")); // New key
            setSaveAssessmentSuccess('');
        } finally {
            setIsAutoCalculating(false); // Reset this specific flag
            setIsSavingAssessment(false); // Reset the general saving flag
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
                <Typography variant="body1"><strong>{t('answerDetailsPage.currentSavedScore')}:</strong> {quizAnswer.score} / {quizAnswer.answers ? quizAnswer.answers.length * 1 : 'N/A'}</Typography>
                <Typography variant="body1">
                    <strong>{t('answerDetailsPage.liveScore')}:</strong>
                    {' '}{totalSelfAssessedScore} / {quizAnswer.answers ? quizAnswer.answers.length * 1 : 'N/A'}
                </Typography>
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
                    {completeError && <Typography color="error" sx={{ mt: 1 }} className="error-text form-message">{completeError}</Typography>}
                    {saveAssessmentError && <Typography color="error" sx={{ mt: 1 }} className="error-text form-message">{saveAssessmentError}</Typography>}
                    {saveAssessmentSuccess && <Typography color="success.main" sx={{ mt: 1 }} className="success-text form-message">{saveAssessmentSuccess}</Typography>}
                </Box>
            )}
        </Box>
    );
};

export default AnswerDetails;