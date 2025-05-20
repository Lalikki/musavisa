import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, auth } from './firebase'; // Import auth
import { doc, getDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

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

    if (loading) return <p>Loading quiz...</p>;
    if (error) return <p className="error-text">{error}</p>;
    if (!quiz) return <p>Quiz not found.</p>;

    return (
        <div className="answer-quiz-container">
            <h1>Answer Quiz: {quiz.title}</h1>
            <p>{quiz.rules || quiz.description}</p>
            <form onSubmit={handleSubmit}>
                {answers.map((answer, index) => (
                    <div key={index} className="song-guess-item">
                        <h4>Song {index + 1} Guess</h4>
                        <label htmlFor={`artist-${index + 1}`}>Artist: </label>
                        <input
                            type="text"
                            id={`artist-${index + 1}`}
                            value={answer.artist}
                            onChange={(e) => handleAnswerChange(index, 'artist', e.target.value)}
                            placeholder="Artist Name"
                            className="artist-input"
                        />
                        <label htmlFor={`songName-${index + 1}`}>Song Name: </label>
                        <input
                            type="text"
                            id={`songName-${index + 1}`}
                            value={answer.songName}
                            onChange={(e) => handleAnswerChange(index, 'songName', e.target.value)}
                            placeholder="Song Name"
                            className="songname-input"
                        />
                    </div>
                ))}
                <div className="is-ready-checkbox-container" style={{ marginBottom: '20px' }}> {/* Re-using the class from Quiz.js */}
                    <label htmlFor="readyForReviewCheckbox" className="is-ready-checkbox-label">
                        Mark as Ready for Review:
                    </label>
                    <input
                        type="checkbox"
                        id="readyForReviewCheckbox"
                        checked={isReadyForReview}
                        onChange={e => setIsReadyForReview(e.target.checked)}
                    />
                </div>
                <button type="submit" disabled={submitting}>
                    {submitting ? 'Submitting...' : 'Submit Answers'}
                </button>
                {submitSuccess && <p className="success-text form-message">{submitSuccess}</p>}
                {submitError && <p className="error-text form-message">{submitError}</p>}
            </form>
        </div>
    );
};

export default AnswerQuiz;