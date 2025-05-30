import React, { useState, useEffect } from 'react';
import { db, auth } from './firebase';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import EditIcon from '@mui/icons-material/Edit';
import GradingIcon from '@mui/icons-material/Grading';
import { Button } from '@mui/material';
import { Link } from 'react-router-dom'; // Import Link
import { format } from 'date-fns';
import Box from '@mui/material/Box'; // Import Box
import Typography from '@mui/material/Typography'; // Import Typography
import { useTranslation } from 'react-i18next'; // Import useTranslation
import CustomTable from './components/CustomTable';

const MyAnswers = () => {
  const [user, setUser] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { t } = useTranslation(); // Initialize useTranslation

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

  const headers = [{ value: t('common.title') }, { value: t('common.score') }, { value: t('common.created') }, { value: t('common.team') }, { value: t('common.status') }]; // Define the headers for the web table
  const rows = data => {
    return (
      data &&
      data.map((d) => {
        const team = getTeamDisplayString(d);
        const score = `${d.score}/${d.answers && d.answers.length}`;
        const status = d.isCompleted ? t('answerDetailsPage.statusCompleted') : d.isChecked ? t('answerDetailsPage.statusReadyForReview') : t('answerDetailsPage.statusInProgress');
        return [{ value: d.quizTitle }, { value: score }, { value: d.submittedAt ? format(d.submittedAt, 'dd.MM.yyyy HH:mm') : 'N/A' }, { value: team }, { value: status }];
      })
    ); 
  }; // Define the rows for the table
  const actions = answer => {
    return (
      (answer.isChecked && (
        <Button variant="outlined" to={`/my-answers/${answer.id}`} startIcon={<GradingIcon />} component={Link}>
          {answer.isCompleted ? t('common.details') : t('common.review')}
        </Button>
      )) ||
      (!answer.isChecked && user && answer.answerCreatorId === user.uid && (
        <Button variant="outlined" to={`/edit-answer/${answer.id}`} startIcon={<EditIcon />} component={Link}>
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
      {answers.length > 0 && <CustomTable headers={headers} rows={rows(answers)} data={answers} actions={actions} />}
    </Box>
  );
};

export default MyAnswers;
