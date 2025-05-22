import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { db } from "./firebase";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  orderBy,
  getDocs,
} from "firebase/firestore";
import { format } from "date-fns";
import MusicPlayer from "./components/MusicPlayer";

const QuizDetails = () => {
  const { quizId } = useParams();
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [answersLoading, setAnswersLoading] = useState(true);
  const [answersError, setAnswersError] = useState(null);

  useEffect(() => {
    const fetchQuizDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const quizDocRef = doc(db, "quizzes", quizId);
        const quizDocSnap = await getDoc(quizDocRef);

        if (quizDocSnap.exists()) {
          const data = quizDocSnap.data();
          setQuiz({
            id: quizDocSnap.id,
            ...data,
            createdAt: data.createdAt ? data.createdAt.toDate() : null,
          });
        } else {
          setError("Quiz not found.");
        }
      } catch (err) {
        console.error("Error fetching quiz details:", err);
        setError("Failed to load quiz details. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    if (quizId) {
      fetchQuizDetails();
    }
  }, [quizId]);

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
        const fetchedAnswers = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          submittedAt: doc.data().submittedAt
            ? doc.data().submittedAt.toDate()
            : null,
        }));
        setAnswers(fetchedAnswers);
      } catch (err) {
        console.error("Error fetching answers for quiz details:", err);
        setAnswersError("Failed to load submitted answers.");
      } finally {
        setAnswersLoading(false);
      }
    };

    fetchAnswers();
  }, [quizId]);

  if (loading) return <p>Loading quiz details...</p>;
  if (error) return <p className="error-text">{error}</p>;
  if (!quiz)
    return (
      <p>
        Quiz not found. <Link to="/my-quizzes">Go back to My Quizzes</Link>
      </p>
    );

  return (
    <div className="quiz-container">
      <h1>{quiz.title}</h1>
      <p>
        <strong>Rules:</strong> {quiz.rules || "No rules provided."}
      </p>
      <p>
        <strong>Number of Songs:</strong> {quiz.amount}
      </p>
      <p>
        <strong>Created By:</strong> {quiz.creatorName || "Unknown"}
      </p>
      <p>
        <strong>Created At:</strong>{" "}
        {quiz.createdAt ? format(quiz.createdAt, "yyyy-MM-dd HH:mm") : "N/A"}
      </p>
      <h2>Questions (Song Details)</h2>
      {quiz.questions && quiz.questions.length > 0 ? (
        <ul className="quiz-questions-list">
          {quiz.questions.map((q, index) => (
            // <li key={index} className="quiz-question-item">
            //     <strong>Song {index + 1}:</strong> Artist - "{q.artist}", Title - "{q.song}"
            //     {q.songLink && <p>Link: <a href={q.songLink} target="_blank" rel="noopener noreferrer">{q.artist} - {q.song}</a></p>}
            // </li>
            <MusicPlayer
              key={index}
              artist={q.artist}
              song={q.song}
              songNumber={index + 1}
              songLink={q.songLink}
            />
          ))}
        </ul>
      ) : (
        <p>No questions found for this quiz.</p>
      )}
      <h2 className="section-heading">Submitted Answers</h2>
      {answersLoading && <p>Loading submitted answers...</p>}
      {answersError && <p className="error-text">{answersError}</p>}
      {!answersLoading && !answersError && answers.length === 0 && (
        <p>No one has submitted answers for this quiz yet.</p>
      )}
      {!answersLoading && !answersError && answers.length > 0 && (
        <div className="table-responsive-wrapper">
          <table className="quizzes-table">
            <thead>
              <tr>
                <th>Answered By</th>
                <th>Score</th>
                <th>Status</th>
                <th>Submitted At</th>
              </tr>
            </thead>
            <tbody>
              {answers.map((answer) => (
                <tr key={answer.id}>
                  <td data-label="Answered By">
                    {answer.answerCreatorName || "Anonymous"}
                  </td>
                  <td data-label="Score">
                    {answer.score} /{" "}
                    {answer.answers ? answer.answers.length * 1 : "N/A"}
                  </td>
                  <td data-label="Status">
                    {answer.isCompleted
                      ? "Completed"
                      : answer.isChecked
                      ? "Ready for Review"
                      : "In Progress"}
                  </td>
                  <td data-label="Submitted">
                    {answer.submittedAt
                      ? format(answer.submittedAt, "yyyy-MM-dd HH:mm")
                      : "N/A"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Link to="/my-quizzes" className="back-link">
        Back to My Quizzes
      </Link>
    </div>
  );
};

export default QuizDetails;
