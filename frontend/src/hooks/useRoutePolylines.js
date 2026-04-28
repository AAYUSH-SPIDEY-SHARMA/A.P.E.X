// ══════════════════════════════════════════════════════════
// useRoutePolylines — v2: Routes API + Douglas-Peucker Simplification
//
// Architecture:
//   1. On mount, fetches HD polylines for all enabled corridors
//   2. Uses IndexedDB cache (24h TTL) to avoid repeat API calls
//   3. Applies Douglas-Peucker simplification for PathLayer rendering
//   4. Full resolution polylines kept for truck interpolation
//   5. Falls back to static waypoints if API fails
//   6. Exposes fetchAlternateRoute() for dynamic rerouting
//
// Returns: { corridorPolylines, isLoading, error, fetchAlternateRoute }
//
// Each corridor entry:
//   waypoints           — Full HD polyline (12K-73K points) for truck animation
//   simplifiedWaypoints — Douglas-Peucker simplified (2K-5K) for PathLayer
//   cumDistances        — Pre-computed cumulative distances for O(log N) search
//   totalDistanceKm     — Total polyline length
// ══════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef } from 'react';
import { HIGHWAY_CORRIDORS } from '../data/routeWaypoints';
import {
  fetchCorridorPolyline,
  fetchRouteFromAPI,
  computeCumulativeDistances,
} from '../services/routeService';
import { simplifyPolylineIterative } from '../utils/polylineUtils';

// S-08: Web Worker for off-main-thread simplification
let simplifyWorker = null;
try {
  simplifyWorker = new Worker(
    new URL('../workers/simplifyWorker.js', import.meta.url),
    { type: 'module' }
  );
} catch (e) {
  console.warn('[APEX] Web Worker unavailable, using main thread:', e.message);
}

function workerSimplify(waypoints, epsilon, corridorId) {
  if (!simplifyWorker) return Promise.resolve(simplifyPolylineIterative(waypoints, epsilon));
  return new Promise((resolve) => {
    const handler = (e) => {
      if (e.data.corridorId === corridorId) {
        simplifyWorker.removeEventListener('message', handler);
        resolve(e.data.simplified);
      }
    };
    simplifyWorker.addEventListener('message', handler);
    simplifyWorker.postMessage({ waypoints, epsilon, corridorId });
    // Fallback timeout: if worker doesn't respond in 5s, do it sync
    setTimeout(() => {
      simplifyWorker.removeEventListener('message', handler);
      resolve(simplifyPolylineIterative(waypoints, epsilon));
    }, 5000);
  });
}

// Douglas-Peucker epsilon: ~0.0005 degrees ≈ 50m tolerance
// Reduces 40K→3K points, maintaining highway curve fidelity
const SIMPLIFICATION_EPSILON = 0.0005;

export default function useRoutePolylines() {
  const [corridorPolylines, setCorridorPolylines] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const fetchedRef = useRef(false);

  // ── Fetch all corridor polylines on mount ────────────────────
  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    const fetchAll = async () => {
      setIsLoading(true);
      const results = {};
      const corridorEntries = Object.entries(HIGHWAY_CORRIDORS);

      console.log(`[APEX] Fetching polylines for ${corridorEntries.length} corridors...`);

      const promises = corridorEntries.map(async ([id, corridor]) => {
        try {
          if (corridor.routesAPI?.enabled) {
            const result = await fetchCorridorPolyline({
              id,
              origin: corridor.routesAPI.origin,
              destination: corridor.routesAPI.destination,
              intermediates: corridor.routesAPI.intermediates || [],
            });

            if (result) {
              // S-08: Apply Douglas-Peucker via Web Worker (non-blocking)
              const t0 = performance.now();
              const simplified = await workerSimplify(
                result.waypoints,
                SIMPLIFICATION_EPSILON,
                id
              );
              const simplifyMs = (performance.now() - t0).toFixed(1);

              results[id] = {
                waypoints: result.waypoints,           // Full HD for truck animation
                simplifiedWaypoints: simplified,        // Simplified for PathLayer
                cumDistances: result.cumDistances,
                totalDistanceKm: result.totalDistanceKm,
                source: result.fromCache ? 'cache' : 'api',
                pointCount: result.waypoints.length,
                simplifiedCount: simplified.length,
              };
              console.log(
                `[APEX] ✅ ${id}: ${result.waypoints.length} → ${simplified.length} points ` +
                `(DP simplify: ${simplifyMs}ms), ` +
                `${result.totalDistanceKm.toFixed(0)} km (${result.fromCache ? 'cache' : 'API'})`
              );
              return;
            }
          }

          // Fallback to static waypoints
          const staticWaypoints = corridor.waypoints;
          const cumDist = computeCumulativeDistances(staticWaypoints);
          results[id] = {
            waypoints: staticWaypoints,
            simplifiedWaypoints: staticWaypoints,     // No simplification needed
            cumDistances: cumDist,
            totalDistanceKm: cumDist[cumDist.length - 1],
            source: 'static',
            pointCount: staticWaypoints.length,
            simplifiedCount: staticWaypoints.length,
          };
          console.log(
            `[APEX] ⚠️ ${id}: Using ${staticWaypoints.length} static waypoints ` +
            `(${corridor.routesAPI?.enabled ? 'API failed' : corridor.type})`
          );
        } catch (err) {
          console.error(`[APEX] ❌ ${id} fetch failed:`, err);
          const staticWaypoints = corridor.waypoints;
          const cumDist = computeCumulativeDistances(staticWaypoints);
          results[id] = {
            waypoints: staticWaypoints,
            simplifiedWaypoints: staticWaypoints,
            cumDistances: cumDist,
            totalDistanceKm: cumDist[cumDist.length - 1],
            source: 'static-fallback',
            pointCount: staticWaypoints.length,
            simplifiedCount: staticWaypoints.length,
          };
        }
      });

      // Sequential execution to avoid rate limits
      for (const promise of promises) {
        await promise;
      }

      setCorridorPolylines(results);
      setIsLoading(false);

      // Summary log
      const apiCount = Object.values(results).filter(r => r.source === 'api').length;
      const cacheCount = Object.values(results).filter(r => r.source === 'cache').length;
      const staticCount = Object.values(results).filter(r => r.source.startsWith('static')).length;
      const totalFull = Object.values(results).reduce((s, r) => s + r.pointCount, 0);
      const totalSimplified = Object.values(results).reduce((s, r) => s + r.simplifiedCount, 0);
      console.log(
        `[APEX] Route loading complete: ${apiCount} API, ${cacheCount} cache, ` +
        `${staticCount} static. Full: ${totalFull}, Simplified: ${totalSimplified} waypoints.`
      );
    };

    fetchAll().catch(err => {
      console.error('[APEX] Fatal error fetching polylines:', err);
      setError(err.message);
      setIsLoading(false);
    });
  }, []);

  // ── Fetch alternate route for dynamic rerouting ──────────────
  const fetchAlternateRoute = useCallback(async (
    currentPosition,
    destination,
    avoidVia = [],
  ) => {
    console.log('[APEX] Fetching alternate reroute...');

    const result = await fetchRouteFromAPI(
      currentPosition,
      destination,
      avoidVia,
      {
        routingPreference: 'TRAFFIC_AWARE',
        polylineQuality: 'HIGH_QUALITY',
        computeAlternatives: true,
      }
    );

    if (!result) {
      console.warn('[APEX] Alternate route fetch failed');
      return null;
    }

    const cumDist = computeCumulativeDistances(result.waypoints);
    const simplified = simplifyPolylineIterative(result.waypoints, SIMPLIFICATION_EPSILON);

    return {
      waypoints: result.waypoints,
      simplifiedWaypoints: simplified,
      cumDistances: cumDist,
      totalDistanceKm: cumDist[cumDist.length - 1],
      distanceMeters: result.distanceMeters,
      source: 'reroute-api',
      pointCount: result.waypoints.length,
      simplifiedCount: simplified.length,
      alternatives: result.alternatives,
    };
  }, []);

  return {
    corridorPolylines,
    isLoading,
    error,
    fetchAlternateRoute,
  };
}
