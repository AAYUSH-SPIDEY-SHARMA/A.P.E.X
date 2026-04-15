"""
A.P.E.X — ML Model Predictor Tests

Tests the ModelRegistry class for:
    - Model loading from .pkl files
    - Feature alignment and column mapping
    - Disruption prediction (XGBoost)
    - Risk score prediction (Random Forest)
    - Batch prediction
    - Graceful fallback when models are missing
"""

import sys
from pathlib import Path

import pytest

# Ensure project root is importable
_project_root = Path(__file__).resolve().parent.parent.parent
if str(_project_root) not in sys.path:
    sys.path.insert(0, str(_project_root))

from ml.models.predictor import (
    ModelRegistry,
    DisruptionPrediction,
    RiskPrediction,
    XGBOOST_FEATURES,
    RF_FEATURES,
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(scope="module")
def registry():
    """Load models once for the entire module (expensive I/O)."""
    model_dir = Path(__file__).resolve().parent.parent / "models"
    return ModelRegistry(model_dir=str(model_dir))


# ---------------------------------------------------------------------------
# Model Loading Tests
# ---------------------------------------------------------------------------

class TestModelLoading:
    """Tests for model artifact loading."""

    def test_xgboost_loads_successfully(self, registry: ModelRegistry):
        """XGBoost model .pkl should exist and load without errors."""
        assert registry.xgboost_loaded, (
            "XGBoost model failed to load. "
            "Ensure xgboost_model.pkl exists in ml/models/"
        )

    def test_rf_model_loads_successfully(self, registry: ModelRegistry):
        """Random Forest model .pkl should exist and load without errors."""
        assert registry.rf_loaded, (
            "Random Forest model failed to load. "
            "Ensure rf_risk_model.pkl exists in ml/models/"
        )

    def test_status_reports_both_loaded(self, registry: ModelRegistry):
        """Status dict should report both models as loaded."""
        status = registry.status
        assert status["xgboost"] == "loaded"
        assert status["random_forest"] == "loaded"

    def test_graceful_fallback_missing_dir(self):
        """Registry should handle missing model directory gracefully."""
        reg = ModelRegistry(model_dir="/nonexistent/path")
        assert not reg.xgboost_loaded
        assert not reg.rf_loaded


# ---------------------------------------------------------------------------
# Feature Schema Tests
# ---------------------------------------------------------------------------

class TestFeatureSchema:
    """Tests for feature column alignment."""

    def test_xgboost_feature_count(self):
        """XGBoost should use exactly 9 features (matching training data)."""
        assert len(XGBOOST_FEATURES) == 9

    def test_required_features_present(self):
        """Critical features must be in the feature list."""
        required = {"queue_length", "utilization", "weather_severity", "processingRate"}
        for feat in required:
            assert feat in XGBOOST_FEATURES, f"Missing critical feature: {feat}"

    def test_rf_features_match_xgboost(self):
        """RF and XGBoost should use the same feature set."""
        assert RF_FEATURES == XGBOOST_FEATURES


# ---------------------------------------------------------------------------
# Disruption Prediction Tests
# ---------------------------------------------------------------------------

class TestDisruptionPrediction:
    """Tests for XGBoost disruption classifier."""

    def test_high_severity_predicts_disruption(self, registry: ModelRegistry):
        """
        High utilization + severe weather should predict disruption.
        This is the core test — if this fails, the model is broken.
        """
        pred = registry.predict_disruption(
            queue_length=120.0,
            queue_growth=15.0,
            processing_rate=5.0,
            utilization=0.97,
            prev_utilization=0.92,
            downstream_congestion_flag=1,
            weather_severity=0.95,
        )
        assert isinstance(pred, DisruptionPrediction)
        assert pred.probability > 0.5, (
            f"High-severity scenario should predict disruption, "
            f"but got probability={pred.probability}"
        )
        assert pred.is_disrupted is True

    def test_normal_conditions_predict_no_disruption(self, registry: ModelRegistry):
        """Low utilization + clear weather should predict normal operation."""
        pred = registry.predict_disruption(
            queue_length=5.0,
            queue_growth=0.0,
            processing_rate=12.0,
            utilization=0.25,
            prev_utilization=0.22,
            downstream_congestion_flag=0,
            weather_severity=0.05,
        )
        assert isinstance(pred, DisruptionPrediction)
        assert pred.probability < 0.5, (
            f"Normal conditions should NOT predict disruption, "
            f"but got probability={pred.probability}"
        )
        assert pred.is_disrupted is False

    def test_prediction_returns_all_fields(self, registry: ModelRegistry):
        """Prediction result should contain all expected fields."""
        pred = registry.predict_disruption(utilization=0.5, weather_severity=0.3)
        assert hasattr(pred, "is_disrupted")
        assert hasattr(pred, "probability")
        assert hasattr(pred, "confidence")
        assert hasattr(pred, "threshold")
        assert hasattr(pred, "severity_label")

    def test_probability_in_valid_range(self, registry: ModelRegistry):
        """Probability must be between 0.0 and 1.0."""
        pred = registry.predict_disruption(utilization=0.7, weather_severity=0.5)
        assert 0.0 <= pred.probability <= 1.0

    def test_confidence_in_valid_range(self, registry: ModelRegistry):
        """Confidence must be between 0.0 and 1.0."""
        pred = registry.predict_disruption(utilization=0.7, weather_severity=0.5)
        assert 0.0 <= pred.confidence <= 1.0

    def test_severity_label_valid(self, registry: ModelRegistry):
        """Severity label must be one of the defined categories."""
        valid_labels = {"NORMAL", "LOW", "MODERATE", "HIGH", "CRITICAL"}
        pred = registry.predict_disruption(utilization=0.95, weather_severity=0.9)
        assert pred.severity_label in valid_labels

    def test_default_features_dont_crash(self, registry: ModelRegistry):
        """Calling with minimal features (others defaulted) should work."""
        pred = registry.predict_disruption()
        assert isinstance(pred, DisruptionPrediction)


# ---------------------------------------------------------------------------
# Risk Score Prediction Tests
# ---------------------------------------------------------------------------

class TestRiskPrediction:
    """Tests for Random Forest risk scorer."""

    def test_high_risk_scenario(self, registry: ModelRegistry):
        """High utilization + weather should produce high risk score."""
        pred = registry.predict_risk_score(
            utilization=0.95,
            weather_severity=0.9,
            queue_length=100.0,
            downstream_congestion_flag=1,
        )
        assert isinstance(pred, RiskPrediction)
        assert pred.risk_score > 0.5, (
            f"High-risk scenario should produce score > 0.5, got {pred.risk_score}"
        )

    def test_low_risk_scenario(self, registry: ModelRegistry):
        """Normal conditions should produce low risk score."""
        pred = registry.predict_risk_score(
            utilization=0.2,
            weather_severity=0.05,
            queue_length=3.0,
            downstream_congestion_flag=0,
        )
        assert pred.risk_score < 0.5

    def test_risk_clamped_to_unit_interval(self, registry: ModelRegistry):
        """Risk score must be between 0.0 and 1.0."""
        pred = registry.predict_risk_score(utilization=0.99, weather_severity=1.0)
        assert 0.0 <= pred.risk_score <= 1.0

    def test_risk_level_valid(self, registry: ModelRegistry):
        """Risk level must be one of the defined categories."""
        valid_levels = {"MINIMAL", "LOW", "MODERATE", "HIGH", "CRITICAL"}
        pred = registry.predict_risk_score(utilization=0.8, weather_severity=0.7)
        assert pred.risk_level in valid_levels


# ---------------------------------------------------------------------------
# Batch Prediction Tests
# ---------------------------------------------------------------------------

class TestBatchPrediction:
    """Tests for batch prediction API."""

    def test_batch_returns_correct_count(self, registry: ModelRegistry):
        """Batch should return one result per input node."""
        nodes = [
            {"utilization": 0.3, "weather_severity": 0.1},
            {"utilization": 0.8, "weather_severity": 0.7},
            {"utilization": 0.95, "weather_severity": 0.95},
        ]
        results = registry.predict_batch(nodes)
        assert len(results) == 3

    def test_batch_high_severity_detected(self, registry: ModelRegistry):
        """At least the high-severity node should be marked as disrupted."""
        nodes = [
            {"utilization": 0.1, "weather_severity": 0.0},
            {
                "utilization": 0.98,
                "weather_severity": 0.95,
                "queue_length": 130.0,
                "downstream_congestion_flag": 1,
            },
        ]
        results = registry.predict_batch(nodes)
        assert results[1].get("is_disrupted") is True
