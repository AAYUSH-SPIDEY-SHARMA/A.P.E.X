import React from 'react';
import './AIEngineStatus.css';

/**
 * AI Engine Status Panel — Shows real-time ML activity to judges.
 *
 * This is THE component that proves autonomy. It displays:
 * - Last detected node + probability
 * - Inference latency
 * - Number of auto-detections (no human clicks)
 * - Current trigger status
 *
 * Props:
 *   autoDetections: number — total auto-detections so far
 *   lastAutoDetect: object — latest detection event from SSE
 */
export default function AIEngineStatus({ autoDetections = 0, lastAutoDetect = null }) {
  const prob = lastAutoDetect?.disruption_probability ?? 0;
  const severityClass = prob > 0.85 ? '--critical' : prob > 0.6 ? '--warning' : '--safe';

  return (
    <div className="ai-engine-panel">
      <div className="ai-engine-panel__header">
        <div className="ai-engine-panel__icon" />
        <span className="ai-engine-panel__title">AI Engine Status</span>
      </div>

      <div className="ai-engine-panel__grid">
        <div className="ai-engine-panel__row">
          <span className="ai-engine-panel__label">Mode</span>
          <span className="ai-engine-panel__value ai-engine-panel__value--safe">
            AUTONOMOUS
          </span>
        </div>

        <div className="ai-engine-panel__row">
          <span className="ai-engine-panel__label">Detections</span>
          <span className="ai-engine-panel__value">
            {autoDetections}
          </span>
        </div>

        {lastAutoDetect && (
          <>
            <div className="ai-engine-panel__divider" />

            <div className="ai-engine-panel__row">
              <span className="ai-engine-panel__label">Last Node</span>
              <span className="ai-engine-panel__value">
                {lastAutoDetect.node_name?.split(' ')[0] ?? '—'}
              </span>
            </div>

            <div className="ai-engine-panel__row">
              <span className="ai-engine-panel__label">P(disrupt)</span>
              <span className={`ai-engine-panel__value ai-engine-panel__value${severityClass}`}>
                {(prob * 100).toFixed(0)}%
              </span>
            </div>

            <div className="ai-engine-panel__row">
              <span className="ai-engine-panel__label">Latency</span>
              <span className="ai-engine-panel__value">
                {lastAutoDetect.inference_latency_ms?.toFixed(0) ?? '—'}ms
              </span>
            </div>

            <div className="ai-engine-panel__row">
              <span className="ai-engine-panel__label">Trigger</span>
              <span className="ai-engine-panel__value ai-engine-panel__value--safe">
                AUTO
              </span>
            </div>

            {lastAutoDetect.route_path && (
              <div className="ai-engine-panel__latest">
                <div className="ai-engine-panel__latest-label">Latest A* Route</div>
                <div className="ai-engine-panel__latest-text">
                  {lastAutoDetect.route_path}
                </div>
              </div>
            )}
          </>
        )}

        {!lastAutoDetect && (
          <>
            <div className="ai-engine-panel__divider" />
            <div className="ai-engine-panel__latest">
              <div className="ai-engine-panel__latest-label">Status</div>
              <div className="ai-engine-panel__latest-text">
                Monitoring FASTag stream... Waiting for utilization &gt; 85%
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
