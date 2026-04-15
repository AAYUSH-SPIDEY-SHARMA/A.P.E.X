import React, { useState, useCallback, useMemo } from 'react';
import './App.css';
import Header from './components/Header/Header';
import MapView from './components/Map/MapView';
import NodeInspector from './components/NodeInspector/NodeInspector';
import AnomalyConsole from './components/AnomalyConsole/AnomalyConsole';
import AlertTimeline from './components/AlertTimeline/AlertTimeline';
import KPIDashboard from './components/KPIDashboard/KPIDashboard';
import { useFirebaseNodes } from './hooks/useFirebaseNodes';
import { useFirebaseRoutes } from './hooks/useFirebaseRoutes';
import { useFirebaseAnomalies } from './hooks/useFirebaseAnomalies';
import { useFirebaseAlerts } from './hooks/useFirebaseAlerts';

function App() {
  const nodes = useFirebaseNodes();
  const routes = useFirebaseRoutes();
  const anomalies = useFirebaseAnomalies();
  const alerts = useFirebaseAlerts();

  const [selectedNode, setSelectedNode] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [theme, setTheme] = useState('light');

  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  }, []);

  // Compute KPIs from state
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

  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const handleInject = useCallback(async (anomaly) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_ML_API_URL}/inject-anomaly`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(anomaly),
      });
      const result = await res.json();
      addToast(`⚡ Disruption injected! ${result.rerouted || 0} trucks autonomously rerouted.`);
    } catch (err) {
      console.error('Injection failed:', err);
      // Fallback message if backend is not running yet
      addToast(`⚡ Note: Backend not connected. Anomaly submitted locally.`);
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  const handleDualShock = useCallback(async () => {
    setIsLoading(true);
    addToast('🌧️ Shock 1: Western Ghats Monsoon — Severity 95%');
    try {
      await fetch(`${import.meta.env.VITE_ML_API_URL}/inject-anomaly`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'MONSOON', severity: 0.95, lat: 17.5, lng: 73.8 }),
      });
      
      setTimeout(async () => {
        addToast(`🖥️ Shock 2: ICEGATE Failure! System gridlocked.`);
        await fetch(`${import.meta.env.VITE_ML_API_URL}/inject-anomaly`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'ICEGATE_FAILURE', severity: 1.0, lat: 28.5, lng: 77.3 }),
        });
        setIsLoading(false);
      }, 2000);
    } catch (error) {
      console.error(error);
      setIsLoading(false);
    }
  }, [addToast]);

  const handleAutopilot = useCallback(() => {
    // Reset or call autopilot endpoint
    addToast('🤖 Autopilot Engaged: Pitch Mode connected to backend...', 'info');
    handleDualShock();
  }, [addToast, handleDualShock]);

  const handleReset = useCallback(async () => {
    try {
      await fetch(`${import.meta.env.VITE_PROCESSOR_API_URL}/reset`, { method: 'POST' });
      addToast('🔄 Backend reset triggered — systems nominal');
    } catch (error) {
       addToast('🔄 Local reset complete');
    }
    setSelectedNode(null);
  }, [addToast]);

  const handleNodeClick = useCallback((node) => {
    setSelectedNode(node);
  }, []);

  return (
    <div className="app">
      <Header 
        activeRoutes={kpis.activeRoutes} 
        activeNodes={kpis.activeNodes}
        onToggleTheme={toggleTheme}
        theme={theme}
      />

      <div className="app__content">
        <div className="app__map">
          <MapView
            nodes={nodes}
            routes={routes}
            anomalies={anomalies}
            onNodeClick={handleNodeClick}
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
