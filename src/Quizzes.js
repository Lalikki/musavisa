import React, { useState, useEffect } from "react";
import { db } from "./firebase"; // Import your Firestore instance
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { format } from 'date-fns'; // Import date-fns for formatting dates
import { Link } from "react-router-dom"; // Optional: if you want to link to individual quizzes later

const Quizzes = () => {
    const [quizzes, setQuizzes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchQuizzes = async () => {
            try {
                setLoading(true);
                setError(null);
                const quizzesCollectionRef = collection(db, "quizzes");
                // Filter for ready quizzes and order by creation date
                const q = query(
                    quizzesCollectionRef,
                    where("isReady", "==", true), // Only fetch quizzes where isReady is true
                    orderBy("createdAt", "desc"));
                const querySnapshot = await getDocs(q);
                const quizzesData = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    createdAt: doc.data().createdAt ? doc.data().createdAt.toDate() : null
                    // creatorName should be directly available from the document data
                }));
                setQuizzes(quizzesData);
            } catch (err) {
                console.error("Error fetching quizzes:", err);
                setError("Failed to load quizzes. Please try again later. You might need to create a Firestore index for 'isReady' and 'createdAt'.");
            } finally {
                setLoading(false);
            }
        };

        fetchQuizzes();
    }, []);

    return (
        <div className="quizzes-container">
            <h1>All Quizzes</h1>
            {loading && <p>Loading quizzes...</p>}
            {error && <p className="error-text">{error}</p>} {/* Changed to use class from App.css */}
            {!loading && !error && quizzes.length === 0 && <p>No ready quizzes found.</p>} {/* Updated message for clarity */}
            {!loading && !error && quizzes.length > 0 && (
                <table className="quizzes-table">
                    <thead>
                        <tr>
                            <th>Title</th>
                            <th>Number of Songs</th>
                            <th>Created</th>
                            <th>Created By</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {quizzes.map(quiz => (
                            <tr key={quiz.id}>
                                <td>{quiz.title}</td>
                                <td>{quiz.amount}</td>
                                <td>{quiz.createdAt ? format(quiz.createdAt, 'yyyy-MM-dd HH:mm') : 'N/A'}</td>
                                <td>{quiz.creatorName || 'Unknown'}</td>
                                <td><Link to={`/answer-quiz/${quiz.id}`}>Answer Quiz</Link></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
};

export default Quizzes;