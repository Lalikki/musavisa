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
import Box from '@mui/material/Box'; // Import Box
import Typography from '@mui/material/Typography'; // Import Typography
import AddCircleIcon from '@mui/icons-material/AddCircle';
import IconButton from '@mui/material/IconButton';
import { useTheme } from '@mui/material/styles'; // Import useTheme
import { Button } from "@mui/material";
import { format } from 'date-fns'; // Import date-fns for formatting dates
import { Link } from "react-router-dom"; // Optional: if you want to link to individual quizzes later
import { useTranslation } from 'react-i18next'; // Import useTranslation

const Quizzes = () => {
    const [quizzes, setQuizzes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const theme = useTheme(); // Get the theme object
    const { t } = useTranslation(); // Initialize the t function

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
                setError(t('allQuizzesPage.loadingError')); // Use translated error message
            } finally {
                setLoading(false);
            }
        };

        fetchQuizzes();
    }, []);

    return (
        <Box
            className="my-quizzes-container" // You can keep this if you have specific global styles not yet migrated
            sx={{
                maxWidth: '900px', // Or your preferred max-width, consistent with other pages
                margin: '0 auto',  // Center the content
                padding: { xs: 2, sm: 3 }, // Responsive padding (16px on xs, 24px on sm and up)
                // The background color will come from theme.palette.background.default via CssBaseline
            }}
        >
            <Typography variant="h4" component="h1" gutterBottom align="center">
                {t('allQuizzesPage.allQuizzesTitle')}
            </Typography>
            {loading && <Typography sx={{ textAlign: 'center', mt: 2 }}>{t('common.loading')}</Typography>}
            {error && <Typography color="error" sx={{ textAlign: 'center', mt: 2 }} className="error-text">{error}</Typography>}
            {!loading && !error && quizzes.length === 0 && <Typography sx={{ textAlign: 'center', mt: 2 }}>{t('allQuizzesPage.noReadyQuizzes')}</Typography>}
            {!loading && !error && quizzes.length > 0 && (
                <TableContainer
                    component={Paper}
                    className="table-responsive-wrapper"
                    sx={{
                        // On mobile, prevent the container itself from scrolling horizontally
                        // if the table content reflows properly.
                        [theme.breakpoints.down('sm')]: {
                            // Make the TableContainer's Paper background transparent on mobile
                            // so the margin between cards shows the page background.
                            backgroundColor: 'transparent',
                            boxShadow: 'none', // Remove shadow if Paper is transparent
                            overflowX: 'visible',
                        },
                    }}
                >
                    <Table className="quizzes-table" aria-label="All Quizzes Table"> {/* Use Table */}
                        <TableHead sx={{ [theme.breakpoints.down('sm')]: { display: 'none' } }}> {/* Hide headers on mobile */}
                            <TableRow className="quizzes-table-header-row">
                                <TableCell>{t('common.title')}</TableCell>
                                <TableCell>{t('common.numSongs')}</TableCell>
                                <TableCell>{t('common.created')}</TableCell>
                                <TableCell>{t('common.by')}</TableCell>
                                <TableCell>{t('common.actions')}</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {quizzes.map(quiz => (
                                <TableRow
                                    className="quizzes-table-data-row"
                                    key={quiz.id}
                                    sx={{
                                        [theme.breakpoints.down('sm')]: {
                                            display: 'block',
                                            marginBottom: theme.spacing(2),
                                            border: `1px solid ${theme.palette.divider}`,
                                            // Apply the 'paper' background to each card on mobile
                                            backgroundColor: theme.palette.background.paper,
                                            borderRadius: theme.shape.borderRadius,
                                            // Override hover/even styles from App.css for mobile card view if needed
                                            '&:hover': {
                                                backgroundColor: 'transparent', // Or a subtle mobile hover
                                            },
                                            '&:nth-of-type(even)': {
                                                backgroundColor: 'transparent', // Or consistent card background
                                            }
                                        },
                                    }}
                                >
                                    <TableCell data-label={t('common.title')} sx={mobileCardCellStyle(theme)}>{quiz.title}</TableCell>
                                    <TableCell data-label={t('common.songs')} sx={mobileCardCellStyle(theme)}>{quiz.amount}</TableCell>
                                    <TableCell data-label={t('common.created')} sx={mobileCardCellStyle(theme)}>{quiz.createdAt ? format(quiz.createdAt, 'yyyy-MM-dd HH:mm') : 'N/A'}</TableCell>
                                    <TableCell data-label={t('common.by')} sx={mobileCardCellStyle(theme)}>{quiz.creatorName || t('common.unnamedUser', 'Unknown')}</TableCell> {/* Added default for unnamed user */}
                                    <TableCell data-label={t('common.actions')} sx={{ ...mobileCardCellStyle(theme), [theme.breakpoints.down('sm')]: { textAlign: 'left', paddingLeft: theme.spacing(2) } }}>
                                        <Button className="view-action-button" variant="outlined" color="primary" to={`/answer-quiz/${quiz.id}`} startIcon={<AddCircleIcon />} component={Link}>{t('myQuizzesPage.answerAction')}</Button>
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

// Helper function for mobile cell styles to keep sx prop cleaner
const mobileCardCellStyle = (theme) => ({ // No direct translation needed here, but its `data-label` usage is translated above
    [theme.breakpoints.down('sm')]: {
        display: 'block',
        textAlign: 'right',
        fontSize: '0.875rem', // Adjust font size for mobile if needed
        paddingLeft: '50%', // Make space for the label
        position: 'relative',
        borderBottom: `1px solid ${theme.palette.divider}`,
        '&:last-of-type': { // Changed from :last-child to :last-of-type for reliability with TableCell
            borderBottom: 0,
        },
        '&::before': {
            content: 'attr(data-label)',
            position: 'absolute',
            left: theme.spacing(2),
            top: '50%',
            transform: 'translateY(-50%)',
            width: 'calc(50% - ${theme.spacing(4)})', // Adjust width considering padding
            whiteSpace: 'nowrap',
            textAlign: 'left',
            fontWeight: 'bold',
            color: theme.palette.text.secondary,
        },
    },
});

export default Quizzes;
