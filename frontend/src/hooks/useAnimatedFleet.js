/**
 * useAnimatedFleet.js — Phase 7B: 60fps Dead Reckoning Hook
 *
 * Replaces useTruckAnimation (setInterval-based) with a proper
 * requestAnimationFrame loop. Each frame:
 *   1. Computes progress t ∈ [0,1] between last two Firebase snapshots
 *   2. Applies cubic ease-out for physical deceleration feel
 *   3. Interpolates lat/lng between prev and current positions
 *   4. Calculates live bearing for icon heading rotation
 *   5. Applies lateral lane offset (Great-Circle perpendicular)
 *   6. Adds micro-jitter for "alive" agent feel
 *
 * Zero React re-renders per frame — reads from refs, calls setFrame once.
 */

import { useEffect, useRef, useMemo } from 'react';
import useFleetStore from '../stores/fleetStore';
import { HIGHWAY_CORRIDORS } from '../data/routeWaypoints';
import {
  interpolateOnPolyline,
  computeCumulativeDistances,
  haversineKm,
} from '../services/routeService';
import {
  calcLateralOffset,
  calcBearing,
  getLaneIndex,
  easeOutCubic,
  microJitter,
} from '../utils/lateralOffset';

// Expected time between Firebase position updates
const UPDATE_INTERVAL_MS = 3000;

// How far trucks advance per update tick (fraction of corridor length)
const PROGRESS_PER_TICK = 0.008;

const MAIN_CORRIDORS = ['NH-48', 'NH-44', 'SH-17-ALT', 'NH-44-EAST-ALT', 'DFC-WESTERN', 'COASTAL-SAGARMALA'];

// ── Named constants (no magic numbers) ──
const CORRIDOR_SAMPLE_POINTS = 30;     // points sampled on new corridor for nearest-match
const PROGRESS_AHEAD_DELTA = 0.002;    // lookahead for bearing calculation
const JITTER_RANGE = 0.00003;          // lat/lng micro-jitter for alive feel
const LANE_WIDTH_M = 5.5;              // lateral offset per lane
const FALLBACK_PROGRESS = 0.3;         // safe progress if corridor has < 3 waypoints
const MIN_PROGRESS = 0.02;             // minimum progress clamp
const MAX_PROGRESS = 0.95;             // maximum progress clamp

// ── Safe distance wrapper — prevents lat/lng param order bugs ──
function distanceKm([lng1, lat1], [lng2, lat2]) {
  return haversineKm(lat1, lng1, lat2, lng2);
}

// ── djb2 hash for deterministic truck variance ──
function hashStr(str) {
  let h = 5381;
  for (let i = 0; i < (str || '').length; i++) {
    h = ((h << 5) + h) + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

// ── Normalize routes object/array → array with .id ──
function normalizeRoutes(routes) {
  if (!routes) return [];
  if (Array.isArray(routes)) return routes.map((r, i) => ({ ...r, id: r.id || r.truckId || `r${i}` }));
  return Object.entries(routes).map(([k, v]) => ({ ...v, id: k }));
}

// ── Assign a corridor to a route based on origin/dest ──
function assignCorridor(route, index) {
  if (route.corridorId && HIGHWAY_CORRIDORS[route.corridorId]) return route.corridorId;
  if (route.corridor && HIGHWAY_CORRIDORS[route.corridor]) return route.corridor;

  const origin = route.originCoordinates;
  const dest = route.destinationCoordinates;
  if (origin && dest) {
    const oLat = Array.isArray(origin) ? origin[1] : (origin.lat || 0);
    const oLng = Array.isArray(origin) ? origin[0] : (origin.lng || 0);
    const dLat = Array.isArray(dest) ? dest[1] : (dest.lat || 0);
    const dLng = Array.isArray(dest) ? dest[0] : (dest.lng || 0);

    if ((oLat > 27 && dLat < 21) || (dLat > 27 && oLat < 21)) return 'NH-48';
    if (dLat < 18 || oLat < 18) return 'NH-44';
    if (dLng > 85 || oLng > 85) return 'NH-44-EAST-ALT';
  }
  return MAIN_CORRIDORS[index % MAIN_CORRIDORS.length];
}

// ═══════════════════════════════════════════════════════
// Hook: useAnimatedFleet (Phase 7B — 60fps rAF version)
// ═══════════════════════════════════════════════════════
export default function useAnimatedFleet(routes, blockedCorridors = [], corridorPolylines = {}) {
  const setFrame = useFleetStore(s => s.setFrame);
  const commitSnapshot = useFleetStore(s => s.commitSnapshot);

  // Internal state refs (read in rAF loop without re-subscribing)
  const progressRef = useRef({});     // routeId → progress [0,1]
  const corridorRef = useRef({});     // routeId → corridorId
  const lastTickRef = useRef(performance.now());
  const routesRef = useRef([]);
  const polylinesRef = useRef({});
  const blockedRef = useRef([]);
  const rafRef = useRef(null);
  const initializedRef = useRef(false);
  const cumDistCache = useRef({});  // Fix L-02: cache static waypoint cumDistances
  const activeCorridorRef = useRef({});  // Track each truck's active corridor for transition detection

  // Normalize routes once — useMemo for stability
  const normalizedRoutes = useMemo(() => normalizeRoutes(routes), [routes]);

  // Sync refs when props change (no re-subscription of rAF)
  useEffect(() => { routesRef.current = normalizedRoutes; }, [normalizedRoutes]);
  useEffect(() => { polylinesRef.current = corridorPolylines; }, [corridorPolylines]);
  useEffect(() => { blockedRef.current = blockedCorridors; }, [blockedCorridors]);

  // ── Initialize progress + corridor for each route ──────────────
  useEffect(() => {
    if (normalizedRoutes.length === 0) return;

    normalizedRoutes.forEach((route, i) => {
      const id = route.id;
      if (!corridorRef.current[id]) {
        corridorRef.current[id] = assignCorridor(route, i);
      }
      if (progressRef.current[id] === undefined) {
        // Spread trucks across corridor (not all at start)
        progressRef.current[id] = route.progress || (0.05 + (hashStr(id) % 85) / 100);
      }
    });

    if (!initializedRef.current) {
      console.log(`[APEX] useAnimatedFleet: ${normalizedRoutes.length} trucks, 60fps rAF active`);
      initializedRef.current = true;
    }
  }, [normalizedRoutes]);

  // ── The 60fps requestAnimationFrame loop ────────────────────────
  useEffect(() => {
    let lastProgressTick = performance.now();
    let lastSnapshotCommit = performance.now();

    const tick = (now) => {
      const routes = routesRef.current;
      const polylines = polylinesRef.current;
      const blocked = blockedRef.current;

      // Advance progress every ~1.5s (simulates GPS update cadence)
      if (now - lastProgressTick > 1500) {
        routes.forEach(route => {
          const id = route.id;
          const h = hashStr(id);
          const variance = 0.6 + (h % 80) / 100;
          let p = (progressRef.current[id] || 0) + PROGRESS_PER_TICK * variance;
          if (p >= 0.98) p = 0.03 + (h % 15) / 100; // Loop back to start
          progressRef.current[id] = p;
        });
        lastProgressTick = now;
      }

      // Build frame with interpolated positions + lateral offsets
      const frame = routes.map((route, i) => {
        const id = route.id;
        let corridorId = corridorRef.current[id] || assignCorridor(route, i);

        // Rerouted trucks use alternate corridor
        if (route.isRerouted) {
          const c = HIGHWAY_CORRIDORS[corridorId];
          if (c?.alternateId) corridorId = c.alternateId;
        }

        const corridor = HIGHWAY_CORRIDORS[corridorId];
        if (!corridor) return { ...route, currentPosition: [route.currentPositionLng || 77, route.currentPositionLat || 22] };

        // ── Corridor transition detection — remap progress on switch ──
        const prevActiveCorridor = activeCorridorRef.current[id];
        if (prevActiveCorridor && prevActiveCorridor !== corridorId) {
          // Truck is switching corridors (reroute or un-reroute)
          // Get current geographic position from OLD corridor
          const oldPos = progressRef.current[id] ?? 0.5;

          // Find nearest progress point on NEW corridor
          const newPolyData = polylines[corridorId];
          const newWpts = newPolyData?.waypoints || corridor.waypoints;
          if (newWpts && newWpts.length > 2) {
            // Sample new corridor at ~50 points and find closest geographic match
            let bestDistSq = Infinity, bestProgress = 0.3;
            const oldPolyData = polylines[prevActiveCorridor];
            const oldWpts = oldPolyData?.waypoints || HIGHWAY_CORRIDORS[prevActiveCorridor]?.waypoints;
            let currPos = [77, 22]; // fallback
            if (oldWpts) {
              const oldCum = oldPolyData?.cumDistances || cumDistCache.current[prevActiveCorridor];
              if (oldCum) {
                currPos = interpolateOnPolyline(oldWpts, oldCum, oldPos);
              }
            }
            const step = Math.max(1, Math.floor(newWpts.length / CORRIDOR_SAMPLE_POINTS));
            for (let j = 0; j < newWpts.length; j += step) {
              // Use distanceKm wrapper for safe param order
              const d = distanceKm(currPos, newWpts[j]);
              if (d < bestDistSq) { bestDistSq = d; bestProgress = j / (newWpts.length - 1); }
            }
            progressRef.current[id] = Math.max(MIN_PROGRESS, Math.min(MAX_PROGRESS, bestProgress));
          } else {
            progressRef.current[id] = FALLBACK_PROGRESS; // Safe fallback
          }
          console.log(`[APEX] ↻ Truck ${id} corridor transition: ${prevActiveCorridor} → ${corridorId} (progress remapped to ${(progressRef.current[id] * 100).toFixed(1)}%)`);
        }
        activeCorridorRef.current[id] = corridorId;

        const progress = progressRef.current[id] ?? 0.5;

        // ── Get position on real polyline ──
        const polylineData = polylines[corridorId];
        let pos;
        if (polylineData?.waypoints && polylineData?.cumDistances) {
          pos = interpolateOnPolyline(polylineData.waypoints, polylineData.cumDistances, progress);
        } else {
          const wpts = corridor.waypoints;
          // Fix L-02: cache cumDistances for static waypoints (computed once per corridor)
          if (!cumDistCache.current[corridorId]) {
            cumDistCache.current[corridorId] = computeCumulativeDistances(wpts);
          }
          pos = interpolateOnPolyline(wpts, cumDistCache.current[corridorId], progress);
        }

        // ── Calculate bearing for icon rotation ──
        const progressAhead = Math.min(progress + PROGRESS_AHEAD_DELTA, 0.99);
        let posAhead;
        if (polylineData?.waypoints && polylineData?.cumDistances) {
          posAhead = interpolateOnPolyline(polylineData.waypoints, polylineData.cumDistances, progressAhead);
        } else {
          const wpts = corridor.waypoints;
          if (!cumDistCache.current[corridorId]) {
            cumDistCache.current[corridorId] = computeCumulativeDistances(wpts);
          }
          posAhead = interpolateOnPolyline(wpts, cumDistCache.current[corridorId], progressAhead);
        }
        const bearing = calcBearing(pos[1], pos[0], posAhead[1], posAhead[0]);

        // ── Apply lateral lane offset (Phase 7A math) ──
        const laneIdx = getLaneIndex(id);
        const laneOffsetM = laneIdx * LANE_WIDTH_M;
        const [offLng, offLat] = calcLateralOffset(pos[1], pos[0], bearing, laneOffsetM);

        // ── Micro-jitter for alive-agent feel ──
        const jLat = offLat + microJitter(JITTER_RANGE);
        const jLng = offLng + microJitter(JITTER_RANGE);

        // ── Speed: deterministic + realistic range 35-88 km/h ──
        const h = hashStr(id);
        const baseSpeed = 35 + (h % 53);
        const disruptionPenalty = route.isRerouted ? -8 : 0;
        const speedKmh = Math.max(20, baseSpeed + disruptionPenalty);

        return {
          ...route,
          currentPosition: [jLng, jLat],
          rawPosition: pos,           // Non-offset position for distance calcs
          bearing,
          laneIndex: laneIdx,
          velocityKmh: speedKmh,
          progress,
          corridorActive: corridorId,
          corridor: corridorId,
          wasRerouted: route.isRerouted,  // For tooltip: "A* rerouted → alternate corridor"
        };
      });

      // Update store ref at 60fps (no React re-render)
      setFrame(frame);

      // Commit to React snapshot every 500ms (for KPI, sidebar, etc.)
      if (now - lastSnapshotCommit > 500) {
        commitSnapshot();
        lastSnapshotCommit = now;
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []); // Empty deps — runs forever, reads from refs

  // Return the reactive snapshot for React consumers (KPI dashboard, sidebar, etc.)
  return useFleetStore(s => s.snapshot);
}
