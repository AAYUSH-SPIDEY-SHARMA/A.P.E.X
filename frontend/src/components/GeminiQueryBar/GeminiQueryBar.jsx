/**
 * GeminiQueryBar.jsx — Gemini Use Case #2: Natural Language Query
 *
 * Allows users to ask questions about the supply chain network in plain English.
 * Gemini 2.5 Flash parses intent, queries the network graph, and returns actionable insights.
 */
import React, { useState, useCallback } from 'react';
import './GeminiQueryBar.css';

const ML_API_URL = import.meta.env.VITE_ML_API_URL || 'http://localhost:8080';

const EXAMPLE_QUERIES = [
  "What's the riskiest corridor right now?",
  "Show me bottleneck nodes on NH-48",
  "Which route between Delhi and Mumbai is safest?",
  "Predict cascade risk for the next 2 hours",
  "Why is Panipat toll plaza flagged?",
];

export default function GeminiQueryBar() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [placeholder, setPlaceholder] = useState(
    () => EXAMPLE_QUERIES[Math.floor(Math.random() * EXAMPLE_QUERIES.length)]
  );

  const handleSubmit = useCallback(async (e) => {
    e?.preventDefault();
    if (!query.trim() || loading) return;

    setLoading(true);
    setResponse(null);

    try {
      const res = await fetch(`${ML_API_URL}/gemini-query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim() }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setResponse(data);
    } catch (err) {
      setResponse({
        answer: 'Unable to reach Gemini. The ML agent may be initializing.',
        risk_level: 'NOMINAL',
        latency_ms: 0,
        source: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [query, loading]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') handleSubmit(e);
  }, [handleSubmit]);

  const riskClass = response?.risk_level?.toLowerCase() || 'nominal';

  return (
    <div className="gemini-query-wrapper">
      <form className="gemini-query" onSubmit={handleSubmit}>
        <span className="gemini-query__icon">✨</span>
        <input
          className="gemini-query__input"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Ask Gemini: "${placeholder}"`}
          disabled={loading}
          aria-label="Ask Gemini AI about the supply chain"
        />
        {loading ? (
          <div className="gemini-query__loading" />
        ) : (
          <button
            className="gemini-query__submit"
            type="submit"
            disabled={!query.trim()}
            aria-label="Submit query"
          >
            →
          </button>
        )}
      </form>

      {response && (
        <div className="gemini-response">
          <div className="gemini-response__header">
            <span className={`gemini-response__badge gemini-response__badge--${riskClass}`}>
              {response.risk_level || 'NOMINAL'}
            </span>
            <span style={{ fontSize: '10px', color: '#94a3b8' }}>Gemini 2.5 Flash</span>
            <button
              className="gemini-response__close"
              onClick={() => setResponse(null)}
              aria-label="Close response"
            >
              ×
            </button>
          </div>
          <p className="gemini-response__text">{response.answer}</p>
          {response.latency_ms > 0 && (
            <div className="gemini-response__latency">
              ⚡ {response.latency_ms}ms · {response.source}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
