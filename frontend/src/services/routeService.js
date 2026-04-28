// ══════════════════════════════════════════════════════════
// routeService.js — Google Maps Routes API + Polyline Engine
//
// Handles:
//   1. Encoded polyline decoding (precision-5, pre-allocated arrays)
//   2. Routes API fetching with exponential backoff retry
//   3. IndexedDB caching (async, non-blocking, 24h TTL)
//   4. Cumulative distance pre-computation for O(log N) interpolation
//
// Research-backed architecture:
//   - HIGH_QUALITY polylines → 12,000-18,000 points per corridor
//   - IndexedDB over localStorage (avoids main-thread blocking)
//   - Binary search interpolation for 60fps truck animation
// ══════════════════════════════════════════════════════════

const ROUTES_API_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes';
const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

// Essentials-tier field mask — minimizes billing
const FIELD_MASK = 'routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline,routes.legs.polyline.encodedPolyline';

const DB_NAME = 'apex_route_cache';
const DB_VERSION = 1;
const STORE_NAME = 'polylines';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// ─── 1. Encoded Polyline Decoder ───────────────────────────
// Decodes Google's encoded polyline into [lng, lat][] for deck.gl
// Uses bitwise arithmetic for maximum performance
// Precision 5 = standard Routes API output
export function decodePolyline(encodedPath, precision = 5) {
  const factor = Math.pow(10, precision);
  const len = encodedPath.length;
  const path = new Array(Math.floor(len / 2)); // Pre-allocate upper bound

  let index = 0, lat = 0, lng = 0, pointIndex = 0;

  while (index < len) {
    // Decode latitude delta
    // NOTE: Uses result=1 + (charCode-63-1) which is mathematically equivalent
    // to the standard result=0 + (charCode-63). Both produce identical output.
    let result = 1, shift = 0, b;
    do {
      b = encodedPath.charCodeAt(index++) - 63 - 1;
      result += b << shift;
      shift += 5;
    } while (b >= 0x1f);
    lat += (result & 1) ? ~(result >> 1) : (result >> 1);

    // Decode longitude delta
    result = 1; shift = 0;
    do {
      b = encodedPath.charCodeAt(index++) - 63 - 1;
      result += b << shift;
      shift += 5;
    } while (b >= 0x1f);
    lng += (result & 1) ? ~(result >> 1) : (result >> 1);

    // deck.gl format: [longitude, latitude]
    path[pointIndex++] = [lng / factor, lat / factor];
  }

  path.length = pointIndex; // Truncate to exact size
  return path;
}

// ─── 2. Haversine Distance (km) ───────────────────────────
// Fix L-01: Import from canonical source (lateralOffset.js) to avoid duplication
import { haversineKm } from '../utils/lateralOffset';
export { haversineKm }; // Re-export for backward compatibility

// ─── 3. Pre-compute Cumulative Distances ──────────────────
// Computed ONCE per corridor, reused every animation frame
// Enables O(log N) binary search interpolation
export function computeCumulativeDistances(waypoints) {
  const cumDist = new Float64Array(waypoints.length);
  cumDist[0] = 0;

  for (let i = 1; i < waypoints.length; i++) {
    const [lng1, lat1] = waypoints[i - 1];
    const [lng2, lat2] = waypoints[i];
    const segDist = haversineKm(lat1, lng1, lat2, lng2);
    cumDist[i] = cumDist[i - 1] + segDist;
  }

  return cumDist;
}

// ─── 4. Binary Search for Active Segment ──────────────────
// O(log N) — finds the segment containing targetDist
// Returns lower bound index i where cumDist[i] <= target < cumDist[i+1]
export function findActiveSegment(cumDistances, targetDist) {
  let lo = 0;
  let hi = cumDistances.length - 1;

  while (lo <= hi) {
    const mid = (lo + hi) >>> 1; // Unsigned right shift = fast floor
    if (cumDistances[mid] <= targetDist) {
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  return Math.max(0, Math.min(hi, cumDistances.length - 2));
}

// ─── 5. Interpolate Position Along Polyline ───────────────
// Uses pre-computed cumDist + binary search for O(log N) performance
export function interpolateOnPolyline(waypoints, cumDistances, progress) {
  if (!waypoints || waypoints.length < 2) return waypoints?.[0] || [0, 0];

  const totalDist = cumDistances[cumDistances.length - 1];
  const targetDist = Math.max(0, Math.min(1, progress)) * totalDist;

  const idx = findActiveSegment(cumDistances, targetDist);

  if (idx >= waypoints.length - 1) return waypoints[waypoints.length - 1];

  const d1 = cumDistances[idx];
  const d2 = cumDistances[idx + 1];
  const segProgress = d2 > d1 ? (targetDist - d1) / (d2 - d1) : 0;

  const [lng1, lat1] = waypoints[idx];
  const [lng2, lat2] = waypoints[idx + 1];

  return [
    lng1 + (lng2 - lng1) * segProgress,
    lat1 + (lat2 - lat1) * segProgress,
  ];
}

// ─── 6. Compute Bearing (for truck rotation) ──────────────
export function computeBearing(lng1, lat1, lng2, lat2) {
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

// ─── 7. IndexedDB Cache Layer ─────────────────────────────
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getCachedPolyline(corridorId) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(corridorId);
      req.onsuccess = () => {
        const record = req.result;
        if (record && Date.now() - record.timestamp < CACHE_TTL_MS) {
          console.log(`[APEX] Cache HIT: ${corridorId} (${record.waypoints.length} points)`);
          // S-09: Reconstruct Float64Array from stored ArrayBuffer
          if (record.cumDistances instanceof ArrayBuffer) {
            record.cumDistances = new Float64Array(record.cumDistances);
          } else if (Array.isArray(record.cumDistances)) {
            record.cumDistances = new Float64Array(record.cumDistances);
          }
          resolve(record);
        } else {
          resolve(null); // Expired or missing
        }
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[APEX] IndexedDB read error:', err);
    return null;
  }
}

export async function setCachedPolyline(corridorId, waypoints, distanceMeters, durationSecs, encodedPolyline) {
  try {
    const db = await openDB();
    const cumDistances = computeCumulativeDistances(waypoints);
    const record = {
      id: corridorId,
      waypoints,
      cumDistances: cumDistances.buffer, // S-09: Store as ArrayBuffer (2× smaller, instant deserialize)
      distanceMeters,
      durationSecs,
      encodedPolyline,
      totalDistanceKm: cumDistances[cumDistances.length - 1],
      timestamp: Date.now(),
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(record);
      req.onsuccess = () => {
        console.log(`[APEX] Cache SET: ${corridorId} (${waypoints.length} points, ${(record.totalDistanceKm).toFixed(0)} km)`);
        resolve(record);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[APEX] IndexedDB write error:', err);
    return null;
  }
}

// ─── 8. Routes API Fetcher with Exponential Backoff ──────
export async function fetchRouteFromAPI(origin, destination, intermediates = [], options = {}) {
  const {
    travelMode = 'DRIVE',
    routingPreference = 'TRAFFIC_UNAWARE', // Essentials tier
    polylineQuality = 'HIGH_QUALITY',
    computeAlternatives = false,
    maxRetries = 3,
  } = options;

  const payload = {
    origin: {
      location: {
        latLng: { latitude: origin[1], longitude: origin[0] }, // origin is [lng, lat]
      },
    },
    destination: {
      location: {
        latLng: { latitude: destination[1], longitude: destination[0] },
      },
    },
    travelMode,
    routingPreference,
    polylineQuality,
    polylineEncoding: 'ENCODED_POLYLINE',
    computeAlternativeRoutes: computeAlternatives,
  };

  // Add intermediate waypoints as VIA (pass-through, no leg split)
  if (intermediates.length > 0) {
    payload.intermediates = intermediates.map(coord => ({
      via: true, // Pass-through, don't create separate legs
      location: {
        latLng: { latitude: coord[1], longitude: coord[0] },
      },
    }));
  }

  let delay = 1000;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[APEX] Routes API call (attempt ${attempt + 1}):`, {
        from: `[${origin[1].toFixed(4)}, ${origin[0].toFixed(4)}]`,
        to: `[${destination[1].toFixed(4)}, ${destination[0].toFixed(4)}]`,
        viaPoints: intermediates.length,
      });

      const response = await fetch(ROUTES_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': API_KEY,
          'X-Goog-FieldMask': FIELD_MASK,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errBody = await response.text();
        if (response.status === 429) {
          throw new Error(`Quota exceeded: ${errBody}`);
        }
        throw new Error(`HTTP ${response.status}: ${errBody}`);
      }

      const data = await response.json();

      if (!data.routes || data.routes.length === 0) {
        throw new Error('No routes returned by API');
      }

      const route = data.routes[0];
      const encoded = route.polyline?.encodedPolyline;

      if (!encoded) {
        throw new Error('No polyline in response');
      }

      const waypoints = decodePolyline(encoded);
      console.log(`[APEX] Routes API success: ${waypoints.length} waypoints, ${route.distanceMeters}m, ${route.duration}`);

      return {
        waypoints,
        encodedPolyline: encoded,
        distanceMeters: route.distanceMeters,
        durationSecs: parseInt(route.duration?.replace('s', '') || '0'),
        alternatives: data.routes.slice(1).map(r => ({
          waypoints: decodePolyline(r.polyline?.encodedPolyline || ''),
          distanceMeters: r.distanceMeters,
        })),
      };
    } catch (error) {
      console.warn(`[APEX] Routes API attempt ${attempt + 1} failed:`, error.message);

      if (attempt === maxRetries) {
        console.error('[APEX] Max retries reached. Will use fallback static waypoints.');
        return null;
      }

      await new Promise(res => setTimeout(res, delay));
      delay *= 2; // Exponential backoff
    }
  }

  return null;
}

// ─── 9. Full Corridor Fetch (API + Cache) ─────────────────
// Fetches a corridor polyline, using cache if available, otherwise API
export async function fetchCorridorPolyline(corridorConfig) {
  const { id, origin, destination, intermediates = [] } = corridorConfig;

  // 1. Try cache first
  const cached = await getCachedPolyline(id);
  if (cached) {
    return {
      waypoints: cached.waypoints,
      cumDistances: new Float64Array(cached.cumDistances),
      totalDistanceKm: cached.totalDistanceKm,
      distanceMeters: cached.distanceMeters,
      fromCache: true,
    };
  }

  // 2. Fetch from Routes API
  const result = await fetchRouteFromAPI(origin, destination, intermediates);

  if (!result) {
    return null; // Caller should use fallback static waypoints
  }

  // 3. Cache the result
  const record = await setCachedPolyline(
    id,
    result.waypoints,
    result.distanceMeters,
    result.durationSecs,
    result.encodedPolyline,
  );

  const cumDistances = computeCumulativeDistances(result.waypoints);

  return {
    waypoints: result.waypoints,
    cumDistances,
    totalDistanceKm: cumDistances[cumDistances.length - 1],
    distanceMeters: result.distanceMeters,
    fromCache: false,
  };
}
