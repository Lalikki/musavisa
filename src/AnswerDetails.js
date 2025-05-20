import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { db, auth } from './firebase'; // Import auth
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { compareTwoStrings } from 'string-similarity'; // Import for fuzzy matching
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


    if (loading) return <p>Loading answer details...</p>;
    if (error) return <p className="error-text">{error} <button onClick={() => navigate('/my-answers')}>Go to My Answers</button></p>;
    if (!quizAnswer) return <p>Answer submission not found. <button onClick={() => navigate('/my-answers')}>Go to My Answers</button></p>;


    // User can self-assess if they are the creator of the answer.
    // The "isChecked" status (Ready for Review) is the state in which they perform this self-assessment.
    // If a host later "officially checks" it, we might add another flag to disable this.
    const canSelfAssess = currentUser && quizAnswer && currentUser.uid === quizAnswer.answerCreatorId && !quizAnswer.isCompleted;

    return (
        <div className="answer-details-container">
            <h1>Answers for: {quizAnswer.quizTitle}</h1>
            <div className="answer-summary">
                <p><strong>Submitted By:</strong> {quizAnswer.answerCreatorName || 'Anonymous'}</p>
                <p><strong>Submitted At:</strong> {quizAnswer.submittedAt ? format(quizAnswer.submittedAt.toDate(), 'yyyy-MM-dd HH:mm') : 'N/A'}</p>
                <p><strong>Status:</strong>
                    {quizAnswer.isCompleted ? 'Completed' :
                        quizAnswer.isChecked ? 'Ready for Review' :
                            'In Progress'}
                </p>
                <p><strong>Current Saved Score:</strong> {quizAnswer.score} / {quizAnswer.answers ? quizAnswer.answers.length * 1 : 'N/A'}</p>
                <p>
                    <strong>{scoreMode === 'auto' ? 'Auto-Calculated Score (Live):' : 'Manually Assessed Score (Live):'}</strong>
                    {' '}{totalSelfAssessedScore} / {quizAnswer.answers ? quizAnswer.answers.length * 1 : 'N/A'}
                </p>
            </div>

            {canSelfAssess && (
                <div className="score-mode-selector">
                    <label htmlFor="scoreModeCheckbox">
                        Calculate Score Automatically:
                    </label>
                    <input
                        type="checkbox"
                        id="scoreModeCheckbox"
                        checked={scoreMode === 'auto'}
                        onChange={(e) => setScoreMode(e.target.checked ? 'auto' : 'manual')}
                    />
                </div>
            )}

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
                                        disabled={!canSelfAssess || scoreMode === 'auto'}
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
            {canSelfAssess && scoreMode === 'auto' && !quizAnswer.isCompleted && (
                <button onClick={handleAutoCalculateScore} disabled={isSavingAssessment || isCompleting || isAutoCalculating} className="button-auto-calculate">
                    {isAutoCalculating || isSavingAssessment ? 'Calculating & Saving...' : 'Automatically Calculate & Save Score'}
                </button>
            )}
            {canSelfAssess && !quizAnswer.isCompleted && (
                <div className="save-assessment-section">
                    <button onClick={handleSaveAssessment} disabled={isSavingAssessment} className="button-save-assessment">
                        {isSavingAssessment ? 'Saving...' : 'Save My Assessment'}
                    </button>
                    <button onClick={handleSaveAndCompleteAssessment} disabled={isCompleting || isSavingAssessment} className="button-save-complete-assessment">
                        {isCompleting ? 'Completing...' : 'Save and Mark as Completed'}
                    </button>
                    {completeError && <p className="error-text form-message">{completeError}</p>}
                    {saveAssessmentError && <p className="error-text form-message">{saveAssessmentError}</p>}
                    {saveAssessmentSuccess && <p className="success-text form-message">{saveAssessmentSuccess}</p>}
                </div>
            )}
            <Link to="/my-answers" className="back-link">Back to My Answers</Link>
        </div>
    );
};

export default AnswerDetails;