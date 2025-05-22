import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { format } from 'date-fns';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper'; // Often used with TableContainer
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
                <TableContainer component={Paper} className="table-responsive-wrapper"> {/* Use TableContainer and Paper */}
                    <Table className="quizzes-table" aria-label="Highscores Table"> {/* Use Table */}
                        <TableHead> {/* Use TableHead */}
                            <TableRow className="quizzes-table-header-row"> {/* Use TableRow */}
                                <TableCell>Quiz Title</TableCell> {/* Use TableCell */}
                                <TableCell>Score</TableCell>
                                <TableCell>Submitted By</TableCell>
                                <TableCell>Submitted At</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody> {/* Use TableBody */}
                            {highscores.map((scoreEntry) => (
                                <TableRow className="quizzes-table-data-row" key={scoreEntry.id}> {/* Use TableRow */}
                                    <TableCell data-label="Quiz">{scoreEntry.quizTitle}</TableCell> {/* Use TableCell and keep data-label */}
                                    <TableCell data-label="Score">{scoreEntry.score} / {scoreEntry.answers ? scoreEntry.answers.length * 1 : 'N/A'}</TableCell>
                                    <TableCell data-label="Submitted By">{scoreEntry.answerCreatorName || 'Anonymous'}</TableCell>
                                    <TableCell data-label="Submitted At">{scoreEntry.submittedAt ? format(scoreEntry.submittedAt, 'yyyy-MM-dd HH:mm') : 'N/A'}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </div>
    );
};

export default Highscores;