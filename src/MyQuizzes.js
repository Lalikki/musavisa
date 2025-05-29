import React, { useState, useEffect } from 'react';
import { db, auth } from './firebase';
import { collection, query, where, orderBy, getDocs, doc, deleteDoc, limit } from 'firebase/firestore';
import EditIcon from '@mui/icons-material/Edit';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box'; // Import Box
import { ButtonGroup, ListItemIcon, ListItemText, MenuItem, MenuList, Paper, Popover, useMediaQuery } from '@mui/material'; // Import Box
import { MediaBluetoothOn as MediaBluetoothOnIcon, ArrowDropDown as ArrowDropDownIcon } from '@mui/icons-material';
import ShareIcon from '@mui/icons-material/Share'; // Import ShareIcon
import DeleteIcon from '@mui/icons-material/Delete'; // Import DeleteIcon
import { useTheme } from '@mui/material/styles'; // Import useTheme
import { onAuthStateChanged } from 'firebase/auth';
import Typography from '@mui/material/Typography'; // Import Typography
import { Link, useNavigate } from 'react-router-dom'; // Added useNavigate
import { useTranslation } from 'react-i18next';
import ShareQuizModal from './ShareQuizModal'; // We will create this component
import TableMobile from './components/TableMobile';
import TableWeb from './components/TableWeb';
import { format } from 'date-fns';

const MyQuizzes = () => {
  const [user, setUser] = useState(null);
  const [myQuizzes, setMyQuizzes] = useState([]); // Renamed from quizzes
  const [sharedQuizzes, setSharedQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingShared, setLoadingShared] = useState(true);
  const [error, setError] = useState(null);
  const [errorShared, setErrorShared] = useState(null);
  const [expandedQuizId, setExpandedQuizId] = useState(null);
  // const [quizAnswers, setQuizAnswers] = useState([]); // This state seems unused here, consider removing if not needed for this component's direct logic
  const theme = useTheme(); // Get the theme object
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [quizToShare, setQuizToShare] = useState(null);
  const [buttonOptionsAnchorEl, setButtonOptionsAnchorEl] = useState(null);
  const { t } = useTranslation(); // Initialize useTranslation
  const navigate = useNavigate(); // Initialize useNavigate

  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const openButtonOptions = Boolean(buttonOptionsAnchorEl);

  const headers = [{ value: t('common.title') }, { value: t('common.numSongs') }, { value: t('common.created') }]; // Define the headers for the web table as objects with 'column' property
  const rows = data => {
    if (!Array.isArray(data)) return getRowData(data);
    return data && data.map(quiz => getRowData(quiz)); // Define the rows for the web table
  };
  const getRowData = data => {
    if (!data || typeof data !== 'object') return ['N/A', 'N/A', 'N/A']; // Handle case where quiz is not an object
    const createdAt = data.createdAt ? format(data.createdAt, 'dd.MM.yyyy') : 'N/A';
    return [{ value: data.title }, { value: data.amount }, { value: createdAt }];
  };
  const myQuizzesActions = quiz => (
    <Box>
      <ButtonGroup variant="outlined" aria-label="Button group with a nested menu">
        <Button onClick={() => handleHostQuiz(quiz.id)} startIcon={<MediaBluetoothOnIcon />}>
          {t('myQuizzesPage.hostAction')}
        </Button>
        <Button
          size="small"
          aria-controls={openButtonOptions ? 'split-button-menu' : undefined}
          aria-expanded={openButtonOptions ? 'true' : undefined}
          aria-label="open options"
          aria-haspopup="menu"
          onClick={handleOpenButtonOptions}
        >
          <ArrowDropDownIcon />
        </Button>
      </ButtonGroup>
      <Popover
        sx={{ zIndex: 1 }}
        open={openButtonOptions}
        anchorEl={buttonOptionsAnchorEl}
        onClose={handleOpenButtonOptions}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
      >
        <Paper>
          <MenuList id="split-button-menu" autoFocusItem>
            <MenuItem to={`/edit-quiz/${quiz.id}`} component={Link}>
              <ListItemIcon>
                <EditIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>{t('common.edit')}</ListItemText>
            </MenuItem>
            <MenuItem color="secondary" onClick={() => handleOpenShareModal(quiz)}>
              <ListItemIcon>
                <ShareIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>{t('myQuizzesPage.shareAction')}</ListItemText>
            </MenuItem>
            {!quiz.hasAnswers && (
              <MenuItem onClick={() => handleDeleteQuiz(quiz.id)} startIcon={<DeleteIcon />}>
                <ListItemIcon>
                  <DeleteIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>{t('common.delete', 'Delete')}</ListItemText>
              </MenuItem>
            )}
          </MenuList>
        </Paper>
      </Popover>
    </Box>
  );

  const sharedQuizzesActions = quiz => (
    <Button variant="outlined" to={`/my-quizzes/${quiz.id}`} startIcon={<MediaBluetoothOnIcon />} component={Link}>
      {t('myQuizzesPage.hostAction')}
    </Button>
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, currentUser => {
      setUser(currentUser);
      if (currentUser) {
        fetchUserQuizzes(currentUser.uid);
        fetchSharedQuizzes(currentUser.uid);
      } else {
        setMyQuizzes([]); // Clear quizzes if user logs out
        setSharedQuizzes([]);
        setExpandedQuizId(null); // Reset expanded quiz
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchUserQuizzes = async uid => {
    setLoading(true);
    setError(null);
    try {
      const quizzesCollectionRef = collection(db, 'quizzes');
      // Query for quizzes created by the current user, ordered by creation date
      const q = query(quizzesCollectionRef, where('createdBy', '==', uid), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const userQuizzesDataPromises = querySnapshot.docs.map(async quizDoc => {
        const quizData = {
          id: quizDoc.id,
          ...quizDoc.data(),
          createdAt: quizDoc.data().createdAt ? quizDoc.data().createdAt.toDate() : null,
        };
        // Check if this quiz has any answers
        const answersQuery = query(collection(db, 'quizAnswers'), where('quizId', '==', quizDoc.id), limit(1));
        const answerSnapshots = await getDocs(answersQuery);
        quizData.hasAnswers = !answerSnapshots.empty;
        return quizData;
      });
      const userQuizzesData = await Promise.all(userQuizzesDataPromises);
      setMyQuizzes(userQuizzesData);
    } catch (err) {
      console.error('Error fetching user quizzes:', err);
      setError(t('myQuizzesPage.loadingError'));
    } finally {
      setLoading(false);
    }
  };

  const fetchSharedQuizzes = async uid => {
    setLoadingShared(true);
    setErrorShared(null);
    try {
      const quizzesCollectionRef = collection(db, 'quizzes');
      // Query for quizzes where the sharedWithUids array contains the current user's UID
      const q = query(
        quizzesCollectionRef,
        where('sharedWithUids', 'array-contains', uid),
        orderBy('createdAt', 'desc') // Optional: order them as well
      );
      const querySnapshot = await getDocs(q);
      const sharedQuizzesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt ? doc.data().createdAt.toDate() : null,
      }));
      setSharedQuizzes(sharedQuizzesData);
    } catch (err) {
      console.error('Error fetching shared quizzes:', err);
      setErrorShared(t('myQuizzesPage.loadingSharedError'));
    } finally {
      setLoadingShared(false);
    }
  };

  const handleOpenButtonOptions = event => {
    if (buttonOptionsAnchorEl) {
      // If the button is already open, close it
      setButtonOptionsAnchorEl(null);
      return;
    }
    setButtonOptionsAnchorEl(event.currentTarget);
  };

  const handleOpenShareModal = quiz => {
    setQuizToShare(quiz);
    setShareModalOpen(true);
  };

  const handleCloseShareModal = () => {
    setQuizToShare(null);
    setShareModalOpen(false);
  };

  const handleHostQuiz = quizId => {
    // Navigate to a hosting page or trigger hosting logic
    // For now, let's assume it navigates to a quiz details page that might have hosting controls
    navigate(`/my-quizzes/${quizId}`); // Or a specific hosting route
  };

  const handleDeleteQuiz = async quizIdToDelete => {
    // The button is only rendered if quiz.hasAnswers is false,
    // so we can directly proceed with confirmation and deletion.
    if (window.confirm(t('myQuizzesPage.confirmDeleteQuiz', 'Are you sure you want to delete this quiz? This action cannot be undone.'))) {
      try {
        const quizDocRef = doc(db, 'quizzes', quizIdToDelete);
        await deleteDoc(quizDocRef);
        // Update local state to remove the quiz
        setMyQuizzes(prevQuizzes => prevQuizzes.filter(quiz => quiz.id !== quizIdToDelete));
        // Optionally, show a success message
        // setSuccessMessage(t('myQuizzesPage.deleteSuccess', 'Quiz deleted successfully.'));
      } catch (err) {
        console.error('Error deleting quiz:', err);
        setError(t('myQuizzesPage.deleteError', 'Failed to delete quiz. Please try again.'));
      }
    }
  };

  if (!user && !loading) {
    return <Typography sx={{ textAlign: 'center', mt: 3 }}>{t('common.pleaseLogin')}</Typography>;
  }

  if (!user && !loading) return <Typography sx={{ textAlign: 'center', mt: 3 }}>{t('common.pleaseLogin')}</Typography>;

  if (loading || loadingShared) return <Typography sx={{ textAlign: 'center', mt: 3 }}>{t('common.loading')}</Typography>;

  return (
    <Box
      sx={{
        maxWidth: '900px', // Consistent max-width
        margin: '0 auto', // Center the content
        padding: { xs: 2, sm: 3 }, // Responsive padding
      }}
    >
      <Typography variant="h4" component="h1" gutterBottom align="center">
        {t('myQuizzesPage.myCreatedQuizzesTitle')}
      </Typography>
      {error && (
        <Typography color="error" sx={{ textAlign: 'center', mt: 2, mb: 2 }}>
          {error}
        </Typography>
      )}
      {myQuizzes.length === 0 && !loading && !error && (
        <Typography sx={{ textAlign: 'center', mt: 2 }}>
          {t('myQuizzesPage.noQuizzesCreated')}{' '}
          <Link to="/quiz" style={{ color: 'inherit' }}>
            {t('navbar.newQuiz')}
          </Link>
        </Typography>
      )}
      {(myQuizzes.length > 0 && !isMobile && <TableWeb headers={headers} rows={rows(myQuizzes)} data={myQuizzes} actions={myQuizzesActions} />) ||
        (isMobile && myQuizzes.map(quiz => <TableMobile headers={headers} rows={rows(quiz)} data={quiz} actions={myQuizzesActions} />))}

      {quizToShare && <ShareQuizModal open={shareModalOpen} onClose={handleCloseShareModal} quiz={quizToShare} />}

      <Typography variant="h4" component="h2" gutterBottom align="center" sx={{ mt: 5, mb: 2 }}>
        {t('myQuizzesPage.sharedWithMeTitle')}
      </Typography>
      {errorShared && (
        <Typography color="error" sx={{ textAlign: 'center', mt: 2, mb: 2 }}>
          {errorShared}
        </Typography>
      )}
      {sharedQuizzes.length === 0 && !loadingShared && !errorShared && <Typography sx={{ textAlign: 'center', mt: 2 }}>{t('myQuizzesPage.noQuizzesShared')}</Typography>}
      {(sharedQuizzes.length > 0 && !isMobile && <TableWeb headers={headers} rows={rows(sharedQuizzes)} data={sharedQuizzes} actions={sharedQuizzesActions} />) ||
        (isMobile && sharedQuizzes.map((quiz, key) => <TableMobile key={key} headers={headers} rows={rows(quiz)} data={quiz} actions={sharedQuizzesActions} />))}
      {quizToShare && <ShareQuizModal open={shareModalOpen} onClose={handleCloseShareModal} quiz={quizToShare} />}
    </Box>
  );
};

export default MyQuizzes;
