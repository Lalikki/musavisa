import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db } from './firebase';
import { doc, getDoc } from 'firebase/firestore';
import { format } from 'date-fns';

const QuizDetails = () => {
    const { quizId } = useParams();
    const [quiz, setQuiz] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchQuizDetails = async () => {
            setLoading(true);
            setError(null);
            try {
                const quizDocRef = doc(db, 'quizzes', quizId);
                const quizDocSnap = await getDoc(quizDocRef);

                if (quizDocSnap.exists()) {
                    const data = quizDocSnap.data();
                    setQuiz({
                        id: quizDocSnap.id,
                        ...data,
                        createdAt: data.createdAt ? data.createdAt.toDate() : null,
                    });
                } else {
                    setError('Quiz not found.');
                }
            } catch (err) {
                console.error("Error fetching quiz details:", err);
                setError('Failed to load quiz details. Please try again.');
            } finally {
                setLoading(false);
            }
        };

        if (quizId) {
            fetchQuizDetails();
        }
    }, [quizId]);

    if (loading) return <p>Loading quiz details...</p>;
    if (error) return <p className="error-text">{error}</p>;
    if (!quiz) return <p>Quiz not found. <Link to="/my-quizzes">Go back to My Quizzes</Link></p>;

    return (
        <div className="quiz-details-container">
            <h1>{quiz.title}</h1>
            <p><strong>Rules:</strong> {quiz.rules || 'No rules provided.'}</p>
            <p><strong>Number of Songs:</strong> {quiz.amount}</p>
            <p><strong>Created By:</strong> {quiz.creatorName || 'Unknown'}</p>
            <p><strong>Created At:</strong> {quiz.createdAt ? format(quiz.createdAt, 'yyyy-MM-dd HH:mm') : 'N/A'}</p>

            <h2>Questions (Song Details)</h2>
            {quiz.questions && quiz.questions.length > 0 ? (
                <ul className="quiz-questions-list">
                    {quiz.questions.map((q, index) => (
                        <li key={index} className="quiz-question-item">
                            <strong>Song {index + 1}:</strong> Artist - "{q.artist}", Title - "{q.song}"
                            {q.songLink && <p>Link: <a href={q.songLink} target="_blank" rel="noopener noreferrer">{q.songLink}</a></p>}
                        </li>
                    ))}
                </ul>
            ) : (
                <p>No questions found for this quiz.</p>
            )}
            <Link to="/my-quizzes" className="back-link">Back to My Quizzes</Link>
        </div>
    );
};

export default QuizDetails;