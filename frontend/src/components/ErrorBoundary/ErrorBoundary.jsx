/**
 * ErrorBoundary — Phase S-04: React Error Boundary
 *
 * Class component (required — hooks can't catch render errors).
 * Wraps critical UI zones so a single deck.gl/WebGL crash
 * doesn't take down the entire application.
 *
 * Usage:
 *   <ErrorBoundary variant="map">
 *     <MapView ... />
 *   </ErrorBoundary>
 *
 * Props:
 *   variant — "map" | "sidebar" | "kpi" | "default"
 *   children — child React tree to protect
 */
import React from 'react';
import './ErrorBoundary.css';

const VARIANT_CONFIG = {
  map: {
    icon: '🗺️',
    title: 'Map Render Error',
    hint: 'The WebGL map layer encountered an error. Click retry to reload.',
  },
  sidebar: {
    icon: '📊',
    title: 'Component Error',
    hint: 'This panel encountered an error. Click retry to recover.',
  },
  kpi: {
    icon: '📈',
    title: 'Data Unavailable',
    hint: 'KPI data could not be rendered.',
  },
  default: {
    icon: '⚠️',
    title: 'Something Went Wrong',
    hint: 'An unexpected error occurred.',
  },
};

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error(
      `[APEX] ErrorBoundary (${this.props.variant || 'default'}) caught:`,
      error,
      info.componentStack
    );
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const variant = this.props.variant || 'default';
      const config = VARIANT_CONFIG[variant] || VARIANT_CONFIG.default;

      return (
        <div className={`error-boundary__fallback error-boundary__fallback--${variant}`}>
          <div className="error-boundary__icon">{config.icon}</div>
          <div className="error-boundary__title">{config.title}</div>
          <div className="error-boundary__message">
            {this.state.error?.message || config.hint}
          </div>
          <button
            className="error-boundary__retry"
            onClick={this.handleRetry}
            aria-label="Retry loading this component"
          >
            ↻ Retry
          </button>
        </div>
      );
    }

    // Render children directly via Fragment — no wrapper div to break flex layout
    return <>{this.props.children}</>;
  }
}

export default ErrorBoundary;
