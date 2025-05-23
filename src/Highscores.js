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

const Highscores = () => {
    // const [highscores, setHighscores] = useState([]); // Old state
    const [userStats, setUserStats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

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
                            userName: answer.answerCreatorName || 'Anonymous',
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
                setError("Failed to load highscores. Please try again.");
            } finally {
                setLoading(false);
            }
        };

        fetchHighscores();
    }, []);

    if (loading) return <Typography sx={{ textAlign: 'center', mt: 3 }}>Loading user stats... <CircularProgress size={20} /></Typography>;
    if (error) return <Typography color="error" sx={{ textAlign: 'center', mt: 3 }} className="error-text">{error}</Typography>;

    return (
        <div className="quiz-container"> {/* Re-using quiz-container for consistent page styling */}
            <Typography variant="h4" component="h1" gutterBottom align="center" sx={{ mb: 3 }}>
                User Leaderboard
            </Typography>

            {userStats.length === 0 && !loading && (
                <Typography sx={{ textAlign: 'center', mt: 3 }}>No user statistics available yet.</Typography>
            )}

            {userStats.length > 0 && (
                <TableContainer component={Paper} className="table-responsive-wrapper"> {/* Use TableContainer and Paper */}
                    <Table className="quizzes-table user-stats-table" aria-label="User Statistics Table"> {/* Use Table */}
                        <TableHead> {/* Use TableHead */}
                            <TableRow className="quizzes-table-header-row"> {/* Use TableRow */}
                                <TableCell>Rank</TableCell>
                                <TableCell>Player</TableCell> {/* Use TableCell */}
                                <TableCell >Quizzes Answered</TableCell>
                                <TableCell >Overall Accuracy</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody> {/* Use TableBody */}
                            {userStats.map((stat, index) => (
                                <TableRow className="quizzes-table-data-row" key={stat.userId}> {/* Use TableRow */}
                                    <TableCell data-label="Rank">{index + 1}</TableCell>
                                    <TableCell data-label="Player">{stat.userName}</TableCell> {/* Use TableCell and keep data-label */}
                                    <TableCell data-label="Quizzes Answered" >{stat.quizzesAnsweredCount}</TableCell>
                                    <TableCell data-label="Overall Accuracy" >
                                        {stat.overallPercentage.toFixed(2)}%
                                        <Typography variant="caption" display="block" sx={{ color: 'text.secondary' }}>({stat.totalCorrectAnswers}/{stat.totalPossibleAnswers} correct)</Typography>
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

export default Highscores;