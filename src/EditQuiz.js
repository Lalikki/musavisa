import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, auth } from './firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

const EditQuiz = () => {
    const { quizId } = useParams();
    const navigate = useNavigate();

    const [user, setUser] = useState(null);
    const [originalQuizData, setOriginalQuizData] = useState(null); // To store initially fetched quiz for auth check

    // Form state
    const [title, setTitle] = useState("");
    const [rules, setRules] = useState("");
    const [amount, setAmount] = useState("");
    const [questions, setQuestions] = useState([{ songLink: "", artist: "", song: "" }]);
    const [isReady, setIsReady] = useState(false); // New state for isReady

    // UI state
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState("");

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!quizId || !user) {
            if (!user && quizId) setError("Please log in to edit quizzes.");
            // Don't set loading to false here if user is null yet, wait for auth state
            return;
        }

        const fetchQuiz = async () => {
            setLoading(true);
            setError("");
            try {
                const quizDocRef = doc(db, 'quizzes', quizId);
                const quizDocSnap = await getDoc(quizDocRef);

                if (quizDocSnap.exists()) {
                    const data = quizDocSnap.data();
                    if (data.createdBy !== user.uid) {
                        setError("You are not authorized to edit this quiz.");
                        setOriginalQuizData(null); // Clear any potentially sensitive data
                    } else {
                        setOriginalQuizData(data);
                        setTitle(data.title || "");
                        setRules(data.rules || "");
                        setAmount(data.amount ? String(data.amount) : "");
                        setQuestions(data.questions && data.questions.length > 0 ? data.questions.map(q => ({ ...q })) : [{ songLink: "", artist: "", song: "" }]);
                        setIsReady(data.isReady || false); // Populate isReady state
                    }
                } else {
                    setError("Quiz not found.");
                }
            } catch (err) {
                console.error("Error fetching quiz for editing:", err);
                setError("Failed to load quiz data. " + err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchQuiz();
    }, [quizId, user]);

    // Effect to sync questions array with amount input
    useEffect(() => {
        const numAmount = Number(amount);
        if (!isNaN(numAmount) && numAmount >= 0 && questions) { // Allow 0 for amount
            const currentLength = questions.length;
            if (numAmount > currentLength) {
                const newQuestionsToAdd = Array(numAmount - currentLength).fill(null).map(() => ({ songLink: "", artist: "", song: "" }));
                setQuestions(prevQuestions => [...prevQuestions, ...newQuestionsToAdd]);
            }
            // Decreasing 'amount' in the input field will no longer automatically remove question entries.
            // Users must use the "Remove Song" button for that.
        } else if (amount === "" && questions && questions.length > 0) {
            // If amount is cleared, and questions exist, reset questions array.
            // This is a deliberate action by the user to clear the amount.
            if (questions.length !== 0) {
                setQuestions([]); // Or setQuestions([{ songLink: "", artist: "", song: "" }]) if 1 is min
            }
        }
    }, [amount]); // Only re-run if amount changes

    const handleQuestionChange = (index, field, value) => {
        const updatedQuestions = questions.map((q, i) => {
            if (i === index) {
                return { ...q, [field]: value };
            }
            return q;
        });
        setQuestions(updatedQuestions);
    };

    const addQuestion = () => {
        const newQuestions = [...questions, { songLink: "", artist: "", song: "" }];
        setQuestions(newQuestions);
        setAmount(String(newQuestions.length));
    };

    const removeQuestion = (index) => {
        const newQuestions = questions.filter((_, i) => i !== index);
        setQuestions(newQuestions);
        setAmount(String(newQuestions.length));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSuccess("");
        setError("");

        if (!originalQuizData || originalQuizData.createdBy !== user?.uid) {
            setError("Authorization error or quiz data not loaded properly.");
            return;
        }

        // Validations (similar to Quiz.js)
        if (!title.trim()) { setError("Title is required"); return; }
        if (!amount || isNaN(amount) || Number(amount) <= 0) { setError("Amount of songs must be a positive number"); return; }
        if (questions.length !== Number(amount)) { setError(`Number of song entries (${questions.length}) must match 'Amount of songs' (${amount}).`); return; }
        for (const q of questions) {
            if (!q.artist.trim() || !q.song.trim()) { setError("Artist and Song fields cannot be empty for any song entry."); return; }
        }

        setSaving(true);
        try {
            const quizDocRef = doc(db, 'quizzes', quizId);
            await updateDoc(quizDocRef, {
                title,
                rules,
                amount: Number(amount),
                questions,
                isReady, // Add isReady to the update
                updatedAt: serverTimestamp() // Optional: track updates
            });
            setSuccess("Quiz updated successfully!");
            setTimeout(() => navigate('/my-quizzes'), 1500); // Redirect after a short delay
        } catch (err) {
            setError("Failed to update quiz: " + err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <p>Loading quiz for editing...</p>;
    if (error && !originalQuizData) return <p className="error-text">{error} <button onClick={() => navigate('/my-quizzes')}>Back to My Quizzes</button></p>;
    if (!user) return <p>Please log in to edit quizzes.</p>;
    if (!originalQuizData && !loading) return <p>Quiz data could not be loaded or you are not authorized.</p>


    // Re-using form structure from Quiz.js, but with state from EditQuiz.js
    return (
        <div className="quiz-container"> {/* Can reuse .quiz-container or make .edit-quiz-container */}
            <h1>Edit Quiz: {originalQuizData?.title}</h1>
            <form onSubmit={handleSubmit} className="quiz-creation-form"> {/* Use quiz-creation-form class */}
                <div>
                    <label>Title:</label>
                    <input type="text" value={title} onChange={e => setTitle(e.target.value)} />
                </div>
                <div>
                    <label>Rules:</label>
                    <textarea value={rules} onChange={e => setRules(e.target.value)} className="form-input-full-width" />
                </div>
                <div>
                    <label>Amount of songs:</label>
                    <input type="number" min="0" value={amount} readOnly className="form-input-full-width" disabled />
                </div>
                <h3>Song Entries</h3>
                {questions.map((q, index) => (
                    <div key={index} className="question-entry-box"> {/* Use question-entry-box class */}
                        <h4>Song {index + 1}</h4>
                        <label>Song Link:</label>
                        <input type="text" placeholder="https://youtube.com/..." value={q.songLink} onChange={e => handleQuestionChange(index, "songLink", e.target.value)} className="form-input-question" />
                        <label>Artist:</label>
                        <input type="text" placeholder="Artist Name" value={q.artist} onChange={e => handleQuestionChange(index, "artist", e.target.value)} required className="form-input-question" />
                        <label>Song Title:</label>
                        <input type="text" placeholder="Song Title" value={q.song} onChange={e => handleQuestionChange(index, "song", e.target.value)} required className="form-input-question" />
                        {questions.length > 1 && (
                            <button type="button" onClick={() => removeQuestion(index)} className="button-remove-question">Remove Song</button>
                        )}
                    </div>
                ))}
                <button type="button" onClick={addQuestion} className="button-add-question">Add Song Entry</button>
                <div className="is-ready-checkbox-container"> {/* Use is-ready-checkbox-container class */}
                    <label htmlFor="editIsReadyCheckbox" className="is-ready-checkbox-label">Mark as Ready:</label>
                    <input type="checkbox" id="editIsReadyCheckbox" checked={isReady} onChange={e => setIsReady(e.target.checked)} />
                </div>
                <button type="submit" disabled={saving} className="button-submit-quiz">{saving ? 'Saving...' : 'Save Changes'}</button> {/* Use button-submit-quiz class */}
                {success && <p className="success-text form-message">{success}</p>}
                {error && <p className="error-text form-message">{error}</p>}
            </form>
        </div>
    );
};

export default EditQuiz;