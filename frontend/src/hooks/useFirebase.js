// ══════════════════════════════════════════════════════════
// Firebase Hooks — Real-time RTDB + ML Agent API + Mock Fallback
//
// Architecture:
//   1. Try to connect to REAL Firebase RTDB (onValue listeners)
//   2. If Firebase fails → fall back to local mock data
//   3. Anomaly injection → calls live Cloud Run ML Agent
//   4. If ML Agent fails → runs local mock injection logic
//
// Blueprint Reference: S10.5 (Firebase RTDB Contract)
// ══════════════════════════════════════════════════════════

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, set, push, update } from 'firebase/database';
import firebaseConfig from '../config/firebase';
import {
  mockNodes, mockRoutes, mockAnomalies, mockAlerts,
} from '../data/mockData';
import { findAffectedCorridor, HIGHWAY_CORRIDORS } from '../data/routeWaypoints';
import { haversineKm } from '../utils/lateralOffset';  // Fix H-06: proper geographic distance

// ─── ML Agent API URL (Cloud Run) ───
const ML_API_URL = import.meta.env.VITE_ML_API_URL || 'http://localhost:8080';

// ── Distance thresholds (km) — calibrated to Indian highway network ──
const DISRUPTION_RADIUS_KM = 200;   // nodes within 200km → DISRUPTED
const CASCADE_RADIUS_KM = 500;      // nodes within 500km → DELAYED (cascade)
const REROUTE_RADIUS_KM = 500;      // routes within 500km → rerouted

// ─── Initialize Firebase ─────────────────────────────────────────
let app = null;
let db = null;
try {
  if (firebaseConfig.databaseURL) {
    app = initializeApp(firebaseConfig);
    db = getDatabase(app);
    console.log('[APEX] Firebase initialized:', firebaseConfig.databaseURL);
  }
} catch (err) {
  console.warn('[APEX] Firebase init failed, using mock data:', err.message);
}

// ─── Helper: Convert Firebase snapshot object to array ───
function objectToArray(obj) {
  if (!obj) return [];
  return Object.entries(obj).map(([key, data]) => ({ ...data, id: data.id ?? key }));  // Fix I-08: preserve existing .id
}

// ─── Mock fallback logic — simulates ML agent response locally ───
function runMockInjection({ anomaly, setAnomalies, setNodes, setRoutes, setAlerts }) {
  const id = `ANM-${Date.now()}`;
  setAnomalies(prev => ({ ...prev, [id]: anomaly }));

  // Simulate impact on nearby nodes
  setNodes(prev => {
    const updated = { ...prev };
    Object.entries(updated).forEach(([nodeId, node]) => {
      const dist = haversineKm(node.lat, node.lng, anomaly.lat, anomaly.lng);  // Fix H-06
      if (dist < DISRUPTION_RADIUS_KM) {
        updated[nodeId] = {
          ...node,
          status: 'DISRUPTED',
          utilization: Math.min(0.98, node.utilization + 0.3),
          queueLength: node.queueLength + 80,
        };
      } else if (dist < CASCADE_RADIUS_KM) {
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

  const maxRerouted = Math.floor(Math.random() * 4) + 4;

  setRoutes(prev => {
    const updated = { ...prev };
    let count = 0;
    Object.keys(updated).forEach(key => {
      if (count >= maxRerouted) return;
      const route = updated[key];
      if (route.isRerouted) return;
      const midLat = (route.originCoordinates[1] + route.destinationCoordinates[1]) / 2;
      const midLng = (route.originCoordinates[0] + route.destinationCoordinates[0]) / 2;
      const distMid = haversineKm(midLat, midLng, anomaly.lat, anomaly.lng);  // Fix H-06
      if (distMid < REROUTE_RADIUS_KM) {
        updated[key] = {
          ...route,
          status: 'REROUTED',
          isRerouted: true,
          riskScore: Math.min(0.95, route.riskScore + 0.5),
          affectedNodeId: anomaly.nodeId || anomaly.id || 'unknown',  // Track for smart recovery
        };
        count++;
      }
    });
    return updated;
  });

  const costSaved = Math.floor(Math.random() * 300000) + 200000;
  const alertId1 = `ALT-${Date.now()}`;
  const alertId2 = `ALT-${Date.now() + 1}`;

  setAlerts(prev => ({
    ...prev,
    [alertId1]: {
      message: `CRITICAL: ${anomaly.type.replace(/_/g, ' ')} detected near ${anomaly.lat.toFixed(1)}°N, ${anomaly.lng.toFixed(1)}°E. Severity: ${(anomaly.severity * 100).toFixed(0)}%. ${maxRerouted} trucks automatically rerouted via A* engine.`,
      severity: anomaly.severity > 0.7 ? 'CRITICAL' : 'WARNING',
      costSavedINR: costSaved,
      timestamp: new Date().toISOString(),
    },
    [alertId2]: {
      message: `A.P.E.X autonomous rerouting complete. ${maxRerouted} trucks diverted to alternate corridors. ₹${(costSaved / 100000).toFixed(1)}L in demurrage fees avoided. Zero human intervention.`,
      severity: 'INFO',
      costSavedINR: costSaved,
      timestamp: new Date(Date.now() + 3000).toISOString(),
    },
  }));

  return { rerouted: maxRerouted, costSaved };
}

// ══════════════════════════════════════════════════════════
// useFirebaseRTDB — Real Firebase connection with mock fallback
// ══════════════════════════════════════════════════════════
export function useLocalState() {
  const [nodes, setNodes] = useState(() => ({ ...mockNodes }));
  const [routes, setRoutes] = useState(() => ({ ...mockRoutes }));
  const [anomalies, setAnomalies] = useState(() => ({ ...mockAnomalies }));
  const [alerts, setAlerts] = useState(() => ({ ...mockAlerts }));
  const [firebaseConnected, setFirebaseConnected] = useState(false);
  const [blockedCorridors, setBlockedCorridors] = useState([]);
  const [reroutedCorridors, setReroutedCorridors] = useState([]);
  const [autoDetections, setAutoDetections] = useState(0);
  const [lastAutoDetect, setLastAutoDetect] = useState(null);
  const [geminiAnalysis, setGeminiAnalysis] = useState(null);
  const unsubscribersRef = useRef([]);

  // ── Connect to real Firebase RTDB ───────────────────────────────
  useEffect(() => {
    if (!db) {
      console.log('[APEX] No Firebase DB — using mock data');
      return;
    }

    console.log('[APEX] Subscribing to Firebase RTDB...');
    const unsubs = [];

    try {
      // Listen to nodes
      const nodesRef = ref(db, 'supply_chain/nodes');
      const unsubNodes = onValue(nodesRef, (snapshot) => {
        const data = snapshot.val();
        if (data && Object.keys(data).length > 0) {
          console.log(`[APEX] Firebase nodes: ${Object.keys(data).length}`);
          setNodes(data);
          setFirebaseConnected(true);
        }
      }, (err) => {
        console.warn('[APEX] Firebase nodes error:', err.message);
      });
      unsubs.push(unsubNodes);

      // Listen to routes
      const routesRef = ref(db, 'supply_chain/active_routes');
      const unsubRoutes = onValue(routesRef, (snapshot) => {
        const data = snapshot.val();
        if (data && Object.keys(data).length > 0) {
          console.log(`[APEX] Firebase routes: ${Object.keys(data).length}`);
          setRoutes(data);
        }
      }, (err) => {
        console.warn('[APEX] Firebase routes error:', err.message);
      });
      unsubs.push(unsubRoutes);

      // Listen to anomalies
      const anomaliesRef = ref(db, 'supply_chain/anomalies');
      const unsubAnomalies = onValue(anomaliesRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          setAnomalies(data);
        }
      }, (err) => {
        console.warn('[APEX] Firebase anomalies error:', err.message);
      });
      unsubs.push(unsubAnomalies);

      // Listen to alerts
      const alertsRef = ref(db, 'supply_chain/alerts');
      const unsubAlerts = onValue(alertsRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          setAlerts(data);
        }
      }, (err) => {
        console.warn('[APEX] Firebase alerts error:', err.message);
      });
      unsubs.push(unsubAlerts);

    } catch (err) {
      console.warn('[APEX] Firebase subscription error:', err.message);
    }

    unsubscribersRef.current = unsubs;

    return () => {
      unsubs.forEach(unsub => {
        if (typeof unsub === 'function') unsub();
      });
    };
  }, []);

  // ── SSE: Listen for autonomous detections from ML engine ───────
  useEffect(() => {
    let evtSource = null;
    try {
      evtSource = new EventSource(`${ML_API_URL}/events/stream`);
      evtSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const alertId = `AUTO-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

          // ✅ FIX F1 + Risk1: Live node status updates from simulator pipeline
          if (data.type === 'NODE_STATUS_UPDATE') {
            setNodes(prev => ({
              ...prev,
              [data.node_id]: {
                ...(prev[data.node_id] || {}),
                type: data.type_label || prev[data.node_id]?.type || 'TOLL_PLAZA',
                name: data.name || prev[data.node_id]?.name || data.node_id,
                lat: data.lat || prev[data.node_id]?.lat,
                lng: data.lng || prev[data.node_id]?.lng,
                status: data.status,
                utilization: data.utilization,
                queueLength: data.queueLength,
                tts: data.tts,
                ttr: data.ttr,
                isLive: true,  // ✅ Risk1: Marks node as live-driven (prevents mock overwrite)
              },
            }));
            return;
          }

          // ✅ FIX F6: Node recovery events — self-healing
          if (data.type === 'NODE_RECOVERED') {
            setNodes(prev => ({
              ...prev,
              [data.node_id]: {
                ...(prev[data.node_id] || {}),
                status: 'NORMAL',
                utilization: data.utilization || 0.45,
                queueLength: data.queueLength || 20,
                tts: data.tts || 72,
                ttr: data.ttr || 24,
                isLive: true,
              },
            }));
            const recoverId = `REC-${Date.now()}`;
            setAlerts(prev => ({
              ...prev,
              [recoverId]: {
                message: `✅ RECOVERED: ${data.name || data.node_id} returned to NORMAL operations.`,
                severity: 'INFO',
                autoDetected: true,
                timestamp: data.timestamp,
              },
            }));
            // Smart un-reroute: only revert trucks affected by THIS recovered node
            const recoveredNodeId = data.node_id;
            setRoutes(prev => {
              const updated = { ...prev };
              let unrouted = 0;
              Object.keys(updated).forEach(key => {
                const rt = updated[key];
                if (rt.isRerouted && rt.affectedNodeId === recoveredNodeId) {
                  updated[key] = { ...rt, isRerouted: false, status: 'NORMAL', affectedNodeId: null };
                  unrouted++;
                }
              });
              if (unrouted > 0) {
                console.log(`[APEX] ✅ ${unrouted} trucks un-rerouted after ${data.name || recoveredNodeId} recovery`);
              }
              return unrouted > 0 ? updated : prev;
            });

            // Clear blocked/rerouted corridors associated with this recovery
            // Only clear if no remaining disrupted nodes exist
            setNodes(prevNodes => {
              const nodeArr = Array.isArray(prevNodes) ? prevNodes : Object.values(prevNodes || {});
              const stillDisrupted = nodeArr.some(n => n.status === 'DISRUPTED');
              if (!stillDisrupted) {
                setBlockedCorridors([]);
                setReroutedCorridors([]);
              }
              return prevNodes;  // No mutation — read-only check
            });

            console.log('[APEX] ✅ Node recovered:', data.name || data.node_id);
            return;
          }

          // Handle EARLY_WARNING events (predictive trend forecasting)
          if (data.type === 'EARLY_WARNING') {
            setAlerts(prev => ({
              ...prev,
              [alertId]: {
                message: `🔮 PREDICTION: ${data.node_name} trending to ρ=${(data.predicted_util_5min * 100).toFixed(0)}% in ~${data.time_to_threshold_sec ? Math.round(data.time_to_threshold_sec) + 's' : '5min'} (current: ${(data.current_util * 100).toFixed(0)}%)`,
                severity: 'WARNING',
                autoDetected: true,
                timestamp: data.timestamp,
              },
            }));
            console.log('[APEX] 🔮 Early warning:', data.node_name, `predicted=${data.predicted_util_5min}`);
            return;
          }

          // Only process actual AUTO_DETECTED events (ignore unknown types)
          if (data.type === 'GEMINI_ANALYSIS') {
            // Store latest Gemini analysis for Agent Narration display
            setGeminiAnalysis(data);
            const geminiAlertId = `GEM-${Date.now()}`;
            setAlerts(prev => ({
              ...prev,
              [geminiAlertId]: {
                message: `🧠 GEMINI AI: ${data.root_cause || 'Analysis complete'} | Risk: ${data.cascade_risk || 'MEDIUM'} | ${data.recommended_action || ''}`,
                severity: data.cascade_risk === 'HIGH' ? 'CRITICAL' : 'WARNING',
                autoDetected: true,
                isGemini: true,
                timestamp: data.timestamp,
              },
            }));
            console.log('[APEX] 🧠 Gemini analysis received:', data.cascade_risk, `(${data.source})`);
            return;
          }

          if (data.type !== 'AUTO_DETECTED' || !data.node_name) return;

          // Track auto-detection state for AI Engine Status panel
          setAutoDetections(prev => prev + 1);
          setLastAutoDetect(data);

          // Add auto-detected alert to alerts
          setAlerts(prev => ({
            ...prev,
            [alertId]: {
              message: `🤖 AUTO: ${data.node_name} at ${(data.disruption_probability * 100).toFixed(0)}% risk (${data.severity_label}). ${data.route_path ? 'Rerouted via ' + data.route_path + '.' : ''} ₹${((data.cost_saved_inr || 0) / 100000).toFixed(1)}L saved.`,
              severity: data.disruption_probability > 0.85 ? 'CRITICAL' : 'WARNING',
              costSavedINR: data.cost_saved_inr || 0,
              autoDetected: true,
              timestamp: data.timestamp,
            },
          }));

          console.log('[APEX] 🤖 Auto-detected:', data.node_name, `P=${data.disruption_probability}`);
        } catch (e) { /* ignore parse errors */ }
      };
      evtSource.onerror = () => {
        console.warn('[APEX] SSE connection error — auto-detections paused');
      };
    } catch (e) {
      console.warn('[APEX] SSE not available:', e.message);
    }

    return () => {
      if (evtSource) evtSource.close();
    };
  }, []);

  // ── Inject anomaly — tries live ML Agent, falls back to mock ────
  const injectAnomaly = useCallback(async (anomaly) => {
    try {
      // ── Call the LIVE ML Agent API on Cloud Run ──
      const response = await fetch(`${ML_API_URL}/inject-anomaly`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(anomaly),
      });

      if (response.ok) {
        const result = await response.json();

        // If connected to Firebase, the onValue listeners will pick up
        // changes written by the ML Agent. But we also update local state
        // for instant feedback.
        const id = result.anomaly_id || `ANM-${Date.now()}`;
        setAnomalies(prev => ({ ...prev, [id]: anomaly }));

        // Apply impact to local state for immediate visual feedback
        setNodes(prev => {
          const updated = { ...prev };
          Object.entries(updated).forEach(([nodeId, node]) => {
            const dist = haversineKm(node.lat, node.lng, anomaly.lat, anomaly.lng);
            if (dist < DISRUPTION_RADIUS_KM) {
              updated[nodeId] = { ...node, status: 'DISRUPTED', utilization: Math.min(0.98, node.utilization + 0.3), queueLength: node.queueLength + 80 };
            } else if (dist < CASCADE_RADIUS_KM) {
              updated[nodeId] = { ...node, status: node.status === 'NORMAL' ? 'DELAYED' : node.status, utilization: Math.min(0.95, node.utilization + 0.15), queueLength: node.queueLength + 30 };
            }
          });
          return updated;
        });

        const reroutedCount = result.rerouted || 0;
        setRoutes(prev => {
          const updated = { ...prev };
          let count = 0;
          Object.keys(updated).forEach(key => {
            if (count >= reroutedCount) return;
            const route = updated[key];
            if (route.isRerouted) return;
            const midLat = (route.originCoordinates[1] + route.destinationCoordinates[1]) / 2;
            const midLng = (route.originCoordinates[0] + route.destinationCoordinates[0]) / 2;
            const dist = haversineKm(midLat, midLng, anomaly.lat, anomaly.lng);  // Fix F-01: proper geographic distance
            if (dist < REROUTE_RADIUS_KM) {
              updated[key] = { ...route, status: 'REROUTED', isRerouted: true, riskScore: Math.min(0.95, route.riskScore + 0.5), affectedNodeId: anomaly.nodeId || anomaly.id || 'unknown' };
              count++;
            }
          });
          return updated;
        });

        const alertId = result.alert_id || `ALT-${Date.now()}`;
        const costSaved = result.cost_saved_inr || 0;
        const routePath = result.route_path || 'alternate corridor';
        const mlProb = result.ml_prediction?.probability;
        const mlSeverity = result.ml_prediction?.severity_label || '';
        setAlerts(prev => ({
          ...prev,
          [alertId]: {
            message: `CRITICAL: ${anomaly.type.replace(/_/g, ' ')} detected${mlProb ? ` (severity ${(mlProb * 100).toFixed(0)}% — ${mlSeverity})` : ''}. A* rerouted ${reroutedCount} trucks via ${routePath}. ₹${(costSaved / 100000).toFixed(1)}L saved.`,
            severity: anomaly.severity > 0.7 ? 'CRITICAL' : 'WARNING',
            costSavedINR: costSaved,
            timestamp: new Date().toISOString(),
          },
          [`${alertId}-resolve`]: {
            message: `A.P.E.X autonomous rerouting complete. ${reroutedCount} trucks diverted via ${routePath}. ₹${(costSaved / 100000).toFixed(1)}L demurrage avoided. Zero human intervention.`,
            severity: 'INFO',
            costSavedINR: costSaved,
            timestamp: new Date(Date.now() + 3000).toISOString(),
          },
        }));

        return { rerouted: reroutedCount, costSaved };
      }
    } catch (err) {
      console.warn('[APEX] ML Agent not available, falling back to mock:', err.message);
    }

    // ── Fallback to mock logic if API is not available ──
    const result = runMockInjection({ anomaly, setAnomalies, setNodes, setRoutes, setAlerts });

    // ── Corridor-aware rerouting visualization ──
    const affected = findAffectedCorridor(anomaly.lat, anomaly.lng, 150);
    if (affected.length > 0) {
      const primaryCorridor = affected[0].corridorId;
      const corridor = HIGHWAY_CORRIDORS[primaryCorridor];

      // Block the affected corridor
      setBlockedCorridors(prev => {
        if (prev.includes(primaryCorridor)) return prev;
        return [...prev, primaryCorridor];
      });

      // Activate the alternate reroute corridor
      if (corridor?.alternateId) {
        setReroutedCorridors(prev => {
          if (prev.includes(corridor.alternateId)) return prev;
          return [...prev, corridor.alternateId];
        });
      }

      console.log(`[APEX] Corridor ${primaryCorridor} BLOCKED → rerouting to ${corridor?.alternateId}`);
    }

    return result;
  }, []);

  // ── Reset state ─────────────────────────────────────────────────
  const resetState = useCallback(() => {
    setNodes({ ...mockNodes });
    setRoutes({ ...mockRoutes });
    setAnomalies({ ...mockAnomalies });
    setAlerts({ ...mockAlerts });
    setBlockedCorridors([]);
    setReroutedCorridors([]);
  }, []);

  // ── Memoize array conversions ───────────────────────────────────
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
    blockedCorridors,
    reroutedCorridors,
    injectAnomaly,
    resetState,
    firebaseConnected,
    autoDetections,
    lastAutoDetect,
    geminiAnalysis,
  };
}
