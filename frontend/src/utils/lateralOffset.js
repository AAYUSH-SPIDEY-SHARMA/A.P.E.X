/**
 * lateralOffset.js — Phase 7A: Geospatial Disaggregation Engine
 *
 * Implements Great-Circle perpendicular bearing mathematics for eliminating
 * the "Train Effect" by offsetting each truck into its own virtual lane.
 *
 * Formula Reference (Blueprint Phase 7A):
 *   φ₂ = arcsin(sin(φ₁)·cos(dR) + cos(φ₁)·sin(dR)·cos(θ_perp))
 *   λ₂ = λ₁ + atan2(sin(θ_perp)·sin(dR)·cos(φ₁), cos(dR) - sin(φ₁)·sin(φ₂))
 */

const EARTH_RADIUS_M = 6378137; // WGS-84 equatorial radius
const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

/**
 * Calculate a point offset perpendicular to a bearing by `offsetMeters`.
 * Positive offset = right of bearing, negative = left.
 *
 * @param {number} lat  - origin latitude (degrees)
 * @param {number} lng  - origin longitude (degrees)
 * @param {number} bearingDeg - direction of travel (degrees from N)
 * @param {number} offsetMeters - lateral offset (+right, -left)
 * @returns {[lng, lat]} - [longitude, latitude] for deck.gl
 */
export function calcLateralOffset(lat, lng, bearingDeg, offsetMeters) {
  if (lat == null || lng == null || Math.abs(offsetMeters) < 0.1) return [lng, lat];

  const dR = offsetMeters / EARTH_RADIUS_M;
  const lat1 = lat * DEG_TO_RAD;
  const lon1 = lng * DEG_TO_RAD;
  // Perpendicular bearing: rotate 90° to the right
  const brng = (bearingDeg + 90) * DEG_TO_RAD;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(dR) +
    Math.cos(lat1) * Math.sin(dR) * Math.cos(brng)
  );

  const lon2 = lon1 + Math.atan2(
    Math.sin(brng) * Math.sin(dR) * Math.cos(lat1),
    Math.cos(dR) - Math.sin(lat1) * Math.sin(lat2)
  );

  return [
    lon2 * RAD_TO_DEG,
    lat2 * RAD_TO_DEG,
  ];
}

/**
 * Calculate compass bearing from point A to point B.
 * @returns {number} bearing in degrees [0, 360)
 */
export function calcBearing(lat1, lng1, lat2, lng2) {
  if (lat1 == null || lat2 == null) return 0;  // Fix: proper null check (lat=0 is valid)
  const φ1 = lat1 * DEG_TO_RAD;
  const φ2 = lat2 * DEG_TO_RAD;
  const Δλ = (lng2 - lng1) * DEG_TO_RAD;

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (Math.atan2(y, x) * RAD_TO_DEG + 360) % 360;
}

/**
 * Deterministic lane index from truck ID. Range: -3 to +3 (7 lanes).
 * Uses djb2 hash so same truck always gets same lane across renders.
 */
export function getLaneIndex(truckId) {
  if (!truckId) return 0;
  let h = 5381;
  for (let i = 0; i < truckId.length; i++) {
    h = ((h << 5) + h) + truckId.charCodeAt(i);
    h |= 0; // Convert to 32-bit int
  }
  return (Math.abs(h) % 7) - 3; // -3, -2, -1, 0, 1, 2, 3
}

/**
 * Cubic ease-out: t=0→0, t=1→1 with deceleration curve.
 * Simulates truck mass/momentum as it approaches next waypoint.
 */
export function easeOutCubic(t) {
  return 1 - Math.pow(1 - Math.min(t, 1), 3);
}

/**
 * Micro-jitter: adds ±N degrees of stochastic noise per frame.
 * Makes each truck feel like an independent, living agent.
 */
export function microJitter(scale = 0.00004) {
  return (Math.random() - 0.5) * scale;
}

/**
 * Haversine distance between two lat/lng points in km.
 */
export function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * DEG_TO_RAD;
  const dLng = (lng2 - lng1) * DEG_TO_RAD;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * DEG_TO_RAD) * Math.cos(lat2 * DEG_TO_RAD) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
