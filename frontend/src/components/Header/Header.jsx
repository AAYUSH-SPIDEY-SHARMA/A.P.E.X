import React, { useState, useEffect } from 'react';
import './Header.css';

export default function Header({ activeRoutes = 0, activeNodes = 0, theme = 'light', onToggleTheme }) {
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

        <button
          className="header__theme-toggle"
          onClick={onToggleTheme}
          title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          aria-label="Toggle theme"
        >
          {theme === 'light' ? '🌙' : '☀️'}
        </button>

        <div className="header__clock">
          {formatTime(time)} IST &middot; {formatDate(time)}
        </div>
      </div>
    </header>
  );
}
