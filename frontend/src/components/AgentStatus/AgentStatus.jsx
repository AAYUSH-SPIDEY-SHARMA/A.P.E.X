/**
 * AgentStatus — Live ML Agent Health Indicator
 *
 * Polls the Cloud Run ML Agent /health endpoint every 30s.
 * Shows model status, graph nodes, and prediction count.
 * Displayed in the Header alongside existing service chips.
 */
import React, { useState, useEffect, useCallback } from 'react';
import './AgentStatus.css';

const ML_API_URL = import.meta.env.VITE_ML_API_URL || 'http://localhost:8080';

export default function AgentStatus() {
  const [health, setHealth] = useState(null);  // null = loading, false = offline
  const [lastChecked, setLastChecked] = useState(null);

  const checkHealth = useCallback(async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    try {
      const res = await fetch(`${ML_API_URL}/ml-status`, {
        signal: controller.signal,
      });
      if (!res.ok) throw new Error('bad status');
      const data = await res.json();
      setHealth(data);
      setLastChecked(new Date());
    } catch {
      setHealth(false);
      setLastChecked(new Date());
    } finally {
      clearTimeout(timeoutId);
    }
  }, []);

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30_000);
    return () => clearInterval(interval);
  }, [checkHealth]);

  if (health === null) {
    return (
      <div className="agent-status agent-status--loading" title="Connecting to ML Agent...">
        <span className="agent-status__dot agent-status__dot--pulse" />
        <span className="agent-status__label">ML Agent</span>
        <span className="agent-status__sub">Connecting…</span>
      </div>
    );
  }

  if (health === false) {
    return (
      <div className="agent-status agent-status--offline" title="ML Agent offline — running in mock mode">
        <span className="agent-status__dot agent-status__dot--red" />
        <span className="agent-status__label">ML Agent</span>
        <span className="agent-status__sub">Mock Mode</span>
      </div>
    );
  }

  const xgbLoaded = health.xgboost === true;
  const rfLoaded  = health.random_forest === true;
  const isHealthy = xgbLoaded && health.routing_graph;

  return (
    <div
      className={`agent-status ${isHealthy ? 'agent-status--live' : 'agent-status--degraded'}`}
      title={`XGBoost: ${xgbLoaded ? 'loaded' : 'not loaded'} | RF: ${rfLoaded ? 'loaded' : 'not loaded'} | Graph: ${health.graph_nodes}N/${health.graph_edges}E | Avg latency: ${health.avg_inference_latency_ms || 0}ms`}
    >
      <span className={`agent-status__dot ${isHealthy ? 'agent-status__dot--green' : 'agent-status__dot--amber'}`} />
      <div className="agent-status__content">
        <span className="agent-status__label">
          ML Agent {isHealthy ? '✓' : '⚠'}
        </span>
        <span className="agent-status__sub">
          XGBoost {xgbLoaded ? '✓' : '✗'} · RF {rfLoaded ? '✓' : '✗'} · {health.graph_nodes}N graph
        </span>
      </div>
    </div>
  );
}
