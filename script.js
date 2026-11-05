// ==========================================
// 1. GLOBAL VARIABLES
// ==========================================

let questions = [];
let filteredQuestions = [];
let currentQuestionIndex = 0;
let selectedAnswers = {};
let timeLeft = 1200;
let timerInterval = null;
let quizSubmitted = false;
const BEST_SCORE_KEY = "quizBestScore";

// ==========================================
// 2. DOM ELEMENTS
// ==========================================

const btn =
  document.getElementById("startBtn") ||
  document.getElementById("startBtn") ||
  document.querySelector("#welcomeScreen button");

const welcomeScreen = document.getElementById("welcomeScreen");
const quizScreen = document.getElementById("quizScreen");
const resultScreen = document.getElementById("resultScreen");
const questionText = document.getElementById("questionText");
const optionsContainer = document.getElementById("optionsContainer");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const submitBtn = document.getElementById("submitBtn");
const questionCounter = document.getElementById("questionCounter");
const progressBar = document.getElementById("progressBar");
const questionPalette = document.getElementById("questionPalette");
const timer = document.getElementById("timer");
const finalScore = document.getElementById("finalScore");
const percentage = document.getElementById("percentage");
const correctCount = document.getElementById("correctCount");
const wrongCount = document.getElementById("wrongCount");
const accuracy = document.getElementById("accuracy");
const reviewContainer = document.getElementById("reviewContainer");
const restartBtn = document.getElementById("restartBtn");
const heading = document.getElementById("heading");
const description = document.getElementById("description");
const categorySelect = document.getElementById("categorySelect");
const difficultySelect = document.getElementById("difficultySelect");
const bestScoreElement = document.getElementById("bestScore");
const homeBtn = document.getElementById("homeBtn");

// ==========================================
// 3. JSON QUESTION FILES
// ==========================================

const questionFiles = [
  "./questions/dsa.json",
  "./questions/dbms.json",
  "./questions/os.json",
  "./questions/cn.json",
  "./questions/oop.json",
  "./questions/programming.json",
  "./questions/javascript.json",
  "./questions/html-css.json",
  "./questions/aptitude.json",
  "./questions/react.json",
];

// ==========================================
// 4. LOAD QUESTIONS FROM JSON
// ==========================================

async function loadQuestions() {
  try {
    btn.disabled = true;
    btn.textContent = "Loading Questions...";

    const responses = await Promise.all(
      questionFiles.map((file) => fetch(file)),
    );

    if (responses.some((response) => !response.ok)) {
      throw new Error("One or more JSON files could not be loaded.");
    }

    const questionGroups = await Promise.all(
      responses.map((response) => response.json()),
    );

    questions = questionGroups.flat();

    if (questions.length !== 200) {
      throw new Error(`Expected 200 questions, found ${questions.length}`);
    }

    // Validate question structure
    const invalidQuestion = questions.find(
      (question) =>
        !question.id ||
        !question.category ||
        !question.difficulty ||
        !question.question ||
        !Array.isArray(question.options) ||
        question.options.length !== 4 ||
        !question.options.includes(question.correctAnswer),
    );

    if (invalidQuestion) {
      throw new Error(`Invalid question data at ID ${invalidQuestion.id}`);
    }

    console.log(`${questions.length} questions loaded successfully!`);

    // Show category-wise question count
    const categoryCounts = questions.reduce((counts, question) => {
      counts[question.category] = (counts[question.category] || 0) + 1;

      return counts;
    }, {});

    console.table(categoryCounts);

    btn.disabled = false;
    btn.textContent = "Start Quiz";
  } catch (error) {
    console.error("Question loading failed:", error);

    btn.disabled = true;
    btn.textContent = "Loading Failed";

    alert("Questions could not be loaded. Check your JSON files and Console.");
  }
}

// ==========================================
// 5. SCREEN NAVIGATION
// ==========================================

function showScreen(screenToShow) {
  [welcomeScreen, quizScreen, resultScreen].forEach((screen) => {
    if (screen) {
      screen.hidden = screen !== screenToShow;
    }
  });
}

// ==========================================
// 6. BEST SCORE
// ==========================================

function displayBestScore() {
  const bestScore = localStorage.getItem(BEST_SCORE_KEY);

  if (bestScoreElement) {
    bestScoreElement.textContent = bestScore !== null ? bestScore : "0";
  }
}

// ==========================================
// 7. START QUIZ
// ==========================================

// ==========================================
// 7. START QUIZ
// ==========================================

function startQuiz() {
  // Get selected category and difficulty
  const category = categorySelect.value;
  const difficulty = difficultySelect.value;

  // Category selection is compulsory
  if (!category) {
    alert("Please select a category before starting the quiz.");
    categorySelect.focus();
    return;
  }

  // Filter questions
  filteredQuestions = questions.filter((question) => {
    const categoryMatch = question.category === category;

    const difficultyMatch =
      difficulty === "all" || question.difficulty === difficulty;

    return categoryMatch && difficultyMatch;
  });

  // Check question availability
  if (filteredQuestions.length === 0) {
    alert("No questions available for this selection.");
    return;
  }

  // Reset quiz data
  currentQuestionIndex = 0;
  selectedAnswers = {};
  quizSubmitted = false;

  timeLeft = 1200;

  clearInterval(timerInterval);

  // Start quiz
  showScreen(quizScreen);

  displayQuestion();
  startTimer();
}

// ==========================================
// 8. DISPLAY QUESTION
// ==========================================

function displayQuestion() {
  const question = filteredQuestions[currentQuestionIndex];

  if (!question) return;

  // Question text
  questionText.textContent = question.question;

  // Question counter
  questionCounter.textContent = `Question ${currentQuestionIndex + 1} of ${filteredQuestions.length}`;

  // Progress bar
  const progress =
    ((currentQuestionIndex + 1) / filteredQuestions.length) * 100;

  progressBar.style.width = `${progress}%`;

  // Previous button
  prevBtn.disabled = currentQuestionIndex === 0;

  // Next button
  if (currentQuestionIndex === filteredQuestions.length - 1) {
    nextBtn.style.display = "none";
  } else {
    nextBtn.style.display = "";
  }

  // Hide submit button until last question
  submitBtn.style.display =
    currentQuestionIndex === filteredQuestions.length - 1 ? "" : "none";

  // Clear previous options
  optionsContainer.innerHTML = "";

  // Create option buttons
  question.options.forEach((option, index) => {
    const optionButton = document.createElement("button");

    optionButton.className = "option-btn";
    optionButton.textContent = option;

    // Option label
    const optionLabel = String.fromCharCode(65 + index);

    optionButton.setAttribute("data-option", optionLabel);

    // Restore selected answer
    if (selectedAnswers[question.id] === option) {
      optionButton.classList.add("selected");
    }

    optionButton.addEventListener("click", () => {
      if (quizSubmitted) return;

      selectedAnswers[question.id] = option;

      displayQuestion();
    });

    optionsContainer.appendChild(optionButton);
  });

  updateQuestionPalette();
}

// ==========================================
// 9. QUESTION PALETTE
// ==========================================

function updateQuestionPalette() {
  if (!questionPalette) return;

  questionPalette.innerHTML = "";

  filteredQuestions.forEach((question, index) => {
    const paletteButton = document.createElement("button");

    paletteButton.textContent = index + 1;
    paletteButton.className = "palette-btn";

    if (index === currentQuestionIndex) {
      paletteButton.classList.add("current");
    }

    if (selectedAnswers[question.id]) {
      paletteButton.classList.add("answered");
    }

    paletteButton.addEventListener("click", () => {
      currentQuestionIndex = index;
      displayQuestion();
    });

    questionPalette.appendChild(paletteButton);
  });
}

// ==========================================
// 10. NEXT AND PREVIOUS QUESTION
// ==========================================

function nextQuestion() {
  if (currentQuestionIndex < filteredQuestions.length - 1) {
    currentQuestionIndex++;
    displayQuestion();
  }
}

function previousQuestion() {
  if (currentQuestionIndex > 0) {
    currentQuestionIndex--;
    displayQuestion();
  }
}

// ==========================================
// 11. TIMER
// ==========================================

// ==========================================
// 8. START TIMER
// ==========================================

function startTimer() {
  clearInterval(timerInterval);

  timerInterval = setInterval(() => {
    timeLeft--;

    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;

    timer.textContent = `Time Left: ${minutes}:${String(seconds).padStart(2, "0")}`;

    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      submitQuiz(true);
    }
  }, 1000);
}

// ==========================================
// 12. CALCULATE QUIZ STATISTICS
// ==========================================

function calculateStats() {
  let correct = 0;
  let wrong = 0;

  filteredQuestions.forEach((question) => {
    const selectedAnswer = selectedAnswers[question.id];

    if (selectedAnswer === question.correctAnswer) {
      correct++;
    } else if (selectedAnswer) {
      wrong++;
    }
  });

  const unanswered = filteredQuestions.length - correct - wrong;

  const total = filteredQuestions.length;

  const score = correct;

  const resultPercentage = total > 0 ? Math.round((correct / total) * 100) : 0;

  return {
    correct,
    wrong,
    unanswered,
    total,
    score,
    percentage: resultPercentage,
  };
}

// ==========================================
// 13. SUBMIT QUIZ
// ==========================================

function submitQuiz(isTimeUp = false) {
  if (quizSubmitted) return;

  const unanswered = filteredQuestions.filter(
    (question) => !selectedAnswers[question.id],
  );

  if (!isTimeUp && unanswered.length > 0) {
    const confirmSubmit = confirm(
      `You have ${unanswered.length} unanswered questions. Submit anyway?`,
    );

    if (!confirmSubmit) return;
  }

  quizSubmitted = true;

  clearInterval(timerInterval);

  const stats = calculateStats();

  // Display score
  finalScore.textContent = `${stats.score}/${stats.total}`;

  percentage.textContent = `${stats.percentage}%`;

  correctCount.textContent = stats.correct;
  wrongCount.textContent = stats.wrong;

  accuracy.textContent = `${stats.percentage}%`;

  // Update best score
  const previousBest = Number(localStorage.getItem(BEST_SCORE_KEY) || 0);

  if (stats.score > previousBest) {
    localStorage.setItem(BEST_SCORE_KEY, stats.score);
  }

  displayBestScore();

  displayReview();

  showScreen(resultScreen);
}

// ==========================================
// 14. ANSWER REVIEW
// ==========================================

function displayReview() {
  reviewContainer.innerHTML = "";

  filteredQuestions.forEach((question, index) => {
    const selectedAnswer = selectedAnswers[question.id];

    const isCorrect = selectedAnswer === question.correctAnswer;

    const reviewItem = document.createElement("div");

    reviewItem.className = "review-item";

    if (!selectedAnswer) {
      reviewItem.classList.add("unanswered");
    } else if (isCorrect) {
      reviewItem.classList.add("correct");
    } else {
      reviewItem.classList.add("wrong");
    }

    const questionHeading = document.createElement("h3");

    questionHeading.textContent = `Q${index + 1}. ${question.question}`;

    const selectedText = document.createElement("p");

    selectedText.textContent = `Your Answer: ${selectedAnswer || "Not answered"}`;

    const correctText = document.createElement("p");

    correctText.textContent = `Correct Answer: ${question.correctAnswer}`;

    const status = document.createElement("p");

    if (!selectedAnswer) {
      status.textContent = "Not Attempted";
    } else if (isCorrect) {
      status.textContent = "Correct";
    } else {
      status.textContent = "Incorrect";
    }

    reviewItem.append(questionHeading, selectedText, correctText, status);

    reviewContainer.appendChild(reviewItem);
  });
}

// ==========================================
// 15. RESTART QUIZ
// ==========================================

function restartQuiz() {
  clearInterval(timerInterval);

  currentQuestionIndex = 0;
  selectedAnswers = {};

  timeLeft = 60;

  quizSubmitted = false;

  displayBestScore();

  showScreen(welcomeScreen);
}

// ==========================================
// 16. KEYBOARD NAVIGATION
// ==========================================

document.addEventListener("keydown", (event) => {
  if (quizScreen.style.display === "none" || quizSubmitted) {
    return;
  }

  if (event.key === "ArrowRight") {
    nextQuestion();
  }

  if (event.key === "ArrowLeft") {
    previousQuestion();
  }
});

// ==========================================
// 17. EVENT LISTENERS
// ==========================================

btn.addEventListener("click", startQuiz);

nextBtn.addEventListener("click", nextQuestion);

prevBtn.addEventListener("click", previousQuestion);

submitBtn.addEventListener("click", () => submitQuiz(false));

restartBtn.addEventListener("click", restartQuiz);

// ==========================================
// 18. INITIALIZE APPLICATION
// ==========================================

showScreen(welcomeScreen);

displayBestScore();

loadQuestions();


homeBtn.addEventListener("click", () => {
    clearInterval(timerInterval);
    showScreen(welcomeScreen);
});