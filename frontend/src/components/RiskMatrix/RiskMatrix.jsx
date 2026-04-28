// ══════════════════════════════════════════════════════════
// RiskMatrix — Blueprint S16.2
//
// 3×3 grid showing network-wide risk:
//   Rows (Y) = Impact Severity: Low/Medium/High
//   Cols (X) = Probability: Low/Medium/High
//
// Data source: nodes array → utilization + SSW → risk zone
// Blueprint formula: cascade_risk = severity × (1 - resilience)
//
// Color map:
//   Bottom-left  = Green (low prob, low impact)
//   Top-right    = Dark Red + cascade animation (high prob, high impact)
// ══════════════════════════════════════════════════════════

import React, { useMemo } from 'react';
import './RiskMatrix.css';

// Cell color based on [row=impact, col=probability] position
// row 0=High, row 1=Medium, row 2=Low (rendered top to bottom)
// col 0=Low, col 1=Medium, col 2=High (left to right)
const CELL_COLORS = [
  ['yellow',       'orange',   'dark-red'],   // row 0 = High Impact
  ['yellow-green', 'yellow',   'orange'],     // row 1 = Medium Impact
  ['green',        'yellow-green', 'yellow'], // row 2 = Low Impact
];

const CELL_LABELS = [
  ['M',  'H',  '🔴'],
  ['L',  'M',  'H'],
  ['ML', 'L',  'M'],
];

// Map node to risk zone [row, col]
function nodeToZone(node) {
  const utilization = node.utilization || 0;
  const ssw = Math.max(0, (node.ttr || 0) - (node.tts || 0));
  const isDisrupted = node.status === 'DISRUPTED';
  const isDelayed = node.status === 'DELAYED';

  // Probability = how likely disruption continues/spreads
  let probCol;
  if (utilization >= 0.85 || isDisrupted) probCol = 2;     // High
  else if (utilization >= 0.6 || isDelayed) probCol = 1;    // Medium
  else probCol = 0;                                          // Low

  // Impact = severity of consequence (SSW + utilization)
  let impactRow;
  if (ssw > 8 || (isDisrupted && utilization >= 0.85)) impactRow = 0;  // High
  else if (ssw > 0 || isDelayed) impactRow = 1;                         // Medium
  else impactRow = 2;                                                    // Low

  return [impactRow, probCol];
}

export default function RiskMatrix({ nodes = [] }) {
  // Build 3×3 grid with node counts
  const grid = useMemo(() => {
    const matrix = Array.from({ length: 3 }, () => Array(3).fill(0));
    const nodeArr = Array.isArray(nodes)
      ? nodes
      : Object.values(nodes);

    nodeArr.forEach(node => {
      const [row, col] = nodeToZone(node);
      matrix[row][col]++;
    });
    return matrix;
  }, [nodes]);

  // Summary counts
  const summary = useMemo(() => {
    const nodeArr = Array.isArray(nodes) ? nodes : Object.values(nodes);
    return {
      critical: nodeArr.filter(n => n.status === 'DISRUPTED').length,
      warning: nodeArr.filter(n => n.status === 'DELAYED').length,
      nominal: nodeArr.filter(n => n.status === 'NORMAL').length,
    };
  }, [nodes]);

  const rowLabels = ['HIGH', 'MED', 'LOW'];
  const colLabels = ['LOW', 'MEDIUM', 'HIGH'];

  return (
    <div className="risk-matrix">
      <div className="risk-matrix__title">
        <div className="risk-matrix__title-dot" />
        Risk Matrix
      </div>

      <div className="risk-matrix__grid-wrapper">
        {/* Y-axis labels */}
        <div className="risk-matrix__y-label">
          {rowLabels.map(l => <span key={l}>{l}</span>)}
        </div>

        <div className="risk-matrix__inner">
          {/* 3×3 grid */}
          {grid.map((row, rowIdx) => (
            <div key={rowIdx} className="risk-matrix__row">
              {row.map((count, colIdx) => {
                const colorClass = CELL_COLORS[rowIdx][colIdx];
                return (
                  <div
                    key={colIdx}
                    className={`risk-matrix__cell risk-matrix__cell--${count === 0 ? 'empty' : colorClass}`}
                    title={`Impact: ${rowLabels[rowIdx]}, Probability: ${colLabels[colIdx]}, Nodes: ${count}`}
                    role="button"
                    tabIndex={0}
                    aria-label={`${count} nodes at ${rowLabels[rowIdx]} impact, ${colLabels[colIdx]} probability`}
                  >
                    <span className="risk-matrix__cell-count">
                      {count === 0 ? '—' : count}
                    </span>
                    {count > 0 && (
                      <span className="risk-matrix__cell-label">
                        {CELL_LABELS[rowIdx][colIdx]}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}

          {/* X-axis labels */}
          <div className="risk-matrix__x-labels">
            {colLabels.map(l => <span key={l}>{l}</span>)}
          </div>
          <div className="risk-matrix__axis-title">← Probability →</div>
        </div>
      </div>

      {/* Summary bar */}
      <div className="risk-matrix__summary">
        <div className="risk-matrix__summary-item">
          <span className="risk-matrix__summary-count" style={{ color: 'var(--color-danger)' }}>
            {summary.critical}
          </span>
          <span className="risk-matrix__summary-label">Critical</span>
        </div>
        <div className="risk-matrix__summary-item">
          <span className="risk-matrix__summary-count" style={{ color: 'var(--color-warning)' }}>
            {summary.warning}
          </span>
          <span className="risk-matrix__summary-label">Warning</span>
        </div>
        <div className="risk-matrix__summary-item">
          <span className="risk-matrix__summary-count" style={{ color: 'var(--color-success)' }}>
            {summary.nominal}
          </span>
          <span className="risk-matrix__summary-label">Nominal</span>
        </div>
      </div>
    </div>
  );
}
