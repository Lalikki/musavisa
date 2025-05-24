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
// import './App.css';
// import './Mui.css';
// import './Navbar.css'; 
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from './theme'; // Import your custom theme
import { HashRouter as Router, Routes, Route } from "react-router-dom";

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline /> {/* Applies baseline styles and background from theme */}
      <Router>
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/quizzes" element={<Quizzes />} />
          <Route path="/my-answers" element={<MyAnswers />} />
          <Route path="/my-quizzes/:quizId" element={<QuizDetails />} />
          <Route path="/answer-quiz/:quizId" element={<AnswerQuiz />} />
          <Route path="/highscores" element={<Highscores />} />
          <Route path="/my-answers/:answerId" element={<AnswerDetails />} />
          <Route path="/edit-answer/:answerId" element={<EditAnswer />} />
          <Route path="/edit-quiz/:quizId" element={<EditQuiz />} />
          <Route path="/my-quizzes" element={<MyQuizzes />} />
          <Route path="/quiz" element={<Quiz />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;