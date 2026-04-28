import React, { useState, useCallback, useEffect, useRef } from 'react';
import { ANOMALY_TYPES, PRESET_LOCATIONS } from '../../config/firebase';
import './AnomalyConsole.css';

function getSeverityColor(value) {
  if (value >= 0.8) return '#EF4444';
  if (value >= 0.5) return '#F59E0B';
  return '#10B981';
}

// Solver animation steps that play after injection
const SOLVER_STEPS = [
  { icon: '🔍', text: 'Analyzing disruption impact...', duration: 600 },
  { icon: '🧮', text: 'Running XGBoost + A* routing...', duration: 900 },
  { icon: '🗺️', text: 'Generating alternate routes...', duration: 700 },
  { icon: '✅', text: 'Autonomous rerouting complete!', duration: 800 },
];

function SolverAnimation({ active, onComplete }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!active) { setStep(0); return; }
    let i = 0;
    const timeouts = [];
    const advance = () => {
      setStep(i);
      if (i < SOLVER_STEPS.length - 1) {
        i++;
        timeouts.push(setTimeout(advance, SOLVER_STEPS[i - 1].duration));
      } else {
        timeouts.push(setTimeout(() => onComplete?.(), SOLVER_STEPS[i].duration));
      }
    };
    advance();
    return () => timeouts.forEach(id => clearTimeout(id));
  }, [active, onComplete]);

  if (!active && step === 0) return null;

  return (
    <div className="solver-animation">
      <div className="solver-animation__bar" />
      <div className="solver-animation__steps">
        {SOLVER_STEPS.map((s, idx) => (
          <div
            key={idx}
            className={`solver-animation__step ${idx === step ? 'active' : idx < step ? 'done' : ''}`}
          >
            <span className="solver-animation__step-icon">{s.icon}</span>
            <span className="solver-animation__step-text">{s.text}</span>
            {idx < step && <span className="solver-animation__step-check">✓</span>}
            {idx === step && <span className="solver-animation__step-spinner" />}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AnomalyConsole({ onInject, onDualShock, onAutopilot, onReset, isLoading = false }) {
  const [type, setType] = useState('MONSOON');
  const [severity, setSeverity] = useState(0.85);
  const [locationIdx, setLocationIdx] = useState(0);
  const [solverActive, setSolverActive] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  const handleInject = useCallback(() => {
    const loc = PRESET_LOCATIONS[locationIdx];
    // Estimate impact for preview
    const estTrucks = Math.round(severity * 8 + 2);
    const result = onInject?.({
      type,
      severity,
      lat: loc.lat,
      lng: loc.lng,
      affectedHighway: loc.label,
      timestamp: new Date().toISOString(),
    });
    setLastResult({ estTrucks, result });
    setSolverActive(true);
  }, [type, severity, locationIdx, onInject]);

  const handleSolverComplete = useCallback(() => {
    setSolverActive(false);
  }, []);

  const selectedType = ANOMALY_TYPES.find(t => t.value === type);
  const loc = PRESET_LOCATIONS[locationIdx];
  const estTrucksAffected = Math.round(severity * 8 + 2);
  const estLossINR = Math.round(severity * estTrucksAffected * 3000 * 24 / 100000);

  return (
    <div className="anomaly-console">
      <div className="anomaly-console__title">
        <span>🎛️</span>
        <span>Disruption Injection Console</span>
      </div>

      {/* Scenario Type Cards */}
      <div className="anomaly-console__field">
        <label className="form-label">Disruption Type</label>
        <div className="anomaly-console__type-grid">
          {ANOMALY_TYPES.map(t => (
            <button
              key={t.value}
              className={`anomaly-console__type-card ${type === t.value ? 'active' : ''}`}
              onClick={() => setType(t.value)}
              title={t.description}
            >
              <span className="anomaly-console__type-icon">{t.icon}</span>
              <span className="anomaly-console__type-label">{t.label.split(' ')[0]}</span>
            </button>
          ))}
        </div>
        {selectedType && (
          <div className="anomaly-console__type-desc">
            {selectedType.description}
          </div>
        )}
      </div>

      {/* Severity slider */}
      <div className="anomaly-console__field">
        <div className="anomaly-console__slider-header">
          <label className="form-label" style={{ marginBottom: 0 }}>Severity</label>
          <span
            className="anomaly-console__slider-value"
            style={{
              color: getSeverityColor(severity),
              background: severity >= 0.8 ? 'var(--color-danger-ghost)' :
                          severity >= 0.5 ? 'var(--color-warning-ghost)' :
                          'var(--color-success-ghost)',
            }}
          >
            {(severity * 100).toFixed(0)}%
          </span>
        </div>
        <input
          type="range"
          className="anomaly-console__slider"
          min="0.1" max="1.0" step="0.05"
          value={severity}
          onChange={(e) => setSeverity(parseFloat(e.target.value))}
          style={{ background: `linear-gradient(90deg, #10B981 0%, #F59E0B 50%, #EF4444 100%)` }}
        />
      </div>

      {/* Location */}
      <div className="anomaly-console__field">
        <label className="form-label">Location</label>
        <select
          className="form-select"
          value={locationIdx}
          onChange={(e) => setLocationIdx(parseInt(e.target.value))}
        >
          {PRESET_LOCATIONS.map((loc, i) => (
            <option key={i} value={i}>📍 {loc.label}</option>
          ))}
        </select>
      </div>

      {/* Impact preview panel */}
      {!solverActive && (
        <div className="anomaly-console__preview">
          <div className="anomaly-console__preview-item">
            <span className="anomaly-console__preview-label">Est. trucks affected</span>
            <span className="anomaly-console__preview-value" style={{ color: '#F59E0B' }}>
              ~{estTrucksAffected}
            </span>
          </div>
          <div className="anomaly-console__preview-sep" />
          <div className="anomaly-console__preview-item">
            <span className="anomaly-console__preview-label">Projected loss</span>
            <span className="anomaly-console__preview-value" style={{ color: '#EF4444' }}>
              ₹{estLossINR}L/day
            </span>
          </div>
        </div>
      )}

      {/* Solver animation */}
      <SolverAnimation active={solverActive} onComplete={handleSolverComplete} />

      {/* Inject button */}
      {!solverActive && (
        <button
          className="anomaly-console__inject-btn btn btn-danger"
          onClick={handleInject}
          disabled={isLoading}
          aria-label="Inject disruption into supply chain"
        >
          {isLoading ? '⏳ Injecting...' : '⚡ Inject Disruption'}
        </button>
      )}

      {/* Divider */}
      <div className="anomaly-console__divider">
        <div className="anomaly-console__divider-line" />
        <span className="anomaly-console__divider-text">Demo Presets</span>
        <div className="anomaly-console__divider-line" />
      </div>

      {/* Dual Shock */}
      <button className="anomaly-console__preset-btn" onClick={onDualShock} disabled={isLoading || solverActive} aria-label="Run dual-shock scenario: Western Ghats Monsoon plus ICEGATE Failure">
        💥 Dual-Shock Scenario
        <br />
        <span style={{ fontSize: '9px', opacity: 0.8, fontWeight: 400 }}>
          Western Ghats Monsoon + ICEGATE Failure
        </span>
      </button>

      {/* Pitch Autopilot */}
      <button
        className="anomaly-console__autopilot-btn btn btn-primary"
        style={{ width: '100%', marginTop: '8px', padding: '12px', fontSize: '14px', background: 'var(--gradient-brand)' }}
        onClick={onAutopilot}
        disabled={isLoading || solverActive}
        aria-label="Start automated pitch demonstration"
      >
        {isLoading ? '🤖 Autopilot Running...' : '▶️ Start Pitch Autopilot'}
      </button>

      {/* Reset */}
      <button className="anomaly-console__reset-btn" onClick={onReset} aria-label="Reset all disruptions and restore default state">
        🔄 Reset Demo
      </button>
    </div>
  );
}
