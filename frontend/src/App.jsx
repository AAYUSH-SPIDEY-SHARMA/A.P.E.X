import React, { useState, useCallback, useMemo, useEffect } from 'react';
import './App.css';
import Header from './components/Header/Header';
import MapView from './components/Map/MapView';
import NodeInspector from './components/NodeInspector/NodeInspector';
import AnomalyConsole from './components/AnomalyConsole/AnomalyConsole';
import AlertTimeline from './components/AlertTimeline/AlertTimeline';
import KPIDashboard from './components/KPIDashboard/KPIDashboard';
import { useLocalState } from './hooks/useFirebase';

function App() {
  const {
    nodes, routes, anomalies, alerts,
    injectAnomaly, resetState,
  } = useLocalState();

  const [selectedNode, setSelectedNode] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // ── Theme state with localStorage persistence ──
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('apex-theme') || 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('apex-theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  }, []);

  // Compute KPIs from state — no useEffect needed, just derive from data
  const kpis = useMemo(() => {
    const disrupted = nodes.filter(n => n.status === 'DISRUPTED').length;
    const delayed = nodes.filter(n => n.status === 'DELAYED').length;
    const rerouted = routes.filter(r => r.isRerouted).length;
    const totalCost = alerts.reduce((sum, a) => sum + (a.costSavedINR || 0), 0);

    return {
      etaAccuracy: Math.max(60, 94.2 - disrupted * 8 + rerouted * 2),
      costSavedINR: totalCost,
      trucksRerouted: rerouted,
      networkHealth: Math.max(20, 73 - disrupted * 15 - delayed * 5 + rerouted * 3),
      activeRoutes: routes.length,
      activeNodes: nodes.length,
    };
  }, [nodes, routes, alerts]);

  // Add toast notification
  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  // Handle anomaly injection
  const handleInject = useCallback((anomaly) => {
    setIsLoading(true);
    setTimeout(() => {
      const result = injectAnomaly(anomaly);
      addToast(`⚡ Disruption injected! ${result.rerouted} trucks autonomously rerouted. ₹${(result.costSaved / 100000).toFixed(1)}L saved.`);
      setIsLoading(false);
    }, 800);
  }, [injectAnomaly, addToast]);

  // Handle dual-shock scenario
  const handleDualShock = useCallback(() => {
    setIsLoading(true);
    setTimeout(() => {
      injectAnomaly({
        type: 'MONSOON', severity: 0.95, lat: 17.5, lng: 73.8,
        affectedHighway: 'NH-48 Western Ghats', timestamp: new Date().toISOString(),
      });
      addToast('🌧️ Shock 1: Western Ghats Monsoon — Severity 95%');
    }, 500);

    setTimeout(() => {
      const result = injectAnomaly({
        type: 'ICEGATE_FAILURE', severity: 1.0, lat: 28.5, lng: 77.3,
        affectedHighway: 'ICD Tughlakabad', timestamp: new Date().toISOString(),
      });
      addToast(`🖥️ Shock 2: ICEGATE Failure — ${result.rerouted} trucks rerouted autonomously`);
      setIsLoading(false);
    }, 2000);
  }, [injectAnomaly, addToast]);

  // Handle full autopilot demo flow
  const handleAutopilot = useCallback(() => {
    resetState();
    setSelectedNode(null);
    setIsLoading(true);
    
    // Baseline state presentation
    setTimeout(() => addToast('🤖 Autopilot Engaged: Analyzing baseline DFC tracking...', 'info'), 500);

    // Shock 1
    setTimeout(() => {
      injectAnomaly({
        type: 'MONSOON', severity: 0.95, lat: 17.5, lng: 73.8,
        affectedHighway: 'NH-48 Western Ghats', timestamp: new Date().toISOString(),
      });
      addToast('🌧️ Shock 1: Western Ghats Monsoon limits flow capacity', 'error');
    }, 4000);

    // Shock 2
    setTimeout(() => {
      const result = injectAnomaly({
        type: 'ICEGATE_FAILURE', severity: 1.0, lat: 28.5, lng: 77.3,
        affectedHighway: 'ICD Tughlakabad', timestamp: new Date().toISOString(),
      });
      addToast(`🖥️ Shock 2: ICEGATE Failure! System gridlocked.`, 'error');
    }, 8000);

    // Resolution state
    setTimeout(() => {
      addToast(`⚡ Autonomous Multi-Agent repair invoked via MCP. System stabilized in 11.4s.`, 'success');
      setIsLoading(false);
    }, 12000);
  }, [injectAnomaly, addToast, resetState]);

  // Handle reset
  const handleReset = useCallback(() => {
    resetState();
    setSelectedNode(null);
    addToast('🔄 Demo reset complete — all systems nominal');
  }, [resetState, addToast]);

  // Handle node click on map
  const handleNodeClick = useCallback((node) => {
    setSelectedNode(node);
  }, []);

  return (
    <div className="app">
      <Header activeRoutes={kpis.activeRoutes} activeNodes={kpis.activeNodes} theme={theme} onToggleTheme={toggleTheme} />

      <div className="app__content">
        <div className="app__map">
          <MapView
            nodes={nodes}
            routes={routes}
            anomalies={anomalies}
            onNodeClick={handleNodeClick}
            theme={theme}
          />
        </div>

        <div className="app__sidebar">
          <div className="app__sidebar-section glass-panel">
            <NodeInspector node={selectedNode} onClose={() => setSelectedNode(null)} />
          </div>
          <div className="app__sidebar-section glass-panel">
            <AnomalyConsole
              onInject={handleInject}
              onDualShock={handleDualShock}
              onAutopilot={handleAutopilot}
              onReset={handleReset}
              isLoading={isLoading}
            />
          </div>
          <div className="app__sidebar-section glass-panel">
            <AlertTimeline alerts={alerts} />
          </div>
        </div>
      </div>

      <KPIDashboard kpis={kpis} />

      <div className="app__toasts">
        {toasts.map(toast => (
          <div key={toast.id} className="app__toast">{toast.message}</div>
        ))}
      </div>
    </div>
  );
}

export default App;
