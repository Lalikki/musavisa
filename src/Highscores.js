import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, query, where, getDocs } from 'firebase/firestore'; // Added where
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import { useTranslation } from 'react-i18next'; // Import useTranslation
import CustomTable from './components/CustomTable';

const Highscores = () => {
  // const [highscores, setHighscores] = useState([]); // Old state
  const [userStats, setUserStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { t } = useTranslation(); // Initialize useTranslation

  const headers = [{ value: t('common.rank') }, { value: t('common.player') }, { value: t('highscoresPage.quizzesAnswered') }, { value: t('highscoresPage.overallAccuracy'), align: 'right' }]; // Define the headers for the web table
  const rows = data => {
    return (
      data &&
      data.map((d, index) => {
        const rank = ++index;
        const overallPercentage = d.overallPercentage ? `${d.overallPercentage.toFixed(2)}%` : '0%'; // Format percentage
        const overallPercentageSubText = `${d.totalCorrectAnswers}/${d.totalPossibleAnswers} ${t('highscoresPage.correctAnswers')}`;
        return [{ value: rank }, { value: d.userName }, { value: d.quizzesAnsweredCount }, { value: overallPercentage, subValue: overallPercentageSubText, align: 'right' }];
      })
    ); // Define the rows for the web table
  };

  useEffect(() => {
    const fetchHighscores = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch all completed quiz answers
        const answersQuery = query(
          collection(db, 'quizAnswers'),
          where('isCompleted', '==', true) // Consider only completed and scored answers
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
          overallPercentage: data.totalPossibleAnswers > 0 ? (data.totalCorrectAnswers / data.totalPossibleAnswers) * 100 : 0,
        }));

        // Sort by overall percentage descending, then by quizzes answered
        statsArray.sort((a, b) => b.overallPercentage - a.overallPercentage || b.quizzesAnsweredCount - a.quizzesAnsweredCount);

        setUserStats(statsArray);
      } catch (err) {
        console.error('Error fetching highscores:', err);
        setError(t('highscoresPage.loadingError'));
      } finally {
        setLoading(false);
      }
    };

    fetchHighscores();
  }, [t]); // Added t to dependency array as it's used in useEffect

  if (loading)
    return (
      <Typography sx={{ textAlign: 'center', mt: 3 }}>
        {t('common.loading')} <CircularProgress size={20} />
      </Typography>
    );
  if (error)
    return (
      <Typography color="error" sx={{ textAlign: 'center', mt: 3 }} className="error-text">
        {error || t('common.error')}
      </Typography>
    );

  return (
    <Box
      sx={{
        maxWidth: '900px', // Consistent max-width
        margin: '0 auto', // Center the content
        padding: { xs: 2, sm: 3 }, // Responsive padding
      }}
    >
      <Typography variant="h4" component="h1" gutterBottom align="center" sx={{ mb: 3 }}>
        {t('highscoresPage.userLeaderboardTitle')}
      </Typography>
      {userStats.length === 0 && !loading && <Typography sx={{ textAlign: 'center', mt: 3 }}>{t('highscoresPage.noHighscores')}</Typography>}
      {userStats.length > 0 && <CustomTable headers={headers} rows={rows(userStats)} data={userStats} />}
    </Box>
  );
};

export default Highscores;
