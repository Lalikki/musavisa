import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { db, auth } from './firebase'; // Import auth
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { format } from 'date-fns';

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
        if (!currentUser || currentUser.uid !== quizAnswer?.answerCreatorId || quizAnswer?.isChecked) {
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
                selfAssessedTotalScore: totalSelfAssessedScore,
                lastSelfAssessedAt: serverTimestamp()
            });
            setSaveAssessmentSuccess("Your assessment has been saved!");
            // Optionally update local quizAnswer state if needed, or rely on re-fetch if user navigates away and back
            setQuizAnswer(prev => ({ ...prev, selfAssessedSongScores, selfAssessedTotalScore: totalSelfAssessedScore }));
        } catch (err) {
            console.error("Error saving self-assessment:", err);
            setSaveAssessmentError("Failed to save your assessment. Please try again.");
        } finally {
            setIsSavingAssessment(false);
        }
    };

    const canSelfAssess = currentUser && quizAnswer && currentUser.uid === quizAnswer.answerCreatorId && !quizAnswer.isChecked;

    if (loading) return <p>Loading answer details...</p>;
    if (error) return <p className="error-text">{error} <button onClick={() => navigate('/my-answers')}>Go to My Answers</button></p>;
    if (!quizAnswer) return <p>Answer submission not found. <button onClick={() => navigate('/my-answers')}>Go to My Answers</button></p>;

    return (
        <div className="answer-details-container">
            <h1>Answers for: {quizAnswer.quizTitle}</h1>
            <div className="answer-summary">
                <p><strong>Submitted By:</strong> {quizAnswer.answerCreatorName || 'Anonymous'}</p>
                <p><strong>Submitted At:</strong> {quizAnswer.submittedAt ? format(quizAnswer.submittedAt.toDate(), 'yyyy-MM-dd HH:mm') : 'N/A'}</p>
                <p><strong>Automatically calculated Score:</strong> {quizAnswer.score} / {quizAnswer.answers ? quizAnswer.answers.length * 1 : 'N/A'}</p>
                <p><strong>Status:</strong> {quizAnswer.isChecked ? 'Checked' : 'Pending'}</p>
                <p><strong>Manual score:</strong> {totalSelfAssessedScore} / {quizAnswer.answers ? quizAnswer.answers.length * 1 : 'N/A'}</p>
            </div>

            <h2>Your Guesses</h2>
            {quizAnswer.answers && quizAnswer.answers.length > 0 ? (
                <ul className="answer-guesses-list">
                    {quizAnswer.answers.map((guess, index) => {
                        const correctAnswer = correctQuizData?.questions?.[index];
                        return (
                            <li key={index} className="answer-guess-item detailed-guess-item">
                                <h4>Song {index + 1}</h4>
                                <p><strong>Your Guess:</strong> Artist - "{guess.artist || 'N/A'}", Title - "{guess.songName || 'N/A'}"</p>
                                {/* {correctAnswer && (
                                    <p className="correct-answer-text">
                                        <strong>Correct:</strong> Artist - "{correctAnswer.artist}", Title - "{correctAnswer.song}"
                                        {correctAnswer.songLink && <a href={correctAnswer.songLink} target="_blank" rel="noopener noreferrer" className="song-link-details">(Link)</a>}
                                    </p>
                                )} */}
                                <div className="manual-score-input">
                                    <label htmlFor={`manual-score-${index}`}>Score: </label>
                                    <select
                                        id={`manual-score-${index}`}
                                        value={selfAssessedSongScores[index] !== undefined ? selfAssessedSongScores[index] : 0}
                                        onChange={(e) => handleSelfAssessedScoreChange(index, e.target.value)}
                                        disabled={!canSelfAssess}
                                    >
                                        <option value="0">0</option>
                                        <option value="0.5">0.5</option>
                                        <option value="1">1</option>
                                    </select>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            ) : (
                <p>No guesses recorded for this submission.</p>
            )}
            {canSelfAssess && (
                <div className="save-assessment-section">
                    <button onClick={handleSaveAssessment} disabled={isSavingAssessment} className="button-save-assessment">
                        {isSavingAssessment ? 'Saving...' : 'Save My Assessment'}
                    </button>
                    {saveAssessmentError && <p className="error-text form-message">{saveAssessmentError}</p>}
                    {saveAssessmentSuccess && <p className="success-text form-message">{saveAssessmentSuccess}</p>}
                </div>
            )}
            <Link to="/my-answers" className="back-link">Back to My Answers</Link>
        </div>
    );
};

export default AnswerDetails;