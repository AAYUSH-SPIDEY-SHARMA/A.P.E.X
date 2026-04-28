import React, { useEffect, useRef, useState, useCallback } from 'react';
import './AlertTimeline.css';

const severityIcons = {
  CRITICAL: '🔴',
  WARNING: '🟡',
  INFO: '🔵',
};

const EVENT_TYPES = {
  DISRUPTION: { icon: '💥', label: 'DISRUPTION', color: '#EF4444' },
  AI_RESPONSE: { icon: '🤖', label: 'AI ACTION', color: '#2563EB' },
  RESOLUTION: { icon: '✅', label: 'RESOLVED', color: '#10B981' },
  REROUTE: { icon: '🗺️', label: 'REROUTED', color: '#8B5CF6' },
  EWAYBILL: { icon: '📋', label: 'eWAY BILL', color: '#F59E0B' },
  INFO:     { icon: '📡', label: 'TELEMETRY', color: '#64748B' },
};

function timeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
  if (seconds < 10) return 'Just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

// Classify an alert into an event type
function classifyAlert(alert) {
  const msg = (alert.message || '').toLowerCase();
  if (msg.includes('rerouted') || msg.includes('rerouting')) return 'REROUTE';
  if (msg.includes('resolved') || msg.includes('cleared') || msg.includes('normal')) return 'RESOLUTION';
  if (msg.includes('ai') || msg.includes('autonomous') || msg.includes('agent') || msg.includes('xgboost') || msg.includes('optimiz')) return 'AI_RESPONSE';
  if (msg.includes('eway') || msg.includes('e-way') || msg.includes('compliance')) return 'EWAYBILL';
  if (alert.severity === 'CRITICAL' || msg.includes('disruption') || msg.includes('blocked') || msg.includes('failure')) return 'DISRUPTION';
  return 'INFO';
}

const FILTERS = ['ALL', 'CRITICAL', 'AI'];

export default function AlertTimeline({ alerts = [] }) {
  const listRef = useRef(null);
  const [filter, setFilter] = useState('ALL');
  const [expanded, setExpanded] = useState(null);
  const prevLengthRef = useRef(0);

  // Auto-scroll to newest alert
  useEffect(() => {
    if (alerts.length > prevLengthRef.current && listRef.current) {
      const firstChild = listRef.current.firstElementChild;
      if (firstChild) firstChild.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    prevLengthRef.current = alerts.length;
  }, [alerts.length]);

  const toggleExpand = useCallback((id) => {
    setExpanded(prev => prev === id ? null : id);
  }, []);

  // Filter alerts
  const filteredAlerts = alerts.filter(alert => {
    if (filter === 'ALL') return true;
    if (filter === 'CRITICAL') return alert.severity === 'CRITICAL';
    if (filter === 'AI') {
      const t = classifyAlert(alert);
      return t === 'AI_RESPONSE' || t === 'REROUTE' || t === 'RESOLUTION';
    }
    return true;
  });

  // Fix L-04: Build single-pass index of disruption timestamps (O(n) instead of O(n²))
  // BUG-11 FIX: Also pre-build alert→index map to avoid O(n) indexOf inside loop
  let lastDisruptionTime = null;
  const disruptionIndex = new Map();
  const alertIndexMap = new Map();  // alert object → original index
  for (let i = alerts.length - 1; i >= 0; i--) {
    alertIndexMap.set(alerts[i], i);
    if (classifyAlert(alerts[i]) === 'DISRUPTION') {
      lastDisruptionTime = alerts[i].timestamp;
    }
    disruptionIndex.set(i, lastDisruptionTime);
  }

  const alertsWithLatency = filteredAlerts.map((alert) => {
    const eventType = classifyAlert(alert);
    let latency = null;
    if (eventType === 'AI_RESPONSE' || eventType === 'REROUTE') {
      const origIdx = alertIndexMap.get(alert) ?? -1;  // O(1) lookup instead of O(n) indexOf
      const prevDisruptionTime = disruptionIndex.get(origIdx);
      if (prevDisruptionTime) {
        const ms = new Date(alert.timestamp) - new Date(prevDisruptionTime);
        if (ms > 0 && ms < 60000) latency = `${(ms / 1000).toFixed(1)}s`;
      }
    }
    return { ...alert, eventType, latency };
  });

  if (alerts.length === 0) {
    return (
      <div>
        <div className="alert-timeline__title">📋 Activity Feed</div>
        <div className="alert-timeline__empty">
          No alerts yet. Inject a disruption to see the AI respond.
        </div>
      </div>
    );
  }

  return (
    <div className="alert-timeline-container">
      <div className="alert-timeline__header">
        <div className="alert-timeline__title">
          📋 Activity Feed
          <span className="alert-timeline__count">{alerts.length}</span>
        </div>
        {/* Filter tabs */}
        <div className="alert-timeline__filters">
          {FILTERS.map(f => (
            <button
              key={f}
              className={`alert-timeline__filter-btn ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="alert-timeline__list" ref={listRef} aria-live="polite" aria-label="Alert feed">
        {alertsWithLatency.slice(0, 30).map((alert, idx) => {
          const evType = EVENT_TYPES[alert.eventType] || EVENT_TYPES.INFO;
          const isExpanded = expanded === (alert.id || idx);

          return (
            <div
              key={alert.id || idx}
              className={`alert-timeline__item alert-timeline__item--${alert.severity?.toLowerCase()} ${isExpanded ? 'expanded' : ''}`}
              style={{ animationDelay: `${idx * 40}ms`, borderLeftColor: evType.color }}
              onClick={() => toggleExpand(alert.id || idx)}
            >
              {/* Event type badge */}
              <div className="alert-timeline__event-badge" style={{ background: evType.color + '22', color: evType.color }}>
                {evType.icon} {evType.label}
              </div>

              <div className="alert-timeline__content">
                <div className="alert-timeline__message">{alert.message}</div>
                <div className="alert-timeline__meta">
                  <span className="alert-timeline__time">
                    {severityIcons[alert.severity] || '🔵'} {timeAgo(alert.timestamp)}
                  </span>
                  {alert.latency && (
                    <span className="alert-timeline__latency">
                      ⚡ Responded in {alert.latency}
                    </span>
                  )}
                  {alert.costSavedINR > 0 && (
                    <span className="alert-timeline__cost">
                      +₹{(alert.costSavedINR / 100000).toFixed(1)}L saved
                    </span>
                  )}
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="alert-timeline__detail">
                    {alert.type && <div><b>Type:</b> {alert.type}</div>}
                    {alert.affectedHighway && <div><b>Highway:</b> {alert.affectedHighway}</div>}
                    {alert.severity && <div><b>Severity:</b> {alert.severity}</div>}
                    {alert.trucksAffected > 0 && <div><b>Trucks affected:</b> {alert.trucksAffected}</div>}
                    <div style={{ color: 'var(--color-text-tertiary)', fontSize: '9px', marginTop: 2 }}>
                      {new Date(alert.timestamp).toLocaleString('en-IN')}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* AI autonomy summary */}
      {alerts.length > 2 && (
        <div className="alert-timeline__autonomy-bar">
          <span className="alert-timeline__autonomy-dot" />
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-success)', fontWeight: 700 }}>
            {alerts.filter(a => classifyAlert(a) === 'AI_RESPONSE' || classifyAlert(a) === 'REROUTE').length} autonomous actions — 0 human interventions
          </span>
        </div>
      )}
    </div>
  );
}
