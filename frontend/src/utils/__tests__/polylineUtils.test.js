/**
 * polylineUtils.test.js — S-21: Unit tests for polyline utilities
 */
import { describe, it, expect } from 'vitest';
import { simplifyPolyline, simplifyPolylineIterative } from '../polylineUtils';
import { computeCumulativeDistances } from '../../services/routeService';

describe('simplifyPolyline (recursive)', () => {
  it('preserves endpoints', () => {
    const pts = [[0,0], [1,0], [2,0], [3,0]];
    const result = simplifyPolyline(pts, 0.1);
    expect(result[0]).toEqual([0,0]);
    expect(result[result.length - 1]).toEqual([3,0]);
  });

  it('returns original with epsilon=0', () => {
    const pts = [[0,0], [0.5,0.5], [1,0]];
    const result = simplifyPolyline(pts, 0);
    expect(result.length).toBe(pts.length);
  });

  it('returns input if fewer than 3 points', () => {
    expect(simplifyPolyline([[0,0], [1,1]], 0.1)).toHaveLength(2);
    expect(simplifyPolyline([[0,0]], 0.1)).toHaveLength(1);
  });

  it('simplifies a straight line to 2 points', () => {
    const pts = [[0,0], [1,0], [2,0], [3,0], [4,0]];
    const result = simplifyPolyline(pts, 0.001);
    expect(result.length).toBe(2);
  });
});

describe('simplifyPolylineIterative (stack-based)', () => {
  it('matches recursive output for zigzag', () => {
    const pts = [[0,0], [1,1], [2,0], [3,1], [4,0]];
    const r1 = simplifyPolyline(pts, 0.5);
    const r2 = simplifyPolylineIterative(pts, 0.5);
    expect(r2.length).toBe(r1.length);
    expect(r2[0]).toEqual(r1[0]);
    expect(r2[r2.length-1]).toEqual(r1[r1.length-1]);
  });

  it('handles empty input', () => {
    expect(simplifyPolylineIterative([], 0.1)).toEqual([]);
  });

  it('handles null input', () => {
    expect(simplifyPolylineIterative(null, 0.1)).toBeNull();
  });
});

describe('computeCumulativeDistances', () => {
  it('returns monotonically increasing distances', () => {
    const pts = [[77, 28], [77.1, 28.1], [77.2, 28.2]];
    const dists = computeCumulativeDistances(pts);
    expect(dists.length).toBe(pts.length);
    expect(dists[0]).toBe(0);
    for (let i = 1; i < dists.length; i++) {
      expect(dists[i]).toBeGreaterThan(dists[i-1]);
    }
  });

  it('first element is always 0', () => {
    const pts = [[0,0], [1,1]];
    const dists = computeCumulativeDistances(pts);
    expect(dists[0]).toBe(0);
  });

  it('returns [0] for single point', () => {
    const dists = computeCumulativeDistances([[0,0]]);
    expect(dists).toEqual(new Float64Array([0]));
  });
});
