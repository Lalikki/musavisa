import React, { useState, useEffect } from 'react';
import { db, auth } from './firebase';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { format } from 'date-fns'; // For formatting dates
import { Link } from 'react-router-dom';

const MyQuizzes = () => {
    const [user, setUser] = useState(null);
    const [quizzes, setQuizzes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [expandedQuizId, setExpandedQuizId] = useState(null);
    const [quizAnswers, setQuizAnswers] = useState([]);


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
                <div className="table-responsive-wrapper"> {/* Added wrapper div */}
                    <table className="quizzes-table">
                        <thead>
                            <tr>
                                <th>Title</th>
                                <th>Number of Songs</th>
                                <th>Created At</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {quizzes.map(quiz => (
                                <React.Fragment key={quiz.id}>
                                    <tr>
                                        <td data-label="Title">{quiz.title}</td>
                                        <td data-label="Songs">{quiz.amount}</td>
                                        <td data-label="Created">{quiz.createdAt ? format(quiz.createdAt, 'yyyy-MM-dd HH:mm') : 'N/A'}</td>
                                        <td data-label="Actions">
                                            <Link to={`/my-quizzes/${quiz.id}`} className="view-details-button action-button-spacing">Details</Link>
                                            <Link to={`/edit-quiz/${quiz.id}`} className="edit-button">Edit</Link>
                                        </td>
                                    </tr>

                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default MyQuizzes;