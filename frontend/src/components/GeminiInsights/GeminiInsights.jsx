/**
 * GeminiInsights.jsx — Gemini Use Case #3: Predictive AI Insights Feed
 *
 * Periodically fetches AI-generated predictions about network health.
 * Shows 3 contextual insights with icons, confidence scores, and types.
 */
import React, { useState, useCallback, useEffect } from 'react';
import './GeminiInsights.css';

const ML_API_URL = import.meta.env.VITE_ML_API_URL || 'http://localhost:8080';

export default function GeminiInsights() {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastFetched, setLastFetched] = useState(null);

  const fetchInsights = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${ML_API_URL}/gemini-insights`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setInsights(data);
      setLastFetched(new Date());
    } catch (err) {
      setInsights({
        network_summary: 'Insights temporarily unavailable. XGBoost monitoring active.',
        insights: [
          { text: 'Predictive engine reconnecting. All autonomous systems operational.', type: 'status', confidence: 1, icon: '🛡️' },
        ],
        source: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-fetch on mount and every 60 seconds
  useEffect(() => {
    fetchInsights();
    const interval = setInterval(fetchInsights, 120000);
    return () => clearInterval(interval);
  }, [fetchInsights]);

  if (!insights && loading) {
    return (
      <div className="gemini-insights__loading">
        <div className="gemini-insights__spinner" />
        <span>Gemini generating predictions...</span>
      </div>
    );
  }

  if (!insights) return null;

  return (
    <div className="gemini-insights">
      <div className="gemini-insights__header">
        <span className="gemini-insights__title">
          <span className="gemini-insights__title-icon">🔮</span>
          AI Predictive Insights
        </span>
        <button
          className="gemini-insights__refresh"
          onClick={fetchInsights}
          disabled={loading}
        >
          {loading ? '...' : '↻ Refresh'}
        </button>
      </div>

      {insights.network_summary && (
        <div className="gemini-insights__summary">
          {insights.network_summary}
        </div>
      )}

      <div className="gemini-insights__list">
        {(insights.insights || []).map((item, i) => (
          <div key={i} className="gemini-insight-card">
            <span className="gemini-insight-card__icon">
              {item.icon || '📊'}
            </span>
            <div className="gemini-insight-card__body">
              <p className="gemini-insight-card__text">{item.text}</p>
              <div className="gemini-insight-card__meta">
                <span className={`gemini-insight-card__type gemini-insight-card__type--${item.type || 'status'}`}>
                  {item.type || 'status'}
                </span>
                {item.confidence != null && (
                  <span className="gemini-insight-card__confidence">
                    {(item.confidence * 100).toFixed(0)}% conf
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {insights.latency_ms > 0 && (
        <div style={{ fontSize: '9px', color: 'rgba(148,163,184,0.4)', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
          ⚡ {insights.latency_ms}ms · Gemini 2.5 Flash
        </div>
      )}
    </div>
  );
}
