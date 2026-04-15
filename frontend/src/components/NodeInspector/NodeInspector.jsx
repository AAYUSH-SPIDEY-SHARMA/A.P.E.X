import React from 'react';
import './NodeInspector.css';

const typeIcons = {
  TOLL_PLAZA: '🛣️',
  WAREHOUSE: '📦',
  ICD: '🏗️',
  RTO_CHECKPOINT: '🚧',
};

function getBarColor(value) {
  if (value >= 0.85) return '#EF4444';
  if (value >= 0.65) return '#F59E0B';
  return '#10B981';
}

export default function NodeInspector({ node, onClose }) {
  if (!node) {
    return (
      <div className="node-inspector">
        <div className="node-inspector__empty">
          <div className="node-inspector__empty-icon">📍</div>
          <div className="node-inspector__empty-text">
            Click a node on the map<br />to inspect its details
          </div>
        </div>
      </div>
    );
  }

  const ssw = Math.max(0, (node.ttr || 0) - (node.tts || 0));
  const utilization = node.utilization || 0;

  return (
    <div className="node-inspector">
      <div className="node-inspector__header">
        <div className="node-inspector__title-group">
          <span className="node-inspector__icon">
            {typeIcons[node.type] || '📍'}
          </span>
          <div className="node-inspector__info">
            <span className="node-inspector__name">{node.name}</span>
            <span className="node-inspector__highway">{node.highway || node.type?.replace('_', ' ')}</span>
          </div>
        </div>
        <button className="node-inspector__close" onClick={onClose} title="Close">✕</button>
      </div>

      {/* Status badge */}
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <span className={`status-badge status-badge--${node.status?.toLowerCase()}`}>
          {node.status}
        </span>
      </div>

      <div className="node-inspector__metrics">
        {/* Utilization */}
        <div className="node-inspector__metric">
          <div className="node-inspector__metric-header">
            <span className="node-inspector__metric-label">Utilization (ρ)</span>
            <span className="node-inspector__metric-value" style={{ color: getBarColor(utilization) }}>
              {(utilization * 100).toFixed(0)}%
            </span>
          </div>
          <div className="node-inspector__bar-track">
            <div
              className="node-inspector__bar-fill"
              style={{
                width: `${utilization * 100}%`,
                background: `linear-gradient(90deg, ${getBarColor(utilization)}88, ${getBarColor(utilization)})`,
              }}
            />
          </div>
        </div>

        {/* Queue Length */}
        <div className="node-inspector__metric">
          <div className="node-inspector__metric-header">
            <span className="node-inspector__metric-label">Queue Length</span>
            <span className="node-inspector__metric-value">{node.queueLength || 0} vehicles</span>
          </div>
          <div className="node-inspector__bar-track">
            <div
              className="node-inspector__bar-fill"
              style={{
                width: `${Math.min(100, ((node.queueLength || 0) / 150) * 100)}%`,
                background: `linear-gradient(90deg, #6366F188, #6366F1)`,
              }}
            />
          </div>
        </div>

        {/* Resilience Metrics */}
        <div className="node-inspector__metric">
          <span className="node-inspector__metric-label">Resilience Metrics</span>
          <div className="node-inspector__resilience">
            <div className="node-inspector__resilience-item">
              <span className="node-inspector__resilience-label">TTR</span>
              <span className="node-inspector__resilience-value" style={{ color: '#6366F1' }}>
                {node.ttr || 0}h
              </span>
            </div>
            <div className="node-inspector__resilience-item">
              <span className="node-inspector__resilience-label">TTS</span>
              <span className="node-inspector__resilience-value" style={{ color: '#2563EB' }}>
                {node.tts || 0}h
              </span>
            </div>
            <div className="node-inspector__resilience-item">
              <span className="node-inspector__resilience-label">SSW</span>
              <span className="node-inspector__resilience-value" style={{
                color: ssw > 0 ? '#EF4444' : '#10B981'
              }}>
                {ssw}h
              </span>
            </div>
          </div>
        </div>

        {/* SSW Assessment */}
        <div className={`node-inspector__ssw-badge ${ssw > 0 ? 'node-inspector__ssw-badge--risk' : 'node-inspector__ssw-badge--safe'}`}>
          {ssw > 0
            ? `⚠️ AT RISK — ${ssw}h service shortfall window`
            : '✅ RESILIENT — Network can absorb disruption'
          }
        </div>
      </div>
    </div>
  );
}
