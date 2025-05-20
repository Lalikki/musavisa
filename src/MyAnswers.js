import React, { useState, useEffect } from 'react';
import { db, auth } from './firebase';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { Link } from 'react-router-dom'; // Import Link
import { format } from 'date-fns';

const MyAnswers = () => {
    const [user, setUser] = useState(null);
    const [answers, setAnswers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                fetchUserAnswers(currentUser.uid);
            } else {
                setAnswers([]); // Clear answers if user logs out
                setLoading(false); // Stop loading if user logs out and no fetch is needed
            }
        });
        return () => unsubscribe();
    }, []);

    const fetchUserAnswers = async (uid) => {
        setLoading(true);
        setError(null);
        try {
            const answersCollectionRef = collection(db, "quizAnswers");
            const q = query(
                answersCollectionRef,
                where("answerCreatorId", "==", uid),
                orderBy("submittedAt", "desc")
            );
            const querySnapshot = await getDocs(q);
            const userAnswersData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                submittedAt: doc.data().submittedAt ? doc.data().submittedAt.toDate() : null,
            }));
            setAnswers(userAnswersData);
        } catch (err) {
            console.error("Error fetching user answers:", err);
            setError("Failed to load your answers. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    if (!user && !loading) {
        return <p>Please log in to see your answers.</p>;
    }
    if (loading) return <p>Loading your answers...</p>;
    if (error) return <p className="error-text">{error}</p>;

    return (
        <div className="my-quizzes-container">
            <h1>My Submitted Answers</h1>
            {answers.length === 0 && !loading && <p>You haven't submitted any quiz answers yet.</p>}
            {answers.length > 0 && (
                <div className="table-responsive-wrapper">
                    <table className="quizzes-table">
                        <thead>
                            <tr>
                                <th>Quiz Title</th>
                                <th>Your Score</th>
                                <th>Submitted At</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {answers.map(answer => (
                                <tr key={answer.id}>
                                    <td data-label="Title">{answer.quizTitle}</td>
                                    {/* Assuming max score is 1 point per song (0.5 artist + 0.5 song) */}
                                    <td data-label="Score">{answer.score} / {answer.answers ? answer.answers.length * 1 : 'N/A'}</td>
                                    <td data-label="Submitted">{answer.submittedAt ? format(answer.submittedAt, 'yyyy-MM-dd HH:mm') : 'N/A'}</td>
                                    <td data-label="Status">
                                        {answer.isCompleted ? 'Completed' :
                                            answer.isChecked ? 'Ready for Review' :
                                                'In Progress'}
                                    </td>
                                    <td data-label="Actions">
                                        {answer.isChecked && (
                                            <Link to={`/my-answers/${answer.id}`} className="view-details-button action-button-spacing">Details</Link>
                                        )}
                                        {/* Show edit link only if not checked and user is the creator */}
                                        {!answer.isChecked && user && answer.answerCreatorId === user.uid && (
                                            <Link to={`/edit-answer/${answer.id}`} className="edit-button">Edit</Link>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default MyAnswers;