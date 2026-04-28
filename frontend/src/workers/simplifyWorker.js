/**
 * simplifyWorker.js — S-08: Off-main-thread polyline simplification
 *
 * Web Worker that runs Douglas-Peucker simplification without blocking UI.
 * Vite supports `new Worker(new URL(...), { type: 'module' })` natively.
 */

// ── Iterative Douglas-Peucker (stack-based, no recursion) ──
function simplifyPolylineIterative(points, epsilon = 0.0005) {
  if (!points || points.length < 3) return points;

  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;

  const stack = [[0, points.length - 1]];

  while (stack.length > 0) {
    const [start, end] = stack.pop();
    if (end - start < 2) continue;

    let maxDist = 0;
    let maxIdx = start;

    const [x1, y1] = points[start];
    const [x2, y2] = points[end];
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;

    for (let i = start + 1; i < end; i++) {
      const [px, py] = points[i];
      let dist;
      if (lenSq === 0) {
        dist = Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
      } else {
        const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
        const projX = x1 + t * dx;
        const projY = y1 + t * dy;
        dist = Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);
      }
      if (dist > maxDist) { maxDist = dist; maxIdx = i; }
    }

    if (maxDist > epsilon) {
      keep[maxIdx] = 1;
      stack.push([start, maxIdx]);
      stack.push([maxIdx, end]);
    }
  }

  const result = [];
  for (let i = 0; i < points.length; i++) {
    if (keep[i]) result.push(points[i]);
  }
  return result;
}

// ── Worker message handler ──
self.onmessage = ({ data: { waypoints, epsilon, corridorId } }) => {
  const simplified = simplifyPolylineIterative(waypoints, epsilon);
  self.postMessage({ corridorId, simplified });
};
