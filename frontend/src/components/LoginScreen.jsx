import React from 'react';
import { Lock, Rocket, User } from 'lucide-react';

const LoginScreen = ({ onLogin }) => {
  return (
    <div className="login-container">
      {/* Abstract Background Orbs for aesthetic */}
      <div className="bg-orb orb-1"></div>
      <div className="bg-orb orb-2"></div>
      
      <div className="auth-glass-panel" style={{ padding: '3rem 2.5rem' }}>
        <div className="brand-header">
          <h2 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
            <Rocket size={28} color="var(--brand-solid, #2383E2)" />
            Campus Copilot
          </h2>
          <p>Your AI-powered structured learning workspace.</p>
        </div>
        
        <div className="login-actions" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <button className="auth-btn primary" onClick={onLogin}>
            Continue to Workspace
          </button>
          <button className="auth-btn secondary" onClick={onLogin}>
            <User size={18} /> Sign in with GitHub
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
