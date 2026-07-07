import re

with open("src/App.jsx", "r", encoding="utf-8") as f:
    content = f.read()

# Add Dashboard import
if "import Dashboard" not in content:
    content = content.replace("import Tutor from './views/Tutor'", "import Tutor from './views/Tutor'\nimport Dashboard from './views/Dashboard'")

# Add streak recording function at the top of the component (e.g. after notes state)
streak_logic = """
  // Streak Logic
  const recordActivity = () => {
    const today = new Date().toDateString();
    let streakData = { count: 0, lastStudyDate: null };
    try {
      const saved = localStorage.getItem('campusCopilotStreak');
      if (saved) streakData = JSON.parse(saved);
    } catch(e) {}
    
    if (streakData.lastStudyDate !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      if (streakData.lastStudyDate === yesterday.toDateString()) {
        streakData.count += 1;
      } else {
        streakData.count = 1;
      }
      streakData.lastStudyDate = today;
      localStorage.setItem('campusCopilotStreak', JSON.stringify(streakData));
    }
  };

  const saveQuizScore = (quizQuestions, userAnswers) => {
    let score = 0;
    quizQuestions.forEach((q, idx) => {
      if (userAnswers[idx] === q.correct_option) score++;
    });
    const pct = Math.round((score / quizQuestions.length) * 100);
    try {
      const scores = JSON.parse(localStorage.getItem('campusCopilotQuizScores') || '[]');
      scores.push(pct);
      localStorage.setItem('campusCopilotQuizScores', JSON.stringify(scores));
    } catch(e) {}
  };
"""

# Insert streak_logic right after notesDrawerOpen state definition if not there
if "const recordActivity" not in content:
    content = content.replace("const [notesDrawerOpen, setNotesDrawerOpen] = useState(false);", "const [notesDrawerOpen, setNotesDrawerOpen] = useState(false);" + streak_logic)

# Call recordActivity in toggleTaskCompletion
if "recordActivity();" not in content:
    content = content.replace("task.isCompleted = !task.isCompleted;", "task.isCompleted = !task.isCompleted;\n      if (task.isCompleted) recordActivity();")

# Call recordActivity and saveQuizScore on submit quiz
submit_logic = """
                  } else {
                    recordActivity();
                    saveQuizScore(quizQuestions, userAnswers);
                    setQuizFinished(true);
                  }
"""
content = content.replace("""                  } else {
                    setQuizFinished(true);
                  }""", submit_logic)


# Replace case 'dashboard': block
dashboard_pattern = re.compile(r"      case 'dashboard':\s*return \(.*?case 'roadmap':", re.DOTALL)
dashboard_replacement = """      case 'dashboard':
        return (
          <Dashboard 
            roadmaps={roadmaps} 
            setActiveRoadmapTab={(tab) => {
              setActiveRoadmapTab(tab);
              setCurrentView('roadmap');
            }} 
          />
        );
      case 'roadmap':"""

content = dashboard_pattern.sub(dashboard_replacement, content)

with open("src/App.jsx", "w", encoding="utf-8") as f:
    f.write(content)
