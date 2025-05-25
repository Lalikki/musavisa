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
import Box from '@mui/material/Box'; // Import Box
import MediaBluetoothOnIcon from '@mui/icons-material/MediaBluetoothOn';
import ShareIcon from '@mui/icons-material/Share'; // Import ShareIcon
import { useTheme } from '@mui/material/styles'; // Import useTheme
import { onAuthStateChanged } from 'firebase/auth';
import { format } from 'date-fns'; // For formatting dates
import Typography from '@mui/material/Typography'; // Import Typography
import { Link } from 'react-router-dom';
import ShareQuizModal from './ShareQuizModal'; // We will create this component

const MyQuizzes = () => {
    const [user, setUser] = useState(null);
    const [myQuizzes, setMyQuizzes] = useState([]); // Renamed from quizzes
    const [sharedQuizzes, setSharedQuizzes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingShared, setLoadingShared] = useState(true);
    const [error, setError] = useState(null);
    const [errorShared, setErrorShared] = useState(null);
    const [expandedQuizId, setExpandedQuizId] = useState(null);
    // const [quizAnswers, setQuizAnswers] = useState([]); // This state seems unused here, consider removing if not needed for this component's direct logic
    const theme = useTheme(); // Get the theme object
    const [shareModalOpen, setShareModalOpen] = useState(false);
    const [quizToShare, setQuizToShare] = useState(null);


    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                fetchUserQuizzes(currentUser.uid);
                fetchSharedQuizzes(currentUser.uid);
            } else {
                setMyQuizzes([]); // Clear quizzes if user logs out
                setSharedQuizzes([]);
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
            setMyQuizzes(userQuizzesData);
        } catch (err) {
            console.error("Error fetching user quizzes:", err);
            setError("Failed to load your quizzes. Please try again. You might need to create a Firestore index.");
        } finally {
            setLoading(false);
        }
    };

    const fetchSharedQuizzes = async (uid) => {
        setLoadingShared(true);
        setErrorShared(null);
        try {
            const quizzesCollectionRef = collection(db, "quizzes");
            // Query for quizzes where the sharedWithUids array contains the current user's UID
            const q = query(
                quizzesCollectionRef,
                where("sharedWithUids", "array-contains", uid),
                orderBy("createdAt", "desc") // Optional: order them as well
            );
            const querySnapshot = await getDocs(q);
            const sharedQuizzesData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt ? doc.data().createdAt.toDate() : null,
            }));
            setSharedQuizzes(sharedQuizzesData);
        } catch (err) {
            console.error("Error fetching shared quizzes:", err);
            setErrorShared("Failed to load quizzes shared with you. Please try again.");
        } finally {
            setLoadingShared(false);
        }
    };

    const handleOpenShareModal = (quiz) => {
        setQuizToShare(quiz);
        setShareModalOpen(true);
    };

    const handleCloseShareModal = () => {
        setQuizToShare(null);
        setShareModalOpen(false);
    };

    if (!user && !loading) {
        return <Typography sx={{ textAlign: 'center', mt: 3 }}>Please log in to see the quizzes you've created.</Typography>;
    }
    // Combined loading state for initial page load
    if (loading || loadingShared) return <Typography sx={{ textAlign: 'center', mt: 3 }}>Loading quizzes...</Typography>;

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
                My Created Quizzes
            </Typography>
            {error && <Typography color="error" sx={{ textAlign: 'center', mt: 2, mb: 2 }} className="error-text">{error}</Typography>}
            {myQuizzes.length === 0 && !loading && !error && (
                <Typography sx={{ textAlign: 'center', mt: 2 }}>
                    You haven't created any quizzes yet. <Link to="/quiz" style={{ color: 'inherit' }}>Create one now!</Link>
                </Typography>
            )}
            {myQuizzes.length > 0 && (
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
                    <Table className="quizzes-table" aria-label="My Quizzes Table"> {/* Use Table */}
                        <TableHead sx={{ [theme.breakpoints.down('sm')]: { display: 'none' } }}> {/* Hide headers on mobile */}
                            <TableRow className="quizzes-table-header-row"> {/* Use TableRow */}
                                <TableCell>Title</TableCell> {/* Use TableCell */}
                                <TableCell>Number of Songs</TableCell>
                                <TableCell>Created At</TableCell>
                                <TableCell>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody> {/* Use TableBody */}
                            {myQuizzes.map(quiz => (
                                <React.Fragment key={quiz.id}>
                                    <TableRow
                                        className="quizzes-table-data-row"
                                        key={quiz.id}
                                        sx={{
                                            [theme.breakpoints.down('sm')]: {
                                                display: 'block',
                                                marginBottom: theme.spacing(2),
                                                border: `1px solid ${theme.palette.divider}`,
                                                backgroundColor: theme.palette.background.paper,
                                                borderRadius: theme.shape.borderRadius,
                                                '&:hover': {
                                                    backgroundColor: theme.palette.background.paper, // Or a subtle mobile hover
                                                },
                                                '&:nth-of-type(even)': {
                                                    backgroundColor: theme.palette.background.paper, // Or consistent card background
                                                }
                                            },
                                        }}
                                    >
                                        <TableCell data-label="Title" sx={mobileCardCellStyle(theme)}>{quiz.title}</TableCell>
                                        <TableCell data-label="Songs" sx={mobileCardCellStyle(theme)}>{quiz.amount}</TableCell>
                                        <TableCell data-label="Created" sx={mobileCardCellStyle(theme)}>{quiz.createdAt ? format(quiz.createdAt, 'yyyy-MM-dd HH:mm') : 'N/A'}</TableCell>
                                        <TableCell data-label="Actions" sx={{ ...mobileCardCellStyle(theme), [theme.breakpoints.down('sm')]: { textAlign: 'left', paddingLeft: theme.spacing(2), '& button': { marginRight: theme.spacing(1), marginBottom: theme.spacing(1) } } }}>
                                            <Button
                                                className="view-action-button"
                                                variant="outlined"
                                                color="primary"
                                                to={`/my-quizzes/${quiz.id}`}
                                                startIcon={<MediaBluetoothOnIcon />}
                                                component={Link}
                                                sx={{ mr: { sm: 1 } }} // Add margin-right on small screens and up
                                            >
                                                Host
                                            </Button>
                                            <Button className="view-action-button" variant="outlined" color="primary" to={`/edit-quiz/${quiz.id}`} startIcon={<EditIcon />} component={Link}>
                                                Edit
                                            </Button>
                                            <Button
                                                className="view-action-button"
                                                variant="outlined"
                                                color="secondary" // Or your preferred color
                                                onClick={() => handleOpenShareModal(quiz)}
                                                startIcon={<ShareIcon />}
                                                sx={{ ml: { sm: 1 } }} // Add margin-left on small screens and up
                                            >Share</Button>
                                        </TableCell>
                                    </TableRow>
                                </React.Fragment>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
            {quizToShare && (
                <ShareQuizModal
                    open={shareModalOpen}
                    onClose={handleCloseShareModal}
                    quiz={quizToShare}
                />
            )}

            {/* Quizzes Shared With Me Section */}
            <Typography variant="h4" component="h2" gutterBottom align="center" sx={{ mt: 5, mb: 2 }}>
                Quizzes Shared With Me
            </Typography>
            {errorShared && <Typography color="error" sx={{ textAlign: 'center', mt: 2, mb: 2 }} className="error-text">{errorShared}</Typography>}
            {sharedQuizzes.length === 0 && !loadingShared && !errorShared && (
                <Typography sx={{ textAlign: 'center', mt: 2 }}>
                    No quizzes have been shared with you yet.
                </Typography>
            )}
            {sharedQuizzes.length > 0 && (
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
                    <Table className="quizzes-table" aria-label="Shared Quizzes Table">
                        <TableHead sx={{ [theme.breakpoints.down('sm')]: { display: 'none' } }}>
                            <TableRow className="quizzes-table-header-row">
                                <TableCell>Title</TableCell>
                                <TableCell>Number of Songs</TableCell>
                                <TableCell>Created By</TableCell> {/* Show who created/shared it */}
                                <TableCell>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {sharedQuizzes.map(quiz => (
                                <TableRow
                                    className="quizzes-table-data-row"
                                    key={quiz.id}
                                    sx={{
                                        [theme.breakpoints.down('sm')]: {
                                            display: 'block',
                                            marginBottom: theme.spacing(2),
                                            border: `1px solid ${theme.palette.divider}`,
                                            backgroundColor: theme.palette.background.paper,
                                            borderRadius: theme.shape.borderRadius,
                                            '&:hover': { backgroundColor: theme.palette.background.paper },
                                            '&:nth-of-type(even)': { backgroundColor: theme.palette.background.paper }
                                        },
                                    }}
                                >
                                    <TableCell data-label="Title" sx={mobileCardCellStyle(theme)}>{quiz.title}</TableCell>
                                    <TableCell data-label="Songs" sx={mobileCardCellStyle(theme)}>{quiz.amount}</TableCell>
                                    <TableCell data-label="Created By" sx={mobileCardCellStyle(theme)}>{quiz.creatorName || 'Unknown'}</TableCell>
                                    <TableCell data-label="Actions" sx={{ ...mobileCardCellStyle(theme), [theme.breakpoints.down('sm')]: { textAlign: 'left', paddingLeft: theme.spacing(2), '& button': { marginRight: theme.spacing(1), marginBottom: theme.spacing(1) } } }}>
                                        <Button className="view-action-button" variant="outlined" color="primary" to={`/answer-quiz/${quiz.id}`} startIcon={<MediaBluetoothOnIcon />} component={Link}>
                                            Answer
                                        </Button>
                                        {/* You might add a "View Details" button here too if needed */}
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

// Helper function for mobile cell styles (copied from Quizzes.js)
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
            top: '50%', // Vertically center the label
            transform: 'translateY(-50%)',
            width: `calc(50% - ${theme.spacing(4)})`, // Adjust width considering padding
            whiteSpace: 'nowrap',
            textAlign: 'left',
            fontWeight: 'bold', // Keep it bold
            color: theme.palette.primary.main, // Change to primary color (orange)
        },
    },
});
export default MyQuizzes;