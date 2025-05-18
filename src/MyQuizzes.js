import React, { useState, useEffect } from 'react';
import { db, auth } from './firebase';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { format } from 'date-fns'; // For formatting dates
import { Link } from 'react-router-dom';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';

const MyQuizzes = () => {
    const [user, setUser] = useState(null);
    const [quizzes, setQuizzes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [expandedQuizId, setExpandedQuizId] = useState(null);
    const [quizAnswers, setQuizAnswers] = useState([]);
    const [answersLoading, setAnswersLoading] = useState(false);
    const [answersError, setAnswersError] = useState(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                fetchUserQuizzes(currentUser.uid);
            } else {
                setQuizzes([]); // Clear quizzes if user logs out
                setExpandedQuizId(null); // Reset expanded quiz
                setLoading(false);
            }
        });
        return () => unsubscribe();
    }, []);

    const fetchUserQuizzes = async (uid) => {
        setLoading(true);
        setError(null);
        try {
            const quizzesCollectionRef = collection(db, "quizzes");
            // Query for quizzes created by the current user, ordered by creation date
            const q = query(
                quizzesCollectionRef,
                where("createdBy", "==", uid),
                orderBy("createdAt", "desc")
            );
            const querySnapshot = await getDocs(q);
            const userQuizzesData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt ? doc.data().createdAt.toDate() : null,
            }));
            setQuizzes(userQuizzesData);
        } catch (err) {
            console.error("Error fetching user quizzes:", err);
            setError("Failed to load your quizzes. Please try again. You might need to create a Firestore index.");
        } finally {
            setLoading(false);
        }
    };

    const fetchAnswersForQuiz = async (quizId) => {
        setAnswersLoading(true);
        setAnswersError(null);
        setQuizAnswers([]);
        try {
            const answersCollectionRef = collection(db, "quizAnswers");
            const q = query(
                answersCollectionRef,
                where("quizId", "==", quizId),
                orderBy("submittedAt", "desc") // Or orderBy("score", "desc")
            );
            const querySnapshot = await getDocs(q);
            const fetchedAnswers = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                submittedAt: doc.data().submittedAt ? doc.data().submittedAt.toDate() : null,
            }));
            setQuizAnswers(fetchedAnswers);
        } catch (err) {
            console.error("Error fetching answers for quiz:", err);
            setAnswersError("Failed to load answers. You might need to create a Firestore index for 'quizAnswers' on 'quizId' and 'submittedAt'.");
        } finally {
            setAnswersLoading(false);
        }
    };

    const toggleAnswersVisibility = (quizId) => {
        const newExpandedQuizId = expandedQuizId === quizId ? null : quizId;
        setExpandedQuizId(newExpandedQuizId);
        if (newExpandedQuizId) {
            fetchAnswersForQuiz(newExpandedQuizId);
        }
    };

    if (!user && !loading) {
        return <p>Please log in to see the quizzes you've created.</p>;
    }
    if (loading) return <p>Loading your quizzes...</p>;
    if (error) return <p className="error-text">{error}</p>;

    return (
        <div className="my-quizzes-container">
            <h1>My Created Quizzes</h1>
            {quizzes.length === 0 && !loading && <p>You haven't created any quizzes yet. <Link to="/quiz">Create one now!</Link></p>}
            {quizzes.length > 0 && (
                <table className="my-quizzes-table">
                    <thead>
                        <tr>
                            <th>Title</th>
                            <th>Number of Songs</th>
                            <th>Created At</th>
                            <th>View Answers</th>
                        </tr>
                    </thead>
                    <tbody>
                        {quizzes.map(quiz => (
                            <React.Fragment key={quiz.id}>
                                <tr>
                                    <td><Link to={`/my-quizzes/${quiz.id}`}>{quiz.title}</Link></td>
                                    <td>{quiz.amount}</td>
                                    <td>{quiz.createdAt ? format(quiz.createdAt, 'yyyy-MM-dd HH:mm') : 'N/A'}</td>
                                    <td onClick={() => toggleAnswersVisibility(quiz.id)} className="expand-arrow-cell">
                                        {expandedQuizId === quiz.id ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                                    </td>
                                </tr>
                                {expandedQuizId === quiz.id && (
                                    <tr>
                                        <td colSpan="4" className="collapsible-content">
                                            {answersLoading && <p>Loading answers...</p>}
                                            {answersError && <p className="error-text">{answersError}</p>}
                                            {!answersLoading && !answersError && quizAnswers.length === 0 && <p>No one has answered this quiz yet.</p>}
                                            {!answersLoading && !answersError && quizAnswers.length > 0 && (
                                                <table className="quiz-answers-subtable">
                                                    <thead>
                                                        <tr>
                                                            <th>Answered By</th>
                                                            <th>Score</th>
                                                            <th>Submitted At</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {quizAnswers.map(answer => (
                                                            <tr key={answer.id}>
                                                                <td>{answer.answerCreatorName || 'Anonymous'}</td>
                                                                <td>{answer.score} / {answer.answers.length * 1}</td>
                                                                <td>{answer.submittedAt ? format(answer.submittedAt, 'yyyy-MM-dd HH:mm') : 'N/A'}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            )}
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
};

export default MyQuizzes;