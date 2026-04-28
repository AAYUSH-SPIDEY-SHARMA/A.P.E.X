"""
A.P.E.X — Trend Prediction Tests

Tests for the linear regression-based utilization trend forecasting.

Run: python -m pytest tests/test_trend_prediction.py -v
"""
import time
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))
sys.path.insert(0, str(Path(__file__).parent.parent / "backend" / "processor"))


class TestPredictUtilizationTrend:
    """Verify trend prediction with known data."""

    def _get_predict_fn(self):
        """Import the prediction function and its globals."""
        from collections import deque
        import backend.processor.main as main_module
        return main_module.predict_utilization_trend, main_module

    def test_insufficient_data_returns_none(self):
        """With < 3 samples, predicted_util should be None."""
        predict_fn, mod = self._get_predict_fn()
        mod._util_history["TEST_NODE"] = [(time.time(), 0.5), (time.time() + 1, 0.6)]
        result = predict_fn("TEST_NODE")
        assert result["predicted_util"] is None

    def test_increasing_trend_predicts_higher(self):
        """An increasing utilization series should predict higher future value."""
        from collections import deque
        predict_fn, mod = self._get_predict_fn()
        now = time.time()
        # Simulate utilization increasing from 0.5 to 0.8 over 5 samples
        mod._util_history["TEST_INC"] = deque([
            (now, 0.50),
            (now + 30, 0.56),
            (now + 60, 0.62),
            (now + 90, 0.68),
            (now + 120, 0.74),
        ], maxlen=10)
        result = predict_fn("TEST_INC")
        assert result["predicted_util"] is not None
        assert result["predicted_util"] > 0.74  # Should predict higher
        assert result["trend_slope"] > 0  # Positive slope

    def test_decreasing_trend_no_threshold_warning(self):
        """A decreasing utilization series should NOT forecast threshold crossing."""
        from collections import deque
        predict_fn, mod = self._get_predict_fn()
        now = time.time()
        mod._util_history["TEST_DEC"] = deque([
            (now, 0.80),
            (now + 30, 0.75),
            (now + 60, 0.70),
            (now + 90, 0.65),
            (now + 120, 0.60),
        ], maxlen=10)
        result = predict_fn("TEST_DEC")
        assert result["predicted_util"] is not None
        assert result["predicted_util"] < 0.60  # Should predict lower
        assert result["time_to_threshold_sec"] is None  # No threshold crossing

    def test_stable_trend_near_zero_slope(self):
        """Stable utilization should have near-zero slope."""
        from collections import deque
        predict_fn, mod = self._get_predict_fn()
        now = time.time()
        mod._util_history["TEST_FLAT"] = deque([
            (now, 0.50),
            (now + 30, 0.51),
            (now + 60, 0.49),
            (now + 90, 0.50),
            (now + 120, 0.51),
        ], maxlen=10)
        result = predict_fn("TEST_FLAT")
        assert abs(result["trend_slope"]) < 0.1  # Near-zero slope

    def test_time_to_threshold_calculated(self):
        """When increasing toward 0.85, time_to_threshold should be positive."""
        from collections import deque
        predict_fn, mod = self._get_predict_fn()
        now = time.time()
        mod._util_history["TEST_TTT"] = deque([
            (now, 0.70),
            (now + 30, 0.73),
            (now + 60, 0.76),
            (now + 90, 0.79),
            (now + 120, 0.82),
        ], maxlen=10)
        result = predict_fn("TEST_TTT")
        assert result["time_to_threshold_sec"] is not None
        assert result["time_to_threshold_sec"] > 0

    def test_unknown_node_returns_defaults(self):
        """Unknown node should return safe defaults."""
        predict_fn, mod = self._get_predict_fn()
        result = predict_fn("NONEXISTENT_NODE_XYZ")
        assert result["predicted_util"] is None
        assert result["time_to_threshold_sec"] is None
        assert result["trend_slope"] == 0
