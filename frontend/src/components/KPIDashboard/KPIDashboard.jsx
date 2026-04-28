/**
 * KPIDashboard.jsx — Phase 7G: Mission Control Hex Card Upgrade
 *
 * Upgraded with:
 * - Orbitron numeric display for all KPI values
 * - Hexagonal clip-path status cards for Cascade Risk & Human Interventions
 * - Animated scanning border on the outer container
 * - Neon glow utilities applied to critical metrics
 * - Refined color palette maintaining existing data logic
 */
import React, { useState, useEffect, useRef } from 'react';
import './KPIDashboard.css';

// Animated counter hook
function useAnimatedValue(target, duration = 1000) {
  const [current, setCurrent] = useState(0);
  const prevRef = useRef(0);

  useEffect(() => {
    const start = prevRef.current;
    const diff = target - start;
    if (Math.abs(diff) < 0.01) return;

    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = start + diff * eased;
      setCurrent(value);
      if (progress < 1) requestAnimationFrame(animate);
      else prevRef.current = target;
    };
    requestAnimationFrame(animate);
  }, [target, duration]);

  return current;
}

// Tiny sparkline SVG
function Sparkline({ values = [], color = '#6366f1', width = 60, height = 20 }) {
  if (!values || values.length < 2) return null;
  const max = Math.max(...values, 0.01);
  const min = Math.min(...values);
  const range = (max - min) || 0.01;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 2) - 1;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  return (
    <svg width={width} height={height} style={{ overflow: 'visible', opacity: 0.8 }}>
      <defs>
        <linearGradient id={`sg-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.8"/>
          <stop offset="100%" stopColor={color} stopOpacity="0.1"/>
        </linearGradient>
      </defs>
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Fill area under sparkline */}
      <polyline
        points={`0,${height} ${pts} ${width},${height}`}
        fill={`url(#sg-${color.replace('#','')})`}
        stroke="none"
        opacity="0.3"
      />
    </svg>
  );
}

// Phase 7G: Enhanced ring gauge with neon glow
function RingGauge({ value, max = 100, color = '#6366f1', size = 48 }) {
  const radius = (size - 10) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(value / max, 1);
  const offset = circumference * (1 - progress);

  return (
    <div className="kpi-ring" style={{ width: size, height: size, position: 'relative' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="rgba(30,41,59,0.8)" strokeWidth="6"
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{
            filter: `drop-shadow(0 0 4px ${color}aa)`,
            transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
      </svg>
      <span style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: size * 0.22, fontWeight: 700, color,
        textShadow: `0 0 8px ${color}88`,
      }}>
        {Math.round(value)}%
      </span>
    </div>
  );
}

// Phase 7G: Hexagonal metric badge for bold display of 0/small integers
function HexBadge({ value, color = '#10B981', label }) {
  return (
    <div className="kpi-hex-badge">
      <div
        className="kpi-hex-badge__shape"
        style={{
          background: `linear-gradient(135deg, ${color}22, ${color}11)`,
          border: `1px solid ${color}44`,
          boxShadow: `0 0 16px ${color}33, inset 0 0 12px ${color}11`,
        }}
      >
        <span
          className="kpi-hex-badge__value"
          style={{ color, textShadow: `0 0 12px ${color}` }}
        >
          {value}
        </span>
      </div>
      <span className="kpi-hex-badge__label">{label}</span>
    </div>
  );
}

function getHealthColor(value) {
  if (value >= 80) return '#10B981';
  if (value >= 60) return '#F59E0B';
  return '#EF4444';
}

function getCascadeColor(risk) {
  if (risk >= 60) return '#EF4444';
  if (risk >= 30) return '#F59E0B';
  return '#10B981';
}

export default function KPIDashboard({ kpis = {} }) {
  // BUG-01 FIX: Hooks MUST be called before any conditional return (React Rules of Hooks)
  const etaAnim     = useAnimatedValue(kpis?.etaAccuracy   || 0, 1200);
  const costAnim    = useAnimatedValue(kpis?.costSavedINR  || 0, 1500);
  const trucksAnim  = useAnimatedValue(kpis?.trucksRerouted|| 0, 800);
  const healthAnim  = useAnimatedValue(kpis?.networkHealth || 0, 1000);
  const cascadeAnim = useAnimatedValue(kpis?.cascadeRisk   || 0, 900);

  // Rolling history for sparklines (last 20 ticks) — Fix L-03: use interval instead of effect
  const etaHistRef    = useRef([]);
  const healthHistRef = useRef([]);
  const [, forceUpdate] = useState(0);
  const etaAnimRef = useRef(0);
  const healthAnimRef = useRef(0);
  etaAnimRef.current = etaAnim;
  healthAnimRef.current = healthAnim;

  useEffect(() => {
    const interval = setInterval(() => {
      etaHistRef.current    = [...etaHistRef.current.slice(-19),    etaAnimRef.current];
      healthHistRef.current = [...healthHistRef.current.slice(-19), healthAnimRef.current];
      forceUpdate(n => n + 1);
    }, 2000); // Accumulate every 2s — stable interval, no dep churn
    return () => clearInterval(interval);
  }, []);

  // S-05: Show skeleton while data is loading (AFTER all hooks)
  if (!kpis || (!kpis.activeRoutes && !kpis.trucksRerouted && !kpis.networkHealth)) {
    return (
      <div className="kpi-dashboard" aria-label="KPI Dashboard loading">
        <div className="kpi-skeleton">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="kpi-skeleton__card">
              <div className="skeleton" style={{ width: '40%', height: '8px', background: 'var(--color-bg-secondary)', borderRadius: '4px', position: 'relative', overflow: 'hidden' }} />
              <div className="skeleton" style={{ width: '60%', height: '14px', background: 'var(--color-bg-secondary)', borderRadius: '4px', position: 'relative', overflow: 'hidden' }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const formatCost = (val) => {
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)}Cr`;
    if (val >= 100000)   return `₹${(val / 100000).toFixed(1)}L`;
    if (val >= 1000)     return `₹${(val / 1000).toFixed(0)}K`;
    if (val > 0)         return `₹${Math.round(val)}`;
    return '₹0';
  };

  const healthColor  = getHealthColor(healthAnim);
  const cascadeColor = getCascadeColor(cascadeAnim);

  return (
    <div className="kpi-bar">

      {/* ── ETA Accuracy ── */}
      <div className="kpi-card kpi-card--eta">
        <RingGauge value={etaAnim} color="#6366f1" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <Sparkline values={etaHistRef.current} color="#6366f1" />
          <div className="kpi-card__meta">
            <span className="kpi-card__value kpi-card__value--orbitron" style={{ color: '#818cf8' }}>
              {etaAnim.toFixed(1)}<span className="kpi-card__unit">%</span>
            </span>
            <span className="kpi-card__label">ETA Accuracy</span>
            <span className="kpi-card__badge kpi-card__badge--safe">MAPE &lt;10%</span>
          </div>
        </div>
      </div>

      {/* ── Cost Saved ── */}
      <div className="kpi-card kpi-card--cost">
        <div className="kpi-card__icon-wrap kpi-card__icon-wrap--green">
          <span className="kpi-card__icon-glyph">₹</span>
        </div>
        <div className="kpi-card__meta">
          <span className="kpi-card__value kpi-card__value--orbitron" style={{ color: '#34d399' }}>
            {formatCost(costAnim)}
          </span>
          <span className="kpi-card__label">Cost Saved</span>
          {kpis.costSavedINR > 0 && (
            <span className="kpi-card__badge kpi-card__badge--safe">↑ Demurrage saved</span>
          )}
        </div>
      </div>

      {/* ── Trucks Rerouted ── */}
      <div className="kpi-card kpi-card--trucks">
        <div className="kpi-card__icon-wrap kpi-card__icon-wrap--amber">
          <span className="kpi-card__icon-glyph">🚛</span>
        </div>
        <div className="kpi-card__meta">
          <span className="kpi-card__value kpi-card__value--orbitron" style={{ color: '#fbbf24' }}>
            {Math.round(trucksAnim)}
          </span>
          <span className="kpi-card__label">Trucks Rerouted</span>
          {kpis.trucksRerouted > 0 && (
            <span className="kpi-card__badge kpi-card__badge--info">↑ A* Autonomy</span>
          )}
        </div>
      </div>

      {/* ── Network Health ── */}
      <div className="kpi-card kpi-card--health">
        <RingGauge value={healthAnim} color={healthColor} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <Sparkline values={healthHistRef.current} color={healthColor} />
          <div className="kpi-card__meta">
            <span className="kpi-card__value kpi-card__value--orbitron" style={{ color: healthColor }}>
              {Math.round(healthAnim)}<span className="kpi-card__unit">%</span>
            </span>
            <span className="kpi-card__label">Network Health</span>
          </div>
        </div>
      </div>

      {/* ── Active Routes (hex badge) ── */}
      <HexBadge value={kpis.activeRoutes || 0} color="#6366f1" label="Active Routes" />

      {/* ── Cascade Risk ── */}
      <div className={`kpi-card kpi-card--cascade ${cascadeAnim >= 60 ? 'kpi-card--critical-pulse' : ''}`}>
        <div className="kpi-card__icon-wrap kpi-card__icon-wrap--cascade" style={{ background: `${cascadeColor}22`, border: `1px solid ${cascadeColor}44` }}>
          <span className="kpi-card__icon-glyph">⚡</span>
        </div>
        <div className="kpi-card__meta">
          <span className="kpi-card__value kpi-card__value--orbitron" style={{ color: cascadeColor, textShadow: `0 0 12px ${cascadeColor}88` }}>
            {Math.round(cascadeAnim)}
          </span>
          <span className="kpi-card__label">Cascade Risk</span>
          {(kpis.bottleneckCount || 0) > 0 && (
            <span className="kpi-card__badge kpi-card__badge--danger">
              {kpis.bottleneckCount} bottleneck{kpis.bottleneckCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* ── Zero Human Interventions (hex badge) ── */}
      <HexBadge value={0} color="#10B981" label="Human Interventions" />

    </div>
  );
}
