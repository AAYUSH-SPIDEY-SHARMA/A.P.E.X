import React, { useState, useEffect } from 'react';
import './CascadeComparison.css';

export default function CascadeComparison({ isVisible, onClose, reroutedCount = 12, costSaved = 3800000, responseTime = '~2s' }) {
  const [animIn, setAnimIn] = useState(false);

  useEffect(() => {
    if (isVisible) {
      const t = setTimeout(() => setAnimIn(true), 50);
      return () => clearTimeout(t);
    } else {
      setAnimIn(false);
    }
  }, [isVisible]);

  // Accessibility: Escape key closes modal
  useEffect(() => {
    if (!isVisible) return;
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  const costSavedL = (costSaved / 100000).toFixed(1);
  const totalLoss  = ((costSaved / 0.9) / 100000).toFixed(1); // 90% savings → 10% residual

  return (
    <div className={`cascade-comparison ${animIn ? 'cascade-comparison--in' : ''}`} onClick={onClose}>
      <div className="cascade-comparison__modal" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="cascade-comparison__header">
          <span className="cascade-comparison__header-icon">⚡</span>
          <span className="cascade-comparison__header-title">Network Cascade Impact Analysis</span>
          <button className="cascade-comparison__close" onClick={onClose}>✕</button>
        </div>

        <div className="cascade-comparison__subtitle">
          Dual-Shock Event: Western Ghats Monsoon + ICEGATE Failure — Autonomous Response Complete
        </div>

        {/* Split comparison */}
        <div className="cascade-comparison__split">
          {/* Left — Without APEX */}
          <div className="cascade-comparison__side cascade-comparison__side--bad">
            <div className="cascade-comparison__side-header">
              <span className="cascade-comparison__side-icon">❌</span>
              <span>Without A.P.E.X</span>
            </div>

            <div className="cascade-comparison__metric">
              <span className="cascade-comparison__metric-label">Trucks Stuck</span>
              <span className="cascade-comparison__metric-value cascade-comparison__metric-value--red">
                {reroutedCount} trucks
              </span>
            </div>
            <div className="cascade-comparison__metric">
              <span className="cascade-comparison__metric-label">Demurrage Loss</span>
              <span className="cascade-comparison__metric-value cascade-comparison__metric-value--red">
                ₹{totalLoss}L/event
              </span>
            </div>
            <div className="cascade-comparison__metric">
              <span className="cascade-comparison__metric-label">Recovery Time</span>
              <span className="cascade-comparison__metric-value cascade-comparison__metric-value--red">
                18–24 hours
              </span>
            </div>
            <div className="cascade-comparison__metric">
              <span className="cascade-comparison__metric-label">Human Calls Made</span>
              <span className="cascade-comparison__metric-value cascade-comparison__metric-value--red">
                47+ calls
              </span>
            </div>
            <div className="cascade-comparison__metric">
              <span className="cascade-comparison__metric-label">Nodes Cascaded</span>
              <span className="cascade-comparison__metric-value cascade-comparison__metric-value--red">
                3 ICDs failed
              </span>
            </div>
            <div className="cascade-comparison__metric">
              <span className="cascade-comparison__metric-label">eWay Bill Expiry</span>
              <span className="cascade-comparison__metric-value cascade-comparison__metric-value--red">
                23 violations
              </span>
            </div>

            <div className="cascade-comparison__bar cascade-comparison__bar--bad" />
          </div>

          {/* Divider */}
          <div className="cascade-comparison__vs">
            <div className="cascade-comparison__vs-line" />
            <span className="cascade-comparison__vs-text">VS</span>
            <div className="cascade-comparison__vs-line" />
          </div>

          {/* Right — With APEX */}
          <div className="cascade-comparison__side cascade-comparison__side--good">
            <div className="cascade-comparison__side-header">
              <span className="cascade-comparison__side-icon">✅</span>
              <span>A.P.E.X Autonomous</span>
            </div>

            <div className="cascade-comparison__metric">
              <span className="cascade-comparison__metric-label">Trucks Rerouted</span>
              <span className="cascade-comparison__metric-value cascade-comparison__metric-value--green">
                {reroutedCount} in {responseTime}
              </span>
            </div>
            <div className="cascade-comparison__metric">
              <span className="cascade-comparison__metric-label">Demurrage Avoided</span>
              <span className="cascade-comparison__metric-value cascade-comparison__metric-value--green">
                ₹{costSavedL}L (90%)
              </span>
            </div>
            <div className="cascade-comparison__metric">
              <span className="cascade-comparison__metric-label">Recovery Time</span>
              <span className="cascade-comparison__metric-value cascade-comparison__metric-value--green">
                &lt;5 seconds
              </span>
            </div>
            <div className="cascade-comparison__metric">
              <span className="cascade-comparison__metric-label">Human Interventions</span>
              <span className="cascade-comparison__metric-value cascade-comparison__metric-value--green">
                0 — Fully Autonomous
              </span>
            </div>
            <div className="cascade-comparison__metric">
              <span className="cascade-comparison__metric-label">Network Stabilized</span>
              <span className="cascade-comparison__metric-value cascade-comparison__metric-value--green">
                SH-17 + DFC reroute
              </span>
            </div>
            <div className="cascade-comparison__metric">
              <span className="cascade-comparison__metric-label">eWay Bill Updates</span>
              <span className="cascade-comparison__metric-value cascade-comparison__metric-value--green">
                Auto-extended (0 violations)
              </span>
            </div>

            <div className="cascade-comparison__bar cascade-comparison__bar--good" />
          </div>
        </div>

        {/* Bottom summary */}
        <div className="cascade-comparison__summary">
          <div className="cascade-comparison__summary-stat">
            <span className="cascade-comparison__summary-num">₹{costSavedL}L</span>
            <span className="cascade-comparison__summary-label">Demurrage Avoided</span>
          </div>
          <div className="cascade-comparison__summary-stat">
            <span className="cascade-comparison__summary-num">{reroutedCount}</span>
            <span className="cascade-comparison__summary-label">Trucks Rerouted</span>
          </div>
          <div className="cascade-comparison__summary-stat">
            <span className="cascade-comparison__summary-num">{responseTime}</span>
            <span className="cascade-comparison__summary-label">Response Time</span>
          </div>
          <div className="cascade-comparison__summary-stat">
            <span className="cascade-comparison__summary-num">0</span>
            <span className="cascade-comparison__summary-label">Human Interventions</span>
          </div>
        </div>

        <div className="cascade-comparison__tagline">
          "Not a fleet tracker. An autonomous nervous system for India's highways."
        </div>
      </div>
    </div>
  );
}
