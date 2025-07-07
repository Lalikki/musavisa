import React, { useState, useEffect } from 'react';
import { db, auth } from './firebase'; // Import your Firestore instance and auth
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth'; // Import onAuthStateChanged
import Box from '@mui/material/Box'; // Import Box
import Typography from '@mui/material/Typography'; // Import Typography
import AddCircleIcon from '@mui/icons-material/AddCircle';
import TextField from '@mui/material/TextField'; // Import TextField
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
  const [currentUser, setCurrentUser] = useState(null); // State to hold the current user
  const [searchTerm, setSearchTerm] = useState(''); // State for the search term
  const { t } = useTranslation(); // Initialize the t function

  const headers = [{ value: t('common.title') }, { value: t('common.rating', 'Rating'), align: 'center' }, { value: t('common.numSongs'), align: 'center' }, { value: t('common.created') }, { value: t('common.by') }];

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
          {
            // Rating cell
            // Align items to the start (left) of the column
            value: <Rating name={`quiz-avg-rating-${d.id}`} value={normalizedRating} precision={0.1} max={1} size="medium" readOnly />,
            align: 'center',
            subValue: `${averageRatingValue.toFixed(1)}/5`,
            subAlign: 'center', // Align subValue to the left
          },
          { value: d.amount, align: 'center' }, // Assuming 'amount' is the number of songs
          { value: createdAt },
          { value: createdBy },
        ];
      })
    );
  }; // Define the rows for the table
  const actions = quiz => {
    // Only show the Answer button if a user is logged in
    if (currentUser) {
      return (
        <Button variant="outlined" to={`/answer-quiz/${quiz.id}`} startIcon={<AddCircleIcon />} component={Link}>
          {t('myQuizzesPage.answerAction')}
        </Button>
      );
    }
    return null; // Return null if no user is logged in, so no button is rendered
  };

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
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
    return () => {
      unsubscribeAuth(); // Cleanup the auth subscription
    };
  }, [t]); // t is a dependency for error messages, keep it. currentUser is not needed as a direct dependency for fetchQuizzes.

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  const filteredQuizzes = quizzes.filter(quiz => {
    const term = searchTerm.toLowerCase();
    const titleMatch = quiz.title.toLowerCase().includes(term);
    const creatorNameMatch = quiz.creatorName && quiz.creatorName.toLowerCase().includes(term);
    return titleMatch || creatorNameMatch;
  });
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

      <TextField
        fullWidth
        label={t('allQuizzesPage.searchPlaceholder', 'Search by title or creator...')}
        variant="outlined"
        value={searchTerm}
        onChange={handleSearchChange}
        sx={{ mb: 3, mt: 1 }} // Add some margin
        className="quizzes-search-bar"
      />

      {loading && <Typography sx={{ textAlign: 'center', mt: 2 }}>{t('common.loading')}</Typography>}
      {error && (
        <Typography color="error" sx={{ textAlign: 'center', mt: 2 }} className="error-text">
          {error}
        </Typography>
      )}
      {!loading && !error && (
        <>
          {quizzes.length === 0 ? (
            <Typography sx={{ textAlign: 'center', mt: 2 }}>{t('allQuizzesPage.noReadyQuizzes')}</Typography>
          ) : filteredQuizzes.length === 0 ? (
            <Typography sx={{ textAlign: 'center', mt: 2 }}>{t('allQuizzesPage.noQuizzesMatchSearch', `No quizzes found matching "${searchTerm}"`)}</Typography>
          ) : (
            <CustomTable headers={headers} rows={rows(filteredQuizzes)} data={filteredQuizzes} actions={actions} />
          )}
        </>
      )}
    </Box>
  );
};

export default Quizzes;
