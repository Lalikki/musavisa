import React, { useState, useEffect } from 'react';
import { db, auth } from './firebase';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper'; // Often used with TableContainer
import EditIcon from '@mui/icons-material/Edit';
import GradingIcon from '@mui/icons-material/Grading';
import Button from '@mui/material/Button';
import { Link } from 'react-router-dom'; // Import Link
import { format } from 'date-fns';
import Typography from '@mui/material/Typography'; // Import Typography

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

    const getTeamDisplayString = (answer) => {
        if (!answer.teamSize || answer.teamSize <= 1) {
            return answer.answerCreatorName || 'Solo';
        }
        const members = [answer.answerCreatorName]; // Logged-in user is always first
        if (answer.teamMembers && Array.isArray(answer.teamMembers)) {
            answer.teamMembers.forEach(member => {
                // Ensure member is a non-empty string before adding
                if (member && typeof member === 'string' && member.trim() !== '') {
                    members.push(member.trim());
                }
            });
        }
        return members.join(', ');
    };

    if (!user && !loading) {
        return <Typography sx={{ textAlign: 'center', mt: 3 }}>Please log in to see your answers.</Typography>;
    }
    if (loading) return <Typography sx={{ textAlign: 'center', mt: 3 }}>Loading your answers...</Typography>;
    if (error) return <Typography color="error" sx={{ textAlign: 'center', mt: 3 }} className="error-text">{error}</Typography>;

    return (
        <div className="my-quizzes-container">
            <Typography variant="h4" component="h1" gutterBottom align="center">My Submitted Answers</Typography>
            {answers.length === 0 && !loading && <Typography sx={{ textAlign: 'center', mt: 2 }}>You haven't submitted any quiz answers yet.</Typography>}
            {answers.length > 0 && (
                <TableContainer component={Paper} className="table-responsive-wrapper"> {/* Use TableContainer and Paper */}
                    <Table className="quizzes-table" aria-label="My Submitted Answers Table"> {/* Use Table */}
                        <TableHead> {/* Use TableHead */}
                            <TableRow className="quizzes-table-header-row"> {/* Use TableRow */}
                                <TableCell>Quiz Title</TableCell> {/* Use TableCell */}
                                <TableCell>Your Score</TableCell>
                                <TableCell>Submitted At</TableCell>
                                <TableCell>Team</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody> {/* Use TableBody */}
                            {answers.map(answer => (
                                <TableRow className="quizzes-table-data-row" key={answer.id}> {/* Use TableRow */}
                                    <TableCell data-label="Title">{answer.quizTitle}</TableCell> {/* Use TableCell and keep data-label */}
                                    {/* Assuming max score is 1 point per song (0.5 artist + 0.5 song) */}
                                    <TableCell data-label="Score">{answer.score} / {answer.answers ? answer.answers.length * 1 : 'N/A'}</TableCell>
                                    <TableCell data-label="Submitted">{answer.submittedAt ? format(answer.submittedAt, 'yyyy-MM-dd HH:mm') : 'N/A'}</TableCell>
                                    <TableCell data-label="Team">{getTeamDisplayString(answer)}</TableCell>
                                    <TableCell data-label="Status">
                                        {answer.isCompleted ? 'Completed' :
                                            answer.isChecked ? 'Ready for Review' :
                                                'In Progress'}
                                    </TableCell>
                                    <TableCell data-label="Actions">
                                        {answer.isChecked && (
                                            <Button className="view-action-button" variant="outlined" color="primary" to={`/my-answers/${answer.id}`} startIcon={<GradingIcon />} component={Link}>{answer.isCompleted ? 'Details' : 'Review'}</Button>
                                        )}
                                        {/* Show edit link only if not checked and user is the creator */}
                                        {!answer.isChecked && user && answer.answerCreatorId === user.uid && (
                                            <Button className="view-action-button" variant="outlined" color="primary" to={`/edit-answer/${answer.id}`} startIcon={<EditIcon />} component={Link}>Edit</Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </div>
    );
};

export default MyAnswers;