import React from "react";
import Home from "./Home";
import Quizzes from "./Quizzes"; // Import the new Quizzes component
import AnswerQuiz from "./AnswerQuiz"; // Import the new AnswerQuiz component
import MyAnswers from "./MyAnswers"; // Import the MyAnswers component
import MyQuizzes from "./MyQuizzes"; // Import the MyQuizzes component
import QuizDetails from "./QuizDetails"; // Import the QuizDetails component
import EditAnswer from "./EditAnswer"; // Import the EditAnswer component
import AnswerDetails from "./AnswerDetails"; // Import the AnswerDetails component
import Highscores from "./Highscores"; // Import the Highscores component
import EditQuiz from "./EditQuiz"; // Import the EditQuiz component
import Quiz from "./Quiz";
import Navbar from "./Navbar";
import "./App.css";
import "./Mui.css";
import "./Navbar.css"; // Add this line
import { HashRouter as Router, Routes, Route } from "react-router-dom";

function App() {
  return (
    <Router>
      <div className="App">
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/quizzes" element={<Quizzes />} />
          {/* Add route for All Quizzes */}
          <Route path="/my-answers" element={<MyAnswers />} />
          {/* Route for My Answers */}
          <Route path="/my-quizzes/:quizId" element={<QuizDetails />} />
          {/* Route for specific Quiz Details */}
          <Route path="/answer-quiz/:quizId" element={<AnswerQuiz />} />
          {/* Route for answering a specific quiz */}
          <Route path="/highscores" element={<Highscores />} />
          {/* Route for Highscores */}
          <Route path="/my-answers/:answerId" element={<AnswerDetails />} />
          {/* Route for specific Answer Details */}
          <Route path="/edit-answer/:answerId" element={<EditAnswer />} />
          {/* Route for editing an answer */}
          <Route path="/edit-quiz/:quizId" element={<EditQuiz />} />
          {/* Route for editing a quiz */}
          <Route path="/my-quizzes" element={<MyQuizzes />} />
          {/* Route for My Quizzes */}
          <Route path="/quiz" element={<Quiz />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
