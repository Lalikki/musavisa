import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import { db, auth } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import { InputLabel } from '@mui/material';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useTranslation } from 'react-i18next'; // Import useTranslation
import YTSearch from './components/YTSearch';

const emptyQuestion = { songLink: '', artist: '', song: '', extra: '', correctExtraAnswer: '', hint: '' };

const Quiz = () => {
  const { t } = useTranslation(); // Initialize useTranslation
  const navigate = useNavigate(); // Initialize useNavigate
  const [user, setUser] = useState(null);
  const [title, setTitle] = useState('');
  const [rules, setRules] = useState('');
  const [amount, setAmount] = useState('');
  const [maxScorePerSong, setMaxScorePerSong] = useState('1'); // Will be dynamically set
  const [success, setSuccess] = useState('');
  const [isReady, setIsReady] = useState(false); // New state for isReady, defaults to false
  const [error, setError] = useState('');
  const [enableExtraQuestions, setEnableExtraQuestions] = useState(false); // State for enabling extra questions
  const [questions, setQuestions] = useState([emptyQuestion]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, currentUser => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Effect to update maxScorePerSong based on enableExtraQuestions
  useEffect(() => {
    if (enableExtraQuestions) {
      setMaxScorePerSong('1.5');
    } else {
      setMaxScorePerSong('1');
    }
  }, [enableExtraQuestions]);

  const onDragEnd = result => {
    // dropped outside the list
    if (!result.destination) {
      return;
    }

    const items = Array.from(questions);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setQuestions(items);
  };

  const handleQuestionChange = (index, field, value) => {
    const updated = questions.map((q, i) => {
      if (i === index) {
        return { ...q, [field]: value };
      }
      return q;
    });
    setQuestions(updated);

    if (field === 'songLink' && value.trim() !== '') {
      // fetchAndSetSongMetadata(value, index);
    }
  };

  const handleYouTubeSearchSelection = (index, data) => {
    const updatedQuestions = [...questions];
    updatedQuestions[index] = {
      ...updatedQuestions[index],
      songLink: data.songLink,
      artist: data.songArtist,
      song: data.songName,
    };
    setQuestions(updatedQuestions);
  };

  const addQuestion = () => {
    const newQuestions = [...questions, emptyQuestion];
    setQuestions(newQuestions);
    setAmount(String(newQuestions.length)); // Update the amount field to reflect the new total
  };

  useEffect(() => {
    const numAmount = Number(amount);
    // Only adjust if numAmount is a positive number
    if (!isNaN(numAmount) && numAmount > 0) {
      const currentLength = questions.length;
      if (numAmount > currentLength) {
        // Add new empty question objects
        const newQuestionsToAdd = Array(numAmount - currentLength)
          .fill(null)
          .map(() => emptyQuestion);
        setQuestions(prevQuestions => [...prevQuestions, ...newQuestionsToAdd]);
      } else if (numAmount < currentLength) {
        // Remove questions from the end
        setQuestions(prevQuestions => prevQuestions.slice(0, numAmount));
      }
    } else if (amount === '' && questions.length > 0) {
      // Optional: If amount is cleared, you might want to reset to 1 question or do nothing.
      // For now, let's reset to one question if the field is cleared and there were questions.
      // If you prefer it to do nothing, you can remove this else-if block.
      if (questions.length !== 1) {
        // Avoid unnecessary re-render if already 1
        setQuestions([emptyQuestion]);
      }
    }
  }, [amount, questions.length]); // Rerun this effect when the 'amount' state changes

  const removeQuestion = index => {
    const updatedQuestions = questions.filter((_, i) => i !== index);
    setQuestions(updatedQuestions);
    setAmount(String(updatedQuestions.length)); // Update the amount field
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setSuccess('');
    setError('');
    if (!title.trim()) {
      setError(t('common.error') + ': ' + t('createNewQuizPage.quizTitleLabel') + ' ' + t('common.isRequired', 'is required')); // Example of combining for more specific error
      return;
    }
    if (!rules.trim()) {
      setError(t('common.error') + ': ' + t('createNewQuizPage.rulesOptionalLabel').replace('(Optional)', '').trim() + ' ' + t('common.isRequired', 'is required'));
      return;
    }
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      setError(t('common.error') + ': ' + t('createNewQuizPage.amountOfSongsLabel') + ' ' + t('common.mustBePositive', 'must be a positive number'));
      return;
    }
    if (!maxScorePerSong || isNaN(maxScorePerSong) || Number(maxScorePerSong) <= 0) {
      setError(t('common.error') + ': ' + t('createNewQuizPage.maxScorePerSongLabel', 'Max score per song') + ' ' + t('common.mustBePositive', 'must be a positive number')); // Add new translation key
      return;
    }
    if (questions.length !== Number(amount)) {
      setError(t('common.error') + ': ' + t('createNewQuizPage.songEntriesErrorMismatch', { count: questions.length, amount: amount }));
      return;
    }
    // Optional: Add validation for empty fields within questions
    for (const q of questions) {
      if (!q.artist.trim() || !q.song.trim()) {
        setError(t('common.error') + ': ' + t('createNewQuizPage.songEntryFieldsRequired'));
        return;
      }
    }
    try {
      // Calculate the maximum possible score
      let calculatedMaxScore = 0;
      questions.forEach(q => {
        calculatedMaxScore += 0.5; // For artist
        calculatedMaxScore += 0.5; // For song
        // Only add points for extra if enabled and both the question and its correct answer are present
        if (enableExtraQuestions && q.extra && q.extra.trim() !== '' && q.correctExtraAnswer && q.correctExtraAnswer.trim() !== '') {
          calculatedMaxScore += 0.5; // For extra question
        }
      });

      await addDoc(collection(db, 'quizzes'), {
        title,
        rules, // Changed from description
        amount: Number(amount),
        createdBy: user ? user.uid : 'unknown', // Handle case where user might be null briefly
        maxScorePerSong: Number(maxScorePerSong), // Save the max score per song
        creatorName: user ? user.displayName : t('common.unnamedUser', 'Unknown'), // Store display name
        createdAt: serverTimestamp(),
        questions,
        isReady,
        enableExtraQuestions, // Save the state
        calculatedMaxScore,
      });
      setSuccess(t('createNewQuizPage.createQuizSuccess'));
      // Instead of resetting fields, navigate to My Quizzes page
      // Fields will naturally reset when the component unmounts or re-mounts on next visit
      // Or you can keep the resets if you prefer, but navigation will happen quickly
      // setTitle('');
      // setRules('');
      // setAmount('');
      // setMaxScorePerSong('1'); // Reset to initial default
      // setQuestions([emptyQuestion]);
      // setIsReady(false);
      // setEnableExtraQuestions(false); // Reset if needed
      navigate('/my-quizzes'); // Redirect to My Quizzes page
    } catch (err) {
      setError(t('createNewQuizPage.createQuizError') + ': ' + err.message);
    }
  };

  // Determine if the "Enable Extra Questions" checkbox should be disabled from being unchecked
  const disableExtraQuestionsToggle =
    enableExtraQuestions &&
    questions.some(q => (q.extra && q.extra.trim() !== '') || (q.correctExtraAnswer && q.correctExtraAnswer.trim() !== ''));

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
      {user ? (
        <Paper component="form" onSubmit={handleSubmit} className="quiz-creation-form" sx={{ p: { xs: 1.5, sm: 2.5 }, backgroundColor: 'transparent', boxShadow: 'none' }}>
          {' '}
          {/* Adjusted padding, transparent, no shadow */}
          <Typography variant="h5" component="h2" gutterBottom align="center">
            {t('createNewQuizPage.pageTitle')}
          </Typography>
          <TextField
            label={t('createNewQuizPage.quizTitleLabel')}
            variant="outlined"
            fullWidth
            margin="dense" // Changed from normal to dense
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
            className="form-input-full-width"
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            label={t('createNewQuizPage.rulesOptionalLabel')}
            variant="outlined"
            fullWidth
            margin="dense" // Changed from normal to dense
            multiline
            rows={3}
            value={rules}
            onChange={e => setRules(e.target.value)}
            required
            className="form-input-full-width"
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            label={t('createNewQuizPage.amountOfSongsLabel')}
            type="number"
            variant="outlined"
            fullWidth
            margin="dense" // Changed from normal to dense
            value={amount}
            onChange={e => setAmount(e.target.value)}
            required
            className="form-input-full-width"
            slotProps={{ inputLabel: { shrink: true }, inputProps: { min: 1 } }}
          />
          {/* Features Section */}
          <Typography variant="h6" component="h3" sx={{ mt: 2, mb: 1 }}>
            {t('createNewQuizPage.featuresLabel', 'Features')}
          </Typography>
          <Box sx={{ border: '1px solid rgba(0, 0, 0, 0.12)', borderRadius: 1, p: 1.5, mb: 1 }}>
            <FormControlLabel
              control={<Checkbox checked={enableExtraQuestions} onChange={e => setEnableExtraQuestions(e.target.checked)} id="enableExtraQuestionsCheckbox" disabled={disableExtraQuestionsToggle} />}
              label={t('createNewQuizPage.enableExtraQuestionsLabel', 'Enable Extra Questions (adds 0.5 points per song)')}
              sx={{ display: 'block' }}
            />
          </Box>
          <TextField
            label={t('createNewQuizPage.maxScorePerSongLabel', 'Max Score Per Song')}
            variant="outlined"
            fullWidth
            margin="dense"
            value={maxScorePerSong}
            InputProps={{ readOnly: true }} // Make it read-only
            slotProps={{ inputLabel: { shrink: true } }}
          />

          {Number(amount) > 0 && (
            <Box sx={{ mt: 1, mb: 1 }}>
              {' '}
              {/* Reduced top margin */}
              <Typography variant="h6" component="h3" gutterBottom>
                {t('createNewQuizPage.songEntriesTitle')}
              </Typography>
              <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="questionsDroppableQuiz">
                  {provided => (
                    <Box {...provided.droppableProps} ref={provided.innerRef}>
                      {questions.map((q, index) => (
                        <Draggable key={`quiz-question-${index}`} draggableId={`quiz-question-${index}`} index={index}>
                          {provided => (
                            <Paper
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              elevation={1}
                              sx={{ p: { xs: 0.5, sm: 1 }, mb: 1 }}
                              className="question-entry-box"
                            >
                              <Typography variant="subtitle1" component="h4" gutterBottom>
                                {t('common.songs')} {index + 1} ({t('common.dragToReorder', 'Drag to reorder')})
                              </Typography>
                              <YTSearch handleSelection={handleYouTubeSearchSelection} handleQuestionChange={handleQuestionChange} value={q.songLink} index={index} />
                              <TextField
                                type="text"
                                label={t('createNewQuizPage.artistLabel')}
                                variant="outlined"
                                fullWidth
                                margin="dense"
                                value={q.artist}
                                onChange={e => handleQuestionChange(index, 'artist', e.target.value)}
                                required
                                slotProps={{ inputLabel: { shrink: true } }}
                              />
                              <TextField
                                type="text"
                                label={t('createNewQuizPage.songTitleLabel')}
                                variant="outlined"
                                fullWidth
                                margin="dense"
                                value={q.song}
                                onChange={e => handleQuestionChange(index, 'song', e.target.value)}
                                required
                                slotProps={{ inputLabel: { shrink: true } }}
                              />
                              {enableExtraQuestions && (
                                <>
                                  <TextField
                                    type="text"
                                    label={t('createNewQuizPage.extraLabel', 'Extra Question (Optional)')}
                                    variant="outlined"
                                    fullWidth
                                    margin="dense"
                                    value={q.extra || ''} // Ensure value is controlled
                                    onChange={e => handleQuestionChange(index, 'extra', e.target.value)}
                                    slotProps={{ inputLabel: { shrink: true } }}
                                  />

                                  <TextField
                                    type="text"
                                    label={t('createNewQuizPage.correctExtraAnswerLabel', 'Correct Answer to Extra Question')}
                                    variant="outlined"
                                    fullWidth
                                    margin="dense"
                                    value={q.correctExtraAnswer || ''} // Ensure value is controlled
                                    onChange={e => handleQuestionChange(index, 'correctExtraAnswer', e.target.value)}
                                    slotProps={{ inputLabel: { shrink: true } }}
                                  />
                                </>
                              )}
                              <TextField
                                type="text"
                                label={t('createNewQuizPage.hintOptionalLabel')}
                                variant="outlined"
                                fullWidth
                                margin="dense"
                                value={q.hint}
                                onChange={e => handleQuestionChange(index, 'hint', e.target.value)}
                                slotProps={{ inputLabel: { shrink: true } }}
                              />
                              {questions.length > 1 && ( // Only show remove if more than one question
                                <Button variant="outlined" color="error" startIcon={<RemoveCircleOutlineIcon />} onClick={() => removeQuestion(index)} sx={{ mt: 0.5, mb: 0.5 }}>
                                  {t('createNewQuizPage.removeSong')}
                                </Button>
                              )}
                            </Paper>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </Box>
                  )}
                </Droppable>
              </DragDropContext>
              {/* "Add Song Entry" button within the Song Entries Box */}
              <Button variant="outlined" startIcon={<AddCircleOutlineIcon />} onClick={addQuestion} className="button-add-question" sx={{ mt: 1, mb: 2 }}>
                {t('createNewQuizPage.addSongEntry')}
              </Button>
            </Box>
          )}
          <FormControlLabel
            control={<Checkbox checked={isReady} onChange={e => setIsReady(e.target.checked)} id="isReadyCheckbox" />}
            label={t('createNewQuizPage.markAsReadyLabel')}
            className="is-ready-checkbox-container"
            sx={{ display: 'block', mt: 1, mb: 1 }} // Reduced margins
          />
          <Button type="submit" variant="contained" color="primary" fullWidth className="button-submit-quiz">
            {t('createNewQuizPage.createQuizButton')}
          </Button>
          {success && (
            <Typography color="success.main" sx={{ mt: 2 }} className="form-message">
              {success}
            </Typography>
          )}
          {error && (
            <Typography color="error" sx={{ mt: 2 }} className="form-message">
              {error}
            </Typography>
          )}
        </Paper>
      ) : (
        <Typography>{t('createNewQuizPage.loginToCreate')}</Typography>
      )}
    </Box>
  );
};

export default Quiz;
