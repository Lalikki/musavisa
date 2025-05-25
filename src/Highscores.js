import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, query, where, getDocs } from 'firebase/firestore'; // Added where
import { format } from 'date-fns';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import Box from '@mui/material/Box';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper'; // Often used with TableContainer
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import { useTheme } from '@mui/material/styles'; // Import useTheme
import { useTranslation } from 'react-i18next'; // Import useTranslation

const Highscores = () => {
    // const [highscores, setHighscores] = useState([]); // Old state
    const [userStats, setUserStats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const theme = useTheme(); // Get the theme object
    const { t } = useTranslation(); // Initialize useTranslation

    useEffect(() => {
        const fetchHighscores = async () => {
            setLoading(true);
            setError(null);
            try {
                // Fetch all completed quiz answers
                const answersQuery = query(
                    collection(db, "quizAnswers"),
                    where("isCompleted", "==", true) // Consider only completed and scored answers
                );
                const querySnapshot = await getDocs(answersQuery);
                const completedAnswers = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    submittedAt: doc.data().submittedAt ? doc.data().submittedAt.toDate() : null,
                }));

                // Process answers to calculate user stats
                const stats = {}; // Temporary object to hold stats by userId

                completedAnswers.forEach(answer => {
                    const userId = answer.answerCreatorId;
                    if (!userId) return; // Skip if no user ID

                    if (!stats[userId]) {
                        stats[userId] = {
                            userName: answer.answerCreatorName || t('common.unnamedUser', 'Anonymous'),
                            quizzesAnsweredCount: 0,
                            totalCorrectAnswers: 0,
                            totalPossibleAnswers: 0,
                        };
                    }

                    stats[userId].quizzesAnsweredCount += 1;
                    stats[userId].totalCorrectAnswers += answer.score;
                    // Assuming each question is 1 point, and answer.answers.length is the number of questions
                    stats[userId].totalPossibleAnswers += answer.answers ? answer.answers.length * 1 : 0;
                });

                // Convert stats object to an array and calculate percentages
                const statsArray = Object.entries(stats).map(([userId, data]) => ({
                    userId,
                    ...data,
                    overallPercentage: data.totalPossibleAnswers > 0
                        ? (data.totalCorrectAnswers / data.totalPossibleAnswers) * 100
                        : 0,
                }));

                // Sort by overall percentage descending, then by quizzes answered
                statsArray.sort((a, b) => b.overallPercentage - a.overallPercentage || b.quizzesAnsweredCount - a.quizzesAnsweredCount);

                setUserStats(statsArray);
            } catch (err) {
                console.error("Error fetching highscores:", err);
                setError(t('highscoresPage.loadingError'));
            } finally {
                setLoading(false);
            }
        };

        fetchHighscores();
    }, [t]); // Added t to dependency array as it's used in useEffect

    if (loading) return <Typography sx={{ textAlign: 'center', mt: 3 }}>{t('common.loading')} <CircularProgress size={20} /></Typography>;
    if (error) return <Typography color="error" sx={{ textAlign: 'center', mt: 3 }} className="error-text">{error || t('common.error')}</Typography>;

    return (
        <Box
            className="quiz-container" // Keep class if any global styles still apply
            sx={{
                maxWidth: '900px', // Consistent max-width
                margin: '0 auto',  // Center the content
                padding: { xs: 2, sm: 3 }, // Responsive padding
            }}
        >
            <Typography variant="h4" component="h1" gutterBottom align="center" sx={{ mb: 3 }}>
                {t('highscoresPage.userLeaderboardTitle')}
            </Typography>

            {userStats.length === 0 && !loading && (
                <Typography sx={{ textAlign: 'center', mt: 3 }}>{t('highscoresPage.noHighscores')}</Typography>
            )}

            {userStats.length > 0 && (
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
                    <Table className="quizzes-table user-stats-table" aria-label="User Statistics Table"> {/* Use Table */}
                        <TableHead sx={{ [theme.breakpoints.down('sm')]: { display: 'none' } }}> {/* Hide headers on mobile */}
                            <TableRow className="quizzes-table-header-row"> {/* Use TableRow */}
                                <TableCell>{t('common.rank')}</TableCell>
                                <TableCell>{t('common.player')}</TableCell>
                                <TableCell align="right">{t('highscoresPage.quizzesAnswered')}</TableCell>
                                <TableCell align="right">{t('highscoresPage.overallAccuracy')}</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody> {/* Use TableBody */}
                            {userStats.map((stat, index) => (
                                <TableRow
                                    className="quizzes-table-data-row"
                                    key={stat.userId}
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
                                    <TableCell data-label={t('common.rank')} sx={mobileCardCellStyle(theme)}>{index + 1}</TableCell>
                                    <TableCell data-label={t('common.player')} sx={mobileCardCellStyle(theme)}>{stat.userName}</TableCell>
                                    <TableCell data-label={t('highscoresPage.quizzesAnswered')} sx={{ ...mobileCardCellStyle(theme), [theme.breakpoints.up('sm')]: { textAlign: 'right' } }}>
                                        {stat.quizzesAnsweredCount}
                                    </TableCell>
                                    <TableCell data-label={t('highscoresPage.overallAccuracy')} sx={{ ...mobileCardCellStyle(theme), [theme.breakpoints.up('sm')]: { textAlign: 'right' } }}>
                                        {stat.overallPercentage.toFixed(2)}%
                                        <Typography variant="caption" display="block" sx={{ color: 'text.secondary' }}>({stat.totalCorrectAnswers}/{stat.totalPossibleAnswers} {t('highscoresPage.correctAnswers')})</Typography>
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

// Helper function for mobile cell styles
const mobileCardCellStyle = (theme) => ({
    [theme.breakpoints.down('sm')]: {
        display: 'block',
        textAlign: 'right', // Default for value, label will be on left
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

export default Highscores;