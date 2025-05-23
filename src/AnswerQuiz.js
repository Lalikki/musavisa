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

const AnswerQuiz = () => {
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
                    setAnswers(Array(quizData.amount).fill({ artist: '', songName: '' }));
                } else {
                    setError('Quiz not found.');
                }
            } catch (err) {
                console.error("Error fetching quiz:", err);
                setError('Failed to load the quiz. Please try again.');
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

    }, [quizId]);

    const handleAnswerChange = (index, field, value) => {
        const newAnswers = [...answers];
        newAnswers[index] = { ...newAnswers[index], [field]: value };
        setAnswers(newAnswers);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!user) {
            setSubmitError("You must be logged in to submit answers.");
            return;
        }
        if (!quiz) {
            setSubmitError("Quiz data is not loaded yet.");
            return;
        }

        setSubmitting(true);
        setSubmitSuccess('');
        setSubmitError('');

        try {
            const answerData = {
                quizId: quiz.id,
                quizTitle: quiz.title,
                answers: answers, // The array of { artist: '', songName: '' }
                answerCreatorId: user.uid,
                answerCreatorName: user.displayName || "Anonymous",
                submittedAt: serverTimestamp(),
                score: 0, // Initialize score to 0 for now
                isChecked: isReadyForReview // Set isChecked based on the checkbox state
            };

            const docRef = await addDoc(collection(db, "quizAnswers"), answerData); // Capture the DocumentReference
            setSubmitSuccess("Your answers have been submitted successfully!");

            if (isReadyForReview) {
                navigate(`/my-answers/${docRef.id}`); // Redirect to Answer Details page
            } else {
                // Stay on the page, maybe clear the form or show a message
                // For now, just show success message and clear form state
                setAnswers(Array(quiz.amount).fill({ artist: '', songName: '' })); // Clear form
                setIsReadyForReview(false); // Reset checkbox
                // Redirect to My Answers page after successful submission
                navigate('/my-answers');
            }
        } catch (err) {
            console.error("Error submitting answers:", err);
            setSubmitError("Failed to submit answers. Please try again. " + err.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <Typography sx={{ textAlign: 'center', mt: 3 }}>Loading quiz...</Typography>;
    if (error) return <Typography color="error" sx={{ textAlign: 'center', mt: 3 }} className="error-text">{error}</Typography>;
    if (!quiz) return <Typography sx={{ textAlign: 'center', mt: 3 }}>Quiz not found.</Typography>;

    return (
        <div className="quiz-container">
            <Typography variant="h4" component="h4" gutterBottom align="center" sx={{ mb: 2 }}>
                {quiz.title}
            </Typography>
            {quiz.rules && (
                <Typography variant="body1" paragraph align="center" sx={{ mb: 3 }}>
                    {quiz.rules}
                </Typography>
            )}
            <Paper component="form" onSubmit={handleSubmit} sx={{ p: { xs: 1.5, sm: 2.5 }, backgroundColor: 'transparent', boxShadow: 'none' }} className="answer-quiz-form">
                {answers.map((answer, index) => (
                    <Box key={index} className="song-guess-item" elevation={4} sx={{ mb: 2, p: { xs: 0.5, sm: 1 }, backgroundColor: 'transparent', boxShadow: 'none', border: 'none' }}>
                        <Typography variant="h6" component="h4" gutterBottom>
                            Song {index + 1}
                        </Typography>
                        <TextField
                            label="Artist"
                            variant="outlined"
                            fullWidth
                            margin="dense"
                            id={`artist-${index + 1}`}
                            value={answer.artist}
                            onChange={(e) => handleAnswerChange(index, 'artist', e.target.value)}
                            className="artist-input"
                            InputLabelProps={{ shrink: true }}
                        />
                        <TextField
                            label="Song Name"
                            variant="outlined"
                            fullWidth
                            margin="dense"
                            id={`songName-${index + 1}`}
                            value={answer.songName}
                            onChange={(e) => handleAnswerChange(index, 'songName', e.target.value)}
                            className="songname-input"
                            InputLabelProps={{ shrink: true }}
                        />
                    </Box>
                ))}
                <FormControlLabel
                    control={
                        <Checkbox
                            id="readyForReviewCheckbox"
                            checked={isReadyForReview}
                            onChange={e => setIsReadyForReview(e.target.checked)}
                        />
                    }
                    label="Mark as Ready for Review"
                    className="is-ready-checkbox-container"
                    sx={{ display: 'block', mt: 1, mb: 2 }}
                />
                <Button type="submit" variant="contained" color="primary" fullWidth disabled={submitting} className="button-submit-answers">
                    {submitting ? 'Submitting...' : 'Submit Answers'}
                </Button>
                {submitSuccess && (
                    <Typography color="success.main" sx={{ mt: 2, textAlign: 'center' }} className="success-text form-message">
                        {submitSuccess}
                    </Typography>
                )}
                {submitError && (
                    <Typography color="error" sx={{ mt: 2, textAlign: 'center' }} className="error-text form-message">
                        {submitError}
                    </Typography>
                )}
            </Paper>
        </div>
    );
};

export default AnswerQuiz;
