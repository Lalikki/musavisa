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
import { useTranslation } from 'react-i18next'; // Import useTranslation

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
                console.error("Error fetching quiz details:", err);
                setError(t('quizDetailsPage.loadingError'));
            } finally {
                setLoading(false);
            }
        };

        if (quizId) {
            fetchQuizDetails();
        }
    }, [quizId, t]); // Added t to dependency array

    // Effect to fetch answers related to this quiz
    useEffect(() => {
        if (!quizId) return;

        const fetchAnswers = async () => {
            setAnswersLoading(true);
            setAnswersError(null);
            try {
                const answersCollectionRef = collection(db, "quizAnswers");
                const q = query(
                    answersCollectionRef,
                    where("quizId", "==", quizId),
                    orderBy("submittedAt", "asc") // Order by submission time
                );
                const querySnapshot = await getDocs(q);
                const fetchedAnswers = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    submittedAt: doc.data().submittedAt ? doc.data().submittedAt.toDate() : null,
                }));
                setAnswers(fetchedAnswers);
            } catch (err) {
                console.error("Error fetching answers for quiz details:", err);
                setAnswersError(t('quizDetailsPage.loadingAnswersError', "Failed to load submitted answers.")); // New key
            } finally {
                setAnswersLoading(false);
            }
        };

        fetchAnswers();
    }, [quizId, t]); // Added t to dependency array

    const getTeamDisplayString = (answer) => {
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


    if (loading) return <Typography sx={{ textAlign: 'center', mt: 3 }}>{t('common.loading')} <CircularProgress size={20} /></Typography>;
    if (error) return <Typography color="error" sx={{ textAlign: 'center', mt: 3 }} className="error-text">{error || t('common.error')}</Typography>;
    if (!quiz) return (
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
                margin: '0 auto',  // Center the content
                padding: { xs: 2, sm: 3 }, // Responsive padding
                // Background color will come from theme.palette.background.default via CssBaseline
            }}
        >
            <Typography variant="h4" component="h1" gutterBottom align="center" sx={{ mb: 2 }}>
                {t('quizDetailsPage.pageTitle', { quizTitle: quiz.title })}
            </Typography>
            <Paper elevation={1} sx={{ p: { xs: 1.5, sm: 2 }, mb: 3, backgroundColor: '#2a2a2a' }}>
                <Typography variant="body1"><strong>{t('common.rules')}:</strong> {quiz.rules || t('quizDetailsPage.noRulesProvided')}</Typography>
                <Typography variant="body1"><strong>{t('common.numSongs')}:</strong> {quiz.amount}</Typography>
                <Typography variant="body1"><strong>{t('common.by')}:</strong> {quiz.creatorName || t('common.unnamedUser', 'Unknown')}</Typography>
                <Typography variant="body1"><strong>{t('common.created')}:</strong> {quiz.createdAt ? format(quiz.createdAt, 'yyyy-MM-dd HH:mm') : 'N/A'}</Typography>
            </Paper>

            <Typography variant="h5" component="h2" gutterBottom align="center" sx={{ mb: 2 }}>
                {t('quizDetailsPage.songsInThisQuiz')}
            </Typography>
            <Paper elevation={1} sx={{ p: { xs: 1, sm: 1.5 }, mb: 3, backgroundColor: '#2a2a2a' }}>
                {quiz.questions && quiz.questions.length > 0 ? (
                    <List className="quiz-questions-list" dense>
                        {quiz.questions.map((q, index) => (
                            <MusicPlayer
                                key={index}
                                artist={q.artist}
                                song={q.song}
                                songNumber={index + 1}
                                songLink={q.songLink}
                                hint={q.hint}
                            />
                        ))}
                    </List>
                ) : (
                    <Typography>{t('quizDetailsPage.noQuestionsFound', 'No questions found for this quiz.')}</Typography>
                )}
            </Paper>

            <Typography variant="h5" component="h2" gutterBottom align="center" className="section-heading" sx={{ mb: 2 }}>
                {t('quizDetailsPage.submittedAnswersTitle')}
            </Typography>
            {answersLoading && <Typography sx={{ textAlign: 'center', mt: 2 }}>{t('common.loading')} <CircularProgress size={20} /></Typography>}
            {answersError && <Typography color="error" sx={{ textAlign: 'center', mt: 2 }} className="error-text">{answersError || t('common.error')}</Typography>}
            {!answersLoading && !answersError && answers.length === 0 && <Typography sx={{ textAlign: 'center', mt: 2 }}>{t('quizDetailsPage.noSubmissionsYet')}</Typography>}
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
                                <TableCell>{t('quizDetailsPage.answeredBy')}</TableCell>
                                <TableCell>{t('common.team')}</TableCell>
                                <TableCell>{t('common.score')}</TableCell>
                                <TableCell>{t('common.status')}</TableCell>
                                <TableCell align="right">{t('common.submitted')}</TableCell>
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
                                            }
                                        },
                                    }}
                                >
                                    <TableCell data-label={t('quizDetailsPage.answeredBy')} sx={mobileCardCellStyle(theme)}>{answer.answerCreatorName || t('common.unnamedUser', 'Anonymous')}</TableCell>
                                    <TableCell data-label={t('common.team')} sx={mobileCardCellStyle(theme)}>{getTeamDisplayString(answer)}</TableCell>
                                    <TableCell data-label={t('common.score')} sx={mobileCardCellStyle(theme)}>{answer.score} / {answer.answers ? answer.answers.length * 1 : 'N/A'}</TableCell>
                                    <TableCell data-label={t('common.status')} sx={mobileCardCellStyle(theme)}>
                                        {answer.isCompleted ? t('answerDetailsPage.statusCompleted') :
                                            answer.isChecked ? t('answerDetailsPage.statusReadyForReview') :
                                                t('answerDetailsPage.statusInProgress')}
                                    </TableCell>
                                    <TableCell data-label={t('common.submitted')} sx={{ ...mobileCardCellStyle(theme), [theme.breakpoints.up('sm')]: { textAlign: 'right' } }}>
                                        {answer.submittedAt ? format(answer.submittedAt, 'yyyy-MM-dd HH:mm') : 'N/A'}
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

export default QuizDetails;