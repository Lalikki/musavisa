import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, auth } from './firebase'; // Import auth
import { doc, getDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Snackbar from '@mui/material/Snackbar'; // Added
import Alert from '@mui/material/Alert'; // Added
import { useTranslation } from 'react-i18next'; // Import useTranslation

// Helper function to capitalize the first letter of a string
const capitalizeFirstLetter = (string) => {
    if (!string) return '';
    return string.charAt(0).toUpperCase() + string.slice(1);
};

const AnswerQuiz = () => {
    const { t } = useTranslation(); // Initialize useTranslation
    const { quizId } = useParams();
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [quiz, setQuiz] = useState(null);
    const [answers, setAnswers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState('');
    const [isReadyForReview, setIsReadyForReview] = useState(false); // New state for the checkbox
    const [submitError, setSubmitError] = useState('');
    const [teamSize, setTeamSize] = useState(1);
    const [teamMembers, setTeamMembers] = useState([]); // Stores names of additional members

    useEffect(() => {
        const fetchQuiz = async () => {
            try {
                setLoading(true);
                setError(null);
                const quizDocRef = doc(db, 'quizzes', quizId);
                const quizDocSnap = await getDoc(quizDocRef);

                if (quizDocSnap.exists()) {
                    const quizData = { id: quizDocSnap.id, ...quizDocSnap.data() };
                    setQuiz(quizData);
                    // Initialize answers array based on the number of songs
                    setAnswers(Array(quizData.amount).fill({ artist: '', songName: '', extraAnswer: '', showEasterEggHint: false }));
                } else {
                    setError(t('common.notFound')); // Or a more specific "Quiz not found" key
                }
            } catch (err) {
                console.error("Error fetching quiz:", err);
                setError(t('quizDetailsPage.loadingError')); // Reusing a general quiz loading error
            } finally {
                setLoading(false);
            }
        };
        if (quizId) {
            fetchQuiz();
        }

        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
        });

        // Cleanup subscription on unmount
        return () => unsubscribe();

    }, [quizId, t]); // Added t to dependency array

    const handleAnswerChange = (index, field, value) => {
        const newAnswers = [...answers];
        let showHint = newAnswers[index].showEasterEggHint; // Preserve current hint state by default

        if (field === 'artist') {
            const lowerCaseValue = value.toLowerCase();
            if (lowerCaseValue === 'sum 41' || lowerCaseValue === 'blink 182') {
                showHint = true;
            } else {
                showHint = false;
            }
        }
        newAnswers[index] = { ...newAnswers[index], [field]: value, showEasterEggHint: showHint };
        setAnswers(newAnswers);
    };

    const handleTeamSizeChange = (event) => {
        const newSize = parseInt(event.target.value, 10);
        setTeamSize(newSize);
        // Adjust teamMembers array based on new size, preserving existing names if possible
        // We need newSize - 1 input fields for additional members
        setTeamMembers(prevMembers => {
            const newMembersArray = Array(newSize - 1).fill('');
            for (let i = 0; i < Math.min(prevMembers.length, newSize - 1); i++) {
                newMembersArray[i] = prevMembers[i];
            }
            return newMembersArray;
        });
    };

    const handleTeamMemberNameChange = (index, value) => {
        const newTeamMembers = [...teamMembers];
        newTeamMembers[index] = value;
        setTeamMembers(newTeamMembers);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!user) {
            setSubmitError(t('common.pleaseLogin')); // Or a more specific "must be logged in to submit"
            return;
        }
        if (!quiz) {
            setSubmitError(t('answerQuizPage.quizNotLoadedError', 'Quiz data is not loaded yet.'));
            return;
        }

        setSubmitting(true);
        setSubmitSuccess('');
        setSubmitError('');

        try {
            const answerData = {
                quizId: quiz.id,
                quizTitle: quiz.title,
                calculatedMaxScore: quiz.calculatedMaxScore !== undefined ? quiz.calculatedMaxScore : null, // Store max score
                answers: answers, // The array of { artist: '', songName: '' }
                answerCreatorId: user.uid, // No translation needed
                answerCreatorName: user.displayName || t('common.unnamedUser', 'Anonymous'),
                submittedAt: serverTimestamp(),
                score: 0,
                teamSize: teamSize,
                teamMembers: teamMembers.filter(name => name.trim() !== ''), // Store only non-empty names
                isChecked: isReadyForReview // Set isChecked based on the checkbox state
            };

            const docRef = await addDoc(collection(db, "quizAnswers"), answerData); // Capture the DocumentReference
            setSubmitSuccess(t('common.saveSuccessMessage'));
            // Clear success message after a delay, slightly longer than Snackbar duration if needed
            setTimeout(() => {
                setSubmitSuccess('');
            }, 2500); // e.g., 2.5 seconds

            // Delay navigation for 2 seconds to show success message
            setTimeout(() => {
                if (isReadyForReview) {
                    navigate(`/my-answers/${docRef.id}`); // Redirect to Answer Details page
                } else {
                    // If not ready for review, but still submitted, redirect to My Answers
                    // Form clearing can happen if user stays, but here we navigate
                    // setAnswers(Array(quiz.amount).fill({ artist: '', songName: '', showEasterEggHint: false }));
                    // setIsReadyForReview(false);
                    // setTeamSize(1);
                    // setTeamMembers([]);
                    navigate('/my-answers');
                }
            }, 2000); // 2000 milliseconds = 2 seconds


        } catch (err) {
            console.error("Error submitting answers:", err);
            setSubmitError(t('answerQuizPage.submitError') + " " + err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleSubmitAndReview = async (e) => {
        e.preventDefault(); // Prevent default if it's part of a form, though Button onClick won't by default
        if (!user) {
            setSubmitError(t('common.pleaseLogin'));
            return;
        }
        if (!quiz) {
            setSubmitError(t('answerQuizPage.quizNotLoadedError', 'Quiz data is not loaded yet.'));
            return;
        }

        setSubmitting(true);
        setSubmitSuccess('');
        setSubmitError('');

        try {
            const answerData = {
                quizId: quiz.id,
                quizTitle: quiz.title,
                calculatedMaxScore: quiz.calculatedMaxScore !== undefined ? quiz.calculatedMaxScore : null, // Store max score
                answers: answers,
                answerCreatorId: user.uid, // No translation needed
                answerCreatorName: user.displayName || t('common.unnamedUser', 'Anonymous'),
                submittedAt: serverTimestamp(),
                score: 0,
                teamSize: teamSize,
                teamMembers: teamMembers.filter(name => name.trim() !== ''),
                isChecked: true // Always true for this action
            };

            const docRef = await addDoc(collection(db, "quizAnswers"), answerData);
            setSubmitSuccess(t('common.saveSuccessMessage'));
            // Clear success message after a delay
            setTimeout(() => {
                setSubmitSuccess('');
            }, 2500);
            // Delay navigation for 2 seconds
            setTimeout(() => {
                navigate(`/my-answers/${docRef.id}`); // Redirect to Answer Details page
            }, 2000); // 2000 milliseconds = 2 seconds

        } catch (err) {
            console.error("Error submitting answers for review:", err);
            setSubmitError(t('common.saveErrorMessage') + " " + err.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <Typography sx={{ textAlign: 'center', mt: 3 }}>{t('common.loading')}</Typography>;
    if (error) return <Typography color="error" sx={{ textAlign: 'center', mt: 3 }} className="error-text">{error || t('common.error')}</Typography>;
    if (!quiz) return <Typography sx={{ textAlign: 'center', mt: 3 }}>{t('common.notFound')}</Typography>; // Or a more specific "Quiz not found"

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
            <Typography variant="h4" component="h4" gutterBottom align="center" sx={{ mb: 2 }}>
                {quiz.title}
            </Typography>
            {quiz.rules && (
                <Typography variant="body1" paragraph align="center" sx={{ mb: 3 }}>
                    {quiz.rules}
                </Typography>
            )}
            <Paper component="form" onSubmit={handleSubmit} sx={{ p: { xs: 1.5, sm: 2.5 }, backgroundColor: 'transparent', boxShadow: 'none' }} className="answer-quiz-form">
                <FormControl fullWidth margin="normal">
                    <InputLabel id="team-size-label">{t('answerQuizPage.teamSize')}</InputLabel>
                    <Select
                        labelId="team-size-label"
                        id="team-size-select"
                        value={teamSize}
                        label={t('answerQuizPage.teamSize')}
                        onChange={handleTeamSizeChange}
                    >
                        <MenuItem value={1}>{t('answerQuizPage.singlePlayerCount', { count: 1 })}</MenuItem>
                        <MenuItem value={2}>{t('answerQuizPage.playerCount', { count: 2 })}</MenuItem>
                        <MenuItem value={3}>{t('answerQuizPage.playerCount', { count: 3 })}</MenuItem>
                        <MenuItem value={4}>{t('answerQuizPage.playerCount', { count: 4 })}</MenuItem>
                    </Select>
                </FormControl>

                {teamMembers.map((memberName, index) => (
                    <TextField
                        key={`team-member-${index}`}
                        label={t('answerQuizPage.teamMemberName', { count: index + 2 })} // +2 because member 1 is the logged-in user
                        variant="outlined"
                        fullWidth
                        margin="dense"
                        value={memberName}
                        onChange={(e) => handleTeamMemberNameChange(index, e.target.value)}
                        sx={{ mb: 1 }}
                    />
                ))}

                {answers.map((answer, index) => (
                    <Box key={index} className="song-guess-item" elevation={4} sx={{ mb: 2, p: { xs: 0.5, sm: 1 }, backgroundColor: 'transparent', boxShadow: 'none', border: 'none' }}>
                        <Typography variant="h6" component="h4" gutterBottom>
                            {t('common.song')} {index + 1}
                        </Typography>
                        {answer.showEasterEggHint && (
                            <Typography variant="caption" color="secondary" sx={{ display: 'block', mb: 0.5, textAlign: 'left' }}>
                                {t('answerQuizPage.easterEggOther')}
                            </Typography>
                        )}
                        <TextField
                            label={t('answerQuizPage.artist')}
                            variant="outlined"
                            fullWidth
                            margin="dense"
                            id={`artist-${index + 1}`}
                            value={answer.artist || ''} // Ensure value is not null/undefined
                            onChange={(e) => handleAnswerChange(index, 'artist', e.target.value)}
                            className="artist-input"
                            InputLabelProps={{ shrink: true }}
                        />
                        <TextField
                            label={t('answerQuizPage.songName')}
                            variant="outlined"
                            fullWidth
                            margin="dense"
                            id={`songName-${index + 1}`}
                            value={answer.songName || ''} // Ensure value is not null/undefined
                            onChange={(e) => handleAnswerChange(index, 'songName', e.target.value)}
                            className="songname-input"
                            InputLabelProps={{ shrink: true }}
                        />
                        {/* Display Extra Question and Answer Field if extra question exists */}
                        {quiz?.questions?.[index]?.extra && (
                            <>
                                {/* <Typography variant="body2" sx={{ mt: 1, mb: 0.5, fontWeight: 'medium' }}>
                                    {quiz.questions[index].extra}
                                </Typography> */}
                                <TextField
                                    // label={t('answerQuizPage.extraAnswerLabel', 'Your Answer to Extra Question')}
                                    label={capitalizeFirstLetter(quiz.questions[index].extra)}
                                    variant="outlined"
                                    fullWidth
                                    margin="dense"
                                    id={`extraAnswer-${index + 1}`}
                                    value={answer.extraAnswer || ''}
                                    onChange={(e) => handleAnswerChange(index, 'extraAnswer', e.target.value)}
                                    className="extra-answer-input"
                                    InputLabelProps={{ shrink: true }}
                                />
                            </>
                        )}
                    </Box>
                ))}

                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, mt: 2 }}>
                    <Button type="submit" variant="outlined" fullWidth disabled={submitting} className="button-submit-answers">
                        {submitting ? t('answerQuizPage.submitting') : t('answerQuizPage.submitAnswers')}
                    </Button>
                    <Button
                        variant="contained"
                        color="primary"
                        fullWidth
                        disabled={submitting}
                        onClick={handleSubmitAndReview} // Use the new handler
                        className="button-submit-review"
                    >
                        {submitting ? t('answerQuizPage.submitting') : t('answerQuizPage.submitAndReview')}
                    </Button>
                </Box>

                {submitError && (
                    <Typography color="error" sx={{ mt: 2, textAlign: 'center' }} className="error-text form-message">
                        {submitError}
                    </Typography>
                )}
            </Paper>
            <Snackbar open={!!submitSuccess} autoHideDuration={2000} onClose={() => setSubmitSuccess('')} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
                <Alert onClose={() => setSubmitSuccess('')} severity="success" sx={{ width: '100%' }}>
                    {submitSuccess}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default AnswerQuiz;
