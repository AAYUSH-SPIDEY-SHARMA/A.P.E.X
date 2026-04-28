# ADR-001: Dual-Cadence State Management with Zustand

## Status
Accepted

## Context
The A.P.E.X digital twin renders 15+ trucks at 60fps using deck.gl WebGL layers while simultaneously displaying real-time KPI counters, alert feeds, and node inspection panels. Standard React state management (useState/useReducer) causes catastrophic re-renders when telemetry data updates at 50Hz, dropping frame rates below 10fps.

## Decision
We adopted a **dual-cadence state architecture** using Zustand:

1. **High-frequency (60fps)**: Truck positions stored in `useRef` mutable references, read imperatively by `requestAnimationFrame` animation loops. React never re-renders for position changes.
2. **Low-frequency (2fps)**: KPI aggregates, node statuses, and alert counts synced to React state via throttled Zustand selectors.

## Alternatives Considered
- **Redux**: Rejected due to middleware overhead and boilerplate. Redux re-renders connected components on every store update — incompatible with 60fps.
- **Jotai/Valtio**: Considered, but Zustand's `useStore.getState()` imperative API perfectly maps to rAF loops without subscription overhead.
- **Raw React Context**: Rejected. Context triggers cascading re-renders across all consumers.

## Consequences
- Animation frame rate maintained at 60fps with zero dropped frames
- React reconciliation limited to ~2 DOM updates/second for text elements
- Complexity increased: developers must understand which data lives in refs vs state
