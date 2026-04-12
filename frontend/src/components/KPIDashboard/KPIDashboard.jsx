import React, { useState, useEffect, useRef } from 'react';
import './KPIDashboard.css';

// Animated counter hook
function useAnimatedValue(target, duration = 1000) {
  const [current, setCurrent] = useState(0);
  const prevRef = useRef(0);

  useEffect(() => {
    const start = prevRef.current;
    const diff = target - start;
    if (diff === 0) return;
    
    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
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

// Mini ring gauge
function RingGauge({ value, max = 100, color = '#2563EB', size = 44 }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(value / max, 1);
  const offset = circumference * (1 - progress);

  return (
    <div className="kpi-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle
          className="kpi-ring__bg"
          cx={size/2} cy={size/2} r={radius}
        />
        <circle
          className="kpi-ring__fill"
          cx={size/2} cy={size/2} r={radius}
          stroke={color}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="kpi-ring__value" style={{ color }}>
        {Math.round(value)}%
      </span>
    </div>
  );
}

function getHealthColor(value) {
  if (value >= 80) return '#10B981';
  if (value >= 60) return '#F59E0B';
  return '#EF4444';
}

export default function KPIDashboard({ kpis = {} }) {
  const etaAnim = useAnimatedValue(kpis.etaAccuracy || 0, 1200);
  const costAnim = useAnimatedValue(kpis.costSavedINR || 0, 1500);
  const trucksAnim = useAnimatedValue(kpis.trucksRerouted || 0, 800);
  const healthAnim = useAnimatedValue(kpis.networkHealth || 0, 1000);

  const formatCost = (val) => {
    if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
    if (val >= 1000) return `₹${(val / 1000).toFixed(0)}K`;
    if (val > 0) return `₹${Math.round(val)}`;
    return '₹0';
  };

  return (
    <div className="kpi-bar">
      {/* ETA Accuracy */}
      <div className="kpi-card kpi-card--eta">
        <RingGauge value={etaAnim} color="#2563EB" />
        <div>
          <span className="kpi-card__value" style={{ color: '#2563EB', fontSize: 'var(--text-lg)' }}>
            {etaAnim.toFixed(1)}%
          </span>
          <span className="kpi-card__label">ETA Accuracy</span>
        </div>
      </div>

      {/* Cost Saved */}
      <div className="kpi-card kpi-card--cost">
        <span className="kpi-card__icon">💰</span>
        <span className="kpi-card__value" style={{ color: '#10B981' }}>
          {formatCost(costAnim)}
        </span>
        <span className="kpi-card__label">Cost Saved</span>
        {kpis.costSavedINR > 0 && (
          <span className="kpi-card__trend kpi-card__trend--up">↑ Demurrage avoided</span>
        )}
      </div>

      {/* Trucks Rerouted */}
      <div className="kpi-card kpi-card--trucks">
        <span className="kpi-card__icon">🚛</span>
        <span className="kpi-card__value" style={{ color: '#D97706' }}>
          {Math.round(trucksAnim)}
        </span>
        <span className="kpi-card__label">Trucks Rerouted</span>
        {kpis.trucksRerouted > 0 && (
          <span className="kpi-card__trend kpi-card__trend--up">↑ Autonomous</span>
        )}
      </div>

      {/* Network Health */}
      <div className="kpi-card kpi-card--health">
        <RingGauge value={healthAnim} color={getHealthColor(healthAnim)} />
        <div>
          <span className="kpi-card__value" style={{ color: getHealthColor(healthAnim), fontSize: 'var(--text-lg)' }}>
            {Math.round(healthAnim)}%
          </span>
          <span className="kpi-card__label">Network Health</span>
        </div>
      </div>

      {/* Active Routes */}
      <div className="kpi-card" style={{ flex: '0.6' }}>
        <span className="kpi-card__icon">📡</span>
        <span className="kpi-card__value" style={{ color: '#6366F1', fontSize: 'var(--text-lg)' }}>
          {kpis.activeRoutes || 0}
        </span>
        <span className="kpi-card__label">Active Routes</span>
      </div>

      {/* Zero Human Interventions */}
      <div className="kpi-card" style={{ flex: '0.8' }}>
        <span className="kpi-card__icon">🤖</span>
        <span className="kpi-card__value" style={{ color: '#10B981', fontSize: 'var(--text-lg)' }}>
          0
        </span>
        <span className="kpi-card__label">Human Interventions</span>
        <span className="kpi-card__trend kpi-card__trend--up" style={{ fontSize: '9px' }}>
          Fully Autonomous
        </span>
      </div>
    </div>
  );
}
