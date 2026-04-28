/**
 * lateralOffset.test.js — S-21: Unit tests for lateral offset utilities
 */
import { describe, it, expect } from 'vitest';
import { haversineKm, calcBearing, calcLateralOffset, getLaneIndex } from '../lateralOffset';

describe('haversineKm', () => {
  it('Delhi to Mumbai ≈ 1150km (±100km)', () => {
    const d = haversineKm(28.6139, 77.2090, 19.0760, 72.8777);
    expect(d).toBeGreaterThan(1050);
    expect(d).toBeLessThan(1250);
  });

  it('same point = 0', () => {
    expect(haversineKm(28, 77, 28, 77)).toBe(0);
  });

  it('handles equator (lat=0) without NaN', () => {
    const d = haversineKm(0, 77, 0, 78);
    expect(Number.isNaN(d)).toBe(false);
    expect(d).toBeGreaterThan(0);
  });
});

describe('calcBearing', () => {
  it('due north ≈ 0°', () => {
    const b = calcBearing(28, 77, 29, 77);
    expect(b).toBeGreaterThan(-5);
    expect(b).toBeLessThan(5);
  });

  it('due east ≈ 90°', () => {
    const b = calcBearing(28, 77, 28, 78);
    expect(b).toBeGreaterThan(85);
    expect(b).toBeLessThan(95);
  });
});

describe('calcLateralOffset', () => {
  it('returns [lng, lat] array', () => {
    const result = calcLateralOffset(77, 28, 45, 1, 0.0001);
    expect(result).toHaveLength(2);
    expect(typeof result[0]).toBe('number');
    expect(typeof result[1]).toBe('number');
  });

  it('does not crash with lat=0 (equator)', () => {
    const result = calcLateralOffset(77, 0, 90, 1, 0.0001);
    expect(result).toHaveLength(2);
    expect(Number.isNaN(result[0])).toBe(false);
    expect(Number.isNaN(result[1])).toBe(false);
  });
});

describe('getLaneIndex', () => {
  it('returns 0-3 for valid route IDs', () => {
    expect(getLaneIndex('R-001')).toBeGreaterThanOrEqual(0);
    expect(getLaneIndex('R-001')).toBeLessThanOrEqual(3);
  });

  it('is deterministic', () => {
    expect(getLaneIndex('R-005')).toBe(getLaneIndex('R-005'));
  });
});
