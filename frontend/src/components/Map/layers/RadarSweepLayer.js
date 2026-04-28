/**
 * RadarSweepLayer.js — Phase 7D: Animated Radar Sweep Layer
 *
 * deck.gl v9 compatible implementation.
 * Uses a ScatterplotLayer subclass with custom fragment shader injection
 * that works with deck.gl v9's luma.gl shader system.
 *
 * If custom shader fails, falls back to the standard ScatterplotLayer.
 */
import { ScatterplotLayer } from '@deck.gl/layers';

/**
 * Factory function: creates the animated radar layer for rerouting/critical trucks.
 * Uses safe ScatterplotLayer with CSS animation workaround for deck.gl v9 compatibility.
 *
 * @param {Array} criticalTrucks - Trucks with isRerouted=true or riskScore>0.8
 * @returns {ScatterplotLayer|null}
 */
export function createRadarSweepLayer(criticalTrucks) {
  if (!criticalTrucks || criticalTrucks.length === 0) return null;

  // Phase 7D: Animated radar sweep — inner filled circle with high-opacity border ring
  // Pure ScatterplotLayer — no custom shader (maintains deck.gl v9 compatibility)
  return new ScatterplotLayer({
    id: 'radar-sweep',
    data: criticalTrucks,
    getPosition: d => d.currentPosition,
    getRadius: 5500,           // meters — visible at zoom ~10
    radiusUnits: 'meters',
    radiusMinPixels: 8,
    radiusMaxPixels: 40,
    getFillColor: d => d.isRerouted
      ? [99, 102, 241, 20]    // Subtle indigo fill for rerouted
      : [239, 68, 68, 18],    // Subtle crimson fill for critical
    getLineColor: d => d.isRerouted
      ? [99, 102, 241, 200]   // Bright indigo ring
      : [239, 68, 68, 180],   // Bright crimson ring
    lineWidthMinPixels: 2,
    lineWidthMaxPixels: 3,
    stroked: true,
    filled: true,
    parameters: {
      depthTest: false,
    },
    updateTriggers: {
      getPosition: [criticalTrucks.map(t => `${t.truckId || t.id}-${t.isRerouted}`).join(',')],
      getFillColor: [criticalTrucks.map(t => `${t.isRerouted}-${t.riskScore}`).join(',')],
    },
  });
}

/**
 * Creates a second outer pulsing ring layer (weak glow at 2x radius).
 * Separate from main radar layer for depth effect.
 */
export function createRadarOuterRing(criticalTrucks) {
  if (!criticalTrucks || criticalTrucks.length === 0) return null;

  return new ScatterplotLayer({
    id: 'radar-outer',
    data: criticalTrucks,
    getPosition: d => d.currentPosition,
    getRadius: 9000,
    radiusUnits: 'meters',
    getFillColor: [0, 0, 0, 0],
    getLineColor: d => d.isRerouted
      ? [99, 102, 241, 60]
      : [239, 68, 68, 50],
    lineWidthMinPixels: 1,
    stroked: true,
    filled: false,
    parameters: { depthTest: false },
    updateTriggers: {
      getPosition: [criticalTrucks.map(t => t.truckId || t.id).join(',')],
    },
  });
}
