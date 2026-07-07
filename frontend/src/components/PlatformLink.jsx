import React from 'react';
import { PlayCircle, FileCode2, BookOpen, FileText, Search, CheckCircle2, Circle } from 'lucide-react';

const getPlatformStyle = (platform) => {
  const p = platform.toLowerCase();
  if (p.includes('youtube')) return { icon: <PlayCircle size={16} />, bg: 'rgba(239, 68, 68, 0.1)', border: 'var(--platform-youtube)', glow: 'rgba(239, 68, 68, 0.2)', color: 'var(--platform-youtube)' };
  if (p.includes('leetcode')) return { icon: <FileCode2 size={16} />, bg: 'rgba(255, 161, 22, 0.1)', border: 'var(--platform-leetcode)', glow: 'rgba(255, 161, 22, 0.2)', color: 'var(--platform-leetcode)', isDSA: true };
  if (p.includes('hackerrank')) return { icon: <FileCode2 size={16} />, bg: 'rgba(46, 200, 102, 0.1)', border: 'var(--platform-hackerrank)', glow: 'rgba(46, 200, 102, 0.2)', color: 'var(--platform-hackerrank)', isDSA: true };
  if (p.includes('codechef')) return { icon: <FileCode2 size={16} />, bg: 'rgba(210, 105, 30, 0.1)', border: 'var(--platform-codechef)', glow: 'rgba(210, 105, 30, 0.2)', color: 'var(--platform-codechef)', isDSA: true };
  if (p.includes('algomaster')) return { icon: <BookOpen size={16} />, bg: 'rgba(0, 194, 255, 0.1)', border: 'var(--platform-algomaster)', glow: 'rgba(0, 194, 255, 0.2)', color: 'var(--platform-algomaster)', isDSA: true };
  if (p.includes('geeks')) return { icon: <BookOpen size={16} />, bg: 'rgba(47, 141, 70, 0.1)', border: 'var(--platform-gfg)', glow: 'rgba(47, 141, 70, 0.2)', color: 'var(--platform-gfg)', isDSA: true };
  if (p.includes('w3schools')) return { icon: <BookOpen size={16} />, bg: 'rgba(4, 170, 109, 0.1)', border: 'var(--platform-w3schools)', glow: 'rgba(4, 170, 109, 0.2)', color: 'var(--platform-w3schools)' };
  if (p.includes('doc')) return { icon: <FileText size={16} />, bg: 'rgba(99, 102, 241, 0.1)', border: 'var(--platform-doc)', glow: 'rgba(99, 102, 241, 0.2)', color: 'var(--platform-doc)' };
  return { icon: <Search size={16} />, bg: 'rgba(139, 148, 158, 0.1)', border: 'var(--platform-default)', glow: 'rgba(139, 148, 158, 0.2)', color: 'var(--platform-default)' };
};

export default function PlatformLink({ item, onToggleComplete, onHintClick }) {
  const pStyle = getPlatformStyle(item.platform);
  
  const handleClick = (e) => {
    if (e.target.closest('.hint-btn')) return;
    if (e.target.closest('.check-icon-wrapper')) return;

    if (item.platform.toLowerCase().includes('practice') && onHintClick) {
      onHintClick(`I am ready to practice the following task: "${item.task_name}". Act as a senior pair programmer. Do NOT write the full code for me. Instead, give me the first conceptual step and guide me through building it in my local IDE.`);
      return;
    }
    
    if (item.link) {
      let url = item.link.startsWith('http') ? item.link : `https://${item.link}`;
      
      // Legacy GFG URL fix
      if (url.includes('geeksforgeeks.org/search/?q=')) {
        try {
          const urlObj = new URL(url);
          const query = urlObj.searchParams.get('q') || '';
          url = `https://duckduckgo.com/?q=!ducky+site:geeksforgeeks.org+${encodeURIComponent(query)}`;
        } catch (e) {
          url = url.replace('https://www.geeksforgeeks.org/search/?q=', 'https://duckduckgo.com/?q=!ducky+site:geeksforgeeks.org+');
        }
      } else if (url.includes('google.com/search') && url.includes('site:geeksforgeeks.org')) {
        try {
          const urlObj = new URL(url);
          let query = urlObj.searchParams.get('q') || '';
          query = query.replace('site:geeksforgeeks.org ', '').replace('site:geeksforgeeks.org+', '').replace('site:geeksforgeeks.org', '');
          url = `https://duckduckgo.com/?q=!ducky+site:geeksforgeeks.org+${encodeURIComponent(query.trim())}`;
        } catch (e) {
          url = url.replace('https://www.google.com/search?q=site:geeksforgeeks.org+', 'https://duckduckgo.com/?q=!ducky+site:geeksforgeeks.org+');
        }
      }
      
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleHintClick = (e) => {
    e.stopPropagation();
    if (onHintClick) {
      const prompt = `I am stuck on this ${item.difficulty || ''} problem: "${item.platform}: ${item.task_name}". Give me a conceptual hint without writing the code for me.`;
      onHintClick(prompt);
    }
  };

  return (
    <div 
      className={`task-item ${item.isCompleted ? 'completed' : ''}`} 
      onClick={handleClick}
      style={{
        '--hover-glow': pStyle.glow,
        '--hover-border': pStyle.border,
        background: pStyle.bg,
        border: `1px solid ${pStyle.border}`,
        boxShadow: `0 0 10px ${pStyle.glow}`,
        color: pStyle.color,
        padding: '0.6rem 1rem',
        borderRadius: '20px',
        fontSize: '0.85rem',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        cursor: 'pointer',
        width: '100%',
        boxSizing: 'border-box'
      }}
    >
      <div 
        className="check-icon-wrapper"
        onClick={(e) => {
          e.stopPropagation();
          onToggleComplete();
        }}
        style={{cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'inherit', flexShrink: 0}}
      >
        {item.isCompleted ? <CheckCircle2 size={18} /> : <Circle size={18} />}
      </div>
      
      <div style={{display: 'flex', alignItems: 'flex-start', gap: '8px', textDecoration: 'none', color: 'inherit', flex: 1, minWidth: 0}}>
        <div style={{marginTop: '2px', flexShrink: 0}}>{pStyle.icon}</div>
        <span style={{ fontWeight: 600, lineHeight: '1.4' }}>
          {item.platform}: {item.task_name}
        </span>
      </div>

      <div style={{display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0}}>
        {item.difficulty && (
          <span className={`difficulty-badge difficulty-${item.difficulty.toLowerCase()}`}>
            {item.difficulty}
          </span>
        )}

        {pStyle.isDSA && (
          <button className="hint-btn" onClick={handleHintClick}>
            💡 Hint
          </button>
        )}
      </div>
    </div>
  );
}
