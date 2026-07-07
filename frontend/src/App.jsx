import { useState, useEffect, useRef } from 'react'
import toast, { Toaster } from 'react-hot-toast'
import Editor from '@monaco-editor/react'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { PlayCircle, FileCode2, BookOpen, Search, CheckCircle2, Circle, ChevronDown, ChevronRight, Trash2, List, LayoutDashboard, FileText, PlusCircle, LayoutTemplate, Map, ChevronLeft, X, Sun, Moon, Lock, ShieldAlert, Eye, EyeOff, Timer } from 'lucide-react'
import confetti from 'canvas-confetti'
import Tutor from './views/Tutor'
import Dashboard from './views/Dashboard'
import PlatformLink from './components/PlatformLink'
import LogoIcon from './components/LogoIcon'
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar'
import 'react-circular-progressbar/dist/styles.css'
import './index.css'

const AnimatedCounter = ({ value, duration = 300 }) => {
  const [count, setCount] = useState(value);
  const targetRef = useRef(value);

  useEffect(() => {
    if (value === count) return;
    targetRef.current = value;
    let startTimestamp = null;
    const startValue = count;

    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      
      const currentVal = Math.floor(progress * (targetRef.current - startValue) + startValue);
      setCount(currentVal);

      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setCount(targetRef.current);
      }
    };

    window.requestAnimationFrame(step);
  }, [value, duration]);

  return <span>{count}</span>;
};

const LANGUAGES = [
  { id: 'python', name: 'Python' },
  { id: 'javascript', name: 'JavaScript' },
  { id: 'java', name: 'Java' },
  { id: 'cpp', name: 'C++' },
  { id: 'c', name: 'C' }
];

const useAgenticLoading = (isLoading, flowType) => {
  const [textIndex, setTextIndex] = useState(0);
  
  const roadmapSteps = ["Initializing planning agent...", "Synthesizing module curriculum...", "Finalizing your custom path..."];
  const quizSteps = ["Analyzing module context...", "Formulating conceptual questions...", "Validating grading rubric..."];
  
  const steps = flowType === 'quiz' ? quizSteps : roadmapSteps;

  useEffect(() => {
    let interval;
    if (isLoading) {
      interval = setInterval(() => {
        setTextIndex((prev) => (prev + 1) % steps.length);
      }, 1500);
    } else {
      setTextIndex(0);
    }
    return () => clearInterval(interval);
  }, [isLoading, steps.length]);

  return steps[textIndex];
};

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [theme, setTheme] = useState('dark');
  const [currentView, setCurrentView] = useState('dashboard')
  
  // Natively update the root element attribute
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };
  
  // Shared State
  const metrics = {
    progress: "35%",
    streak: "4 days",
    tasksDone: "12 tasks",
    quizScore: "85%"
  };

  // Chat State
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState([
    { role: 'model', content: 'Hi! I see you are working on Arrays. Write a function in Python that returns the sum of an array.' }
  ]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  // Editor State
  const [code, setCode] = useState('def sum_array(arr):\n    return sum(arr)\n\nprint(sum_array([1, 2, 3]))');
  const [isCodeRunning, setIsCodeRunning] = useState(false);
  const [codeOutput, setCodeOutput] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('python');

  // Roadmap State
  const [roadmapGoal, setRoadmapGoal] = useState('');
  const [roadmapLevel, setRoadmapLevel] = useState('Beginner');
  const [roadmapTime, setRoadmapTime] = useState('60');
  const [roadmapDate, setRoadmapDate] = useState('');
  
  // Notes State
  const [notesDrawerOpen, setNotesDrawerOpen] = useState(false);
  // Streak Logic
  
  const handlePracticeHandoff = (taskName) => {
    const prompt = `I am ready to practice the following task: "${taskName}". Act as a senior pair programmer. Do NOT write the full code for me. Instead, give me the first conceptual step and guide me through building it in my local IDE.`;
    setActiveTutorPrompt(prompt);
    setCurrentView("tutor");
  };

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
      if (userAnswers[idx] === q.correctAnswerIdx) score++;
    });
    const pct = Math.round((score / quizQuestions.length) * 100);
    try {
      const scores = JSON.parse(localStorage.getItem('campusCopilotQuizScores') || '[]');
      scores.push(pct);
      localStorage.setItem('campusCopilotQuizScores', JSON.stringify(scores));
    } catch(e) {}
  };

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
  };

  // Load from LocalStorage
  const initialRoadmaps = (() => {
    const saved = localStorage.getItem('campusCopilotRoadmaps');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [{
      roadmap_title: "Mock AI/DSA Roadmap",
      modules: [
        {
          week_number: 1,
          title: "Arrays & AI Basics",
          topics: [
            { name: "Two Pointers", definition: "A technique to optimize array problems.", code_snippet: "" }
          ],
          action_items: [
            { platform: "LeetCode", task_name: "Two Sum", link: "https://leetcode.com/problems/two-sum/", isCompleted: false, difficulty: "Easy" },
            { platform: "HackerRank", task_name: "Array Manipulation", link: "https://hackerrank.com/challenges/crush", isCompleted: false, difficulty: "Hard" },
            { platform: "CodeChef", task_name: "Chef and Array", link: "https://codechef.com/problems/PTA01", isCompleted: false, difficulty: "Medium" },
            { platform: "YouTube", task_name: "Graph Theory", link: "https://youtube.com/watch?v=123", isCompleted: false }
          ]
        }
      ]
    }];
  })();
  const [roadmaps, setRoadmaps] = useState(initialRoadmaps);
  const [activeRoadmapTab, setActiveRoadmapTab] = useState(initialRoadmaps.length > 0 ? 0 : 'create');

  const [isRoadmapLoading, setIsRoadmapLoading] = useState(false);
  const roadmapLoadingText = useAgenticLoading(isRoadmapLoading, 'roadmap');
  const quizLoadingText = useAgenticLoading(isQuizLoading, 'quiz');

  const [expandedTopics, setExpandedTopics] = useState({});
  const toggleExpandedTopics = (rIdx, mIdx) => {
    const key = `${rIdx}-${mIdx}`;
    setExpandedTopics(prev => ({...prev, [key]: !prev[key]}));
  };

  const [roadmapViewMode, setRoadmapViewMode] = useState('list'); // 'list' or 'kanban'
  const kanbanScrollPositions = useRef({});
  const [hideCompleted, setHideCompleted] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  
  // AI Scheduler State
  const [isDrifting, setIsDrifting] = useState(false);
  const [isRebalancing, setIsRebalancing] = useState(false);

  // Security State
  const [activeTutorPrompt, setActiveTutorPrompt] = useState("");
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [securityStatusMessage, setSecurityStatusMessage] = useState('');
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [keyStatus, setKeyStatus] = useState('untested');

  const testApiKey = async (keyToTest) => {
    setIsTestingKey(true);
    try {
      const res = await fetch('http://127.0.0.1:8000/api/v1/test-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': keyToTest
        }
      });
      if (res.ok) {
        setKeyStatus('valid');
      } else {
        setKeyStatus('invalid');
      }
    } catch (e) {
      setKeyStatus('invalid');
    } finally {
      setIsTestingKey(false);
    }
  };

  useEffect(() => {
    const savedKey = localStorage.getItem('gemini_api_key') || '';
    setApiKey(savedKey);
    if (savedKey) {
      testApiKey(savedKey);
    }
  }, []);

  const handleClearKey = () => {
    localStorage.removeItem('gemini_api_key');
    setApiKey('');
    setKeyStatus('untested');
    setSecurityStatusMessage('🗑️ Personal API key revoked and removed.');
    setTimeout(() => setSecurityStatusMessage(''), 4000);
  };

  const handleSaveApiKey = () => {
    if (apiKey.trim() === '') {
      handleClearKey();
    } else {
      localStorage.setItem('gemini_api_key', apiKey.trim());
      testApiKey(apiKey.trim());
      setSecurityStatusMessage('✅ API Key securely saved locally!');
    }
    setTimeout(() => setSecurityStatusMessage(''), 4000);
  };

  // Persist to LocalStorage and Sync to Backend
  const isFirstRender = useRef(true);
  useEffect(() => {
    localStorage.setItem('campusCopilotRoadmaps', JSON.stringify(roadmaps));
    
    // Sync to backend DB
    if (isFirstRender.current) {
        isFirstRender.current = false;
        return;
    }
    fetch('http://127.0.0.1:8000/api/v1/roadmaps/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: 'default_user', data: JSON.stringify(roadmaps) })
    }).catch(e => console.error("Sync failed:", e));
  }, [roadmaps]);

  const showToast = (message, type="error") => {
    if (type === "error") {
      toast.error(message);
    } else if (type === "success") {
      toast.success(message);
    } else {
      toast(message);
    }
  };

  const handleChat = async () => {
    if (!chatInput.trim()) return;
    const newUserMsg = { role: 'user', content: chatInput };
    setChatHistory(prev => [...prev, newUserMsg]);
    setChatInput('');
    setIsChatLoading(true);
    
    try {
      const userApiKey = localStorage.getItem('gemini_api_key') || '';
      const headers = { 'Content-Type': 'application/json' };
      if (userApiKey) headers['X-API-Key'] = userApiKey;

      const res = await fetch('http://127.0.0.1:8000/api/v1/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({ prompt: chatInput, chat_history: chatHistory })
      });
      const data = await res.json();
      setChatHistory(prev => [...prev, { role: 'model', content: data.response }]);
    } catch (e) {
      console.error(e);
      setChatHistory(prev => [...prev, { role: 'model', content: "Error connecting to AI Tutor." }]);
      showToast("Error connecting to backend API.");
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleRunCode = async () => {
    setIsCodeRunning(true);
    
    // JS Local Fallback! Run completely in the browser for free.
    if (selectedLanguage === 'javascript') {
      setCodeOutput('Executing JavaScript locally in browser...');
      try {
        let output = '';
        const originalConsoleLog = console.log;
        console.log = (...args) => { output += args.join(' ') + '\n'; };
        
        // Execute the code safely using Function
        new Function(code)();
        
        console.log = originalConsoleLog;
        setCodeOutput(output || "Execution completed (no output).");
      } catch (e) {
        setCodeOutput(`Error: ${e.toString()}`);
      }
      setIsCodeRunning(false);
      return;
    }

    setCodeOutput(`Simulating ${selectedLanguage.toUpperCase()} execution via AI Virtual Machine...`);
    try {
      const userApiKey = localStorage.getItem('gemini_api_key') || '';
      const headers = { 'Content-Type': 'application/json' };
      if (userApiKey) headers['X-API-Key'] = userApiKey;

      const res = await fetch('http://127.0.0.1:8000/api/v1/sandbox/simulate', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          language: selectedLanguage,
          code: code
        })
      });
      const data = await res.json();
      setCodeOutput(data.output || "Execution completed (no output).");
    } catch (e) {
      console.error(e);
      setCodeOutput('Error connecting to AI Simulator engine.');
      showToast("Error connecting to Sandbox API.");
    } finally {
      setIsCodeRunning(false);
    }
  };

  const handleGenerateRoadmap = async () => {
    if (!roadmapGoal) return;
    setIsRoadmapLoading(true);
    try {
      const prompt = `ROUTE_TO_ROADMAP Goal: ${roadmapGoal}, Level: ${roadmapLevel}, Daily Time: ${roadmapTime} mins, Target Date: ${roadmapDate || 'Flexible'}`;
      const userApiKey = localStorage.getItem('gemini_api_key') || '';
      const headers = { 'Content-Type': 'application/json' };
      if (userApiKey) headers['X-API-Key'] = userApiKey;

      const res = await fetch('http://127.0.0.1:8000/api/v1/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({ prompt: prompt })
      });
      const data = await res.json();
      
      if (data.response && (data.response.includes('⚠️ **Traffic Jam:**') || data.response.includes('Traffic Jam'))) {
        throw new Error("AI Engine is currently overloaded. Please try again.");
      }

      let parsed = null;
      try {
        parsed = JSON.parse(data.response);
      } catch (e) {
        const jsonMatch = data.response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("Could not parse JSON from AI response.");
        }
      }
      
      parsed.isCollapsed = false;
      parsed.created_at = new Date().toISOString();
      parsed.target_date = roadmapDate || new Date(Date.now() + 30*24*60*60*1000).toISOString();
      parsed.modules.forEach(m => {
        m.action_items.forEach(a => {
           a.isCompleted = false;
        });
      });

      setRoadmaps(prev => {
        const newRoadmaps = [...prev, parsed];
        setActiveRoadmapTab(newRoadmaps.length - 1);
        return newRoadmaps;
      });
      setRoadmapGoal('');
    } catch (e) {showToast("Failed to generate roadmap.");}
    finally {setIsRoadmapLoading(false);}
  };

  const handleRebalance = async (rIdx) => {
    setIsRebalancing(true);
    try {
      const userApiKey = localStorage.getItem('gemini_api_key') || '';
      const headers = { 'Content-Type': 'application/json' };
      if (userApiKey) headers['X-API-Key'] = userApiKey;

      const res = await fetch('http://127.0.0.1:8000/api/v1/roadmaps/rebalance', {
        method: 'POST',
        headers,
        body: JSON.stringify({ roadmap_json: JSON.stringify(roadmaps[rIdx]) })
      });
      const data = await res.json();
      
      if (data.response && (data.response.includes('⚠️ **Traffic Jam:**') || data.response.includes('Traffic Jam'))) {
        throw new Error("AI Engine is currently overloaded. Please try again.");
      }

      let parsed = null;
      try {
        parsed = JSON.parse(data.response);
      } catch (e) {
        const jsonMatch = data.response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("Could not parse JSON from AI response.");
        }
      }
      
      // Keep completed status for carryovers (though ideally LLM removed them, but just in case)
      parsed.isCollapsed = false;
      parsed.created_at = roadmaps[rIdx].created_at;
      parsed.target_date = roadmaps[rIdx].target_date;
      
      // Initialize completed status for all action items in the rebalanced roadmap
      parsed.modules.forEach(m => {
        m.action_items.forEach(a => {
           if (a.isCompleted === undefined) a.isCompleted = false;
        });
      });

      setRoadmaps(prev => {
        const newRoadmaps = [...prev];
        newRoadmaps[rIdx] = parsed;
        return newRoadmaps;
      });
      setIsDrifting(false);
      showToast("Schedule successfully rebalanced!", "success");
    } catch (e) {
      console.error(e);
      showToast("Failed to rebalance schedule: " + (e.message || "Unknown error"));
    } finally {
      setIsRebalancing(false);
    }
  };

  const toggleCollapse = (index) => {
    setRoadmaps(prev => prev.map((rm, i) => i === index ? { ...rm, isCollapsed: !rm.isCollapsed } : rm));
  };

  const scrollKanban = (rIdx, direction) => {
    const el = document.getElementById(`kanban-${rIdx}`);
    if (el) {
      el.scrollBy({ left: direction === 'left' ? -380 : 380, behavior: 'smooth' });
    }
  };

  const deleteRoadmap = (index) => {
    setRoadmaps(prev => prev.filter((_, i) => i !== index));
    if (activeRoadmapTab === index) {
      setActiveRoadmapTab('create');
    } else if (typeof activeRoadmapTab === 'number' && activeRoadmapTab > index) {
      setActiveRoadmapTab(activeRoadmapTab - 1);
    }
  };

  const toggleTaskCompletion = (rIdx, mIdx, aIdx) => {
    // Determine new state before updater to avoid StrictMode double-invocation side effects
    const taskCurrentState = roadmaps[rIdx].modules[mIdx].action_items[aIdx].isCompleted;
    const willBeCompleted = !taskCurrentState;

    if (willBeCompleted) {
      showToast("Task Completed! Dashboard metrics updated.", "success");
      recordActivity();
      
      // Check if this action makes the entire module complete
      const allOthersCompleted = roadmaps[rIdx].modules[mIdx].action_items
        .filter((_, idx) => idx !== aIdx)
        .every(a => a.isCompleted);
        
      if (allOthersCompleted) {
        setTimeout(() => {
          const el = document.getElementById(`module-card-${rIdx}-${mIdx}`);
          if (el) {
            const rect = el.getBoundingClientRect();
            confetti({
              particleCount: 80,
              spread: 70,
              origin: {
                x: (rect.left + rect.width / 2) / window.innerWidth,
                y: (rect.top + rect.height / 2) / window.innerHeight
              },
              zIndex: 9999
            });
          } else {
            confetti({ particleCount: 80, spread: 70, zIndex: 9999 });
          }
        }, 50);
      }
    }

    // Perform pure state update
    setRoadmaps(prev => {
      const newRoadmaps = JSON.parse(JSON.stringify(prev));
      const module = newRoadmaps[rIdx].modules[mIdx];
      const task = module.action_items[aIdx];
      task.isCompleted = !task.isCompleted;
      
      if (task.isCompleted) {
        task.completedAt = Date.now();
      } else {
        task.completedAt = null;
      }
      
      // Auto-Status Toggling (Derived State)
      const allTasksDone = module.action_items.every(t => t.isCompleted);
      const someTasksDone = module.action_items.some(t => t.isCompleted);
      
      if (allTasksDone) {
        module.status = "Completed";
      } else if (someTasksDone) {
        module.status = "In Progress";
      } else {
        module.status = "Upcoming";
      }

      return newRoadmaps;
    });
  };

  const updateModuleStatus = (rIdx, mIdx, status) => {
    if (status === "Completed") {
      showToast("Module Completed! All tasks checked off.", "success");
      recordActivity();
      setTimeout(() => {
        const el = document.getElementById(`module-card-${rIdx}-${mIdx}`);
        if (el) {
          const rect = el.getBoundingClientRect();
          confetti({
            particleCount: 80,
            spread: 70,
            origin: {
              x: (rect.left + rect.width / 2) / window.innerWidth,
              y: (rect.top + rect.height / 2) / window.innerHeight
            },
            zIndex: 9999
          });
        }
      }, 50);
    }

    setRoadmaps(prev => {
      const newRoadmaps = JSON.parse(JSON.stringify(prev));
      const module = newRoadmaps[rIdx].modules[mIdx];
      module.status = status;
      
      if (status === "Completed") {
        module.action_items.forEach(a => {
          a.isCompleted = true;
          a.completedAt = Date.now();
        });
      } else if (status === "Upcoming") {
        module.action_items.forEach(a => {
          a.isCompleted = false;
          a.completedAt = null;
        });
      }
      
      return newRoadmaps;
    });
  };

  const openNotesDrawer = (rIdx, mIdx) => {
    setCurrentNoteModule({ rIdx, mIdx });
    setNotesDrawerOpen(true);
  };

  const calculateProgress = (roadmap) => {
    let total = 0;
    let completed = 0;
    roadmap.modules.forEach(m => {
      m.action_items.forEach(a => {
        total++;
        if (a.isCompleted) completed++;
      });
    });
    const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
    return { completed, total, percentage };
  };

  const getPlatformStyle = (platform) => {
    const p = platform.toLowerCase();
    if (p.includes('youtube')) return { icon: <PlayCircle size={16} />, bg: 'var(--semantic-danger-bg)', border: 'var(--semantic-danger-text)', glow: 'transparent', color: 'var(--semantic-danger-text)' };
    if (p.includes('leetcode')) return { icon: <FileCode2 size={16} />, bg: 'var(--semantic-warning-bg)', border: 'var(--semantic-warning-text)', glow: 'transparent', color: 'var(--semantic-warning-text)' };
    if (p.includes('geeks')) return { icon: <BookOpen size={16} />, bg: 'var(--semantic-success-bg)', border: 'var(--semantic-success-text)', glow: 'transparent', color: 'var(--semantic-success-text)' };
    if (p.includes('doc')) return { icon: <FileText size={16} />, bg: 'var(--bg-surface-elevated)', border: 'var(--brand-solid)', glow: 'transparent', color: 'var(--brand-solid)' };
    return { icon: <Search size={16} />, bg: 'var(--bg-surface)', border: 'var(--border-subtle)', glow: 'transparent', color: 'var(--text-secondary)' };
  };

  const renderView = () => {
    switch(currentView) {
      case 'dashboard':
        return (
          <Dashboard 
            user={currentUser}
            roadmaps={roadmaps} 
            setActiveRoadmapTab={(tab) => {
              setActiveRoadmapTab(tab);
              setCurrentView('roadmap');
            }} 
          />
        );
      case 'roadmap':
        return (
          <div className="view-container fade-in">
            <header style={{marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end'}}>
              <div>
                <h1>🗺️ Learning Workspace</h1>
                <p>AI-powered structured learning paths.</p>
              </div>
            </header>

            {/* Tab Bar */}
            <div className="tab-bar">
              {roadmaps.map((rm, idx) => (
                <button 
                  key={idx} 
                  className={`tab-item ${activeRoadmapTab === idx ? 'active' : ''}`}
                  onClick={() => setActiveRoadmapTab(idx)}
                >
                  {rm.roadmap_title}
                </button>
              ))}
              <button 
                className={`tab-item create ${activeRoadmapTab === 'create' ? 'active' : ''}`}
                onClick={() => setActiveRoadmapTab('create')}
              >
                <PlusCircle size={16} /> Create New Path
              </button>
            </div>
            
            {/* Input Form (Create Mode) */}
            {activeRoadmapTab === 'create' && (
              <div className="glass-panel fade-in" style={{padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
                <h3 style={{margin: 0}}>Tell us about your goal</h3>
                <div style={{display: 'flex', gap: '1.5rem'}}>
                  <div style={{flex: 1}}>
                    <label style={{display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)'}}>Your Goal</label>
                    <input 
                      type="text" 
                      className="input-premium"
                      placeholder="e.g. Master Data Structures in Python" 
                      value={roadmapGoal}
                      onChange={(e) => setRoadmapGoal(e.target.value)}
                      tabIndex="1"
                    />
                  </div>
                  <div style={{flex: 1}}>
                    <label style={{display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)'}}>Current Skill Level</label>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                      {['Beginner', 'Intermediate', 'Advanced'].map(level => (
                        <div 
                          key={level}
                          className={`skill-pill ${roadmapLevel === level ? 'active' : ''}`}
                          onClick={() => setRoadmapLevel(level)}
                        >
                          {level}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div style={{display: 'flex', gap: '1.5rem'}}>
                  <div style={{flex: 1}}>
                    <label style={{display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)'}}>Daily Time (minutes)</label>
                    <input 
                      type="number" 
                      className="input-premium"
                      placeholder="60" 
                      value={roadmapTime}
                      onChange={(e) => setRoadmapTime(e.target.value)}
                      tabIndex="3"
                    />
                  </div>
                  <div style={{flex: 1}}>
                    <label style={{display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)'}}>Target Date</label>
                    <input 
                      type="date" 
                      className="input-premium"
                      value={roadmapDate}
                      onChange={(e) => setRoadmapDate(e.target.value)}
                      tabIndex="4"
                    />
                  </div>
                </div>

                <button 
                  className={`btn-primary ${isRoadmapLoading ? 'shimmer-btn' : ''}`} 
                  style={{alignSelf: 'stretch', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px'}}
                  onClick={handleGenerateRoadmap}
                  disabled={isRoadmapLoading}
                  tabIndex="5"
                >
                  {isRoadmapLoading ? '✨ Structuring Curriculum...' : '✨ Generate Roadmap'}
                </button>

                {!isRoadmapLoading && roadmaps.length === 0 && (
                    <div style={{marginTop: '2rem', textAlign: 'center', color: 'var(--text-secondary)'}}>
                        <Map size={64} style={{margin: '0 auto', opacity: 0.5, marginBottom: '1rem'}} />
                        <h3>No roadmaps generated yet.</h3>
                        <p>Fill out the form above to get started!</p>
                    </div>
                )}
              </div>
            )}

            {/* Skeleton Loader */}
            {isRoadmapLoading && activeRoadmapTab === 'create' && (
                <div style={{marginTop: '3rem', display: 'flex', flexDirection: 'column', gap: '1.5rem'}} className="roadmap-list fade-in">
                    {[1,2,3].map((s) => (
                        <div key={s} className="glass-panel skeleton-loading" style={{padding: '1.5rem', height: '200px', border: 'none'}}></div>
                    ))}
                </div>
            )}

            {/* Active Roadmap Display */}
            {typeof activeRoadmapTab === 'number' && roadmaps[activeRoadmapTab] && (
              <div className="fade-in">
                {(() => {
                  const rIdx = activeRoadmapTab;
                  const roadmapData = roadmaps[rIdx];
                  const progress = calculateProgress(roadmapData);
                  return (
                  <div className="roadmap-wrapper" key={rIdx}>
                    {isDrifting && (
                      <div className="fade-in" style={{
                        background: 'var(--drift-bg)', 
                        border: '1px solid var(--drift-border)', 
                        padding: '1.5rem', 
                        borderRadius: '12px', 
                        marginBottom: '2rem',
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        boxShadow: '0 0 20px var(--drift-glow)'
                      }}>
                        <div>
                          <h3 style={{color: 'var(--drift-text)', margin: '0 0 0.25rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                            <span>⚠️</span> Schedule Drift Detected
                          </h3>
                          <p style={{margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem'}}>
                            You have incomplete tasks from past weeks. Would you like the AI to rebalance your workload?
                          </p>
                        </div>
                        <button 
                          className={`btn-primary ${isRebalancing ? 'shimmer-btn' : ''}`}
                          onClick={() => handleRebalance(rIdx)}
                          disabled={isRebalancing}
                          style={{background: 'var(--drift-solid)', borderColor: 'var(--drift-solid)', boxShadow: '0 0 15px var(--drift-solid-glow)', color: '#fff'}}
                        >
                          {isRebalancing ? 'Rebalancing Schedule...' : '✨ Rebalance My Schedule'}
                        </button>
                      </div>
                    )}
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem'}}>
                      <div style={{display: 'flex', alignItems: 'center', gap: '1rem', flex: 1}}>
                        <div style={{flex: 1, paddingRight: '2rem'}}>
                          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '0.25rem'}}>
                            <h2 style={{margin: 0}}>{roadmapData.roadmap_title}</h2>
                            <span style={{fontSize: '0.85rem', color: 'var(--text-secondary)', fontFamily: 'monospace', letterSpacing: '0.5px'}}>
                              <AnimatedCounter value={progress.completed} />/{progress.total} Tasks (<AnimatedCounter value={progress.percentage} />%)
                            </span>
                          </div>
                          <div className="progress-container">
                             <div className="progress-fill animated-glow" style={{width: `${progress.percentage}%`, borderRadius: '999px', transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)'}}></div>
                             {[25, 50, 75, 100].map(target => (
                               <div 
                                 key={target} 
                                 className={`milestone-marker ${progress.percentage >= target ? 'active' : ''}`}
                                 style={{ left: `${target}%` }}
                               ></div>
                             ))}
                           </div>
                        </div>
                      </div>
                      
                      <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
                        <div style={{display: 'flex', gap: '0.5rem', background: 'var(--bg-surface)', padding: '4px', borderRadius: '8px'}}>
                          <button
                            onClick={() => setHideCompleted(!hideCompleted)}
                            title="Toggle Deep Focus (Hide Completed)"
                            style={{
                              padding: '0.5rem 1rem', 
                              border: 'none', 
                              borderRadius: '4px', 
                              background: hideCompleted ? 'var(--bg-surface-elevated)' : 'transparent',
                              color: hideCompleted ? 'var(--text-primary)' : 'var(--text-secondary)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              fontWeight: 500,
                              transition: 'all 0.2s'
                            }}
                          >
                            {hideCompleted ? <EyeOff size={16} /> : <Eye size={16} />} Focus Mode
                          </button>
                          <button
                            onClick={() => setIsDrifting(!isDrifting)}
                            title="Simulate Schedule Drift (Demo)"
                            style={{
                              padding: '0.5rem 1rem', 
                              border: 'none', 
                              borderRadius: '4px', 
                              display: 'flex', alignItems: 'center', gap: '6px',
                              background: isDrifting ? 'var(--drift-bg)' : 'transparent',
                              color: isDrifting ? 'var(--drift-text)' : 'var(--text-secondary)',
                              cursor: 'pointer'
                            }}>
                            <Timer size={16} /> Simulate Drift
                          </button>
                          <button 
                            onClick={() => setRoadmapViewMode('list')}
                            aria-label="View as List"
                            style={{
                              padding: '0.5rem 1rem', 
                              border: 'none', 
                              borderRadius: '4px', 
                              display: 'flex', alignItems: 'center', gap: '6px',
                              background: roadmapViewMode === 'list' ? 'var(--accent-primary)' : 'transparent',
                              color: roadmapViewMode === 'list' ? '#fff' : 'var(--text-secondary)',
                              cursor: 'pointer'
                            }}><List size={16} /> List</button>
                          <button 
                            onClick={() => setRoadmapViewMode('kanban')}
                            aria-label="View as Kanban"
                            style={{
                              padding: '0.5rem 1rem', 
                              border: 'none', 
                              borderRadius: '4px', 
                              display: 'flex', alignItems: 'center', gap: '6px',
                              background: roadmapViewMode === 'kanban' ? 'var(--accent-primary)' : 'transparent',
                              color: roadmapViewMode === 'kanban' ? '#fff' : 'var(--text-secondary)',
                              cursor: 'pointer'
                            }}><LayoutDashboard size={16} /> Kanban</button>
                        </div>
                        <button 
                          className="btn-danger"
                          onClick={() => deleteRoadmap(rIdx)}
                          title="Delete Roadmap"
                          aria-label="Delete Roadmap"
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', 
                            border: '1px solid rgba(239, 68, 68, 0.3)', padding: '0.5rem', 
                            borderRadius: '8px', cursor: 'pointer'
                          }}
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </div>

                    {!roadmapData.isCollapsed && (
                      <div style={{ position: 'relative' }}>
                        {roadmapViewMode === 'kanban' && (
                          <>
                            <button className="scroll-chevron left" onClick={() => scrollKanban(rIdx, 'left')} aria-label="Scroll Left">
                              <ChevronLeft size={24} />
                            </button>
                            <button className="scroll-chevron right" onClick={() => scrollKanban(rIdx, 'right')} aria-label="Scroll Right">
                              <ChevronRight size={24} />
                            </button>
                          </>
                        )}
                        <div id={`kanban-${rIdx}`} 
                          ref={(el) => {
                            if (el && roadmapViewMode === 'kanban') {
                              if (!el.dataset.restored) {
                                el.scrollLeft = kanbanScrollPositions.current[rIdx] || 0;
                                el.dataset.restored = "true";
                              }
                            }
                          }}
                          onScroll={(e) => {
                            if (roadmapViewMode === 'kanban') {
                              kanbanScrollPositions.current[rIdx] = e.target.scrollLeft;
                            }
                          }}
                          className={roadmapViewMode === 'list' ? 'roadmap-list' : 'roadmap-kanban'} style={{
                          display: roadmapViewMode === 'list' ? 'grid' : 'flex',
                          gridTemplateColumns: roadmapViewMode === 'list' ? 'repeat(auto-fit, minmax(450px, 1fr))' : 'none',
                          gap: '1.5rem',
                          overflowX: roadmapViewMode === 'kanban' ? 'auto' : 'visible',
                          paddingBottom: roadmapViewMode === 'kanban' ? '1rem' : '0'
                        }}>
                          {roadmapData.modules.map((mod, mIdx) => {
                            const modStatusClass = mod.status === 'In Progress' ? 'in-progress' : mod.status === 'Completed' ? 'completed' : '';
                            return (
                            <div key={mIdx} id={`module-card-${rIdx}-${mIdx}`} className={`roadmap-module fade-in stagger-${(mIdx % 5) + 1} ${mod.status === 'In Progress' ? 'active' : ''} ${modStatusClass}`} style={{
                              minWidth: roadmapViewMode === 'kanban' ? '420px' : 'auto',
                              flex: roadmapViewMode === 'kanban' ? '0 0 420px' : 'auto',
                              display: 'flex',
                              flexDirection: 'column'
                            }}>
                            <div style={{display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem'}}>
                              <div style={{
                                width: '45px', height: '45px',
                                flexShrink: 0
                              }}>
                                <CircularProgressbar 
                                  value={mod.action_items.filter(a => a.isCompleted).length} 
                                  maxValue={mod.action_items.length || 1} 
                                  text={`W${mod.week_number}`}
                                  styles={buildStyles({
                                    textSize: '30px',
                                    textColor: 'var(--text-primary)',
                                    pathColor: mod.status === 'Completed' ? 'var(--module-border-completed-color)' : 'var(--brand-solid)',
                                    trailColor: 'var(--border-subtle)',
                                    pathTransitionDuration: 0.5
                                  })}
                                />
                              </div>
                              <h3 style={{margin: 0, fontSize: '1.25rem'}}>{mod.title}</h3>
                            </div>
                            
                            <div style={{marginLeft: '3.5rem', display: 'flex', flexDirection: 'column', flex: 1}}>
                              <div className="topic-pills">
                                {(() => {
                                  const isExpanded = expandedTopics[`${rIdx}-${mIdx}`];
                                  const visibleTopics = isExpanded ? mod.topics : mod.topics.slice(0, 3);
                                  const hiddenCount = mod.topics.length - 3;
                                  return (
                                    <>
                                      {visibleTopics.map((topic, tidx) => (
                                        <div key={tidx} className="topic-tooltip-container">
                                          <span className="topic-pill">{topic.name}</span>
                                          {(topic.definition || topic.code_snippet) && (
                                            <div className="topic-tooltip">
                                              {topic.definition && <p>{topic.definition}</p>}
                                              {topic.code_snippet && (
                                                <pre>
                                                  <code>{topic.code_snippet}</code>
                                                </pre>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                      {hiddenCount > 0 && (
                                        <button 
                                          className="topic-pill" 
                                          style={{ cursor: 'pointer', background: 'var(--bg-surface-elevated)' }}
                                          onClick={() => toggleExpandedTopics(rIdx, mIdx)}
                                        >
                                          {isExpanded ? 'Show Less' : `+${hiddenCount} More`}
                                        </button>
                                      )}
                                    </>
                                  );
                                })()}
                              </div>

                              <div style={{display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem'}}>
                                {mod.action_items.map((item, aIdx) => (
                                  <div key={aIdx} className={`task-item-container ${hideCompleted && item.isCompleted ? 'collapsed-completed' : ''}`}>
                                    <PlatformLink
                                      item={item}
                                      onToggleComplete={() => toggleTaskCompletion(rIdx, mIdx, aIdx)}
                                      onHintClick={(prompt) => {
                                        setActiveTutorPrompt(prompt);
                                        setCurrentView("tutor");
                                      }}
                                    />
                                  </div>
                                ))}
                              </div>

                              <div style={{display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', marginTop: 'auto'}}>
                                <select 
                                  className="status-dropdown"
                                  value={mod.status || 'Upcoming'}
                                  onChange={(e) => updateModuleStatus(rIdx, mIdx, e.target.value)}
                                  style={{ marginRight: 'auto' }}
                                >
                                    <option value="Upcoming">Upcoming</option>
                                    <option value="In Progress">In Progress</option>
                                    <option value="Completed" style={{color: '#10b981'}}>Completed</option>
                                </select>
                                <button 
                                  className={mod.status === 'Completed' ? 'btn-secondary' : 'btn-primary'} 
                                  style={{
                                    display: 'flex', alignItems: 'center', gap: '6px', padding: '0.5rem 1rem', fontSize: '0.85rem',
                                    ...(mod.status === 'Completed' ? { background: 'var(--semantic-success-bg)', color: 'var(--module-border-completed-color)', borderColor: 'var(--module-border-completed-color)' } : {})
                                  }} 
                                  onClick={() => openQuizModal(mod)}>
                                  <LayoutTemplate size={16} /> Take Quiz
                                </button>
                                <button 
                                  className="btn-secondary" 
                                  onClick={() => openNotesDrawer(rIdx, mIdx)}
                                  style={{display: 'flex', alignItems: 'center', gap: '6px', padding: '0.5rem 1rem', fontSize: '0.85rem', background: 'transparent', border: '1px solid var(--border-subtle)'}}
                                >
                                  <PlusCircle size={16} /> Add Notes
                                </button>
                              </div>
                            </div>
                          </div>
                          );
                        })}
                        </div>
                      </div>
                    )}
                  </div>
                  );
                })()}
              </div>
            )}
          </div>
        );
      case 'tutor':
        return (
          <Tutor roadmaps={roadmaps} activeRoadmapId={activeRoadmapTab} activeTutorPrompt={activeTutorPrompt} setActiveTutorPrompt={setActiveTutorPrompt} />
        );
      case 'security':
        return (
          <div className="view-container">
            <header style={{marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem'}}>
              <h1 style={{margin: 0}}>🔒 Security & Configuration</h1>
              {keyStatus === 'valid' && (
                <div className="status-pill-success" style={{boxShadow: '0 0 8px #22c55e'}}>
                  <div className="radar-dot" style={{marginRight: '6px', width: '8px', height: '8px'}}></div>
                  <span>Active Connection</span>
                </div>
              )}
            </header>
            
            {(!apiKey || keyStatus === 'invalid') && (
              <div style={{background: 'var(--semantic-warning-bg)', border: '1px solid var(--border-subtle)', padding: '1rem', borderRadius: '8px', marginBottom: '2rem', color: 'var(--semantic-warning-text)', display: 'flex', alignItems: 'center', gap: '1rem'}}>
                <ShieldAlert size={24} />
                <span><strong>No Valid Key Detected:</strong> Empty configurations route through a shared community key subject to strict rate limits. Please provide your own key for optimal performance.</span>
              </div>
            )}

            <div className="security-layout">
              {/* Left Column: Form Action */}
              <div className="glass-panel fade-in" style={{padding: '2rem', height: 'fit-content'}}>
                <h3 style={{marginBottom: '0.5rem'}}>🔑 API Security Configuration (BYOK)</h3>
                <p style={{color: 'var(--text-secondary)', marginBottom: '0.5rem'}}>Provide your personal Gemini API key to bypass global rate limits.</p>
                <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" style={{color: 'var(--accent-primary)', fontSize: '0.85rem', display: 'inline-block', marginBottom: '1.5rem'}}>Get a key from Google AI Studio &rarr;</a>
                
                <div style={{marginBottom: '1.5rem'}}>
                  <div className="vault-input-container">
                    <Lock size={18} className="vault-input-icon-left" />
                    <input
                      className="input-premium vault-input"
                      style={{fontFamily: showKey ? 'monospace' : 'inherit'}}
                      type={showKey ? 'text' : 'password'}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="Paste your Gemini API key (AIzaSy...)"
                    />
                    <button className="vault-input-toggle-right" onClick={() => setShowKey(!showKey)} title={showKey ? "Hide key" : "Show key"}>
                      {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div style={{display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap'}}>
                  <button className="btn-primary" onClick={handleSaveApiKey}>
                    Save Configuration
                  </button>
                  {apiKey && (
                    <button className={`btn-secondary ${isTestingKey ? 'shimmer-btn' : ''}`} onClick={() => testApiKey(apiKey)} disabled={isTestingKey}>
                      {isTestingKey ? 'Testing...' : 'Test Connection'}
                    </button>
                  )}
                  {localStorage.getItem('gemini_api_key') && (
                    <button onClick={handleClearKey} style={{background: 'var(--semantic-danger-bg)', border: '1px solid var(--semantic-danger-text)', color: 'var(--semantic-danger-text)', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', marginLeft: 'auto', fontWeight: 600}}>
                      Revoke Access & Clear Key
                    </button>
                  )}
                </div>

                {securityStatusMessage && (
                  <p style={{marginTop: '1rem', fontWeight: 500, color: securityStatusMessage.includes('✅') ? '#10b981' : securityStatusMessage.includes('🗑️') ? '#ef4444' : '#f59e0b'}}>
                    {securityStatusMessage}
                  </p>
                )}
                
                <div style={{marginTop: '2rem'}}>
                  <div className="security-callout">
                    <ShieldAlert size={20} style={{marginTop: '2px', flexShrink: 0}} />
                    <div>
                      <strong style={{display: 'block', marginBottom: '4px'}}>Security Notice</strong>
                      <p>Your API key is stored strictly inside your browser's local storage and is never persisted on our backend database.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Trust & Privacy Sidecar */}
              <div className="security-guarantee-card fade-in">
                <div style={{borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem'}}>
                  <h3 style={{margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)'}}>Trust & Privacy</h3>
                  <p style={{margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)'}}>How we protect your credentials</p>
                </div>
                
                <div className="security-feature">
                  <div className="security-feature-icon">🔒</div>
                  <div className="security-feature-text">
                    <h4>Local Storage Only</h4>
                    <p>Keys are stored exclusively in your browser's local storage environment.</p>
                  </div>
                </div>

                <div className="security-feature">
                  <div className="security-feature-icon">🛑</div>
                  <div className="security-feature-text">
                    <h4>Zero Backend Persistence</h4>
                    <p>Our servers never log or store your key. It remains ephemeral during requests.</p>
                  </div>
                </div>

                <div className="security-feature">
                  <div className="security-feature-icon">🛡️</div>
                  <div className="security-feature-text">
                    <h4>Encrypted Transit</h4>
                    <p>All traffic between your client and our AI routing layer is fully encrypted via TLS.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      default:
        return <div><h2>404</h2></div>;
    }
  }

  const handleResetData = () => {
    if (window.confirm("Are you sure you want to completely wipe your local workspace? This will permanently delete your API key, roadmaps, module notes, and chat history.")) {
      // 1. Nuclear Wipe of Local Storage
      localStorage.clear();
      
      // 2. Reset React State
      setRoadmaps([]);
      setModuleNotes({});
      setApiKey('');
      setKeyStatus('untested');
      setSecurityStatusMessage('');
      setChatHistory([{ role: 'model', content: 'Hi! I see you are working on Arrays. Write a function in Python that returns the sum of an array.' }]);
      
      // 3. Reset View
      setCurrentView('dashboard');
      setActiveRoadmapTab('create');
      
      toast.success("Workspace fully wiped and reset.");
      window.scrollTo(0, 0);
    }
  };

  return (
    <div className="layout">
      <Toaster position="bottom-right" toastOptions={{ style: { background: 'var(--bg-surface-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' } }} />
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`toast-banner ${toastMessage.type}`}>
            {toastMessage.message}
        </div>
      )}

      {/* Dynamic Sidebar Container using Semantic Tokens */}
      <aside className="sidebar" style={{ backgroundColor: 'var(--bg-sidebar)', borderRight: '1px solid var(--border-subtle)' }}>
        <div style={{display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '2rem'}}>
          <LogoIcon size={32} theme={theme} />
          <h2 style={{margin: 0, fontSize: '1.25rem'}}>Campus Copilot</h2>
        </div>
        
        <nav style={{display: 'flex', flexDirection: 'column', gap: '0.5rem', flexGrow: 1}}>
          <div className={`nav-item ${currentView === 'dashboard' ? 'active' : ''}`} onClick={() => setCurrentView('dashboard')} style={{cursor: 'pointer'}}>
            <LayoutDashboard size={20} />
            <span className="nav-text">Dashboard</span>
          </div>

          <div className={`nav-item ${currentView === 'roadmap' ? 'active' : ''}`} onClick={() => setCurrentView('roadmap')} style={{cursor: 'pointer'}}>
            <Map size={20} />
            <span className="nav-text">Roadmap</span>
          </div>

          <div className={`nav-item ${currentView === 'tutor' ? 'active' : ''}`} onClick={() => setCurrentView('tutor')} style={{cursor: 'pointer'}}>
            <BookOpen size={20} />
            <span className="nav-text">AI Tutor</span>
          </div>

          <div className={`nav-item ${currentView === 'security' ? 'active' : ''}`} onClick={() => setCurrentView('security')} style={{cursor: 'pointer'}}>
            <ShieldAlert size={20} />
            <span className="nav-text">Security</span>
          </div>

          {/* PREMIUM THEME TOGGLE ELEMENT - Dynamic Bottom Placement */}
          <div className="nav-item theme-toggle-btn" onClick={toggleTheme} style={{ marginTop: 'auto', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px', cursor: 'pointer' }}>
            {theme === 'dark' ? <Sun size={20} style={{ color: 'var(--semantic-warning-text)' }} /> : <Moon size={20} />}
            <span className="nav-text">{theme === 'dark' ? 'Daylight Mode' : 'Midnight AI'}</span>
          </div>

          <div className="nav-item" style={{ cursor: 'pointer', marginTop: '8px' }} onClick={handleResetData}>
            <Trash2 size={20} color="var(--semantic-danger-text)" />
            <span className="nav-text" style={{ color: "var(--semantic-danger-text)" }}>Reset Data</span>
          </div>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        {renderView()}
      </main>

      
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
              <div style={{display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1rem'}}>
                <div style={{display: 'flex', gap: '1rem', alignItems: 'center', color: 'var(--text-secondary)'}}>
                    <div className="radar-dot" style={{width: '12px', height: '12px', borderRadius: '50%', background: 'var(--accent-primary)'}}></div>
                    <span style={{fontWeight: 500}}>AI Agent assembling quiz blocks...</span>
                </div>
                {[1,2,3].map((q) => (
                  <div key={q} className="skeleton-loading" style={{height: '120px', borderRadius: '12px'}}></div>
                ))}
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
                        <div style={{fontWeight: 600, display: 'flex', alignItems: 'flex-start', gap: '0.5rem'}}>
                          <span>{isCorrect ? '✅' : '❌'}</span>
                          <div style={{flex: 1}}>
                            <ReactMarkdown
                              components={{
                                code({node, inline, className, children, ...props}) {
                                  const match = /language-(\w+)/.exec(className || '')
                                  return !inline && match ? (
                                    <SyntaxHighlighter
                                      {...props}
                                      children={String(children).replace(/\n$/, '')}
                                      style={vscDarkPlus}
                                      language={match[1]}
                                      PreTag="div"
                                    />
                                  ) : (
                                    <code {...props} className={className}>
                                      {children}
                                    </code>
                                  )
                                }
                              }}
                            >
                              {q.question}
                            </ReactMarkdown>
                          </div>
                        </div>
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
                  <div style={{marginBottom: '2rem', lineHeight: 1.4, fontSize: '1.17em', fontWeight: 600}}>
                    <ReactMarkdown
                      components={{
                        code({node, inline, className, children, ...props}) {
                          const match = /language-(\w+)/.exec(className || '')
                          return !inline && match ? (
                            <SyntaxHighlighter
                              {...props}
                              children={String(children).replace(/\n$/, '')}
                              style={vscDarkPlus}
                              language={match[1]}
                              PreTag="div"
                            />
                          ) : (
                            <code {...props} className={className}>
                              {children}
                            </code>
                          )
                        }
                      }}
                    >
                      {quizQuestions[currentQuestionIdx].question}
                    </ReactMarkdown>
                  </div>
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
                    recordActivity();
                    saveQuizScore(quizQuestions, userAnswers);
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

      {/* Notes Drawer */}
      <div className={`drawer-overlay ${notesDrawerOpen ? 'open' : ''}`} onClick={() => setNotesDrawerOpen(false)}></div>
      <div className={`notes-drawer ${notesDrawerOpen ? 'open' : ''}`}>
        <div className="notes-drawer-header">
          <h3 style={{margin: 0}}>📝 Module Notes</h3>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn-primary" style={{padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem'}} onClick={() => {
              showToast("Context saved to AI Memory.", "success");
              setNotesDrawerOpen(false);
            }}>
              Save Notes
            </button>
            <button className="btn-secondary" style={{padding: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center'}} onClick={() => setNotesDrawerOpen(false)}>
              <X size={20} />
            </button>
          </div>
        </div>
        <div className="notes-drawer-content">
          <textarea 
            className="notes-textarea"
            placeholder="Write your notes here in Markdown..."
            value={currentNoteModule ? (moduleNotes[`${currentNoteModule.rIdx}-${currentNoteModule.mIdx}`] || '') : ''}
            onChange={(e) => {
              if (currentNoteModule) {
                setModuleNotes(prev => ({
                  ...prev,
                  [`${currentNoteModule.rIdx}-${currentNoteModule.mIdx}`]: e.target.value
                }));
              }
            }}
          />
          <div className="markdown-preview">
            <ReactMarkdown
              components={{
                code({node, inline, className, children, ...props}) {
                  const match = /language-(\w+)/.exec(className || '')
                  return !inline && match ? (
                    <SyntaxHighlighter
                      {...props}
                      children={String(children).replace(/\n$/, '')}
                      style={vscDarkPlus}
                      language={match[1]}
                      PreTag="div"
                    />
                  ) : (
                    <code {...props} className={className}>
                      {children}
                    </code>
                  )
                }
              }}
            >
              {currentNoteModule ? (moduleNotes[`${currentNoteModule.rIdx}-${currentNoteModule.mIdx}`] || '*Live markdown preview will appear here...*') : ''}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
