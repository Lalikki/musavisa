import React, { useState, useEffect } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom'; // Renamed Link to RouterLink
import { db } from './firebase';
import { doc, getDoc, collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { format } from 'date-fns';
import { Typography, Button, Box, Paper, List, CircularProgress, useMediaQuery } from '@mui/material';
import MusicPlayer from './components/MusicPlayer';
import { useTheme } from '@mui/material/styles'; // Import useTheme
import { useTranslation } from 'react-i18next'; // Import useTranslation
import TableWeb from './components/TableWeb';
import TableMobile from './components/TableMobile';

const QuizDetails = () => {
  const { quizId } = useParams();
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [answersLoading, setAnswersLoading] = useState(true);
  const [answersError, setAnswersError] = useState(null);
  const theme = useTheme(); // Get the theme object
  const { t } = useTranslation(); // Initialize useTranslation
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const headers = [
    { value: t('quizDetailsPage.answeredBy') },
    { value: t('common.team') },
    { value: t('common.score') },
    { value: t('common.status') },
    { value: t('common.submitted'), align: 'right' },
  ]; // Define the headers for the web table
  const rows = data => {
    if (!Array.isArray(data)) return getRowData(data);
    return data && data.map(quiz => getRowData(quiz)); // Define the rows for the web table
  };
  const getRowData = data => {
    if (!data || typeof data !== 'object') return ['N/A', 'N/A', 'N/A']; // Handle case where quiz is not an object
    const score = `${data.score}/${data.answers && data.answers.length}`;
    const status = data.isCompleted ? t('answerDetailsPage.statusCompleted') : data.isChecked ? t('answerDetailsPage.statusReadyForReview') : t('answerDetailsPage.statusInProgress');
    const createdAt = data.submittedAt ? format(data.submittedAt, 'dd.MM.yyyy HH:mm') : 'N/A';
    const createdBy = data.answerCreatorName || t('common.unnamedUser', 'Anonymous'); // Default to 'Unknown' if creatorName is not available
    return [{ value: createdBy }, { value: getTeamDisplayString(data) }, { value: score }, { value: status }, { value: createdAt, align: 'right' }];
  };

  // const actions = quiz => {
  //   return (
  //     <Button></Button>
  //   );
  // };

  useEffect(() => {
    const fetchQuizDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const quizDocRef = doc(db, 'quizzes', quizId);
        const quizDocSnap = await getDoc(quizDocRef);

        if (quizDocSnap.exists()) {
          const data = quizDocSnap.data();
          setQuiz({
            id: quizDocSnap.id,
            ...data,
            createdAt: data.createdAt ? data.createdAt.toDate() : null,
          });
        } else {
          setError(t('common.notFound'));
        }
      } catch (err) {
        console.error('Error fetching quiz details:', err);
        setError(t('quizDetailsPage.loadingError'));
      } finally {
        setLoading(false);
      }
    };

    const fetchAnswers = async () => {
      setAnswersLoading(true);
      setAnswersError(null);
      try {
        const answersCollectionRef = collection(db, 'quizAnswers');
        const q = query(
          answersCollectionRef,
          where('quizId', '==', quizId),
          orderBy('submittedAt', 'asc') // Order by submission time
        );
        const querySnapshot = await getDocs(q);
        const fetchedAnswers = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          submittedAt: doc.data().submittedAt ? doc.data().submittedAt.toDate() : null,
        }));
        setAnswers(fetchedAnswers);
      } catch (err) {
        console.error('Error fetching answers for quiz details:', err);
        setAnswersError(t('quizDetailsPage.loadingAnswersError', 'Failed to load submitted answers.')); // New key
      } finally {
        setAnswersLoading(false);
      }
    };

    if (quizId) {
      fetchQuizDetails();
      fetchAnswers();
    }
  }, [quizId, t]); // Added t to dependency array

  const getTeamDisplayString = answer => {
    if (!answer.teamSize || answer.teamSize <= 1) {
      return answer.answerCreatorName || t('answerQuizPage.player'); // Reusing key
    }
    const members = [answer.answerCreatorName]; // Logged-in user is always first
    if (answer.teamMembers && Array.isArray(answer.teamMembers)) {
      answer.teamMembers.forEach(member => {
        if (member && typeof member === 'string' && member.trim() !== '') {
          members.push(member.trim());
        }
      });
    }
    return members.join(', ');
  };

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
  if (!quiz)
    return (
      <Box sx={{ textAlign: 'center', mt: 3 }}>
        <Typography>{t('common.notFound')}</Typography>
        <Button component={RouterLink} to="/my-quizzes" variant="outlined" sx={{ mt: 1 }}>
          {t('editQuizPage.backToMyQuizzes')}
        </Button>
      </Box>
    );

  return (
    <Box
      className="quiz-container" // Keep class if any global styles still apply
      sx={{
        maxWidth: '900px', // Consistent max-width
        margin: '0 auto', // Center the content
        padding: { xs: 2, sm: 3 }, // Responsive padding
        // Background color will come from theme.palette.background.default via CssBaseline
      }}
    >
      <Typography variant="h4" component="h1" gutterBottom align="center" sx={{ mb: 2 }}>
        {t('quizDetailsPage.pageTitle', { quizTitle: quiz.title })}
      </Typography>
      <Paper elevation={1} sx={{ p: { xs: 1.5, sm: 2 }, mb: 3, backgroundColor: '#2a2a2a' }}>
        <Typography variant="body1">
          <strong>{t('common.rules')}:</strong> {quiz.rules || t('quizDetailsPage.noRulesProvided')}
        </Typography>
        <Typography variant="body1">
          <strong>{t('common.numSongs')}:</strong> {quiz.amount}
        </Typography>
        <Typography variant="body1">
          <strong>{t('common.by')}:</strong> {quiz.creatorName || t('common.unnamedUser', 'Unknown')}
        </Typography>
        <Typography variant="body1">
          <strong>{t('common.created')}:</strong> {quiz.createdAt ? format(quiz.createdAt, 'dd.MM.yyyy') : 'N/A'}
        </Typography>
      </Paper>

      <Typography variant="h5" component="h2" gutterBottom align="center" sx={{ mb: 2 }}>
        {t('quizDetailsPage.songsInThisQuiz')}
      </Typography>
      <Paper elevation={1} sx={{ p: { xs: 1, sm: 1.5 }, mb: 3, backgroundColor: '#2a2a2a' }}>
        {quiz.questions && quiz.questions.length > 0 ? (
          <List className="quiz-questions-list" dense>
            {quiz.questions.map((q, index) => (
              <MusicPlayer key={index} artist={q.artist} song={q.song} songNumber={index + 1} songLink={q.songLink} hint={q.hint} />
            ))}
          </List>
        ) : (
          <Typography>{t('quizDetailsPage.noQuestionsFound', 'No questions found for this quiz.')}</Typography>
        )}
      </Paper>

      <Typography variant="h5" component="h2" gutterBottom align="center" className="section-heading" sx={{ mb: 2 }}>
        {t('quizDetailsPage.submittedAnswersTitle')}
      </Typography>
      {answersLoading && (
        <Typography sx={{ textAlign: 'center', mt: 2 }}>
          {t('common.loading')} <CircularProgress size={20} />
        </Typography>
      )}
      {answersError && (
        <Typography color="error" sx={{ textAlign: 'center', mt: 2 }} className="error-text">
          {answersError || t('common.error')}
        </Typography>
      )}
      {!answersLoading && !answersError && answers.length === 0 && <Typography sx={{ textAlign: 'center', mt: 2 }}>{t('quizDetailsPage.noSubmissionsYet')}</Typography>}
      {(!answersLoading && !answersError && answers.length > 0 && !isMobile && <TableWeb headers={headers} rows={rows(answers)} data={answers} />) ||
        (isMobile && answers.map((answer, key) => <TableMobile key={key} headers={headers} rows={rows(answer)} data={answer} />))}
    </Box>
  );
};

export default QuizDetails;
