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
import { useTheme } from '@mui/material/styles'; // Import useTheme
import Box from '@mui/material/Box'; // Import Box
import Typography from '@mui/material/Typography'; // Import Typography

const MyAnswers = () => {
    const [user, setUser] = useState(null);
    const [answers, setAnswers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const theme = useTheme(); // Get the theme object

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
        <Box
            className="my-quizzes-container" // Keep class if any global styles still apply
            sx={{
                maxWidth: '900px', // Consistent max-width
                margin: '0 auto',  // Center the content
                padding: { xs: 2, sm: 3 }, // Responsive padding
            }}
        >
            <Typography variant="h4" component="h1" gutterBottom align="center">
                My Submitted Answers
            </Typography>
            {answers.length === 0 && !loading && <Typography sx={{ textAlign: 'center', mt: 2 }}>You haven't submitted any quiz answers yet.</Typography>}
            {answers.length > 0 && (
                <TableContainer
                    component={Paper}
                    className="table-responsive-wrapper"
                    sx={{
                        [theme.breakpoints.down('sm')]: {
                            backgroundColor: 'transparent',
                            boxShadow: 'none',
                            overflowX: 'visible',
                        },
                    }}
                >
                    <Table className="quizzes-table" aria-label="My Submitted Answers Table"> {/* Use Table */}
                        <TableHead sx={{ [theme.breakpoints.down('sm')]: { display: 'none' } }}> {/* Hide headers on mobile */}
                            <TableRow className="quizzes-table-header-row"> {/* Use TableRow */}
                                <TableCell>Quiz</TableCell> {/* Use TableCell */}
                                <TableCell>Score</TableCell>
                                <TableCell>Submitted At</TableCell>
                                <TableCell>Team</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody> {/* Use TableBody */}
                            {answers.map(answer => (
                                <TableRow
                                    className="quizzes-table-data-row"
                                    key={answer.id}
                                    sx={{
                                        [theme.breakpoints.down('sm')]: {
                                            display: 'block',
                                            marginBottom: theme.spacing(2),
                                            border: `1px solid ${theme.palette.divider}`,
                                            backgroundColor: theme.palette.background.paper,
                                            borderRadius: theme.shape.borderRadius,
                                            '&:hover': {
                                                backgroundColor: theme.palette.background.paper,
                                            },
                                            '&:nth-of-type(even)': {
                                                backgroundColor: theme.palette.background.paper,
                                            }
                                        },
                                    }}
                                >
                                    <TableCell data-label="Title" sx={mobileCardCellStyle(theme)}>{answer.quizTitle}</TableCell>
                                    {/* Assuming max score is 1 point per song (0.5 artist + 0.5 song) */}
                                    <TableCell data-label="Score" sx={mobileCardCellStyle(theme)}>{answer.score} / {answer.answers ? answer.answers.length * 1 : 'N/A'}</TableCell>
                                    <TableCell data-label="Submitted" sx={mobileCardCellStyle(theme)}>{answer.submittedAt ? format(answer.submittedAt, 'yyyy-MM-dd HH:mm') : 'N/A'}</TableCell>
                                    <TableCell data-label="Team" sx={mobileCardCellStyle(theme)}>{getTeamDisplayString(answer)}</TableCell>
                                    <TableCell data-label="Status" sx={mobileCardCellStyle(theme)}>
                                        {answer.isCompleted ? 'Completed' :
                                            answer.isChecked ? 'Ready for Review' :
                                                'In Progress'}
                                    </TableCell>
                                    <TableCell data-label="Actions" sx={{ ...mobileCardCellStyle(theme), [theme.breakpoints.down('sm')]: { textAlign: 'left', paddingLeft: theme.spacing(2), '& button': { marginRight: theme.spacing(1), marginBottom: theme.spacing(1) } } }}>
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
        </Box>
    );
};

// Helper function for mobile cell styles (copied from MyQuizzes.js)
const mobileCardCellStyle = (theme) => ({
    [theme.breakpoints.down('sm')]: {
        display: 'block',
        textAlign: 'right',
        fontSize: '0.875rem',
        paddingLeft: '50%', // Make space for the label
        position: 'relative',
        borderBottom: `1px solid ${theme.palette.divider}`,
        '&:last-of-type': {
            borderBottom: 0,
        },
        '&::before': {
            content: 'attr(data-label)',
            position: 'absolute',
            left: theme.spacing(2),
            top: '50%',
            transform: 'translateY(-50%)',
            width: `calc(50% - ${theme.spacing(4)})`,
            whiteSpace: 'nowrap',
            textAlign: 'left',
            fontWeight: 'bold',
            color: theme.palette.primary.main, // Orange color for labels
        },
    },
});
export default MyAnswers;