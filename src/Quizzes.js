import React, { useState, useEffect } from "react";
import { db } from "./firebase"; // Import your Firestore instance
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper'; // Often used with TableContainer
import StartIcon from '@mui/icons-material/Start';
import IconButton from '@mui/material/IconButton';
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
        <div className="my-quizzes-container">
            <h1>All Quizzes</h1>
            {loading && <p>Loading quizzes...</p>}
            {error && <p className="error-text">{error}</p>} {/* Changed to use class from App.css */}
            {!loading && !error && quizzes.length === 0 && <p>No ready quizzes found.</p>} {/* Updated message for clarity */}
            {!loading && !error && quizzes.length > 0 && (
                <TableContainer component={Paper} className="table-responsive-wrapper"> {/* Use TableContainer and Paper */}
                    <Table className="quizzes-table" aria-label="All Quizzes Table"> {/* Use Table */}
                        <TableHead> {/* Use TableHead */}
                            <TableRow> {/* Use TableRow */}
                                <TableCell>Title</TableCell> {/* Use TableCell */}
                                <TableCell>Number of Songs</TableCell>
                                <TableCell>Created</TableCell>
                                <TableCell>Created By (Name)</TableCell>
                                <TableCell>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody> {/* Use TableBody */}
                            {quizzes.map(quiz => (
                                <TableRow key={quiz.id}> {/* Use TableRow */}
                                    <TableCell data-label="Title">{quiz.title}</TableCell> {/* Use TableCell and keep data-label */}
                                    <TableCell data-label="Songs">{quiz.amount}</TableCell>
                                    <TableCell data-label="Created">{quiz.createdAt ? format(quiz.createdAt, 'yyyy-MM-dd HH:mm') : 'N/A'}</TableCell>
                                    <TableCell data-label="Created By">{quiz.creatorName || 'Unknown'}</TableCell>
                                    <TableCell data-label="Actions"><Link to={`/answer-quiz/${quiz.id}`}><IconButton color="orange" aria-label="add an alarm">
                                        <StartIcon />
                                    </IconButton></Link></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </div>
    );
};

export default Quizzes;