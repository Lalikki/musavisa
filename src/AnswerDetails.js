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
import { Link as RouterLink } from 'react-router-dom'; // For MUI Link component

const AnswerDetails = () => {
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
    const [scoreMode, setScoreMode] = useState('manual'); // 'manual' or 'auto'

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const fetchQuizAnswer = async () => {
            if (!answerId) {
                setError("No answer ID provided.");
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
                        setError("Could not find the original quiz data to display correct answers.");
                    }
                } else {
                    setError('Answer submission not found.');
                }
            } catch (err) {
                console.error("Error fetching quiz answer details:", err);
                setError('Failed to load the answer submission details. Please try again.');
            } finally {
                setLoading(false);
            }
        };

        fetchQuizAnswer();
    }, [answerId]);

    const handleSelfAssessedScoreChange = (index, scoreValue) => {
        const newScores = [...selfAssessedSongScores];
        newScores[index] = Number(scoreValue);
        setSelfAssessedSongScores(newScores);
    };

    const totalSelfAssessedScore = selfAssessedSongScores.reduce((sum, score) => sum + score, 0);

    const handleSaveAssessment = async () => {
        if (!canSelfAssess) {
            setSaveAssessmentError("You cannot save this assessment at this time.");
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
            setSaveAssessmentSuccess("Your assessment has been saved!");
            // Update local quizAnswer state to reflect the saved score
            setQuizAnswer(prev => ({
                ...prev,
                selfAssessedSongScores: [...selfAssessedSongScores], // Ensure new array for re-render
                score: totalSelfAssessedScore
            }));
        } catch (err) {
            console.error("Error saving self-assessment:", err);
            setSaveAssessmentError("Failed to save your assessment. Please try again.");
        } finally {
            setIsSavingAssessment(false);
        }
    };

    const handleSaveAndCompleteAssessment = async () => {
        if (!canSelfAssess) {
            setCompleteError("You cannot complete this assessment at this time.");
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
            setSaveAssessmentSuccess("Your assessment has been saved and marked as completed!");
            // Redirect to My Answers page
            navigate('/my-answers');
        } catch (err) {
            console.error("Error saving and completing assessment:", err);
            setCompleteError("Failed to save and complete your assessment. Please try again.");
        } finally {
            setIsCompleting(false);
        }
    };

    const handleAutoCalculateScore = async () => { // Make it async
        if (!correctQuizData || !quizAnswer || !quizAnswer.answers || !canSelfAssess) {
            setSaveAssessmentError("Cannot auto-calculate score at this time."); // Use a general error state
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
            setSelfAssessedSongScores(newScores); // Update local state for song scores
            setQuizAnswer(prev => ({ ...prev, score: calculatedTotalScore, selfAssessedSongScores: [...newScores] })); // Update local state for total score
            setSaveAssessmentSuccess("Scores auto-calculated and saved successfully!");
        } catch (err) {
            console.error("Error auto-calculating and saving score:", err);
            setSaveAssessmentError("Failed to auto-calculate and save score. Please try again.");
            setSaveAssessmentSuccess('');
        } finally {
            setIsAutoCalculating(false); // Reset this specific flag
            setIsSavingAssessment(false); // Reset the general saving flag
        }

    };


    if (loading) return <Typography sx={{ textAlign: 'center', mt: 3 }}>Loading answer details...</Typography>;
    if (error) return <Box sx={{ textAlign: 'center', mt: 3 }}><Typography color="error" className="error-text">{error}</Typography> <Button variant="outlined" onClick={() => navigate('/my-answers')} sx={{ ml: 1 }}>Go to My Answers</Button></Box>;
    if (!quizAnswer) return <Box sx={{ textAlign: 'center', mt: 3 }}><Typography>Answer submission not found.</Typography> <Button variant="outlined" onClick={() => navigate('/my-answers')} sx={{ ml: 1 }}>Go to My Answers</Button></Box>;


    // User can self-assess if they are the creator of the answer.
    // The "isChecked" status (Ready for Review) is the state in which they perform this self-assessment.
    // If a host later "officially checks" it, we might add another flag to disable this.
    const canSelfAssess = currentUser && quizAnswer && currentUser.uid === quizAnswer.answerCreatorId && !quizAnswer.isCompleted;

    return (
        <div className="answer-details-container">
            <Typography variant="h4" component="h1" gutterBottom align="center">
                Answers for: {quizAnswer.quizTitle}
            </Typography>
            <Paper elevation={3} sx={{ p: { xs: 1.5, sm: 2.5 }, mb: 3, backgroundColor: '#2a2a2a' }} className="answer-summary">
                <Typography variant="body1"><strong>Submitted By:</strong> {quizAnswer.answerCreatorName || 'Anonymous'}</Typography>
                <Typography variant="body1"><strong>Submitted At:</strong> {quizAnswer.submittedAt ? format(quizAnswer.submittedAt.toDate(), 'yyyy-MM-dd HH:mm') : 'N/A'}</Typography>
                <Typography variant="body1"><strong>Status:</strong>
                    {quizAnswer.isCompleted ? ' Completed' :
                        quizAnswer.isChecked ? ' Ready for Review' :
                            ' In Progress'}
                </Typography>
                <Typography variant="body1"><strong>Current Saved Score:</strong> {quizAnswer.score} / {quizAnswer.answers ? quizAnswer.answers.length * 1 : 'N/A'}</Typography>
                <Typography variant="body1">
                    <strong>{scoreMode === 'auto' ? 'Auto-Calculated Score (Live):' : 'Manually Assessed Score (Live):'}</strong>
                    {' '}{totalSelfAssessedScore} / {quizAnswer.answers ? quizAnswer.answers.length * 1 : 'N/A'}
                </Typography>
            </Paper>

            {canSelfAssess && (
                <Box className="score-mode-selector" sx={{ mb: 2, display: 'flex', justifyContent: 'center' }}>
                    <FormControlLabel
                        control={
                            <Checkbox
                                id="scoreModeCheckbox"
                                checked={scoreMode === 'auto'}
                                onChange={(e) => setScoreMode(e.target.checked ? 'auto' : 'manual')}
                            />
                        }
                        label="Calculate Score Automatically"
                    />
                </Box>
            )}

            <Typography variant="h5" component="h2" gutterBottom align="center">Your Guesses</Typography>
            {quizAnswer.answers && quizAnswer.answers.length > 0 ? (
                <List className="answer-guesses-list" sx={{ padding: 0 }}>
                    {quizAnswer.answers.map((guess, index) => {
                        const correctAnswer = correctQuizData?.questions?.[index];
                        return (
                            <ListItem key={index} sx={{ p: 0, mb: 2 }}>
                                <Paper elevation={2} sx={{ p: { xs: 1, sm: 2 }, width: '100%', backgroundColor: '#2a2a2a' }} className="answer-guess-item detailed-guess-item">
                                    <Typography variant="h6" component="h4" gutterBottom>Song {index + 1}</Typography>
                                    <Typography variant="body2"><strong>Your Guess:</strong> Artist - "{guess.artist || 'N/A'}", Title - "{guess.songName || 'N/A'}"</Typography>
                                    {/* Correct answer display can be added here if needed, using Typography and MUI Link */}
                                    <FormControl fullWidth margin="dense" className="manual-score-input" sx={{ mt: 1 }}>
                                        <InputLabel id={`manual-score-label-${index}`}>Score</InputLabel>
                                        <Select
                                            labelId={`manual-score-label-${index}`}
                                            id={`manual-score-${index}`}
                                            value={selfAssessedSongScores[index] !== undefined ? selfAssessedSongScores[index] : 0}
                                            onChange={(e) => handleSelfAssessedScoreChange(index, e.target.value)}
                                            disabled={!canSelfAssess || scoreMode === 'auto'}
                                            label="Score"
                                        >
                                            <MenuItem value={0}>0</MenuItem>
                                            <MenuItem value={0.5}>0.5</MenuItem>
                                            <MenuItem value={1}>1</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Paper>
                            </ListItem>
                        );
                    })}
                </List>
            ) : (
                <Typography sx={{ textAlign: 'center', mt: 2 }}>No guesses recorded for this submission.</Typography>
            )}
            {canSelfAssess && scoreMode === 'auto' && !quizAnswer.isCompleted && (
                <Button
                    variant="contained"
                    onClick={handleAutoCalculateScore}
                    disabled={isSavingAssessment || isCompleting || isAutoCalculating}
                    className="button-auto-calculate"
                    sx={{ mt: 2, mb: 1, display: 'block', mx: 'auto' }}
                >
                    {isAutoCalculating || isSavingAssessment ? 'Calculating & Saving...' : 'Automatically Calculate & Save Score'}
                </Button>
            )}
            {canSelfAssess && !quizAnswer.isCompleted && (
                <Box className="save-assessment-section" sx={{ mt: 2, textAlign: 'center' }}>
                    <Button
                        variant="outlined"
                        onClick={handleSaveAssessment}
                        disabled={isSavingAssessment}
                        className="button-save-assessment"
                        sx={{ mr: 1, mb: 1 }}
                    >
                        {isSavingAssessment ? 'Saving...' : 'Save My Assessment'}
                    </Button>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleSaveAndCompleteAssessment}
                        disabled={isCompleting || isSavingAssessment}
                        className="button-save-complete-assessment"
                        sx={{ mb: 1 }}
                    >
                        {isCompleting ? 'Completing...' : 'Save and Mark as Completed'}
                    </Button>
                    {completeError && <Typography color="error" sx={{ mt: 1 }} className="error-text form-message">{completeError}</Typography>}
                    {saveAssessmentError && <Typography color="error" sx={{ mt: 1 }} className="error-text form-message">{saveAssessmentError}</Typography>}
                    {saveAssessmentSuccess && <Typography color="success.main" sx={{ mt: 1 }} className="success-text form-message">{saveAssessmentSuccess}</Typography>}
                </Box>
            )}
            <Button component={RouterLink} to="/my-answers" variant="text" className="back-link" sx={{ display: 'block', mx: 'auto', mt: 3 }}>
                Back to My Answers
            </Button>
        </div>
    );
};

export default AnswerDetails;