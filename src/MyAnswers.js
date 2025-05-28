import React, { useState, useEffect } from 'react';
import { db, auth } from './firebase';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import EditIcon from '@mui/icons-material/Edit';
import GradingIcon from '@mui/icons-material/Grading';
import { Button, useMediaQuery } from '@mui/material';
import { Link } from 'react-router-dom'; // Import Link
import { format } from 'date-fns';
import { useTheme } from '@mui/material/styles'; // Import useTheme
import Box from '@mui/material/Box'; // Import Box
import Typography from '@mui/material/Typography'; // Import Typography
import { useTranslation } from 'react-i18next'; // Import useTranslation
import TableWeb from './components/TableWeb';
import TableMobile from './components/TableMobile';

const MyAnswers = () => {
  const [user, setUser] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const theme = useTheme(); // Get the theme object
  const { t } = useTranslation(); // Initialize useTranslation
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const getTeamDisplayString = answer => {
    if (!answer.teamSize || answer.teamSize <= 1) {
      return answer.answerCreatorName || t('answerQuizPage.player'); // Or a more specific "Solo" if needed
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
  const headers = [t('common.title'), t('common.score'), t('common.created'), t('common.team'), t('common.status')]; // Define the headers for the web table
  const rows = data => {
    if (!Array.isArray(data)) return getRowData(data); // Ensure data is an array
    return data && data.map(answer => getRowData(answer)); // Define the rows for the web table
  };
  const getRowData = data => {
    if (!data || typeof data !== 'object') return ['N/A', 'N/A', 'N/A', 'N/A', 'N/A']; // Handle case where data is not an object
    const team = getTeamDisplayString(data); // Get team display string
    const score = `${data.score}/${data.answers && data.answers.length}`;
    const status = data.isCompleted ? t('answerDetailsPage.statusCompleted') : data.isChecked ? t('answerDetailsPage.statusReadyForReview') : t('answerDetailsPage.statusInProgress');
    return [data.quizTitle, score, data.submittedAt ? format(data.submittedAt, 'dd.MM.yyyy HH:mm') : 'N/A', team, status];
  };

  const quizActions = answer => {
    return (
      (answer.isChecked && (
        <Button className="view-action-button" variant="outlined" color="primary" to={`/my-answers/${answer.id}`} startIcon={<GradingIcon />} component={Link}>
          {answer.isCompleted ? t('common.details') : t('common.review')}
        </Button>
      )) ||
      (!answer.isChecked && user && answer.answerCreatorId === user.uid && (
        <Button className="view-action-button" variant="outlined" color="primary" to={`/edit-answer/${answer.id}`} startIcon={<EditIcon />} component={Link}>
          {t('common.edit')}
        </Button>
      ))
    );
  };
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, currentUser => {
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

  const fetchUserAnswers = async uid => {
    setLoading(true);
    setError(null);
    try {
      const answersCollectionRef = collection(db, 'quizAnswers');
      const q = query(answersCollectionRef, where('answerCreatorId', '==', uid), orderBy('submittedAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const userAnswersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        submittedAt: doc.data().submittedAt ? doc.data().submittedAt.toDate() : null,
      }));
      setAnswers(userAnswersData);
    } catch (err) {
      console.error('Error fetching user answers:', err);
      setError(t('myAnswersPage.loadingError'));
    } finally {
      setLoading(false);
    }
  };
  const actions = answer => {
    return (
      <>
        {answer.isChecked && (
          <Button variant="outlined" to={`/my-answers/${answer.id}`} startIcon={<GradingIcon />} component={Link}>
            {answer.isCompleted ? t('common.details') : t('common.review')}
          </Button>
        )}
        {/* Show edit link only if not checked and user is the creator */}
        {!answer.isChecked && user && answer.answerCreatorId === user.uid && (
          <Button variant="outlined" to={`/edit-answer/${answer.id}`} startIcon={<EditIcon />} component={Link}>
            {t('common.edit')}
          </Button>
        )}
      </>
    );
  };

  if (!user && !loading) {
    return <Typography sx={{ textAlign: 'center', mt: 3 }}>{t('common.pleaseLogin')}</Typography>;
  }
  if (loading) return <Typography sx={{ textAlign: 'center', mt: 3 }}>{t('common.loading')}</Typography>;
  if (error)
    return (
      <Typography color="error" sx={{ textAlign: 'center', mt: 3 }} className="error-text">
        {error || t('common.error')}
      </Typography>
    );

  return (
    <Box
      className="my-quizzes-container" // Keep class if any global styles still apply
      sx={{
        maxWidth: '900px', // Consistent max-width
        margin: '0 auto', // Center the content
        padding: { xs: 2, sm: 3 }, // Responsive padding
      }}
    >
      <Typography variant="h4" component="h1" gutterBottom align="center">
        {t('myAnswersPage.mySubmittedAnswersTitle')}
      </Typography>
      {answers.length === 0 && !loading && <Typography sx={{ textAlign: 'center', mt: 2 }}>{t('myAnswersPage.noAnswersSubmitted')}</Typography>}
      {(answers.length > 0 && !isMobile && <TableWeb headers={headers} rows={rows(answers)} data={answers} actions={actions} />) ||
        (isMobile && answers.map(answer => <TableMobile headers={headers} rows={rows(answer)} data={answer} actions={quizActions} />))}
    </Box>
  );
};

export default MyAnswers;
