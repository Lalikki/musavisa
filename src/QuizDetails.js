import React, { useState, useEffect } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom'; // Renamed Link to RouterLink
import { db } from './firebase';
import { doc, getDoc, collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { format } from 'date-fns';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import List from '@mui/material/List';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import CircularProgress from '@mui/material/CircularProgress';
import MusicPlayer from './components/MusicPlayer';
import { useTheme } from '@mui/material/styles'; // Import useTheme

const QuizDetails = () => {
  const { quizId } = useParams();
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [answersLoading, setAnswersLoading] = useState(true);
  const [answersError, setAnswersError] = useState(null);
  const theme = useTheme(); // Get the theme object

  useEffect(() => {
    return () => {
      if (quizId) {
        fetchQuizDetails();
        fetchAnswers();
      }
    };
  }, [quizId]);

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
        setError('Quiz not found.');
      }
    } catch (err) {
      console.error('Error fetching quiz details:', err);
      setError('Failed to load quiz details. Please try again.');
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
      setAnswersError('Failed to load submitted answers.');
    } finally {
      setAnswersLoading(false);
    }
  };

  const getTeamDisplayString = answer => {
    if (!answer.teamSize || answer.teamSize <= 1) {
      return answer.answerCreatorName || 'Solo';
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
        Loading quiz details... <CircularProgress size={20} />
      </Typography>
    );
  if (error)
    return (
      <Typography color="error" sx={{ textAlign: 'center', mt: 3 }} className="error-text">
        {error}
      </Typography>
    );
  if (!quiz)
    return (
      <Box sx={{ textAlign: 'center', mt: 3 }}>
        <Typography>Quiz not found.</Typography>
        <Button component={RouterLink} to="/my-quizzes" variant="outlined" sx={{ mt: 1 }}>
          Go back to My Quizzes
        </Button>
      </Box>
    );

  return (
    <Box
      className="quiz-container" // Keep class if any global styles still apply
      sx={{
        maxWidth: '900px', // Consistent max-width
        margin: '0 auto',  // Center the content
        padding: { xs: 2, sm: 3 }, // Responsive padding
        // Background color will come from theme.palette.background.default via CssBaseline
      }}
    >
      <Typography variant="h4" component="h1" gutterBottom align="center" sx={{ mb: 2 }}>
        {quiz.title}
      </Typography>
      <Paper elevation={1} sx={{ p: { xs: 1.5, sm: 2 }, mb: 3, backgroundColor: '#2a2a2a' }}>
        <Typography variant="body1">
          <strong>Rules:</strong> {quiz.rules || 'No rules provided.'}
        </Typography>
        <Typography variant="body1">
          <strong>Number of Songs:</strong> {quiz.amount}
        </Typography>
        <Typography variant="body1">
          <strong>Created By:</strong> {quiz.creatorName || 'Unknown'}
        </Typography>
        <Typography variant="body1">
          <strong>Created At:</strong> {quiz.createdAt ? format(quiz.createdAt, 'yyyy-MM-dd HH:mm') : 'N/A'}
        </Typography>
      </Paper>

      <Typography variant="h5" component="h2" gutterBottom align="center" sx={{ mb: 2 }}>
        Questions (Song Details)
      </Typography>
      <Paper elevation={1} sx={{ p: { xs: 1, sm: 1.5 }, mb: 3, backgroundColor: '#2a2a2a' }}>
        {quiz.questions && quiz.questions.length > 0 ? (
          <List className="quiz-questions-list" dense>
            {quiz.questions.map((q, index) => (
              <MusicPlayer key={index} artist={q.artist} song={q.song} songNumber={index + 1} songLink={q.songLink} hint={q.hint}/>
            ))}
          </List>
        ) : (
          <Typography>No questions found for this quiz.</Typography>
        )}
      </Paper>

      <Typography variant="h5" component="h2" gutterBottom align="center" className="section-heading" sx={{ mb: 2 }}>
        Submitted Answers
      </Typography>
      {answersLoading && (
        <Typography sx={{ textAlign: 'center', mt: 2 }}>
          Loading submitted answers... <CircularProgress size={20} />
        </Typography>
      )}
      {answersError && (
        <Typography color="error" sx={{ textAlign: 'center', mt: 2 }} className="error-text">
          {answersError}
        </Typography>
      )}
      {!answersLoading && !answersError && answers.length === 0 && <Typography sx={{ textAlign: 'center', mt: 2 }}>No one has submitted answers for this quiz yet.</Typography>}
      {!answersLoading && !answersError && answers.length > 0 && (
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
          <Table className="quizzes-table" aria-label="Submitted Answers Table">
            <TableHead sx={{ [theme.breakpoints.down('sm')]: { display: 'none' } }}>
              <TableRow className="quizzes-table-header-row">
                <TableCell>Answered By</TableCell>
                <TableCell>Team</TableCell>
                <TableCell>Score</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Submitted At</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {answers.map(answer => (
                <TableRow
                  key={answer.id}
                  className="quizzes-table-data-row"
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
                      },
                    },
                  }}
                >
                  <TableCell data-label="Answered By" sx={mobileCardCellStyle(theme)}>
                    {answer.answerCreatorName || 'Anonymous'}
                  </TableCell>
                  <TableCell data-label="Team" sx={mobileCardCellStyle(theme)}>
                    {getTeamDisplayString(answer)}
                  </TableCell>
                  <TableCell data-label="Score" sx={mobileCardCellStyle(theme)}>
                    {answer.score} / {answer.answers ? answer.answers.length * 1 : 'N/A'}
                  </TableCell>
                  <TableCell data-label="Status" sx={mobileCardCellStyle(theme)}>
                    {answer.isCompleted ? 'Completed' : answer.isChecked ? 'Ready for Review' : 'In Progress'}
                  </TableCell>
                  <TableCell
                    data-label="Submitted"
                    sx={{
                      ...mobileCardCellStyle(theme),
                      [theme.breakpoints.up('sm')]: { textAlign: 'right' },
                    }}
                  >
                    {answer.submittedAt ? format(answer.submittedAt, 'yyyy-MM-dd HH:mm') : 'N/A'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      <Button component={RouterLink} to="/my-quizzes" variant="outlined" className="back-link" sx={{ display: 'block', mx: 'auto', mt: 3 }}>
        Back to My Quizzes
      </Button>
    </Box>
  );
};

// Helper function for mobile cell styles
const mobileCardCellStyle = theme => ({
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

export default QuizDetails;
