import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Trash2, CheckCircle2 } from 'lucide-react';

export default function Tutor({ roadmaps, activeRoadmapId, activeTutorPrompt, setActiveTutorPrompt }) {
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem('campusCopilotTutorChat');
    return saved ? JSON.parse(saved) : [{
      role: 'tutor',
      content: "Hello! I am your Campus Copilot AI Tutor. I can see your current roadmap and study progress. What would you like to practice or learn today?"
    }];
  });
  const [inputValue, setInputValue] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (activeTutorPrompt) {
      setInputValue(activeTutorPrompt);
      setActiveTutorPrompt("");
    }
  }, [activeTutorPrompt, setInputValue, setActiveTutorPrompt]);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('campusCopilotTutorChat', JSON.stringify(messages));
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isGenerating]);

  const handleClear = () => {
    if (confirm("Clear conversation history?")) {
      setMessages([{
        role: 'tutor',
        content: "Hello! I am your Campus Copilot AI Tutor. I can see your current roadmap and study progress. What would you like to practice or learn today?"
      }]);
    }
  };

  const activeRoadmap = roadmaps[activeRoadmapId];
  let activeModuleContext = null;
  
  if (activeRoadmap) {
    const activeModIdx = activeRoadmap.modules.findIndex(m => m.status === 'In Progress');
    if (activeModIdx !== -1) {
      const mod = activeRoadmap.modules[activeModIdx];
      // Fetch active notes from localStorage
      let activeNotes = "";
      try {
        const savedNotes = JSON.parse(localStorage.getItem('campusCopilotNotes') || '{}');
        activeNotes = savedNotes[`${activeRoadmapId}-${activeModIdx}`] || "";
      } catch (e) {}

      activeModuleContext = {
        roadmapTitle: activeRoadmap.roadmap_title,
        activeModule: mod.title,
        incompleteTasks: mod.action_items.filter(a => !a.isCompleted).map(a => a.task_name),
        activeNotes: activeNotes
      };
    } else {
       activeModuleContext = {
         roadmapTitle: activeRoadmap.roadmap_title,
         activeModule: "No module currently 'In Progress'",
         incompleteTasks: []
       }
    }
  }

  const globalOverview = roadmaps.map(r => {
    let completed = 0;
    let total = 0;
    r.modules.forEach(m => {
      m.action_items.forEach(a => {
        total++;
        if (a.isCompleted) completed++;
      });
    });
    return {
      title: r.roadmap_title,
      progress: total === 0 ? "0%" : `${Math.round((completed / total) * 100)}%`
    };
  });

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const userMsg = { role: 'user', content: inputValue };
    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInputValue('');
    setIsGenerating(true);

    try {
      const userApiKey = localStorage.getItem('gemini_api_key') || '';
      const headers = { 'Content-Type': 'application/json' };
      if (userApiKey) headers['X-API-Key'] = userApiKey;

      const payload = {
        message: userMsg.content,
        chat_history: messages,
        currentActiveScope: activeModuleContext || {},
        globalOverview: globalOverview
      };

      const res = await fetch('http://127.0.0.1:8000/api/v1/tutor/chat', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        setMessages([...newHistory, { role: 'tutor', content: data.reply }]);
      } else {
        setMessages([...newHistory, { role: 'tutor', content: '❌ Error connecting to AI Tutor.' }]);
      }
    } catch (e) {
      console.error(e);
      setMessages([...newHistory, { role: 'tutor', content: '❌ Error connecting to backend.' }]);
    } finally {
      setIsGenerating(false);
    }
  };

  const CodeRenderer = ({ node, inline, className, children, ...props }) => {
    const match = /language-(\w+)/.exec(className || '');
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
      navigator.clipboard.writeText(String(children).replace(/\n$/, ''));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

    if (!inline && match) {
      return (
        <div style={{ position: 'relative', marginTop: '1rem', marginBottom: '1rem', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
          <div className="mac-terminal-header">
            <div className="mac-dot close"></div>
            <div className="mac-dot minimize"></div>
            <div className="mac-dot maximize"></div>
            <span style={{ marginLeft: '10px', fontSize: '0.75rem', color: '#888', fontFamily: 'monospace' }}>{match[1]}</span>
          </div>
          <button 
            onClick={handleCopy}
            style={{
              position: 'absolute',
              top: '0.5rem',
              right: '0.5rem',
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              padding: '0.4rem',
              borderRadius: '4px',
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10
            }}
            title="Copy Code"
          >
            {copied ? <CheckCircle2 size={16} color="#10b981" /> : <Copy size={16} />}
          </button>
          <SyntaxHighlighter
            style={vscDarkPlus}
            language={match[1]}
            PreTag="div"
            customStyle={{ margin: 0, borderRadius: '0 0 8px 8px' }}
            {...props}
          >
            {String(children).replace(/\n$/, '')}
          </SyntaxHighlighter>
        </div>
      );
    }
    return <code className={className} {...props} style={{ background: 'rgba(0,0,0,0.3)', padding: '0.2em 0.4em', borderRadius: '4px' }}>{children}</code>;
  };

  return (
    <div className="view-container" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      
      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-subtle)' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
            🤖 AI Academic Tutor
            <span style={{ 
              display: 'inline-block', 
              width: '10px', height: '10px', 
              background: '#10b981', 
              borderRadius: '50%', 
              boxShadow: '0 0 10px #10b981',
              marginLeft: '0.5rem'
            }}></span>
          </h1>
          <p style={{ margin: '0.5rem 0 0 0', color: 'var(--text-secondary)' }}>World-class technical guidance, perfectly tailored to your current studies.</p>
        </div>
        <button className="btn-secondary" onClick={handleClear} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Trash2 size={16} /> Clear Conversation
        </button>
      </header>

      {/* Message Stream */}
      <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0 }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {messages.map((msg, idx) => (
            <div key={idx} className={msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'} style={{
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
            }}>
              <p style={{ 
                margin: 0, 
                color: msg.role === 'user' ? 'rgba(255,255,255,0.8)' : 'var(--brand-solid)', 
                fontSize: '0.85rem', 
                marginBottom: '0.5rem', 
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                {msg.role === 'user' ? 'You' : 'AI Tutor'}
              </p>
              <div className="markdown-body" style={{ margin: 0, fontSize: '1rem', lineHeight: '1.6', color: msg.role === 'user' ? '#fff' : 'var(--text-primary)' }}>
                <ReactMarkdown components={{ code: CodeRenderer }}>{msg.content}</ReactMarkdown>
              </div>
            </div>
          ))}
          
          {isGenerating && (
            <div style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', color: 'var(--text-secondary)' }}>
               <div className="typing-indicator">
                 <span></span><span></span><span></span>
               </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Dock */}
        <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-surface-elevated)' }}>
          {activeRoadmap && (
             <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: 'var(--accent-primary)' }}>📡 Tuned to:</span> 
                {activeRoadmap.roadmap_title} 
                {activeModuleContext?.activeModule && ` > ${activeModuleContext.activeModule}`}
             </div>
          )}
          <div style={{ display: 'flex', gap: '1rem' }}>
            <textarea
              placeholder="Ask for an explanation, code example, or debug help..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              style={{
                flex: 1,
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                padding: '1rem',
                color: 'var(--text-primary)',
                fontFamily: 'inherit',
                fontSize: '1rem',
                resize: 'none',
                height: '60px',
                outline: 'none'
              }}
            />
            <button className="btn-primary" onClick={handleSend} disabled={isGenerating || !inputValue.trim()} style={{ padding: '0 2rem', fontWeight: 600 }}>
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
