import React from 'react';
import './AlertTimeline.css';

const severityIcons = {
  CRITICAL: '🔴',
  WARNING: '🟡',
  INFO: '🔵',
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

export default function AlertTimeline({ alerts = [] }) {
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
    <div>
      <div className="alert-timeline__title">
        📋 Activity Feed
        <span style={{
          fontSize: '10px',
          fontWeight: 600,
          color: 'var(--color-text-tertiary)',
          background: 'var(--color-bg-secondary)',
          padding: '2px 8px',
          borderRadius: 'var(--radius-full)',
        }}>
          {alerts.length}
        </span>
      </div>

      <div className="alert-timeline__list">
        {alerts.slice(0, 30).map((alert, idx) => (
          <div
            key={alert.id || idx}
            className={`alert-timeline__item alert-timeline__item--${alert.severity?.toLowerCase()}`}
            style={{ animationDelay: `${idx * 50}ms` }}
          >
            <span className="alert-timeline__icon">
              {severityIcons[alert.severity] || '🔵'}
            </span>
            <div className="alert-timeline__content">
              <div className="alert-timeline__message">{alert.message}</div>
              <div className="alert-timeline__meta">
                <span className="alert-timeline__time">
                  {timeAgo(alert.timestamp)}
                </span>
                {alert.costSavedINR > 0 && (
                  <span className="alert-timeline__cost">
                    +₹{(alert.costSavedINR / 100000).toFixed(1)}L saved
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
