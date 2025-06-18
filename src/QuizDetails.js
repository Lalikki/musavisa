import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom'; // Renamed Link to RouterLink
import { db } from './firebase';
import { doc, getDoc, collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { format } from 'date-fns';
import { Typography, Button, Box, Paper, CircularProgress, useMediaQuery, FormControlLabel, Checkbox, IconButton as MuiIconButton, useTheme } from '@mui/material'; // Removed List, added MuiIconButton, imported useTheme
import MusicPlayer from './components/MusicPlayer';
import { useTranslation } from 'react-i18next'; // Import useTranslation
import CustomTable from './components/CustomTable';
import Slider from 'react-slick'; // Import react-slick
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import { ArrowBackIosNew, ArrowForwardIos } from '@mui/icons-material'; // Icons for prev/next

const QuizDetails = () => {
  const { quizId } = useParams();
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [answersLoading, setAnswersLoading] = useState(true);
  const [answersError, setAnswersError] = useState(null);
  const { t } = useTranslation(); // Initialize useTranslation
  const sliderRef = useRef(null); // Ref for the slider
  const [currentSlide, setCurrentSlide] = useState(0); // To track the current active slide
  const isDesktop = useMediaQuery(theme => theme.breakpoints.up('sm')); // Renamed for clarity

  const headers = [
    { value: t('quizDetailsPage.answeredBy') },
    { value: t('common.team') },
    { value: t('common.score') },
    { value: t('common.status') },
    { value: t('common.submitted'), align: 'right' },
  ]; // Define the headers for the web table
  const rows = data => {
    return (
      data &&
      data.map(d => {
        const score = `${d.score}/${d.answers && d.answers.length}`;
        const status = d.isCompleted ? t('answerDetailsPage.statusCompleted') : d.isChecked ? t('answerDetailsPage.statusReadyForReview') : t('answerDetailsPage.statusInProgress');
        const createdAt = d.submittedAt ? format(d.submittedAt, 'dd.MM.yyyy HH:mm') : 'N/A';
        const createdBy = d.answerCreatorName || t('common.unnamedUser', 'Anonymous'); // Default to 'Unknown' if creatorName is not available
        return [{ value: createdBy }, { value: getTeamDisplayString(d) }, { value: score }, { value: status }, { value: createdAt, align: 'right' }];
      })
    );
  }; // Define the rows for the table

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

  const handleSlideChange = (newIndex) => {
    setCurrentSlide(newIndex);
    // Potentially pause previous video and play new one if autoPlay is desired
  };

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

  const sliderSettings = {
    dots: false, // Disable default dots, using custom pagination for mobile too
    infinite: false,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    afterChange: handleSlideChange,
    arrows: false, // We'll use custom arrows via PaginationControls
  };

  const goToSlide = (index) => {
    sliderRef.current?.slickGoTo(index);
    setCurrentSlide(index); // Ensure state is updated if slickGoTo doesn't trigger afterChange immediately
  };

  const generatePaginationItems = (totalSlides, currentSlide, goToSlideFunc) => {
    const items = [];
    const pagesToShowAroundCurrent = 2; // Number of pages to show on each side of the current page
    const firstPage = 0; // 0-indexed
    const lastPage = totalSlides - 1; // 0-indexed
    const pagesToShowTotal = 5; // Total number of page numbers to aim for

    // Previous Arrow
    items.push({
      type: 'prev',
      action: () => goToSlideFunc(Math.max(0, currentSlide - 1)),
      disabled: currentSlide === 0,
    });

    // If total slides is small, just show all numbers
    if (totalSlides <= pagesToShowTotal) {
      for (let i = 0; i < totalSlides; i++) {
        items.push({ type: 'number', page: i + 1, action: () => goToSlideFunc(i), active: currentSlide === i });
      }
    } else {
      // Logic for showing centered pages, ellipsis, and first/last

      // Add first page
      items.push({ type: 'number', page: firstPage + 1, action: () => goToSlideFunc(firstPage), active: currentSlide === firstPage });

      // Determine the range of pages around the current slide
      let startRange = Math.max(firstPage + 1, currentSlide - pagesToShowAroundCurrent);
      let endRange = Math.min(lastPage - 1, currentSlide + pagesToShowAroundCurrent);

      // Adjust range if it's too small or hits boundaries
      // If currentSlide is near the beginning, expand endRange
      if (currentSlide < firstPage + pagesToShowAroundCurrent + 1) {
        endRange = Math.min(lastPage - 1, firstPage + pagesToShowTotal - 1); // Show pages 1 to 5 if total > 5
        startRange = firstPage + 1; // Ensure start is after page 1
      }
      // If currentSlide is near the end, expand startRange
      if (currentSlide > lastPage - pagesToShowAroundCurrent - 1) {
        startRange = Math.max(firstPage + 1, lastPage - pagesToShowTotal + 1); // Show pages Last-4 to Last if total > 5
        endRange = lastPage - 1; // Ensure end is before last page
      }

      // Add ellipsis after first page if needed
      if (startRange > firstPage + 1) {
        items.push({ type: 'ellipsis' });
      }

      // Add pages in the calculated range
      for (let i = startRange; i <= endRange; i++) {
        items.push({ type: 'number', page: i + 1, action: () => goToSlideFunc(i), active: currentSlide === i });
      }

      // Add ellipsis before last page if needed
      if (endRange < lastPage - 1) {
        items.push({ type: 'ellipsis' });
      }

      // Add last page (only if there's more than one page and it's not the same as the first page)
      if (lastPage > firstPage) {
        items.push({ type: 'number', page: lastPage + 1, action: () => goToSlideFunc(lastPage), active: currentSlide === lastPage });
      }
    }

    // Next Arrow
    items.push({
      type: 'next',
      action: () => goToSlideFunc(Math.min(totalSlides - 1, currentSlide + 1)),
      disabled: currentSlide === totalSlides - 1 || totalSlides === 0,
    });

    return items;
  };

  let paginationItems = [];
  if (quiz && quiz.questions && quiz.questions.length > 0) {
    paginationItems = generatePaginationItems(quiz.questions.length, currentSlide, goToSlide);
  }


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
      <Paper elevation={1} sx={{ p: { xs: 1.5, sm: 2 }, mb: 3, backgroundColor: '#2a2a2a' }}>
        <Typography variant="body1" sx={{ mb: 0.5 }}> {/* Adjusted margin for consistency */}
          <strong>{t('common.title')}:</strong> {quiz.title}
        </Typography>
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
        <Typography variant="body1">
          <strong>{t('quizDetailsPage.maxScoreLabel', 'Maximum Score')}:</strong> {quiz.calculatedMaxScore !== undefined ? quiz.calculatedMaxScore : 'N/A'}
        </Typography>
      </Paper>

      {/* Features Section - Commented out for now
      <Typography variant="h6" component="h3" sx={{ mt: 3, mb: 1, textAlign: 'center', color: 'white' }}>
        {t('createNewQuizPage.featuresLabel', 'Features')}
      </Typography>
      <Paper elevation={1} sx={{ p: { xs: 1.5, sm: 2 }, mb: 3, backgroundColor: '#2a2a2a' }}>
        <FormControlLabel
          control={<Checkbox checked={quiz.enableExtraQuestions || false} disabled />}
          label={t('createNewQuizPage.enableExtraQuestionsLabel', 'Enable Extra Questions (adds 0.5 points per song)')}
          sx={{ display: 'block' }} // Ensure it takes full width if needed or adjust styling
        />
        
      </Paper>
      */}

      <Typography variant="h5" component="h2" gutterBottom align="center" sx={{ mb: 2 }}>
        {t('quizDetailsPage.songsInThisQuiz')}
      </Typography>

      <Box sx={{ mb: 3, position: 'relative' }}> {/* Wrapper for Slider and potential custom arrows */}
        {quiz.questions && quiz.questions.length > 0 ? (
          <Slider ref={sliderRef} {...sliderSettings}>
            {quiz.questions.map((q, index) => (
              <Box key={`slide-${index}`} sx={{ p: 1 }}> {/* Consistent padding for all screen sizes */}
                <MusicPlayer
                  artist={q.artist}
                  song={q.song}
                  songNumber={index + 1}
                  songLink={q.songLink}
                  hint={q.hint}
                  extraQuestion={q.extra}
                  correctExtraAnswer={q.correctExtraAnswer}
                  isActive={index === currentSlide} // Pass isActive prop
                />
              </Box>
            ))}
          </Slider>
        ) : (
          <Typography>{t('quizDetailsPage.noQuestionsFound', 'No questions found for this quiz.')}</Typography>
        )}
      </Box>

      {/* Pagination Controls - Now always below carousel if items exist */}
      {paginationItems.length > 0 && (
        <PaginationControls items={paginationItems} />
      )}

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
      {!answersLoading && !answersError && answers.length > 0 && <CustomTable headers={headers} rows={rows(answers)} data={answers} />}
    </Box>
  );
};

// PaginationControls Component
const PaginationControls = ({ items }) => {
  const theme = useTheme(); // Import and use theme
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexWrap: 'nowrap', gap: isMobile ? 0.25 : 0.5, mb: 2, mt: 2, overflowX: 'auto', pb: 0.5 }}>
      {items.map((item, index) => {
        if (item.type === 'prev' || item.type === 'next') {
          return (
            <MuiIconButton
              key={`${item.type}-${index}`}
              onClick={item.action}
              disabled={item.disabled}
              size={isMobile ? "small" : "medium"} // Adjust size for mobile
              sx={{ p: isMobile ? '4px' : '8px' }} // Adjust padding for mobile
            >
              {item.type === 'prev' ? <ArrowBackIosNew fontSize="inherit" /> : <ArrowForwardIos fontSize="inherit" />}
            </MuiIconButton>
          );
        } else if (item.type === 'number') {
          return (
            <Button
              key={`page-${item.page}-${index}`} // Ensure unique key
              variant={item.active ? "contained" : "outlined"}
              onClick={item.action}
              size={isMobile ? "small" : "medium"} // Adjust size for mobile
              sx={{ minWidth: isMobile ? '30px' : '36px', p: isMobile ? '4px 6px' : '6px 8px' }} // Adjust padding and minWidth
            >
              {item.page}
            </Button>
          );
        } else if (item.type === 'ellipsis') {
          return (
            <Typography key={`ellipsis-${index}`} sx={{ p: isMobile ? '4px 6px' : '6px 8px', userSelect: 'none', fontSize: isMobile ? '0.875rem' : '1rem' }}>...</Typography>
          );
        }
        return null;
      })}
    </Box>
  );
};

export default QuizDetails;
