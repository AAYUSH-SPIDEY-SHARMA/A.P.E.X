"""
A.P.E.X — ML Models Package

Provides model loading, inference, and feature alignment for the
XGBoost disruption classifier and Random Forest risk scorer.

Public API:
    - ModelRegistry           → loads both models at init, provides predict methods
    - predict_disruption()    → binary classification + probability
    - predict_risk_score()    → continuous risk score (0.0–1.0)
"""

from ml.models.predictor import ModelRegistry

__all__ = ["ModelRegistry"]
