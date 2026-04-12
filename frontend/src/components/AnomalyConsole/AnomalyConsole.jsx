import React, { useState, useCallback } from 'react';
import { ANOMALY_TYPES, PRESET_LOCATIONS } from '../../config/firebase';
import './AnomalyConsole.css';

function getSeverityColor(value) {
  if (value >= 0.8) return '#EF4444';
  if (value >= 0.5) return '#F59E0B';
  return '#10B981';
}

export default function AnomalyConsole({ onInject, onDualShock, onAutopilot, onReset, isLoading = false }) {
  const [type, setType] = useState('MONSOON');
  const [severity, setSeverity] = useState(0.85);
  const [locationIdx, setLocationIdx] = useState(0);

  const handleInject = useCallback(() => {
    const loc = PRESET_LOCATIONS[locationIdx];
    onInject?.({
      type,
      severity,
      lat: loc.lat,
      lng: loc.lng,
      affectedHighway: loc.label,
      timestamp: new Date().toISOString(),
    });
  }, [type, severity, locationIdx, onInject]);

  const handleDualShock = useCallback(() => {
    onDualShock?.();
  }, [onDualShock]);

  const selectedType = ANOMALY_TYPES.find(t => t.value === type);

  return (
    <div className="anomaly-console">
      <div className="anomaly-console__title">
        🎛️ Disruption Injection Console
      </div>

      <div className="anomaly-console__form">
        {/* Type selector */}
        <div className="anomaly-console__field">
          <label className="form-label">Disruption Type</label>
          <select
            className="form-select"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            {ANOMALY_TYPES.map(t => (
              <option key={t.value} value={t.value}>
                {t.icon} {t.label}
              </option>
            ))}
          </select>
          {selectedType && (
            <span style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--color-text-tertiary)',
              marginTop: '2px',
            }}>
              {selectedType.description}
            </span>
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
            min="0.1"
            max="1.0"
            step="0.05"
            value={severity}
            onChange={(e) => setSeverity(parseFloat(e.target.value))}
            style={{
              background: `linear-gradient(90deg, #10B981 0%, #F59E0B 50%, #EF4444 100%)`,
            }}
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
              <option key={i} value={i}>
                📍 {loc.label}
              </option>
            ))}
          </select>
        </div>

        {/* Inject button */}
        <button
          className="anomaly-console__inject-btn btn btn-danger"
          onClick={handleInject}
          disabled={isLoading}
        >
          {isLoading ? '⏳ Injecting...' : '⚡ Inject Disruption'}
        </button>

        {/* Divider */}
        <div className="anomaly-console__divider">
          <div className="anomaly-console__divider-line" />
          <span className="anomaly-console__divider-text">Demo Presets</span>
          <div className="anomaly-console__divider-line" />
        </div>

        {/* Dual Shock button */}
        <button
          className="anomaly-console__preset-btn"
          onClick={handleDualShock}
          disabled={isLoading}
        >
          💥 Dual-Shock Scenario
          <br />
          <span style={{ fontSize: '9px', opacity: 0.8, fontWeight: 400 }}>
            Western Ghats Monsoon + ICEGATE Failure
          </span>
        </button>

        {/* Pitch Autopilot button */}
        <button
          className="anomaly-console__autopilot-btn btn btn-primary"
          style={{ width: '100%', marginTop: '8px', padding: '12px', fontSize: '14px', background: 'linear-gradient(135deg, #4F46E5, #2563EB)' }}
          onClick={onAutopilot}
          disabled={isLoading}
        >
          {isLoading ? '🤖 Autopilot Running...' : '▶️ Start Pitch Autopilot'}
        </button>

        {/* Reset */}
        <button
          className="anomaly-console__reset-btn"
          onClick={onReset}
        >
          🔄 Reset Demo
        </button>
      </div>
    </div>
  );
}
