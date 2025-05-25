import React, { useState, useEffect } from 'react';
import { db, auth } from './firebase';
import { collection, query, where, getDocs, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Radio from '@mui/material/Radio';
import FormControlLabel from '@mui/material/FormControlLabel';
import RadioGroup from '@mui/material/RadioGroup';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';

const ShareQuizModal = ({ open, onClose, quiz }) => {
    const [usersList, setUsersList] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [sharing, setSharing] = useState(false);

    useEffect(() => {
        if (open && quiz) {
            const fetchUsers = async () => {
                setLoadingUsers(true);
                setError('');
                setSuccess('');
                setSelectedUserId(''); // Reset selection when modal opens
                try {
                    const usersRef = collection(db, "users");
                    // Fetch all users except the current logged-in user (quiz owner)
                    // and users already in quiz.sharedWithUids
                    const q = query(usersRef, where("uid", "!=", auth.currentUser?.uid));
                    const querySnapshot = await getDocs(q);
                    let fetchedUsers = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                    // Filter out users already shared with, if that data exists on the quiz
                    if (quiz.sharedWithUids && Array.isArray(quiz.sharedWithUids)) {
                        fetchedUsers = fetchedUsers.filter(u => !quiz.sharedWithUids.includes(u.uid));
                    }

                    setUsersList(fetchedUsers);
                } catch (err) {
                    console.error("Error fetching users:", err);
                    setError("Failed to load users. Please ensure a 'users' collection exists with 'uid' and 'displayName' fields.");
                } finally {
                    setLoadingUsers(false);
                }
            };
            fetchUsers();
        }
    }, [open, quiz]);

    const handleShareQuiz = async () => {
        if (!selectedUserId) {
            setError("Please select a user to share with.");
            return;
        }
        if (!quiz || !quiz.id) {
            setError("Quiz information is missing.");
            return;
        }
        setSharing(true);
        setError('');
        setSuccess('');

        try {
            const quizDocRef = doc(db, "quizzes", quiz.id);
            await updateDoc(quizDocRef, {
                sharedWithUids: arrayUnion(selectedUserId)
            });
            setSuccess(`Quiz "${quiz.title}" shared successfully with the selected user!`);
            // Optionally, refetch users to update the list or simply close
            // For simplicity, we'll let the user close or share with another.
            // To auto-close: onClose();
            // To update list: re-trigger fetchUsers or filter client-side
            setUsersList(usersList.filter(u => u.uid !== selectedUserId)); // Remove shared user from current list
            setSelectedUserId(''); // Reset selection
        } catch (err) {
            console.error("Error sharing quiz:", err);
            setError("Failed to share quiz. " + err.message);
        } finally {
            setSharing(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
            <DialogTitle>Share Quiz: {quiz?.title}</DialogTitle>
            <DialogContent dividers>
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

                {loadingUsers ? (
                    <CircularProgress />
                ) : usersList.length === 0 ? (
                    <Typography>All eligible users have already been shared with.</Typography>
                ) : (
                    <RadioGroup
                        aria-label="select user"
                        name="select-user-group"
                        value={selectedUserId}
                        onChange={(e) => setSelectedUserId(e.target.value)}
                    >
                        <List>
                            {usersList.map((userItem) => (
                                <ListItem key={userItem.uid || userItem.id} disablePadding>
                                    <ListItemButton onClick={() => setSelectedUserId(userItem.uid)}>
                                        <FormControlLabel
                                            value={userItem.uid}
                                            control={<Radio checked={selectedUserId === userItem.uid} />}
                                            label={userItem.displayName || 'Unnamed User'}
                                            sx={{ width: '100%' }}
                                        />
                                    </ListItemButton>
                                </ListItem>
                            ))}
                        </List>
                    </RadioGroup>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="inherit">Cancel</Button>
                <Button onClick={handleShareQuiz} color="primary" disabled={sharing || !selectedUserId || loadingUsers}>
                    {sharing ? <CircularProgress size={24} /> : "Share"}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default ShareQuizModal;
