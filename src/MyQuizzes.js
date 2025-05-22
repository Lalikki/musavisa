import React, { useState, useEffect } from 'react';
import { db, auth } from './firebase';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper'; // Often used with TableContainer
import EditIcon from '@mui/icons-material/Edit';
import Button from '@mui/material/Button';
import MediaBluetoothOnIcon from '@mui/icons-material/MediaBluetoothOn';
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
                <TableContainer component={Paper} className="table-responsive-wrapper"> {/* Use TableContainer and Paper */}
                    <Table className="quizzes-table" aria-label="My Quizzes Table"> {/* Use Table */}
                        <TableHead> {/* Use TableHead */}
                            <TableRow className="quizzes-table-header-row"> {/* Use TableRow */}
                                <TableCell>Title</TableCell> {/* Use TableCell */}
                                <TableCell>Number of Songs</TableCell>
                                <TableCell>Created At</TableCell>
                                <TableCell>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody> {/* Use TableBody */}
                            {quizzes.map(quiz => (
                                <React.Fragment key={quiz.id}>
                                    <TableRow className="quizzes-table-data-row" key={quiz.id}> {/* Use TableRow */}
                                        <TableCell data-label="Title">{quiz.title}</TableCell> {/* Use TableCell and keep data-label */}
                                        <TableCell data-label="Songs">{quiz.amount}</TableCell>
                                        <TableCell data-label="Created">{quiz.createdAt ? format(quiz.createdAt, 'yyyy-MM-dd HH:mm') : 'N/A'}</TableCell>
                                        <TableCell data-label="Actions">
                                            <Button className="view-action-button" variant="outlined" color="primary" to={`/my-quizzes/${quiz.id}`} startIcon={<MediaBluetoothOnIcon />} component={Link}>Host</Button>
                                            <Button className="view-action-button" variant="outlined" color="primary" to={`/edit-quiz/${quiz.id}`} startIcon={<EditIcon />} component={Link}>Edit</Button>
                                        </TableCell>
                                    </TableRow>
                                </React.Fragment>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </div>
    );
};

export default MyQuizzes;