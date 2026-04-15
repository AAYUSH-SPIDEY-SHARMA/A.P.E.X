"""
A.P.E.X — ML Model Registry & Inference Engine

Provides a thread-safe model registry that loads both trained models
at initialization and exposes prediction methods with feature validation.

Models:
    1. XGBoost Binary Classifier — predicts disruption probability (is_disrupted)
       Trained in: ml/models/xgboost_training.py
       Input features: queue_length, queue_growth, processingRate, utilization,
                       prev_utilization, downstream_congestion_flag,
                       weather_severity, hour_sin, hour_cos

    2. Random Forest Regressor — predicts continuous risk score (0.0–1.0)
       Trained in: ml/models/train_rf_risk.py
       Input features: same as XGBoost (minus queue_growth for RF)

Feature column names are locked to the training schema. The predictor
normalizes API-facing names (snake_case) to the model's expected names.

Blueprint References:
    - S11.1: XGBClassifier for delay classification
    - S7.10: Risk score formula (utilization * 0.6 + weather * 0.4)
"""

import logging
import math
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

import joblib
import numpy as np

logger = logging.getLogger("apex.models.predictor")

# ---------------------------------------------------------------------------
# Feature Schema
# ---------------------------------------------------------------------------
# These MUST match the columns used during training.
# Verified from: ml/data/train.csv headers
#   ['node_id', 'queue_length', 'queue_growth', 'processingRate',
#    'utilization', 'prev_utilization', 'downstream_congestion_flag',
#    'weather_severity', 'hour_sin', 'hour_cos', 'is_disrupted']
# ---------------------------------------------------------------------------

# Features the XGBoost model was trained on (drop_cols = ["node_id", "is_disrupted"])
XGBOOST_FEATURES: list[str] = [
    "queue_length",
    "queue_growth",
    "processingRate",
    "utilization",
    "prev_utilization",
    "downstream_congestion_flag",
    "weather_severity",
    "hour_sin",
    "hour_cos",
]

# Features the Random Forest model was trained on (same drop_cols)
RF_FEATURES: list[str] = [
    "queue_length",
    "queue_growth",
    "processingRate",
    "utilization",
    "prev_utilization",
    "downstream_congestion_flag",
    "weather_severity",
    "hour_sin",
    "hour_cos",
]

# Mapping from API-facing names (snake_case) → training column names
# This allows the FastAPI endpoint to accept clean API names while
# the model receives the exact column names it was trained with.
API_TO_TRAINING_COLUMN: dict[str, str] = {
    "queue_length": "queue_length",
    "queue_growth": "queue_growth",
    "processing_rate": "processingRate",       # API uses snake_case
    "processingRate": "processingRate",         # Also accept original
    "utilization": "utilization",
    "prev_utilization": "prev_utilization",
    "downstream_congestion_flag": "downstream_congestion_flag",
    "weather_severity": "weather_severity",
    "hour_sin": "hour_sin",
    "hour_cos": "hour_cos",
}


# ---------------------------------------------------------------------------
# Prediction Result Types
# ---------------------------------------------------------------------------

@dataclass
class DisruptionPrediction:
    """Result from XGBoost disruption classifier."""
    is_disrupted: bool
    probability: float          # P(disrupted) — 0.0 to 1.0
    confidence: float           # |P - 0.5| * 2 — how confident the model is
    threshold: float = 0.5      # Decision boundary

    @property
    def severity_label(self) -> str:
        """Human-readable severity based on probability bands."""
        if self.probability >= 0.9:
            return "CRITICAL"
        elif self.probability >= 0.7:
            return "HIGH"
        elif self.probability >= 0.5:
            return "MODERATE"
        elif self.probability >= 0.3:
            return "LOW"
        return "NORMAL"


@dataclass
class RiskPrediction:
    """Result from Random Forest risk scorer."""
    risk_score: float           # 0.0 (safe) to 1.0 (critical)

    @property
    def risk_level(self) -> str:
        """Human-readable risk level."""
        if self.risk_score >= 0.8:
            return "CRITICAL"
        elif self.risk_score >= 0.6:
            return "HIGH"
        elif self.risk_score >= 0.4:
            return "MODERATE"
        elif self.risk_score >= 0.2:
            return "LOW"
        return "MINIMAL"


# ---------------------------------------------------------------------------
# Model Registry
# ---------------------------------------------------------------------------

class ModelRegistry:
    """
    Thread-safe model registry for A.P.E.X ML models.

    Loads XGBoost and Random Forest models from disk at initialization.
    Provides validated prediction methods with feature alignment.

    Usage:
        >>> registry = ModelRegistry(model_dir="ml/models")
        >>> result = registry.predict_disruption(
        ...     queue_length=85, utilization=0.92, weather_severity=0.8,
        ...     processing_rate=8.5, queue_growth=5.0, prev_utilization=0.85,
        ...     downstream_congestion_flag=1
        ... )
        >>> print(result.probability, result.is_disrupted)
        0.94 True
    """

    def __init__(self, model_dir: Optional[str] = None):
        """
        Initialize registry and load models from disk.

        Args:
            model_dir: Path to directory containing .pkl files.
                       Defaults to ml/models/ relative to this file.
        """
        if model_dir is None:
            self._model_dir = Path(__file__).resolve().parent
        else:
            self._model_dir = Path(model_dir)

        self._xgboost_model = None
        self._rf_model = None

        self._load_models()

    def _load_models(self) -> None:
        """Load both model artifacts from disk with graceful fallback."""
        # --- XGBoost Classifier ---
        xgb_path = self._model_dir / "xgboost_model.pkl"
        if xgb_path.exists():
            try:
                self._xgboost_model = joblib.load(xgb_path)
                logger.info(f"✅ XGBoost model loaded from {xgb_path}")
            except Exception as e:
                logger.error(f"❌ Failed to load XGBoost model: {e}")
        else:
            logger.warning(f"⚠️ XGBoost model not found at {xgb_path}")

        # --- Random Forest Risk Scorer ---
        rf_path = self._model_dir / "rf_risk_model.pkl"
        if rf_path.exists():
            try:
                self._rf_model = joblib.load(rf_path)
                logger.info(f"✅ Random Forest model loaded from {rf_path}")
            except Exception as e:
                logger.error(f"❌ Failed to load RF model: {e}")
        else:
            logger.warning(f"⚠️ RF risk model not found at {rf_path}")

    @property
    def xgboost_loaded(self) -> bool:
        return self._xgboost_model is not None

    @property
    def rf_loaded(self) -> bool:
        return self._rf_model is not None

    @property
    def status(self) -> dict:
        """Returns load status of all models — used by /health endpoint."""
        return {
            "xgboost": "loaded" if self.xgboost_loaded else "not_loaded",
            "random_forest": "loaded" if self.rf_loaded else "not_loaded",
        }

    # -----------------------------------------------------------------
    # Feature Preparation
    # -----------------------------------------------------------------

    @staticmethod
    def _compute_time_features() -> tuple[float, float]:
        """
        Compute cyclical hour features (sin/cos) from current time.
        Used as defaults when caller doesn't specify time features.
        """
        import datetime
        hour = datetime.datetime.now().hour
        hour_sin = round(math.sin(2 * math.pi * hour / 24), 4)
        hour_cos = round(math.cos(2 * math.pi * hour / 24), 4)
        return hour_sin, hour_cos

    def _build_feature_vector(
        self,
        feature_names: list[str],
        **kwargs,
    ) -> np.ndarray:
        """
        Build a 2D feature array matching the model's expected column order.

        Accepts both API-naming (snake_case) and training-naming (camelCase).
        Missing features get sensible defaults rather than crashing.

        Args:
            feature_names: Ordered list of column names the model expects.
            **kwargs:      Feature values keyed by either API or training name.

        Returns:
            np.ndarray with shape (1, n_features).
        """
        # Normalize kwargs: map API names → training column names
        normalized = {}
        for key, value in kwargs.items():
            training_name = API_TO_TRAINING_COLUMN.get(key, key)
            normalized[training_name] = value

        # Compute defaults for time features if not provided
        default_hour_sin, default_hour_cos = self._compute_time_features()

        # Default values for features typically coming from real-time streams
        defaults = {
            "queue_length": 0.0,
            "queue_growth": 0.0,
            "processingRate": 10.0,
            "utilization": 0.5,
            "prev_utilization": 0.5,
            "downstream_congestion_flag": 0,
            "weather_severity": 0.0,
            "hour_sin": default_hour_sin,
            "hour_cos": default_hour_cos,
        }

        # Build feature vector in the exact column order
        features = []
        for col in feature_names:
            if col in normalized:
                features.append(float(normalized[col]))
            elif col in defaults:
                features.append(float(defaults[col]))
            else:
                logger.warning(f"Feature '{col}' missing and no default — using 0.0")
                features.append(0.0)

        return np.array([features])

    # -----------------------------------------------------------------
    # Prediction Methods
    # -----------------------------------------------------------------

    def predict_disruption(self, **kwargs) -> DisruptionPrediction:
        """
        Predict disruption probability for a single node.

        Args:
            queue_length:               Current truck queue (0-200)
            queue_growth:               Queue delta from last window
            processing_rate:            Node throughput (trucks/min)
            utilization:                Current ρ = λ/μ (0.0-1.0)
            prev_utilization:           Previous window utilization
            downstream_congestion_flag: 1 if downstream node ρ > 0.9
            weather_severity:           IMD weather index (0.0-1.0)
            hour_sin:                   sin(2π·hour/24) [auto-computed if omitted]
            hour_cos:                   cos(2π·hour/24) [auto-computed if omitted]

        Returns:
            DisruptionPrediction with probability, binary label, and confidence.

        Raises:
            RuntimeError: if XGBoost model is not loaded.
        """
        if not self.xgboost_loaded:
            raise RuntimeError(
                "XGBoost model not loaded. Ensure xgboost_model.pkl "
                "exists in the models directory."
            )

        X = self._build_feature_vector(XGBOOST_FEATURES, **kwargs)
        probability = float(self._xgboost_model.predict_proba(X)[0][1])
        is_disrupted = probability > 0.5

        return DisruptionPrediction(
            is_disrupted=is_disrupted,
            probability=round(probability, 4),
            confidence=round(abs(probability - 0.5) * 2, 4),
        )

    def predict_risk_score(self, **kwargs) -> RiskPrediction:
        """
        Predict continuous risk score for a single node.

        Args:
            Same as predict_disruption().

        Returns:
            RiskPrediction with score (0.0–1.0) and level label.

        Raises:
            RuntimeError: if Random Forest model is not loaded.
        """
        if not self.rf_loaded:
            raise RuntimeError(
                "Random Forest model not loaded. Ensure rf_risk_model.pkl "
                "exists in the models directory."
            )

        X = self._build_feature_vector(RF_FEATURES, **kwargs)
        risk_score = float(self._rf_model.predict(X)[0])

        # Clamp to [0.0, 1.0] — the model was trained on targets in this range
        risk_score = max(0.0, min(1.0, risk_score))

        return RiskPrediction(risk_score=round(risk_score, 4))

    def predict_batch(
        self,
        node_features_list: list[dict],
    ) -> list[dict]:
        """
        Batch prediction for multiple nodes (corridor sweep).

        Args:
            node_features_list: List of dicts, each with node features.

        Returns:
            List of prediction result dicts, one per input node.
        """
        results = []
        for features in node_features_list:
            try:
                disruption = self.predict_disruption(**features)
                risk = self.predict_risk_score(**features) if self.rf_loaded else None

                result = {
                    "is_disrupted": disruption.is_disrupted,
                    "disruption_probability": disruption.probability,
                    "severity_label": disruption.severity_label,
                    "confidence": disruption.confidence,
                }
                if risk:
                    result["risk_score"] = risk.risk_score
                    result["risk_level"] = risk.risk_level

                results.append(result)
            except Exception as e:
                logger.error(f"Batch prediction failed for node: {e}")
                results.append({"error": str(e)})

        return results
