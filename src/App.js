import React from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import Home from "./Home";
import Login from "./Login";
import Quizzes from "./Quizzes"; // Import the new Quizzes component
import AnswerQuiz from "./AnswerQuiz"; // Import the new AnswerQuiz component
import Quiz from "./Quiz";
import Navbar from "./Navbar";
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/quizzes" element={<Quizzes />} /> {/* Add route for All Quizzes */}
          <Route path="/answer-quiz/:quizId" element={<AnswerQuiz />} /> {/* Route for answering a specific quiz */}
          <Route path="/quiz" element={<Quiz />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
