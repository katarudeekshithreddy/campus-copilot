import React from 'react';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import { PlayCircle, Target, Flame, CheckSquare, BrainCircuit, ExternalLink, BookOpen, ArrowRight, PlusCircle, Compass } from 'lucide-react';


const calculateRoadmapProgress = (rm) => {
  let total = 0;
  let completed = 0;
  rm.modules.forEach(m => {
    m.action_items.forEach(a => {
      total++;
      if (a.isCompleted) completed++;
    });
  });
  return total === 0 ? 0 : Math.round((completed / total) * 100);
};

export default function Dashboard({ roadmaps, setActiveRoadmapTab, user }) {
  const displayName = user ? user.name : "User";
  const displayMajor = user ? user.major : "Computer Science";
  const displayUniversity = user ? user.university : "Campus Placements";
  // 1. Quick Resume Logic
  let resumeTarget = null;
  for (let rIdx = 0; rIdx < roadmaps.length; rIdx++) {
    const roadmap = roadmaps[rIdx];
    const mIdx = roadmap.modules.findIndex(m => m.status === 'In Progress');
    if (mIdx !== -1) {
      resumeTarget = { rIdx, title: roadmap.modules[mIdx].title, roadmapTitle: roadmap.roadmap_title };
      break;
    }
  }

  // 2. Data Aggregation
  let totalTasks = 0;
  let completedTasks = 0;
  let recentTasks = 0;
  const now = Date.now();
  const oneWeek = 7 * 24 * 60 * 60 * 1000;
  
  roadmaps.forEach(r => {
    r.modules.forEach(m => {
      m.action_items.forEach(a => {
        totalTasks++;
        if (a.isCompleted) {
          completedTasks++;
          if (a.completedAt && (now - a.completedAt < oneWeek)) {
            recentTasks++;
          }
        }
      });
    });
  });

  const progressPct = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  // Parse Streak
  let streakCount = 0;
  let isStreakActiveToday = false;
  try {
    const streakData = JSON.parse(localStorage.getItem('campusCopilotStreak') || '{}');
    streakCount = streakData.count || 0;
    if (streakData.lastStudyDate === new Date().toDateString()) {
      isStreakActiveToday = true;
    }
  } catch (e) {}

  // Parse Quiz Scores
  let avgQuizScore = 0;
  let quizCount = 0;
  try {
    const scores = JSON.parse(localStorage.getItem('campusCopilotQuizScores') || '[]');
    if (scores.length > 0) {
      quizCount = scores.length;
      const sum = scores.reduce((a, b) => a + b, 0);
      avgQuizScore = Math.round(sum / scores.length);
    }
  } catch (e) {}

  const handleResume = () => {
    if (resumeTarget) {
      setActiveRoadmapTab(resumeTarget.rIdx);
    } else {
      setActiveRoadmapTab(roadmaps.length > 0 ? 0 : 'create');
    }
  };

  return (
    <div className="view-container fade-in">
      {/* Welcome Banner */}
      <header className="kpi-card fade-in" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '2.5rem', color: 'var(--text-primary)' }}>Welcome Back, {displayName} <span className="emoji-wave">👋</span></h1>
          <p style={{ margin: 0, color: 'var(--brand-solid)', fontSize: '1.1rem', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Target size={18} /> {displayUniversity} • {displayMajor}
          </p>
        </div>
        <div>
          <button 
            className="btn-premium-hero" 
            onClick={handleResume}
            style={{ padding: '1rem 2rem', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}
          >
            <PlayCircle size={20} />
            {resumeTarget ? `Resume: ${resumeTarget.roadmapTitle}` : (roadmaps.length > 0 ? "View Roadmaps" : "Start your first module")}
          </button>
        </div>
      </header>
      
      {/* KPI Cards Grid & Portfolio Wrapper */}
      {roadmaps.length > 0 ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        
        {/* Progress Ring Card */}
        <div className="kpi-card-bento fade-in stagger-1" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <h3 style={{ margin: '0 0 1.5rem 0', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Target size={18} /> Roadmap Progress
          </h3>
          <div style={{ width: '100px', height: '100px', alignSelf: 'center' }}>
            <CircularProgressbar 
              value={progressPct} 
              text={`${progressPct}%`} 
              styles={buildStyles({
                textColor: 'var(--text-primary)',
                pathColor: 'var(--brand-solid)',
                trailColor: 'var(--border-subtle)',
                textSize: '24px'
              })}
            />
          </div>
        </div>

        {/* Streak Counter */}
        <div className="kpi-card-bento fade-in stagger-2" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <h3 style={{ margin: '0 0 1rem 0', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Flame size={18} /> Study Streak
          </h3>
          <div style={{ fontSize: '3.5rem', fontWeight: 'bold', color: 'var(--semantic-warning-text)', lineHeight: '1' }}>
            {streakCount}
          </div>
          <div style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', fontWeight: '500' }}>Days in a row</div>
          {isStreakActiveToday && <div className="trend-indicator trend-up">↑ +1 today</div>}
        </div>

        {/* Tasks Done */}
        <div className="kpi-card-bento fade-in stagger-3" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <h3 style={{ margin: '0 0 1rem 0', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckSquare size={18} /> Tasks Done
          </h3>
          <div style={{ fontSize: '3.5rem', fontWeight: 'bold', color: 'var(--semantic-success-text)', lineHeight: '1' }}>
            {completedTasks}
          </div>
          <div style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', fontWeight: '500' }}>Total Actions Completed</div>
          {recentTasks > 0 && <div className="trend-indicator trend-up">↑ +{recentTasks} this week</div>}
        </div>

        {/* Avg Quiz Score */}
        <div className="kpi-card-bento fade-in stagger-4" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <h3 style={{ margin: '0 0 1rem 0', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BrainCircuit size={18} /> Avg Quiz Score
          </h3>
          <div style={{ fontSize: '3.5rem', fontWeight: 'bold', color: 'var(--brand-solid)', lineHeight: '1' }}>
            {avgQuizScore}%
          </div>
          <div style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', fontWeight: '500' }}>Across all modules</div>
          {quizCount > 0 ? (
            <div className="trend-indicator trend-up">Based on {quizCount} quizzes</div>
          ) : (
            <div className="trend-indicator trend-neutral">No quizzes taken yet</div>
          )}
        </div>

      </div>

      
{/* Roadmap Portfolio View */}
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BookOpen size={20} className="text-accent" /> Active Roadmaps Portfolio
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            {roadmaps.map((rm, idx) => {
              const progress = calculateRoadmapProgress(rm);
              const ragColor = progress < 30 ? 'var(--accent-warning)' : progress < 70 ? '#f59e0b' : 'var(--accent-success)'; // Use red/amber/green logic
              
              return (
                <div key={idx} className="kpi-card fade-in stagger-5" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>{rm.roadmap_title}</h4>
                    <span style={{ fontWeight: 'bold', color: ragColor }}>{progress}%</span>
                  </div>
                  
                  {/* Glowing Progress Bar Container */}
                  <div style={{ width: '100%', height: '8px', background: 'var(--border-subtle)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div 
                      className="roadmap-progress-glow shimmer-active"
                      style={{ 
                        height: '100%', 
                        width: `${progress}%`, 
                        background: progress < 100 ? `linear-gradient(90deg, ${ragColor} 0%, #fff 50%, ${ragColor} 100%)` : ragColor, 
                        color: ragColor,
                        transition: 'width 0.5s ease-out' 
                      }}
                    ></div>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {progress === 100 ? 'Completed 🎉' : 'In Progress'}
                    </span>
                    <button 
                      className="btn-secondary" 
                      style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                      onClick={() => setActiveRoadmapTab(idx)}
                    >
                      Resume <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        </>
      ) : (
        <div className="kpi-card fade-in" style={{ padding: '4rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', marginBottom: '2rem' }}>
          <Compass size={48} style={{ color: 'var(--brand-solid)', marginBottom: '1.5rem', opacity: 0.8 }} />
          <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Your academic portfolio is empty.</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', maxWidth: '400px' }}>Let's build your first context-aware roadmap and start tracking your progress.</p>
          <button 
            className="btn-primary" 
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', padding: '0.8rem 1.5rem' }}
            onClick={() => setActiveRoadmapTab('create')}
          >
            <PlusCircle size={20} /> Create New Path
          </button>
        </div>
      )}

      {/* AI Insights Section */}
      <div className="glass-panel fade-in stagger-5" style={{ padding: '2rem' }}>
        <h3 style={{ margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ExternalLink size={20} className="text-accent" /> Recent AI Insights
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {resumeTarget ? (
            <div className="ai-insight-card">
              <p style={{ margin: '0 0 0.25rem 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>✨ Recommended Focus</p>
              <p style={{ margin: 0, color: 'var(--text-primary)' }}>Continue your work on <strong>{resumeTarget.title}</strong> to maintain your momentum in the {resumeTarget.roadmapTitle} track.</p>
            </div>
          ) : (
            <div className="ai-insight-card">
              <p style={{ margin: '0 0 0.25rem 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>✨ Getting Started</p>
              <p style={{ margin: 0, color: 'var(--text-primary)' }}>Create a new roadmap to generate a personalized AI curriculum and begin your journey!</p>
            </div>
          )}
          <div className="ai-insight-card warning">
              <p style={{ margin: '0 0 0.25rem 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>✨ AI Tutor Tip</p>
              <p style={{ margin: 0, color: 'var(--text-primary)' }}>If you get stuck on a coding task, jump over to the AI Tutor tab. It is fully aware of your active module and personal notes.</p>
          </div>
        </div>
      </div>

    </div>
  );
}
