import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

const Highscores = () => {
    const [highscores, setHighscores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchHighscores = async () => {
            setLoading(true);
            setError(null);
            try {
                const answersCollectionRef = collection(db, "quizAnswers");
                // Query for all answers, ordered by score descending
                // You might want to add a limit here later (e.g., .limit(100))
                // Or filter by isCompleted == true if only completed answers count
                const q = query(
                    answersCollectionRef,
                    orderBy("score", "desc"),
                    orderBy("submittedAt", "asc") // Secondary sort for ties
                );
                const querySnapshot = await getDocs(q);
                const fetchedHighscores = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    submittedAt: doc.data().submittedAt ? doc.data().submittedAt.toDate() : null,
                }));
                setHighscores(fetchedHighscores);
            } catch (err) {
                console.error("Error fetching highscores:", err);
                setError("Failed to load highscores. Please try again.");
            } finally {
                setLoading(false);
            }
        };

        fetchHighscores();
    }, []);

    if (loading) return <p>Loading highscores...</p>;
    if (error) return <p className="error-text">{error}</p>;

    return (
        <div className="my-quizzes-container">
            <h1>Highscores</h1>
            {highscores.length === 0 && !loading && <p>No highscores recorded yet.</p>}
            {highscores.length > 0 && (
                <div className="table-responsive-wrapper">
                    <table className="quizzes-table">
                        <thead>
                            <tr>
                                <th>Quiz Title</th>
                                <th>Score</th>
                                <th>Submitted By</th>
                                <th>Submitted At</th>
                            </tr>
                        </thead>
                        <tbody>
                            {highscores.map((scoreEntry) => (
                                <tr key={scoreEntry.id}>
                                    <td data-label="Quiz">{scoreEntry.quizTitle}</td>
                                    <td data-label="Score">{scoreEntry.score} / {scoreEntry.answers ? scoreEntry.answers.length * 1 : 'N/A'}</td>
                                    <td data-label="Submitted By">{scoreEntry.answerCreatorName || 'Anonymous'}</td>
                                    <td data-label="Submitted At">{scoreEntry.submittedAt ? format(scoreEntry.submittedAt, 'yyyy-MM-dd HH:mm') : 'N/A'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default Highscores;