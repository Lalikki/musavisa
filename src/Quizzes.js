import React, { useState, useEffect } from 'react';
import { db } from './firebase'; // Import your Firestore instance
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import Box from '@mui/material/Box'; // Import Box
import Typography from '@mui/material/Typography'; // Import Typography
import AddCircleIcon from '@mui/icons-material/AddCircle';
import { Button } from '@mui/material';
import { format } from 'date-fns'; // Import date-fns for formatting dates
import { Link } from 'react-router-dom'; // Optional: if you want to link to individual quizzes later
import { useTranslation } from 'react-i18next'; // Import useTranslation
import Rating from '@mui/material/Rating'; // Import Rating component
import CustomTable from './components/CustomTable';

const Quizzes = () => {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { t } = useTranslation(); // Initialize the t function

  const headers = [
    { value: t('common.title') },
    { value: t('common.rating', 'Rating'), },
    { value: t('common.numSongs') },
    { value: t('common.created') },
    { value: t('common.by') }
  ];

  const rows = data => {
    return (
      data &&
      data.map(d => {
        const createdAt = d.createdAt ? format(d.createdAt, 'dd.MM.yyyy') : 'N/A';
        const createdBy = d.creatorName || t('common.unnamedUser', 'Unknown'); // Default to 'Unknown' if creatorName is not available
        const averageRatingValue = d.averageRating || 0; // Get averageRating, default to 0
        // Normalize the 0-5 rating to a 0-1 scale for a single star display
        const normalizedRating = averageRatingValue / 5;

        return [
          { value: d.title },
          { // Rating cell
            value: ( // Align items to the start (left) of the column
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <Rating name={`quiz-avg-rating-${d.id}`} value={normalizedRating} precision={0.1} max={1} size="medium" readOnly />
                <Typography variant="caption" sx={{ mt: 0.5 }}>{`${averageRatingValue.toFixed(1)}/5`}</Typography>
              </Box>
            ),
            align: 'center'
          },
          { value: d.amount },
          { value: createdAt },
          { value: createdBy }
        ];
      })
    );
  }; // Define the rows for the table
  const actions = quiz => {
    return (
      <Button variant="outlined" to={`/answer-quiz/${quiz.id}`} startIcon={<AddCircleIcon />} component={Link}>
        {t('myQuizzesPage.answerAction')}
      </Button>
    );
  };

  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        setLoading(true);
        setError(null);
        const quizzesCollectionRef = collection(db, 'quizzes');
        // Filter for ready quizzes and order by creation date
        const q = query(
          quizzesCollectionRef,
          where('isReady', '==', true), // Only fetch quizzes where isReady is true
          orderBy('createdAt', 'desc')
        );
        const querySnapshot = await getDocs(q);
        const quizzesData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt ? doc.data().createdAt.toDate() : null,
          // creatorName should be directly available from the document data
        }));
        setQuizzes(quizzesData);
      } catch (err) {
        console.error('Error fetching quizzes:', err);
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
        margin: '0 auto', // Center the content
        padding: { xs: 2, sm: 3 }, // Responsive padding (16px on xs, 24px on sm and up)
        // The background color will come from theme.palette.background.default via CssBaseline
      }}
    >
      <Typography variant="h4" component="h1" gutterBottom align="center">
        {t('allQuizzesPage.allQuizzesTitle')}
      </Typography>
      {loading && <Typography sx={{ textAlign: 'center', mt: 2 }}>{t('common.loading')}</Typography>}
      {error && (
        <Typography color="error" sx={{ textAlign: 'center', mt: 2 }} className="error-text">
          {error}
        </Typography>
      )}
      {!loading && !error && quizzes.length === 0 && <Typography sx={{ textAlign: 'center', mt: 2 }}>{t('allQuizzesPage.noReadyQuizzes')}</Typography>}
      {!loading && !error && quizzes.length > 0 && <CustomTable headers={headers} rows={rows(quizzes)} data={quizzes} actions={actions} />}
    </Box>
  );
};

export default Quizzes;
