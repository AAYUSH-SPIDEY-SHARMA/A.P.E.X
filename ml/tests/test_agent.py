"""
A.P.E.X — FastAPI Agent Integration Tests

Tests the routing_agent.py FastAPI endpoints using TestClient.
Covers all 8 endpoints with realistic request payloads
matching the Firebase contract.
"""

import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

# Ensure project root is importable
_project_root = Path(__file__).resolve().parent.parent.parent
if str(_project_root) not in sys.path:
    sys.path.insert(0, str(_project_root))

from ml.deployment.routing_agent import app


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(scope="module")
def client():
    """Create a FastAPI TestClient (triggers lifespan startup/shutdown)."""
    with TestClient(app) as c:
        yield c


# ---------------------------------------------------------------------------
# Health Check Tests
# ---------------------------------------------------------------------------

class TestHealthEndpoint:
    """Tests for GET /health."""

    def test_health_returns_200(self, client: TestClient):
        """Health check should always return 200."""
        resp = client.get("/health")
        assert resp.status_code == 200

    def test_health_reports_models(self, client: TestClient):
        """Health response should include model load status."""
        data = client.get("/health").json()
        assert "models" in data
        assert "xgboost" in data["models"]
        assert "random_forest" in data["models"]

    def test_health_reports_graph(self, client: TestClient):
        """Health response should report graph node/edge count."""
        data = client.get("/health").json()
        assert data["graph_nodes"] == 15
        assert data["graph_edges"] == 21


# ---------------------------------------------------------------------------
# Inject Anomaly Tests
# ---------------------------------------------------------------------------

class TestInjectAnomaly:
    """Tests for POST /inject-anomaly."""

    def test_inject_monsoon(self, client: TestClient):
        """Should successfully inject a MONSOON anomaly."""
        resp = client.post("/inject-anomaly", json={
            "type": "MONSOON",
            "lat": 19.07,
            "lng": 72.88,
            "severity": 0.95,
            "affectedHighway": "NH-48",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "injected"
        assert data["type"] == "MONSOON"
        assert "anomaly_id" in data

    def test_inject_high_severity_triggers_reroute(self, client: TestClient):
        """Severity > 0.7 should auto-trigger A* rerouting."""
        resp = client.post("/inject-anomaly", json={
            "type": "MONSOON",
            "lat": 28.42,
            "lng": 77.05,
            "severity": 0.95,
        })
        data = resp.json()
        assert data["rerouted"] > 0, "High-severity should trigger rerouting"
        assert data["reroute_path"] is not None
        assert data["alert_id"] is not None

    def test_inject_low_severity_no_reroute(self, client: TestClient):
        """Severity <= 0.7 should NOT trigger auto-rerouting."""
        resp = client.post("/inject-anomaly", json={
            "type": "ACCIDENT",
            "lat": 26.9,
            "lng": 75.8,
            "severity": 0.3,
        })
        data = resp.json()
        assert data["rerouted"] == 0

    def test_inject_invalid_type_returns_422(self, client: TestClient):
        """Invalid anomaly type should return 422 validation error."""
        resp = client.post("/inject-anomaly", json={
            "type": "EARTHQUAKE",  # Not in valid types
            "lat": 28.0,
            "lng": 77.0,
            "severity": 0.5,
        })
        assert resp.status_code == 422

    def test_inject_all_valid_types(self, client: TestClient):
        """All 5 valid anomaly types should work."""
        for atype in ["MONSOON", "FLOOD", "ACCIDENT", "RTO_GRIDLOCK", "ICEGATE_FAILURE"]:
            resp = client.post("/inject-anomaly", json={
                "type": atype,
                "lat": 28.0,
                "lng": 77.0,
                "severity": 0.5,
            })
            assert resp.status_code == 200, f"Type '{atype}' failed"


# ---------------------------------------------------------------------------
# Predict Delay Tests
# ---------------------------------------------------------------------------

class TestPredictDelay:
    """Tests for POST /predict-delay."""

    def test_predict_disruption(self, client: TestClient):
        """High-risk scenario should predict disruption."""
        resp = client.post("/predict-delay", json={
            "queue_length": 120,
            "queue_growth": 15.0,
            "processingRate": 5.0,
            "utilization": 0.97,
            "prev_utilization": 0.92,
            "downstream_congestion_flag": 1,
            "weather_severity": 0.95,
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "is_disrupted" in data
        assert "delay_probability" in data
        assert 0.0 <= data["delay_probability"] <= 1.0

    def test_predict_normal(self, client: TestClient):
        """Low-risk scenario should predict no disruption."""
        resp = client.post("/predict-delay", json={
            "queue_length": 3,
            "queue_growth": 0.0,
            "processingRate": 12.0,
            "utilization": 0.2,
            "prev_utilization": 0.18,
            "downstream_congestion_flag": 0,
            "weather_severity": 0.05,
        })
        data = resp.json()
        assert data["is_disrupted"] is False

    def test_predict_with_minimal_fields(self, client: TestClient):
        """Should work with only some fields (rest get defaults)."""
        resp = client.post("/predict-delay", json={
            "utilization": 0.5,
            "weather_severity": 0.3,
        })
        assert resp.status_code == 200


# ---------------------------------------------------------------------------
# Predict Risk Tests
# ---------------------------------------------------------------------------

class TestPredictRisk:
    """Tests for POST /predict-risk."""

    def test_predict_risk_high(self, client: TestClient):
        """High-risk scenario should return high risk score."""
        resp = client.post("/predict-risk", json={
            "utilization": 0.95,
            "weather_severity": 0.9,
            "queue_length": 100,
            "downstream_congestion_flag": 1,
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["risk_score"] > 0.5

    def test_predict_risk_low(self, client: TestClient):
        """Low-risk scenario should return low risk score."""
        resp = client.post("/predict-risk", json={
            "utilization": 0.15,
            "weather_severity": 0.02,
        })
        data = resp.json()
        assert data["risk_score"] < 0.5


# ---------------------------------------------------------------------------
# Reroute Tests
# ---------------------------------------------------------------------------

class TestReroute:
    """Tests for POST /trigger-autonomous-reroute."""

    def test_reroute_avoids_disrupted(self, client: TestClient):
        """Rerouted path should not contain disrupted nodes."""
        resp = client.post("/trigger-autonomous-reroute", json={
            "disrupted_nodes": ["NH48_KHERKI_DAULA", "NH48_SHAHJAHANPUR"],
            "origin": "WH-DEL-001",
            "destination": "WH-MUM-003",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "NH48_KHERKI_DAULA" not in data["path"]
        assert "NH48_SHAHJAHANPUR" not in data["path"]
        assert data["total_distance_km"] > 0
        assert data["cost_saved_inr"] > 0

    def test_reroute_response_structure(self, client: TestClient):
        """Response should have all required fields."""
        resp = client.post("/trigger-autonomous-reroute", json={
            "disrupted_nodes": ["NH48_KHERKI_DAULA"],
        })
        data = resp.json()
        assert "path" in data
        assert "path_description" in data
        assert "total_distance_km" in data
        assert "total_toll_cost_inr" in data
        assert "alert_id" in data


# ---------------------------------------------------------------------------
# Batch Predict Tests
# ---------------------------------------------------------------------------

class TestBatchPredict:
    """Tests for POST /batch-predict."""

    def test_batch_returns_correct_count(self, client: TestClient):
        """Should return one result per input node."""
        resp = client.post("/batch-predict", json={
            "nodes": [
                {"utilization": 0.3, "weather_severity": 0.1},
                {"utilization": 0.9, "weather_severity": 0.8},
            ],
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["total_nodes"] == 2


# ---------------------------------------------------------------------------
# Demo Dual-Shock Tests
# ---------------------------------------------------------------------------

class TestDemoEndpoint:
    """Tests for POST /demo/dual-shock."""

    def test_dual_shock_returns_two_results(self, client: TestClient):
        """Should inject two shocks and return results for both."""
        resp = client.post("/demo/dual-shock")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "dual_shock_complete"
        assert len(data["shocks"]) == 2


# ---------------------------------------------------------------------------
# Metrics Tests
# ---------------------------------------------------------------------------

class TestMetrics:
    """Tests for GET /metrics."""

    def test_metrics_returns_200(self, client: TestClient):
        """Metrics endpoint should return 200."""
        resp = client.get("/metrics")
        assert resp.status_code == 200
        data = resp.json()
        assert "total_predictions" in data
        assert "total_reroutes" in data
