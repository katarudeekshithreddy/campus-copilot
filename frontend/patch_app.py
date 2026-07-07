import re

with open("src/App.jsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add Quiz State
state_block = """  // Notes State
  const [notesDrawerOpen, setNotesDrawerOpen] = useState(false);
  const [currentNoteModule, setCurrentNoteModule] = useState(null);
  const [moduleNotes, setModuleNotes] = useState(() => {
    const saved = localStorage.getItem('campusCopilotNotes');
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    localStorage.setItem('campusCopilotNotes', JSON.stringify(moduleNotes));
  }, [moduleNotes]);

  // Quiz State
  const [activeQuizModule, setActiveQuizModule] = useState(null);
  const [isQuizLoading, setIsQuizLoading] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [quizFinished, setQuizFinished] = useState(false);

  const openQuizModal = async (moduleData) => {
    setActiveQuizModule(moduleData);
    setIsQuizLoading(true);
    setQuizQuestions([]);
    setCurrentQuestionIdx(0);
    setUserAnswers({});
    setQuizFinished(false);
    
    try {
      const userApiKey = localStorage.getItem('gemini_api_key') || '';
      const headers = { 'Content-Type': 'application/json' };
      if (userApiKey) headers['X-API-Key'] = userApiKey;
      
      const res = await fetch('http://127.0.0.1:8000/api/v1/quiz/generate', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          module_title: moduleData.title,
          action_items: moduleData.action_items
        })
      });
      if (res.ok) {
        const data = await res.json();
        setQuizQuestions(data);
      } else {
        alert("Failed to generate quiz.");
      }
    } catch (e) {
      console.error(e);
      alert("Error generating quiz");
    } finally {
      setIsQuizLoading(false);
    }
  };"""

content = re.sub(
    r"  // Notes State.*?}, \[moduleNotes\]\);", 
    state_block, 
    content, 
    flags=re.DOTALL
)

# 2. Add Quiz Modal before Notes Drawer
quiz_modal = """
      {/* Quiz Modal */}
      <div className={`quiz-modal-overlay ${activeQuizModule ? 'open' : ''}`}>
        <div className="quiz-modal-content">
          <div className="quiz-modal-header">
            <h3 style={{margin: 0}}>🧠 {activeQuizModule?.title} - Quick Quiz</h3>
            <button className="btn-secondary" style={{padding: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center'}} onClick={() => setActiveQuizModule(null)}>
              <X size={20} />
            </button>
          </div>
          
          <div className="quiz-modal-body">
            {isQuizLoading ? (
              <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '1rem', color: 'var(--text-secondary)'}}>
                <div className="radar-dot"></div>
                <p>AI Agent assembling your customized quiz blocks...</p>
              </div>
            ) : quizQuestions.length > 0 ? (
              quizFinished ? (
                // Scorecard View
                <div>
                  <div className="quiz-score-circle">
                    {Math.round((Object.values(userAnswers).filter((ans, idx) => ans === quizQuestions[idx].correctAnswerIdx).length / quizQuestions.length) * 100)}%
                  </div>
                  <h4 style={{textAlign: 'center', marginBottom: '2rem'}}>
                    Score: {Object.values(userAnswers).filter((ans, idx) => ans === quizQuestions[idx].correctAnswerIdx).length}/{quizQuestions.length}
                  </h4>
                  
                  {quizQuestions.map((q, idx) => {
                    const isCorrect = userAnswers[idx] === q.correctAnswerIdx;
                    return (
                      <div key={idx} style={{marginBottom: '2rem'}}>
                        <p style={{fontWeight: 600, display: 'flex', alignItems: 'flex-start', gap: '0.5rem'}}>
                          <span>{isCorrect ? '✅' : '❌'}</span>
                          <span>{q.question}</span>
                        </p>
                        <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem', marginLeft: '1.7rem', marginTop: '1rem'}}>
                          {q.options.map((opt, optIdx) => {
                            let className = "quiz-option-button";
                            if (optIdx === q.correctAnswerIdx) className += " correct";
                            else if (optIdx === userAnswers[idx] && !isCorrect) className += " incorrect";
                            
                            return (
                              <div key={optIdx} className={className} style={{cursor: 'default', padding: '0.75rem', marginBottom: '0'}}>
                                <span>{['A','B','C','D'][optIdx]}.</span>
                                <span>{opt}</span>
                              </div>
                            );
                          })}
                        </div>
                        <div style={{marginLeft: '1.7rem', marginTop: '1rem', padding: '1rem', background: 'rgba(99, 102, 241, 0.1)', borderLeft: '4px solid var(--accent-primary)', borderRadius: '4px'}}>
                          <strong>Explanation:</strong> {q.explanation}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                // Runner View
                <div>
                  <p style={{color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem', textAlign: 'center'}}>
                    Question {currentQuestionIdx + 1} of {quizQuestions.length}
                  </p>
                  <h3 style={{marginBottom: '2rem', lineHeight: 1.4}}>{quizQuestions[currentQuestionIdx].question}</h3>
                  <div style={{display: 'flex', flexDirection: 'column'}}>
                    {quizQuestions[currentQuestionIdx].options.map((opt, optIdx) => (
                      <button 
                        key={optIdx}
                        className={`quiz-option-button ${userAnswers[currentQuestionIdx] === optIdx ? 'selected' : ''}`}
                        onClick={() => setUserAnswers({...userAnswers, [currentQuestionIdx]: optIdx})}
                      >
                        <span style={{fontWeight: 600, color: 'var(--accent-primary)', width: '20px'}}>{['A','B','C','D'][optIdx]}.</span>
                        <span>{opt}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )
            ) : null}
          </div>
          
          <div className="quiz-modal-footer">
            {!isQuizLoading && quizQuestions.length > 0 && !quizFinished && (
              <button 
                className="btn-primary" 
                disabled={userAnswers[currentQuestionIdx] === undefined}
                onClick={() => {
                  if (currentQuestionIdx < quizQuestions.length - 1) {
                    setCurrentQuestionIdx(currentQuestionIdx + 1);
                  } else {
                    setQuizFinished(true);
                  }
                }}
              >
                {currentQuestionIdx < quizQuestions.length - 1 ? 'Next Question' : 'Submit Quiz'}
              </button>
            )}
            {!isQuizLoading && quizFinished && (
              <button className="btn-secondary" onClick={() => openQuizModal(activeQuizModule)}>
                Retake Quiz (Fresh Questions)
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Notes Drawer */}"""

content = content.replace("{/* Notes Drawer */}", quiz_modal)

# 3. Update Take Quiz button
old_button = """<button className="pill-action" style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
                                  <LayoutTemplate size={14} /> Take Quiz
                                </button>"""

new_button = """<button className="pill-action" style={{display: 'flex', alignItems: 'center', gap: '6px'}} onClick={() => openQuizModal(m)}>
                                  <LayoutTemplate size={14} /> Take Quiz
                                </button>"""

content = content.replace(old_button, new_button)

with open("src/App.jsx", "w", encoding="utf-8") as f:
    f.write(content)
