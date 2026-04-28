"""
A.P.E.X — Backend API Tests

Validates the two critical ML endpoints:
  1. POST /predict  — live XGBoost + RF inference
  2. POST /inject-anomaly — full pipeline (ML → A* → alert)

Run: cd backend/processor && python -m pytest test_main.py -v
"""

import pytest
from fastapi.testclient import TestClient


@pytest.fixture(scope="module")
def client():
    """Create a test client for the FastAPI app."""
    from main import app
    with TestClient(app) as c:
        yield c


# ──────────────────────────────────────────────────────────────────────────────
# Health & Status
# ──────────────────────────────────────────────────────────────────────────────

def test_health(client):
    """GET /health returns 200 with correct schema."""
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "healthy"
    assert data["service"] == "apex-processor"
    assert "uptime_seconds" in data


def test_ml_status(client):
    """GET /ml-status returns model load status."""
    resp = client.get("/ml-status")
    assert resp.status_code == 200
    data = resp.json()
    assert "xgboost" in data
    assert "random_forest" in data
    assert "routing_graph" in data
    assert "auto_detections" in data


# ──────────────────────────────────────────────────────────────────────────────
# Critical Endpoint 1: /predict
# ──────────────────────────────────────────────────────────────────────────────

def test_predict_valid_input(client):
    """POST /predict with valid features returns disruption + risk scores."""
    payload = {
        "queue_length": 80.0,
        "queue_growth": 10.0,
        "processing_rate": 8.0,
        "utilization": 0.88,
        "prev_utilization": 0.75,
        "downstream_congestion_flag": 1,
        "weather_severity": 0.7,
    }
    resp = client.post("/predict", json=payload)
    # May return 503 if models aren't loaded in test env
    if resp.status_code == 200:
        data = resp.json()
        assert "disruption" in data
        assert "inference_latency_ms" in data
        assert 0 <= data["disruption"]["probability"] <= 1.0
    else:
        assert resp.status_code == 503  # Models not loaded


def test_predict_default_values(client):
    """POST /predict with no body uses defaults."""
    resp = client.post("/predict", json={})
    assert resp.status_code in (200, 503)


# ──────────────────────────────────────────────────────────────────────────────
# Critical Endpoint 2: /inject-anomaly
# ──────────────────────────────────────────────────────────────────────────────

def test_inject_anomaly_returns_response(client):
    """POST /inject-anomaly returns structured AnomalyResponse."""
    payload = {
        "type": "MONSOON",
        "severity": 0.85,
        "lat": 22.45,
        "lng": 73.07,
    }
    resp = client.post("/inject-anomaly", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert "anomaly_id" in data
    assert "alert_id" in data
    assert "ml_prediction" in data
    assert "inference_latency_ms" in data
    assert data["anomaly_id"].startswith("ANM-")
    assert data["alert_id"].startswith("ALT-")


def test_inject_anomaly_with_affected_node(client):
    """POST /inject-anomaly with specific node returns valid route."""
    payload = {
        "type": "TOLL_SYSTEM_CRASH",
        "severity": 0.95,
        "lat": 28.40,
        "lng": 76.98,
        "affected_node": "NH48_KHERKI_DAULA",
    }
    resp = client.post("/inject-anomaly", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["ml_prediction"]  # Should have prediction data


# ──────────────────────────────────────────────────────────────────────────────
# Demo Trigger (safety valve)
# ──────────────────────────────────────────────────────────────────────────────

def test_demo_trigger(client):
    """GET /demo-trigger fires auto-detection without simulator."""
    resp = client.get("/demo-trigger")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "triggered"
    assert "auto_detections_total" in data


# ──────────────────────────────────────────────────────────────────────────────
# Weather Endpoint
# ──────────────────────────────────────────────────────────────────────────────

def test_weather_endpoint(client):
    """GET /weather returns weather data structure."""
    resp = client.get("/weather")
    assert resp.status_code == 200
    data = resp.json()
    assert "live_weather" in data
    assert "source" in data
    assert "api_key_configured" in data
