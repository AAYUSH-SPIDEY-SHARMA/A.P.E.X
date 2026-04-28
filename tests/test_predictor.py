"""
A.P.E.X — ML Model Registry Tests

Tests for XGBoost / Random Forest model loading and prediction contracts.
These tests work even when .pkl model files are not present (graceful fallback).

Run: python -m pytest tests/test_predictor.py -v
"""
import pytest
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))


class TestModelRegistryImport:
    """Verify the ModelRegistry class can be imported and instantiated."""

    def test_import_model_registry(self):
        """ModelRegistry should be importable from ml.models.predictor."""
        from ml.models.predictor import ModelRegistry
        assert ModelRegistry is not None

    def test_instantiate_registry(self):
        """ModelRegistry() should not crash even without model files."""
        from ml.models.predictor import ModelRegistry
        registry = ModelRegistry()
        assert registry is not None

    def test_registry_has_required_methods(self):
        """ModelRegistry must expose predict_disruption and predict_risk."""
        from ml.models.predictor import ModelRegistry
        registry = ModelRegistry()
        assert hasattr(registry, 'predict_disruption')
        assert hasattr(registry, 'predict_risk_score')
        assert hasattr(registry, 'xgboost_loaded')
        assert hasattr(registry, 'rf_loaded')


class TestPredictionContract:
    """Verify prediction outputs match expected schema."""

    @pytest.fixture
    def registry(self):
        from ml.models.predictor import ModelRegistry
        return ModelRegistry()

    def test_predict_disruption_returns_result(self, registry):
        """predict_disruption should return a result object or None."""
        if not registry.xgboost_loaded:
            pytest.skip("XGBoost model not loaded (no .pkl file)")

        result = registry.predict_disruption(
            queue_length=80.0,
            queue_growth=10.0,
            processing_rate=8.0,
            utilization=0.88,
            prev_utilization=0.75,
            downstream_congestion_flag=1,
            weather_severity=0.7,
        )
        assert result is not None
        assert hasattr(result, 'probability')
        assert 0 <= result.probability <= 1.0

    def test_predict_risk_returns_score(self, registry):
        """predict_risk_score should return a numeric score or None."""
        if not registry.rf_loaded:
            pytest.skip("Random Forest model not loaded (no .pkl file)")

        result = registry.predict_risk_score(
            queue_length=80.0,
            queue_growth=10.0,
            processing_rate=8.0,
            utilization=0.88,
            prev_utilization=0.75,
            downstream_congestion_flag=1,
            weather_severity=0.7,
        )
        assert result is not None
        assert hasattr(result, 'risk_score')
        assert isinstance(result.risk_score, (int, float))
