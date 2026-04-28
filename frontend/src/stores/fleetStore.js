/**
 * fleetStore.js — Zustand store for fleet animation state
 *
 * Dual-cadence architecture (Critical Fix C-03):
 *   - _frameRef: updated at 60fps by rAF loop (never triggers React re-render)
 *   - snapshot:  updated every ~500ms for React consumers (KPI, sidebar, etc.)
 *
 * Why this exists:
 *   Before: useAnimatedFleet called useState setter 60× per second,
 *           causing the entire App → MapView → KPI → Sidebar tree to re-render.
 *   After:  rAF loop writes to a non-reactive ref (zero React overhead).
 *           A separate throttled timer commits to React state at ~2fps.
 *
 * Usage:
 *   - MapView:  call getLatestFrame() to read positions imperatively (no re-render)
 *   - App.jsx:  subscribe to `snapshot` for KPI/sidebar updates (~2fps)
 *   - useAnimatedFleet: calls setFrame() at 60fps, commitSnapshot() at 2fps
 */
import { create } from 'zustand';

const useFleetStore = create((set, get) => ({
  // React-reactive snapshot (throttled to ~2fps for UI consumers)
  snapshot: [],

  // Non-reactive ref — updated at 60fps, read imperatively by MapView
  _frameRef: { current: [] },

  // Called from rAF loop — updates ref only (no React re-render)
  setFrame: (frame) => {
    get()._frameRef.current = frame;
  },

  // Called from throttle timer — commits ref to React state (triggers re-render)
  commitSnapshot: () => {
    const frame = get()._frameRef.current;
    // Only commit if there's actual data (avoid unnecessary [] → [] updates)
    if (frame.length > 0) {
      set({ snapshot: frame });
    }
  },

  // Direct ref access for MapView (zero re-renders)
  getLatestFrame: () => get()._frameRef.current,
}));

export default useFleetStore;
