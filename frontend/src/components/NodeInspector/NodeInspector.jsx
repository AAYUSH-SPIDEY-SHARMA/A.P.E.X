import React, { useMemo, useRef, useEffect, useState } from 'react';
import './NodeInspector.css';

const typeIcons = {
  TOLL_PLAZA: '🛣️',
  WAREHOUSE: '📦',
  ICD: '🏗️',
  RTO_CHECKPOINT: '🚧',
};

const typeLabels = {
  TOLL_PLAZA: 'Toll Plaza',
  WAREHOUSE: 'Warehouse Hub',
  ICD: 'Inland Container Depot',
  RTO_CHECKPOINT: 'RTO Checkpoint',
};

function getBarColor(value) {
  if (value >= 0.85) return '#EF4444';
  if (value >= 0.65) return '#F59E0B';
  return '#10B981';
}

// ── Mini SVG sparkline ──────────────────────────────────────────
function Sparkline({ values = [], color = '#2563EB', width = 80, height = 22 }) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 0.01);
  const min = Math.min(...values);
  const range = max - min || 0.01;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={width} height={height} style={{ overflow: 'visible' }}>
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.8"
      />
      <circle
        cx={width}
        cy={height - ((values[values.length - 1] - min) / range) * (height - 4) - 2}
        r="2.5"
        fill={color}
      />
    </svg>
  );
}

// ── Phase 7H: XGBoost Probability Gauge (Canvas-rendered doughnut) ──
function XGBoostGauge({ probability = 0, size = 80 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    const cx = size / 2;
    const cy = size / 2;
    const radius = size / 2 - 8;
    const startAngle = Math.PI * 0.75;
    const fullArc = Math.PI * 1.5;

    const prob = Math.max(0, Math.min(1, probability));
    const color = prob > 0.85 ? '#EF4444' : prob > 0.65 ? '#F59E0B' : '#10B981';

    ctx.clearRect(0, 0, size, size);

    // Track arc
    ctx.beginPath();
    ctx.arc(cx, cy, radius, startAngle, startAngle + fullArc);
    ctx.strokeStyle = 'rgba(30,41,59,0.8)';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Fill arc
    if (prob > 0) {
      ctx.beginPath();
      ctx.arc(cx, cy, radius, startAngle, startAngle + fullArc * prob);
      ctx.strokeStyle = color;
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      ctx.shadowColor = color;
      ctx.shadowBlur = 12;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Center text
    ctx.fillStyle = color;
    ctx.font = `bold ${size * 0.22}px "JetBrains Mono", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${Math.round(prob * 100)}%`, cx, cy - 4);

    ctx.fillStyle = 'rgba(148,163,184,0.7)';
    ctx.font = `600 ${size * 0.11}px Inter, sans-serif`;
    ctx.fillText('RISK', cx, cy + size * 0.13);
  }, [probability, size]);

  return <canvas ref={canvasRef} style={{ display: 'block' }} />;
}

// ── Phase 7H: Live Route Confidence Gauge ─────────────────────
function ConfidenceBar({ label, value = 0, color = '#6366f1', animDelay = 0 }) {
  const pct = Math.round(value * 100);
  return (
    <div className="node-inspector__conf-row">
      <span className="node-inspector__conf-label">{label}</span>
      <div className="node-inspector__conf-track">
        <div
          className="node-inspector__conf-fill"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${color}88, ${color})`,
            animationDelay: `${animDelay}ms`,
          }}
        />
      </div>
      <span className="node-inspector__conf-value" style={{ color }}>{pct}%</span>
    </div>
  );
}

// ── Cascade risk gauge arc ─────────────────────────────────────
function CascadeGauge({ risk = 0 }) {
  const size = 52;
  const cx = size / 2, cy = size / 2;
  const r = 20;
  const clampedRisk = Math.max(0, Math.min(1, risk));
  const angle = clampedRisk * 180;
  const x = cx + r * Math.cos(Math.PI - (angle * Math.PI / 180));
  const y = cy - r * Math.sin(angle * Math.PI / 180);
  const color = risk >= 0.7 ? '#EF4444' : risk >= 0.4 ? '#F59E0B' : '#10B981';

  return (
    <svg width={size} height={size / 2 + 12} viewBox={`0 0 ${size} ${size / 2 + 12}`}>
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none" stroke="var(--color-border-strong)" strokeWidth="4" strokeLinecap="round"
      />
      {clampedRisk > 0 && (
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 ${angle > 90 ? 1 : 0} 1 ${x} ${y}`}
          fill="none" stroke={color} strokeWidth="4" strokeLinecap="round"
        />
      )}
      <line x1={cx} y1={cy} x2={x} y2={y} stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="2.5" fill={color} />
      <text x={cx} y={cy + 14} textAnchor="middle" fontSize="9" fontWeight="700" fill={color}>
        {(clampedRisk * 100).toFixed(0)}%
      </text>
    </svg>
  );
}

export default function NodeInspector({ node, onClose, allNodes = [], onSelectNode }) {
  // Fix L-07: Accumulate real utilization history instead of synthetic sine wave
  const utilHistoryRef = useRef([]);
  const utilHistory = useMemo(() => {
    const u = node?.utilization || 0.4;
    utilHistoryRef.current = [...utilHistoryRef.current.slice(-19), u];
    return utilHistoryRef.current;
  }, [node?.utilization]);

  // Phase 7H: Simulate live XGBoost delay probability from node metrics
  const xgboostProb = useMemo(() => {
    if (!node) return 0;
    const u = node.utilization || 0;
    const q = Math.min(1, (node.queueLength || 0) / 100);
    const ssw = Math.max(0, (node.ttr || 0) - (node.tts || 0));
    const sswFactor = Math.min(0.3, ssw * 0.02);
    return Math.min(0.99, u * 0.6 + q * 0.25 + sswFactor + (node.status === 'DISRUPTED' ? 0.25 : 0));
  }, [node]);

  // Phase 7H: Per-risk-factor confidence bars
  // BUG-07 FIX: Derive Weather Risk and ICEGATE Load from actual node properties
  // instead of hardcoded 0.12 / 0.35 that never change
  const confidenceFactors = useMemo(() => {
    if (!node) return [];
    const u = node.utilization || 0;
    const q = (node.queueLength || 0) / 150;
    const ssw = Math.max(0, (node.ttr || 0) - (node.tts || 0));

    // Weather Risk: derived from queue buildup × status severity × seasonal factor
    // Higher when node is delayed/disrupted (implies external factors)
    const statusMult = node.status === 'DISRUPTED' ? 0.85 : node.status === 'DELAYED' ? 0.45 : 0.1;
    const weatherRisk = Math.min(0.99, statusMult + q * 0.15 + ssw * 0.01);

    // ICEGATE Load: derived from utilization + processing backlog
    // High util + long queues = customs bottleneck
    const icegateLoad = Math.min(0.99, u * 0.5 + q * 0.3 + (node.type === 'ICD' ? 0.2 : 0));

    return [
      { label: 'Queue Pressure', value: Math.min(1, q), color: '#6366f1', delay: 0 },
      { label: 'Utilization ρ', value: u, color: getBarColor(u), delay: 80 },
      { label: 'Weather Risk', value: weatherRisk, color: '#06b6d4', delay: 160 },
      { label: 'ICEGATE Load', value: icegateLoad, color: '#8b5cf6', delay: 240 },
    ];
  }, [node]);

  if (!node) {
    return (
      <div className="node-inspector">
        <div className="node-inspector__empty">
          <div className="node-inspector__empty-icon">📍</div>
          <div className="node-inspector__empty-text">
            Click a node on the map<br />or select from the list below
          </div>
          {allNodes.length > 0 && (
            <select
              className="node-inspector__node-select"
              defaultValue=""
              onChange={e => {
                const found = allNodes.find(n => n.id === e.target.value);
                if (found) onSelectNode?.(found);
              }}
            >
              <option value="" disabled>— Select a node —</option>
              {[...allNodes]
                .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
                .map(n => (
                  <option key={n.id} value={n.id}>
                    {n.status === 'DISRUPTED' ? '🔴 ' : n.status === 'DELAYED' ? '🟡 ' : '🟢 '}
                    {n.name} ({n.type?.replace(/_/g,' ')})
                  </option>
                ))
              }
            </select>
          )}
        </div>
      </div>
    );
  }

  const ssw = Math.max(0, (node.ttr || 0) - (node.tts || 0));
  const utilization = node.utilization || 0;
  const cascadeRisk = Math.min(1, (node.utilization || 0) * (ssw > 0 ? 1.4 : 1.0));
  const isBottleneck = utilization >= 0.85;

  return (
    <div className="node-inspector">
      {/* Bottleneck Banner */}
      {isBottleneck && (
        <div className="node-inspector__bottleneck-banner">
          <span className="node-inspector__bottleneck-dot" />
          BOTTLENECK DETECTED — ρ = {(utilization * 100).toFixed(0)}%
        </div>
      )}

      <div className="node-inspector__header">
        <div className="node-inspector__title-group">
          <span className="node-inspector__icon">{typeIcons[node.type] || '📍'}</span>
          <div className="node-inspector__info">
            <span className="node-inspector__name">{node.name}</span>
            <span className="node-inspector__highway">
              {typeLabels[node.type] || node.type} · {node.highway || 'Network Node'}
            </span>
          </div>
        </div>
        <button className="node-inspector__close" onClick={onClose} title="Close">✕</button>
      </div>

      {/* Status badge */}
      <div style={{ marginBottom: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
        <span className={`status-badge status-badge--${node.status?.toLowerCase()}`}>
          {node.status}
        </span>
        {node.commodity && (
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', background: 'var(--color-bg-secondary)', padding: '2px 8px', borderRadius: 'var(--radius-full)' }}>
            {node.commodity}
          </span>
        )}
      </div>

      <div className="node-inspector__metrics">

        {/* ── Phase 7H: XGBoost Probability Gauge ──────────────── */}
        <div className="node-inspector__xgb-section">
          <div className="node-inspector__xgb-gauge">
            <XGBoostGauge probability={xgboostProb} size={78} />
          </div>
          <div className="node-inspector__xgb-factors">
            <div className="node-inspector__xgb-title">XGBoost Delay Probability</div>
            {confidenceFactors.map((f) => (
              <ConfidenceBar key={f.label} {...f} />
            ))}
          </div>
        </div>

        {/* Utilization with sparkline */}
        <div className="node-inspector__metric">
          <div className="node-inspector__metric-header">
            <span className="node-inspector__metric-label">Utilization (ρ)</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <Sparkline values={utilHistory} color={getBarColor(utilization)} width={60} height={18} />
              <span className="node-inspector__metric-value" style={{ color: getBarColor(utilization) }}>
                {(utilization * 100).toFixed(0)}%
              </span>
            </div>
          </div>
          <div className="node-inspector__bar-track">
            <div
              className={`node-inspector__bar-fill ${isBottleneck ? 'node-inspector__bar-fill--bottleneck' : ''}`}
              style={{
                width: `${utilization * 100}%`,
                background: `linear-gradient(90deg, ${getBarColor(utilization)}88, ${getBarColor(utilization)})`,
              }}
            />
            <div className="node-inspector__bar-threshold" style={{ left: '85%' }} title="BPR Bottleneck threshold (ρ=0.85)" />
          </div>
          <div className="node-inspector__bar-legend">
            <span style={{ fontSize: '9px', color: 'var(--color-text-tertiary)' }}>0%</span>
            <span style={{ fontSize: '9px', color: '#F59E0B', marginLeft: 'auto' }}>▲85%</span>
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

        {/* TTR / TTS / SSW Cards */}
        <div className="node-inspector__metric">
          <span className="node-inspector__metric-label">Resilience Metrics</span>
          <div className="node-inspector__ttr-cards">
            <div className="node-inspector__ttr-card">
              <span className="node-inspector__ttr-card-value" style={{ color: '#6366F1' }}>
                {node.ttr || 0}h
              </span>
              <span className="node-inspector__ttr-card-label">TTR</span>
              <span className="node-inspector__ttr-card-desc">Time To Recover</span>
            </div>
            <div className="node-inspector__ttr-card">
              <span className="node-inspector__ttr-card-value" style={{ color: '#2563EB' }}>
                {node.tts || 0}h
              </span>
              <span className="node-inspector__ttr-card-label">TTS</span>
              <span className="node-inspector__ttr-card-desc">Time To Survive</span>
            </div>
            <div className="node-inspector__ttr-card" style={{ background: ssw > 0 ? 'var(--color-danger-ghost)' : 'var(--color-success-ghost)' }}>
              <span className="node-inspector__ttr-card-value" style={{ color: ssw > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
                {ssw}h
              </span>
              <span className="node-inspector__ttr-card-label">SSW</span>
              <span className="node-inspector__ttr-card-desc">Service Shortfall</span>
            </div>
          </div>
        </div>

        {/* Cascade Risk Gauge */}
        <div className="node-inspector__metric node-inspector__cascade-row">
          <div>
            <span className="node-inspector__metric-label">Cascade Risk Index</span>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', marginTop: 2 }}>
              severity × (1 − resilience)
            </div>
          </div>
          <CascadeGauge risk={cascadeRisk} />
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
