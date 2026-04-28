/**
 * Skeleton — Phase S-05: Loading Placeholder Components
 *
 * Provides shimmer-animated placeholders for loading states.
 *
 * Usage:
 *   <Skeleton width="120px" height="18px" />
 *   <Skeleton variant="circle" size="40px" />
 *   <KPIDashboardSkeleton />
 *   <MapLoadingOverlay />
 */
import React from 'react';
import './Skeleton.css';

/** Base skeleton element */
export function Skeleton({ width, height, variant = 'text', size, style = {}, className = '' }) {
  const s = {
    width: size || width || '100%',
    height: size || height || '14px',
    ...style,
  };
  return <div className={`skeleton skeleton--${variant} ${className}`} style={s} />;
}

/** KPI Dashboard loading state — 6 shimmer cards */
export function KPIDashboardSkeleton() {
  return (
    <div className="kpi-skeleton">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="kpi-skeleton__card">
          <div className="skeleton" />
          <div className="skeleton" />
          <div className="skeleton" />
        </div>
      ))}
    </div>
  );
}

/** Map loading indicator — pulsing dot + status text */
export function MapLoadingOverlay({ message = 'Loading corridors…' }) {
  return (
    <div className="map-loading">
      <div className="map-loading__dot" />
      <div className="map-loading__text">{message}</div>
    </div>
  );
}

/** Sidebar section skeleton — 3 rows of varying widths */
export function SidebarSkeleton() {
  return (
    <div className="sidebar-skeleton">
      <div className="sidebar-skeleton__row">
        <Skeleton variant="circle" size="28px" />
        <Skeleton width="60%" height="12px" />
      </div>
      <Skeleton width="90%" height="10px" />
      <Skeleton width="70%" height="10px" />
      <Skeleton width="100%" height="40px" variant="card" />
    </div>
  );
}

export default Skeleton;
