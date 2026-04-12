// ══════════════════════════════════════════════════════════
// Firebase Hooks — Real-time data sync with fallback to mock data
// ══════════════════════════════════════════════════════════

import { useState, useCallback, useMemo } from 'react';
import {
  mockNodes, mockRoutes, mockAnomalies, mockAlerts, mockKPIs
} from '../data/mockData';

// ─── Helper: Convert Firebase snapshot object to array ───
function objectToArray(obj) {
  if (!obj) return [];
  return Object.entries(obj).map(([id, data]) => ({ id, ...data }));
}

// Pre-compute initial arrays to avoid recreating on every render
const initialNodes = objectToArray(mockNodes);
const initialRoutes = objectToArray(mockRoutes);
const initialAnomalies = objectToArray(mockAnomalies);
const initialAlerts = objectToArray(mockAlerts).sort(
  (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
);

// ─── useLocalState — Manages local simulation state for mock mode ───
export function useLocalState() {
  const [nodes, setNodes] = useState(() => ({ ...mockNodes }));
  const [routes, setRoutes] = useState(() => ({ ...mockRoutes }));
  const [anomalies, setAnomalies] = useState(() => ({ ...mockAnomalies }));
  const [alerts, setAlerts] = useState(() => ({ ...mockAlerts }));

  const injectAnomaly = useCallback((anomaly) => {
    const id = `ANM-${Date.now()}`;
    const newAnomalies = {};
    newAnomalies[id] = anomaly;

    setAnomalies(prev => ({ ...prev, ...newAnomalies }));

    // Simulate impact on nearby nodes
    setNodes(prev => {
      const updated = { ...prev };
      Object.entries(updated).forEach(([nodeId, node]) => {
        const dist = Math.sqrt(
          Math.pow(node.lat - anomaly.lat, 2) +
          Math.pow(node.lng - anomaly.lng, 2)
        );
        if (dist < 3) {
          updated[nodeId] = {
            ...node,
            status: 'DISRUPTED',
            utilization: Math.min(0.98, node.utilization + 0.3),
            queueLength: node.queueLength + 80,
          };
        } else if (dist < 6) {
          updated[nodeId] = {
            ...node,
            status: node.status === 'NORMAL' ? 'DELAYED' : node.status,
            utilization: Math.min(0.95, node.utilization + 0.15),
            queueLength: node.queueLength + 30,
          };
        }
      });
      return updated;
    });

    // Simulate rerouting of affected trucks
    const maxRerouted = Math.floor(Math.random() * 4) + 4; // 4-7 trucks

    setRoutes(prev => {
      const updated = { ...prev };
      let count = 0;
      Object.keys(updated).forEach(key => {
        if (count >= maxRerouted) return;
        const route = updated[key];
        if (route.isRerouted) return; // already rerouted
        // Check proximity of route endpoints or midpoint to anomaly
        const midLat = (route.originCoordinates[1] + route.destinationCoordinates[1]) / 2;
        const midLng = (route.originCoordinates[0] + route.destinationCoordinates[0]) / 2;
        const distMid = Math.sqrt(
          Math.pow(midLat - anomaly.lat, 2) +
          Math.pow(midLng - anomaly.lng, 2)
        );
        const distOrigin = Math.sqrt(
          Math.pow(route.originCoordinates[1] - anomaly.lat, 2) +
          Math.pow(route.originCoordinates[0] - anomaly.lng, 2)
        );
        const distDest = Math.sqrt(
          Math.pow(route.destinationCoordinates[1] - anomaly.lat, 2) +
          Math.pow(route.destinationCoordinates[0] - anomaly.lng, 2)
        );
        const minDist = Math.min(distMid, distOrigin, distDest);
        if (minDist < 12) {
          updated[key] = {
            ...route,
            status: 'REROUTED',
            isRerouted: true,
            riskScore: Math.min(0.95, route.riskScore + 0.5),
          };
          count++;
        }
      });
      return updated;
    });

    // Add alerts
    const costSaved = Math.floor(Math.random() * 300000) + 200000;
    const alertId1 = `ALT-${Date.now()}`;
    const alertId2 = `ALT-${Date.now() + 1}`;

    setAlerts(prev => ({
      ...prev,
      [alertId1]: {
        message: `CRITICAL: ${anomaly.type.replace(/_/g, ' ')} detected near ${anomaly.lat.toFixed(1)}°N, ${anomaly.lng.toFixed(1)}°E. Severity: ${(anomaly.severity * 100).toFixed(0)}%. ${maxRerouted} trucks automatically rerouted.`,
        severity: anomaly.severity > 0.7 ? 'CRITICAL' : 'WARNING',
        costSavedINR: costSaved,
        timestamp: new Date().toISOString(),
      },
      [alertId2]: {
        message: `A.P.E.X autonomous rerouting complete. ${maxRerouted} trucks diverted to alternate corridors. ₹${(costSaved / 100000).toFixed(1)}L in demurrage fees avoided.`,
        severity: 'INFO',
        costSavedINR: costSaved,
        timestamp: new Date(Date.now() + 3000).toISOString(),
      },
    }));

    return { rerouted: maxRerouted, costSaved };
  }, []);

  const resetState = useCallback(() => {
    setNodes({ ...mockNodes });
    setRoutes({ ...mockRoutes });
    setAnomalies({ ...mockAnomalies });
    setAlerts({ ...mockAlerts });
  }, []);

  // Memoize array conversions to prevent unnecessary re-renders
  const nodesArray = useMemo(() => objectToArray(nodes), [nodes]);
  const routesArray = useMemo(() => objectToArray(routes), [routes]);
  const anomaliesArray = useMemo(() => objectToArray(anomalies), [anomalies]);
  const alertsArray = useMemo(() =>
    objectToArray(alerts).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)),
    [alerts]
  );

  return {
    nodes: nodesArray,
    routes: routesArray,
    anomalies: anomaliesArray,
    alerts: alertsArray,
    injectAnomaly,
    resetState,
  };
}
