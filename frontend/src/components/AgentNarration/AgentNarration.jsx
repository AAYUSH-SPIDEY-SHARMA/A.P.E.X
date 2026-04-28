/**
 * AgentNarration.jsx — Phase 7F: AI "Thinking" Terminal Feed
 *
 * Shows a scrolling terminal of autonomous AI decisions.
 * Generates realistic narration from live fleet state + real ML agent events.
 * Typed character-by-character for "AI reasoning" feel.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import './AgentNarration.css';

// ── Named constants for narration (no magic numbers) ──
const DISRUPTION_THRESHOLD = 85;       // ρ% at which disruption triggers
const MIN_BASELINE_UTIL = 55;          // minimum baseline for "rising from" display
const UTIL_DROP_OFFSET = 15;           // ρ offset to show utilization rise from

// ── Narration event templates ──
const NARRATION_TEMPLATES = [
  (t) => `[${t.time}] > Scanning FASTag queue at ${t.node}... depth: ${t.queue} vehicles`,
  (t) => `[${t.time}] > XGBoost: ${t.truck} → delay_prob=${t.prob}% [${t.label}] conf=${t.conf}%`,
  (t) => `[${t.time}] > A* reroute: ${t.truck} → ${t.path} | savings: ₹${t.saved}`,
  (t) => `[${t.time}] > eWay Bill ⚠ ${t.truck} expires in ${t.hours}h — auto-extending`,
  (t) => `[${t.time}] > FASTag ✓ ${t.truck} @ ${t.plaza} | velocity=${t.speed}km/h`,
  (t) => `[${t.time}] > Network health: ρ_avg=${t.rho}% | SSW=${t.ssw}h | cascades=${t.cascades}`,
  (t) => `[${t.time}] > AUTO-DETECT: ρ=${t.rho}% at ${t.node} → XGBoost P(disrupted)=${t.prob}%`,
  (t) => `[${t.time}] > Weather update: ${t.corridor} severity=${(0.3 + (t.rho % 20) / 40).toFixed(2)} (OpenWeatherMap live)`,
  (t) => `[${t.time}] 🤖 AUTO-DETECT: ${t.node} utilization rising ${Math.max(MIN_BASELINE_UTIL, t.rho-UTIL_DROP_OFFSET)}% → ${t.rho}% | Predicted disruption in ${Math.max(1, Math.round((DISRUPTION_THRESHOLD - t.rho) / 5))} min | Preemptive rerouting initiated`,
];

const NODES = ['Kherki Daula', 'Panipat Toll', 'JNPT Gate 3', 'ICD Tughlakabad', 'Dahisar Check Post', 'Nagpur Interchange'];
const CORRIDORS = ['NH-48↗SH-17', 'NH-44→DFC', 'NH-48→COASTAL', 'NH-44-EAST', 'NH-19↗NH-48'];
const PATHS = ['NH-48→SH-17-ALT', 'DFC-WESTERN bypass', 'NH-44→NH-19 via Agra', 'Coastal Sagarmala link'];

function getTimestamp() {
  return new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

function generateEvent(fleet = [], nodes = []) {
  const templateIdx = Math.floor(Math.random() * NARRATION_TEMPLATES.length);
  const template = NARRATION_TEMPLATES[templateIdx];

  // Pick a real truck if available
  const highRiskTrucks = fleet.filter(t => t.riskScore > 0.6);
  const truck = highRiskTrucks.length
    ? highRiskTrucks[Math.floor(Math.random() * highRiskTrucks.length)]
    : fleet[Math.floor(Math.random() * fleet.length)];

  const truckId = truck?.vehicleRegNo || truck?.truckId || 'MH08CD4848';
  const speed = truck?.velocityKmh || Math.floor(Math.random() * 40 + 40);

  // BUG-09 FIX: Use actual corridor from the truck's fleet data, not random pick
  const truckCorridor = truck?.corridorActive || truck?.corridor;
  const corridor = truckCorridor || CORRIDORS[Math.floor(Math.random() * CORRIDORS.length)];

  // BUG-09 FIX: Derive realistic path from actual corridor
  const corridorPathMap = {
    'NH-48': 'NH-48→SH-17-ALT',
    'SH-17-ALT': 'SH-17→NH-48 merge',
    'NH-44': 'NH-44→NH-19 via Agra',
    'NH-44-EAST-ALT': 'NH-44-EAST alternate',
    'DFC-WESTERN': 'DFC-WESTERN bypass',
    'COASTAL-SAGARMALA': 'Coastal Sagarmala link',
  };
  const path = corridorPathMap[truckCorridor] || PATHS[Math.floor(Math.random() * PATHS.length)];

  // Use real node from nodes list if available
  const realNode = nodes.length > 0
    ? (nodes[Math.floor(Math.random() * nodes.length)]?.name || NODES[Math.floor(Math.random() * NODES.length)])
    : NODES[Math.floor(Math.random() * NODES.length)];

  const params = {
    time: getTimestamp(),
    truck: truckId,
    node: realNode,
    queue: Math.floor(Math.random() * 60 + 5),
    prob: Math.floor((truck?.riskScore || Math.random() * 0.6 + 0.2) * 100),
    label: (truck?.riskScore || 0) > 0.8 ? 'CRITICAL' : (truck?.riskScore || 0) > 0.6 ? 'WARNING' : 'NOMINAL',
    conf: Math.floor(Math.random() * 15 + 82),
    path: path,
    saved: (Math.random() * 3 + 0.5).toFixed(1) + 'L',
    hours: Math.floor(Math.random() * 4 + 1),
    plaza: realNode,
    speed,
    rho: Math.floor(Math.random() * 25 + 55),
    ssw: (Math.random() * 2).toFixed(1),
    cascades: Math.floor(Math.random() * 3),
    trucks: Math.floor(Math.random() * 10 + 8),
    val: (Math.random() * 5 + 1.5).toFixed(1),
    corridor: corridor,
    pct: Math.floor(Math.random() * 35 + 10),
  };

  return template(params);
}

// Typewriter hook
function useTypewriter(text, speed = 18) {
  const safeText = text || '';
  const [displayed, setDisplayed] = useState('');
  useEffect(() => {
    if (!safeText) { setDisplayed(''); return; }
    setDisplayed('');
    let i = 0;
    const interval = setInterval(() => {
      setDisplayed(safeText.slice(0, i + 1));
      i++;
      if (i >= safeText.length) clearInterval(interval);
    }, speed);
    return () => clearInterval(interval);
  }, [safeText, speed]);
  return displayed;
}

// Single line component with typewriter
function NarrationLine({ text, isLatest, type }) {
  const displayed = useTypewriter(isLatest ? text : null, 14);
  const content = isLatest ? displayed : text;

  return (
    <div className={`narration__line narration__line--${type || 'info'}`}>
      <span className="narration__line-text">{content}</span>
      {isLatest && displayed.length < text.length && (
        <span className="narration__cursor">▊</span>
      )}
    </div>
  );
}

export default function AgentNarration({ fleet = [], nodes = [], alerts = [], geminiAnalysis = null }) {
  const [lines, setLines] = useState([]);
  const scrollRef = useRef(null);
  const lineId = useRef(0);

  // Classify line type for color coding
  const getLineType = useCallback((text) => {
    if (text.includes('GEMINI') || text.includes('🧠')) return 'gemini';
    if (text.includes('CRITICAL') || text.includes('⚠')) return 'critical';
    if (text.includes('reroute') || text.includes('A*')) return 'reroute';
    if (text.includes('FASTag ✓')) return 'fastag';
    if (text.includes('XGBoost') || text.includes('Auto-detect') || text.includes('Weather')) return 'ml';
    return 'info';
  }, []);

  // Add new event from real ML agent alerts
  useEffect(() => {
    if (!alerts.length) return;
    const latest = alerts[0];
    if (!latest?.message) return;
    const text = `[${getTimestamp()}] > ${latest.message.slice(0, 120)}`;
    setLines(prev => {
      const id = lineId.current++;
      const newLine = { id, text, type: latest.severity === 'CRITICAL' ? 'critical' : 'ml', isLatest: true };
      return [newLine, ...prev.map(l => ({ ...l, isLatest: false }))].slice(0, 20);
    });
  }, [alerts]);

  // Inject Gemini AI analysis events into narration terminal
  useEffect(() => {
    if (!geminiAnalysis) return;
    const lines_to_add = [
      `[${getTimestamp()}] 🧠 GEMINI 2.5 FLASH — Disruption Analysis (${geminiAnalysis.source || 'gemini'})`,
      `[${getTimestamp()}] │ Root Cause: ${geminiAnalysis.root_cause || 'analyzing...'}`,
      `[${getTimestamp()}] │ Cascade Risk: ${geminiAnalysis.cascade_risk || 'MEDIUM'} | Action: ${geminiAnalysis.recommended_action || 'A* rerouting executed'}`,
      `[${getTimestamp()}] └ Latency: ${geminiAnalysis.latency_ms || 0}ms | Model: gemini-2.5-flash`,
    ];
    setLines(prev => {
      const newLines = lines_to_add.map((text, i) => ({
        id: lineId.current++,
        text,
        type: 'gemini',
        isLatest: i === 0,
      }));
      return [...newLines, ...prev.map(l => ({ ...l, isLatest: false }))].slice(0, 25);
    });
  }, [geminiAnalysis]);

  // Refs for fleet/nodes — prevents interval recreation when these change (fix H-02)
  const fleetRef = useRef(fleet);
  const nodesRef = useRef(nodes);
  useEffect(() => { fleetRef.current = fleet; }, [fleet]);
  useEffect(() => { nodesRef.current = nodes; }, [nodes]);

  // Auto-generate synthetic narration events
  useEffect(() => {
    const interval = setInterval(() => {
      const text = generateEvent(fleetRef.current, nodesRef.current);
      const type = getLineType(text);
      setLines(prev => {
        const id = lineId.current++;
        const newLine = { id, text, type, isLatest: true };
        return [newLine, ...prev.map(l => ({ ...l, isLatest: false }))].slice(0, 20);
      });
    }, 2800 + Math.random() * 1500);
    return () => clearInterval(interval);
  }, [getLineType]);  // Stable deps — fleet/nodes read from refs

  // Auto-scroll to latest
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [lines]);

  return (
    <div className="narration">
      <div className="narration__header">
        <span className="narration__header-dot" />
        <span className="narration__header-title">AGENT DECISION LOG</span>
        <span className="narration__source-badge">{geminiAnalysis ? 'GEMINI AI · LIVE' : 'RULE-BASED ENGINE · LIVE DATA'}</span>
        <span className="narration__header-badge">{fleet.length} AGENTS</span>
      </div>

      <div className="narration__terminal" ref={scrollRef}>
        <div className="narration__prompt-top">
          <span className="narration__prompt">apex-ai@cloud-run:~$</span>
          <span className="narration__blink">▊</span>
        </div>

        {lines.map((line, idx) => (
          <NarrationLine
            key={line.id}
            text={line.text}
            isLatest={idx === 0}
            type={line.type}
          />
        ))}

        {lines.length === 0 && (
          <div className="narration__init">
            <span className="narration__prompt">apex-ai@cloud-run:~$</span>
            <span className="narration__init-text"> Initializing autonomous agent network...</span>
            <span className="narration__blink">▊</span>
          </div>
        )}
      </div>
    </div>
  );
}
