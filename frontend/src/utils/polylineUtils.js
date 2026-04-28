// ══════════════════════════════════════════════════════════
// polylineUtils.js — Advanced Polyline Processing
//
// Implements:
//   1. Douglas-Peucker simplification (reduce 40K→3K points)
//   2. Bearing/heading calculation between waypoints
//   3. Vertex density analysis for speed inference
//   4. ETA computation from remaining polyline distance
//
// Research reference:
//   - Douglas-Peucker: O(N log N) recursive vertex elimination
//   - Bearing: atan2(sin(Δλ)cos(φ2), cos(φ1)sin(φ2)-sin(φ1)cos(φ2)cos(Δλ))
//   - Density: count vertices within ±radius of current index
// ══════════════════════════════════════════════════════════

// ─── Haversine distance in km ──────────────────────────────
// Fix L-01: Import from canonical source (lateralOffset.js) to avoid duplication
import { haversineKm } from './lateralOffset';

// ─── 1. Douglas-Peucker Simplification ─────────────────────
// Reduces vertex count while preserving visual shape
// epsilon: max perpendicular distance in degrees (~0.001 = ~100m)
//
// For 40K points → ~2000-5000 points at epsilon=0.0005
// For PathLayer rendering only; truck animation uses full polyline
export function simplifyPolyline(points, epsilon = 0.0005) {
  if (!points || points.length < 3) return points;

  // Find the point with max perpendicular distance from line(start, end)
  const start = points[0];
  const end = points[points.length - 1];

  let maxDist = 0;
  let maxIdx = 0;

  for (let i = 1; i < points.length - 1; i++) {
    const d = perpendicularDistance(points[i], start, end);
    if (d > maxDist) {
      maxDist = d;
      maxIdx = i;
    }
  }

  // If max distance exceeds epsilon, recursively simplify
  if (maxDist > epsilon) {
    const left = simplifyPolyline(points.slice(0, maxIdx + 1), epsilon);
    const right = simplifyPolyline(points.slice(maxIdx), epsilon);

    // Concatenate, removing duplicate point at junction
    return left.slice(0, -1).concat(right);
  }

  // All points within tolerance — keep only endpoints
  return [start, end];
}

// Perpendicular distance from point to line segment (in degrees)
function perpendicularDistance(point, lineStart, lineEnd) {
  const [px, py] = point;
  const [ax, ay] = lineStart;
  const [bx, by] = lineEnd;

  const dx = bx - ax;
  const dy = by - ay;

  if (dx === 0 && dy === 0) {
    // Line segment is a point
    return Math.sqrt((px - ax) ** 2 + (py - ay) ** 2);
  }

  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  const projX = ax + t * dx;
  const projY = ay + t * dy;

  return Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);
}

// ─── Iterative Douglas-Peucker (stack-based, no recursion) ─
// Avoids stack overflow for 73K+ point polylines
export function simplifyPolylineIterative(points, epsilon = 0.0005) {
  if (!points || points.length < 3) return points;

  const n = points.length;
  const keep = new Uint8Array(n); // 0 = discard, 1 = keep
  keep[0] = 1;
  keep[n - 1] = 1;

  // Stack of [startIdx, endIdx] pairs
  const stack = [[0, n - 1]];

  while (stack.length > 0) {
    const [start, end] = stack.pop();

    let maxDist = 0;
    let maxIdx = start;

    for (let i = start + 1; i < end; i++) {
      const d = perpendicularDistance(points[i], points[start], points[end]);
      if (d > maxDist) {
        maxDist = d;
        maxIdx = i;
      }
    }

    if (maxDist > epsilon) {
      keep[maxIdx] = 1;
      if (maxIdx - start > 1) stack.push([start, maxIdx]);
      if (end - maxIdx > 1) stack.push([maxIdx, end]);
    }
  }

  // Collect kept points
  const result = [];
  for (let i = 0; i < n; i++) {
    if (keep[i]) result.push(points[i]);
  }

  return result;
}

// ─── 2. Bearing/Heading Calculation ────────────────────────
// Returns forward azimuth in degrees (0-360) from point1 to point2
// Used for truck icon rotation
export function computeBearing(lng1, lat1, lng2, lat2) {
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) -
            Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

// ─── 3. Vertex Density Analysis ────────────────────────────
// Counts vertices within ±radius indices of the current position
// High density → curve/urban area → lower speed
// Low density → straight expressway → higher speed
//
// Returns: density ratio (0.0 = sparse/fast, 1.0 = dense/slow)
export function computeVertexDensity(waypoints, currentIndex, radius = 50) {
  if (!waypoints || waypoints.length < 3) return 0.5;

  const start = Math.max(0, currentIndex - radius);
  const end = Math.min(waypoints.length - 1, currentIndex + radius);
  const sampleCount = end - start;

  if (sampleCount < 2) return 0.5;

  // Calculate total distance over the sample window
  let totalDist = 0;
  for (let i = start; i < end; i++) {
    const [lng1, lat1] = waypoints[i];
    const [lng2, lat2] = waypoints[i + 1];
    totalDist += haversineKm(lat1, lng1, lat2, lng2);
  }

  // Average segment length (km per vertex)
  const avgSegLen = totalDist / sampleCount;

  // Normalize: <0.05 km/vertex = very dense (urban), >0.5 km/vertex = sparse (highway)
  // Map to [0, 1] density ratio
  const density = Math.max(0, Math.min(1, 1 - (avgSegLen - 0.02) / 0.5));

  return density;
}

// ─── 4. Speed from Vertex Density ──────────────────────────
// Maps density ratio to realistic truck speed
// Dense (curves/urban): 25-45 km/h
// Medium (state highway): 45-65 km/h
// Sparse (expressway): 65-85 km/h
export function speedFromDensity(density) {
  const minSpeed = 25;
  const maxSpeed = 85;
  // Inverse relationship: higher density = lower speed
  return Math.round(maxSpeed - density * (maxSpeed - minSpeed));
}

// ─── 5. ETA Computation ────────────────────────────────────
// Calculates estimated time of arrival from current progress
// Returns: { etaMinutes, etaFormatted, remainingKm }
export function computeETA(totalDistanceKm, progress, averageSpeedKmh = 55) {
  const remainingKm = totalDistanceKm * (1 - progress);
  const hoursRemaining = remainingKm / averageSpeedKmh;
  const minutesRemaining = Math.round(hoursRemaining * 60);

  let etaFormatted;
  if (minutesRemaining > 60) {
    const hrs = Math.floor(minutesRemaining / 60);
    const mins = minutesRemaining % 60;
    etaFormatted = `${hrs}h ${mins}m`;
  } else {
    etaFormatted = `${minutesRemaining}m`;
  }

  return {
    etaMinutes: minutesRemaining,
    etaFormatted,
    remainingKm: Math.round(remainingKm),
  };
}

// ─── 6. Find Nearest Point on Polyline ─────────────────────
// Used for rerouting: find where on the new corridor a truck
// should "enter" based on its current GPS position
export function findNearestPointOnPolyline(waypoints, targetLng, targetLat) {
  if (!waypoints || waypoints.length === 0) return { index: 0, distance: Infinity };

  let minDist = Infinity;
  let minIdx = 0;

  for (let i = 0; i < waypoints.length; i++) {
    const [lng, lat] = waypoints[i];
    const d = haversineKm(lat, lng, targetLat, targetLng);
    if (d < minDist) {
      minDist = d;
      minIdx = i;
    }
  }

  return {
    index: minIdx,
    distance: minDist,
    progress: minIdx / (waypoints.length - 1),
    position: waypoints[minIdx],
  };
}

export { haversineKm };
