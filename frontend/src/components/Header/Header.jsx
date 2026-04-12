import React, { useState, useEffect } from 'react';
import './Header.css';

export default function Header({ activeRoutes = 0, activeNodes = 0, onToggleTheme, theme }) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (d) => {
    return d.toLocaleTimeString('en-IN', {
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
    });
  };

  const formatDate = (d) => {
    return d.toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  };

  return (
    <header className="header">
      <div className="header__left">
        <div className="header__logo">
          <div className="header__logo-icon">⚡</div>
          <div>
            <div className="header__title">A.P.E.X Command Center</div>
            <div className="header__subtitle">Automated Predictive Expressway Routing</div>
          </div>
        </div>

        <div className="header__divider" />

        <div className="header__stats">
          <div className="header__stat">
            <span className="header__stat-value">{activeRoutes}</span>
            <span className="header__stat-label">Routes</span>
          </div>
          <div className="header__stat">
            <span className="header__stat-value">{activeNodes}</span>
            <span className="header__stat-label">Nodes</span>
          </div>
        </div>
      </div>

      <div className="header__right">
        <div className="header__status header__status--online">
          <span className="header__status-dot" />
          System Online
        </div>
        <div className="header__clock">
          {formatTime(time)} IST &middot; {formatDate(time)}
        </div>
        <button 
          className="btn btn-ghost btn-sm" 
          onClick={onToggleTheme}
          style={{ width: '36px', height: '36px', padding: 0, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: '8px' }}
          title="Toggle Theme"
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </div>
    </header>
  );
}
