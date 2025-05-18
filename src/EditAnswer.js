import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, auth } from './firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { compareTwoStrings } from 'string-similarity'; // Import the library
import { onAuthStateChanged } from 'firebase/auth';

const EditAnswer = () => {
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
    }, [navigate, loading]);

    useEffect(() => {
        const fetchQuizAnswer = async () => {
            if (!user || !answerId) { // Ensure user and answerId are available
                if (!user && answerId) setError("Please log in to edit answers.");
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
                    if (data.answerCreatorId !== user.uid) {
                        setError("You are not authorized to edit this answer.");
                        setQuizAnswer(null);
                    } else if (data.isChecked) {
                        setError("This answer has already been checked and cannot be edited.");
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
                            setError("Could not find the original quiz data to check answers.");
                            // Potentially clear quizAnswer or handle this state
                        }
                    }
                } else {
                    setError('Answer submission not found.');
                }
            } catch (err) {
                console.error("Error fetching quiz answer:", err);
                setError('Failed to load the answer submission. Please try again.');
            } finally {
                setLoading(false);
            }
        };

        fetchQuizAnswer();
    }, [answerId, user]);

    const handleAnswerChange = (index, field, value) => {
        const newAnswers = [...editedAnswers];
        newAnswers[index] = { ...newAnswers[index], [field]: value };
        setEditedAnswers(newAnswers);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!quizAnswer || !correctQuizData || quizAnswer.isChecked || quizAnswer.answerCreatorId !== user?.uid) {
            setSaveError("Cannot save changes. Either the answer is checked, not found, or you're not authorized.");
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
            setSaveError('Failed to save changes. Please try again. ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleMarkAsReady = async () => {
        if (!quizAnswer || !correctQuizData || quizAnswer.isChecked || quizAnswer.answerCreatorId !== user?.uid) {
            setMarkReadyError("Cannot mark as ready. Either the answer is already checked, not found, or you're not authorized.");
            return;
        }

        setMarkingReady(true);
        setMarkReadyError(null);

        const similarityThreshold = 0.8; // Adjust this value (0.0 to 1.0) as needed
        // Calculate score
        let calculatedScore = 0;
        if (correctQuizData && correctQuizData.questions && editedAnswers) {
            editedAnswers.forEach((submittedAnswer, index) => {
                const correctAnswer = correctQuizData.questions[index];
                if (correctAnswer) {
                    const submittedArtist = submittedAnswer.artist.toLowerCase().trim();
                    const correctArtist = correctAnswer.artist.toLowerCase().trim();
                    const submittedSongName = submittedAnswer.songName.toLowerCase().trim();
                    // Assuming the correct song title is stored in 'song' field in quiz.questions
                    const correctSongName = correctAnswer.song.toLowerCase().trim();

                    if (compareTwoStrings(submittedArtist, correctArtist) >= similarityThreshold) {
                        calculatedScore += 0.5;
                    }
                    if (compareTwoStrings(submittedSongName, correctSongName) >= similarityThreshold) {
                        calculatedScore += 0.5;
                    }
                }
            });
        }

        try {
            const answerDocRef = doc(db, 'quizAnswers', answerId);
            await updateDoc(answerDocRef, {
                isChecked: true,
                score: calculatedScore,
                // Optionally, add a 'markedReadyAt': serverTimestamp() field
            });
            // Navigate back or show success, and disable further editing
            navigate('/my-answers');
        } catch (err) {
            console.error("Error marking answer as ready:", err);
            setMarkReadyError('Failed to mark as ready or save score. Please try again. ' + err.message);
        } finally {
            setMarkingReady(false);
        }
    }

    if (loading) return <p>Loading answer for editing...</p>;
    if (error) return <p className="error-text">{error} <button onClick={() => navigate('/my-answers')}>Go to My Answers</button></p>;
    if (!quizAnswer || !correctQuizData) return <p>Answer submission or original quiz data not found, or answer is not editable. <button onClick={() => navigate('/my-answers')}>Go to My Answers</button></p>;

    return (
        <div className="edit-answer-container">
            <h1>Edit Your Answers for: {quizAnswer.quizTitle}</h1>
            <form onSubmit={handleSubmit}>
                {editedAnswers.map((answer, index) => (
                    <div key={index} className="song-guess-item"> {/* Re-use existing class if suitable */}
                        <h4>Song {index + 1} Guess</h4>
                        <label htmlFor={`edit-artist-${index}`}>Artist: </label>
                        <input type="text" id={`edit-artist-${index}`} value={answer.artist} onChange={(e) => handleAnswerChange(index, 'artist', e.target.value)} required className="artist-input" />
                        <label htmlFor={`edit-songName-${index}`}>Song Name: </label>
                        <input type="text" id={`edit-songName-${index}`} value={answer.songName} onChange={(e) => handleAnswerChange(index, 'songName', e.target.value)} required className="songname-input" />
                    </div>
                ))}
                <button type="submit" disabled={saving || markingReady}>{saving ? 'Saving...' : 'Save Changes'}</button>
                <button type="button" onClick={handleMarkAsReady} disabled={saving || markingReady} className="button-ready-review">
                    {markingReady ? 'Marking...' : 'Ready for Review'}
                </button>
                <button type="button" onClick={() => navigate('/my-answers')} className="button-cancel-edit">Cancel</button>
                {saveError && <p className="error-text form-message">{saveError}</p>}
                {markReadyError && <p className="error-text form-message">{markReadyError}</p>}
            </form>
        </div>
    );
};

export default EditAnswer;