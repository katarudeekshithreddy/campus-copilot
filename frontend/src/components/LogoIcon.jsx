import React from 'react';

const LogoIcon = ({ size = 32, theme = 'dark' }) => {
  // We use gradients and glowing effects based on the theme
  const isDark = theme === 'dark';

  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      style={{ overflow: 'visible' }}
    >
      {/* Definitions for Gradients and Glows */}
      <defs>
        {/* Dark Mode Gradient: Blue to Purple */}
        <linearGradient id="midnightGlow" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#3B82F6" /> {/* Blue */}
          <stop offset="100%" stopColor="#A855F7" /> {/* Purple */}
        </linearGradient>

        {/* Light Mode Gradient: Dark Teal to Emerald */}
        <linearGradient id="daylightSolid" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#0F766E" /> {/* Dark Teal */}
          <stop offset="100%" stopColor="#10B981" /> {/* Emerald */}
        </linearGradient>

        {/* Glow Filter for Dark Mode */}
        <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      <g filter={isDark ? "url(#neonGlow)" : "none"}>
        {/* Edges (K5 Complete Graph) */}
        <g stroke={isDark ? "url(#midnightGlow)" : "url(#daylightSolid)"} strokeWidth="3" strokeLinecap="round">
          {/* Outer Pentagon */}
          <line x1="50" y1="15" x2="15" y2="50" />
          <line x1="15" y1="50" x2="30" y2="85" />
          <line x1="30" y1="85" x2="70" y2="85" />
          <line x1="70" y1="85" x2="85" y2="50" />
          <line x1="85" y1="50" x2="50" y2="15" />

          {/* Inner Pentagram */}
          <line x1="50" y1="15" x2="30" y2="85" />
          <line x1="50" y1="15" x2="70" y2="85" />
          <line x1="15" y1="50" x2="85" y2="50" />
          <line x1="15" y1="50" x2="70" y2="85" />
          <line x1="85" y1="50" x2="30" y2="85" />
        </g>

        {/* Nodes */}
        <g fill={isDark ? "url(#midnightGlow)" : "url(#daylightSolid)"}>
          <circle cx="50" cy="15" r="7" />
          <circle cx="15" cy="50" r="7" />
          <circle cx="85" cy="50" r="7" />
          <circle cx="30" cy="85" r="7" />
          <circle cx="70" cy="85" r="7" />
        </g>

        {/* Sparkle (Star) */}
        <path 
          d="M 85 10 Q 90 20 100 22 Q 90 24 85 34 Q 80 24 70 22 Q 80 20 85 10 Z" 
          fill={isDark ? "url(#midnightGlow)" : "url(#daylightSolid)"} 
          style={{ transform: 'scale(0.8) translate(10px, -5px)' }}
        />
      </g>
    </svg>
  );
};

export default LogoIcon;
