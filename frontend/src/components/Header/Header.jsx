import React, { useState, useEffect } from 'react';
import './Header.css';

// BUG-05 FIX: Service chips now reflect actual ML Agent health
// The agentStatus prop is the AgentStatus component — but we need raw health data.
// Since we can't easily extract state from a rendered component, we use a different approach:
// Track whether the ML Agent responded successfully via a module-level flag.
let _mlAgentLive = false;
const ML_HEALTH_URL = (import.meta.env.VITE_ML_API_URL || 'http://localhost:8080') + '/ml-status';

function getServiceStatus(mlLive, geminiLive) {
  return [
    { id: 'xgboost', label: 'XGBoost Live', status: mlLive ? 'online' : 'degraded' },
    { id: 'astar', label: 'A* Router', status: 'online' },  // Always available (local A* fallback)
    { id: 'gemini', label: 'Gemini AI', status: geminiLive ? 'online' : 'degraded' },
    { id: 'fastag', label: 'FASTag Feed', status: 'online' }, // Simulated feed always active
  ];
}

export default function Header({
  activeRoutes = 0,
  activeNodes = 0,
  theme = 'light',
  onToggleTheme,
  firebaseConnected = false,
  heatmapEnabled = false,
  onToggleHeatmap,
  autopilotStep = '',
  agentStatus = null,
}) {
  const [time, setTime] = useState(new Date());
  const [mlLive, setMlLive] = useState(false);
  const [geminiLive, setGeminiLive] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // BUG-05 FIX: Check ML Agent health directly for service chip status
  useEffect(() => {
    const checkMl = async () => {
      try {
        const res = await fetch(ML_HEALTH_URL, { signal: AbortSignal.timeout(3000) });
        if (res.ok) {
          const data = await res.json();
          setMlLive(true);
          setGeminiLive(!!data.gemini_loaded);
        } else {
          setMlLive(false);
          setGeminiLive(false);
        }
      } catch {
        setMlLive(false);
        setGeminiLive(false);
      }
    };
    checkMl();
    const interval = setInterval(checkMl, 30_000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (d) => d.toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  });

  const formatDate = (d) => d.toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric'
  });

  const services = getServiceStatus(mlLive, geminiLive);

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

        <div className="header__divider" />

        {/* System service chips — reflects live ML agent status */}
        <div className="header__services">
          {services.map(svc => (
            <div key={svc.id} className={`header__service-chip header__service-chip--${svc.status}`}>
              <span className="header__service-dot" />
              {svc.label}
            </div>
          ))}
        </div>

        {/* Live ML Agent status widget */}
        {agentStatus && (
          <>
            <div className="header__divider" />
            {agentStatus}
          </>
        )}
      </div>

      <div className="header__right">
        {/* Autopilot running step indicator */}
        {autopilotStep && (
          <div className="header__autopilot-step">
            <span className="header__autopilot-dot" />
            {autopilotStep}
          </div>
        )}

        {/* BUG-06 FIX: Show 'Firebase Live' when connected, 'Demo Mode' otherwise */}
        <div className={`header__status ${firebaseConnected ? 'header__status--online' : 'header__status--mock'}`}>
          <span className="header__status-dot" />
          {firebaseConnected ? 'Firebase Live' : 'Demo Mode'}
        </div>

        {/* Heatmap toggle */}
        <button
          className={`header__heatmap-btn ${heatmapEnabled ? 'active' : ''}`}
          onClick={onToggleHeatmap}
          title={heatmapEnabled ? 'Hide Congestion Heatmap' : 'Show Congestion Heatmap'}
          aria-label={heatmapEnabled ? 'Hide congestion heatmap' : 'Show congestion heatmap'}
          aria-pressed={heatmapEnabled}
        >
          🌡️ Heat
        </button>

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
