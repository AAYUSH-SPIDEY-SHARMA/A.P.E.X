"""
A.P.E.X — ML Agent Cloud Run Service

FastAPI application serving as the intelligence core of the A.P.E.X
Automated Predictive Expressway Routing system.

Architecture:
    ┌─────────────────────┐     ┌──────────────┐     ┌──────────────────┐
    │ Frontend (Rakshak)  │────▶│  ML Agent    │────▶│  Firebase RTDB   │
    │ React + deck.gl     │     │  (this file) │     │  (real-time DB)  │
    └─────────────────────┘     └──────┬───────┘     └──────────────────┘
                                       │
                           ┌───────────┼───────────┐
                           │           │           │
                      ┌────▼────┐ ┌────▼────┐ ┌────▼────┐
                      │ XGBoost │ │ RF Risk │ │ A* Route│
                      │ Predict │ │ Scorer  │ │ Engine  │
                      └─────────┘ └─────────┘ └─────────┘

Endpoints:
    GET  /health                      — Cloud Run health probe
    POST /inject-anomaly              — Judge demo: inject disruption
    POST /predict-delay               — XGBoost disruption prediction
    POST /predict-risk                — RF risk score prediction
    POST /trigger-autonomous-reroute  — A* routing + Firebase writes
    POST /batch-predict               — Corridor sweep batch prediction
    POST /demo/dual-shock             — Pre-configured dual-shock demo
    GET  /metrics                     — Service metrics

Integration Points:
    - Frontend calls /inject-anomaly via VITE_ML_API_URL env var
    - Writes anomalies → supply_chain/anomalies/<id>  (Member 3 reads)
    - Writes alerts   → supply_chain/alerts/<id>      (Member 3 reads)
    - Updates routes  → supply_chain/active_routes/<id> (Member 3 reads)

Blueprint References:
    - S26.4: Cloud Run ML Agent specification
    - S11.1: XGBoost delay classification
    - S13.2: A* routing with custom heuristic
    - S10.5: Firebase RTDB contract

Local Dev:
    cd ml/deployment
    uvicorn routing_agent:app --port 8082 --reload
"""

import logging
import sys
import time
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

# ---------------------------------------------------------------------------
# Path Setup — ensure ml/ is importable when running from ml/deployment/
# ---------------------------------------------------------------------------
_project_root = Path(__file__).resolve().parent.parent.parent
_ml_root = Path(__file__).resolve().parent.parent
if str(_project_root) not in sys.path:
    sys.path.insert(0, str(_project_root))
if str(_ml_root) not in sys.path:
    sys.path.insert(0, str(_ml_root))

from ml.deployment.config import settings
from ml.deployment.firebase_client import FirebaseClient
from ml.deployment.schemas import (
    AnomalyRequest,
    AnomalyResponse,
    BatchPredictRequest,
    BatchPredictResponse,
    HealthResponse,
    MetricsResponse,
    PredictDelayRequest,
    PredictDelayResponse,
    PredictRiskRequest,
    PredictRiskResponse,
    RerouteRequest,
    RerouteResponse,
)
from ml.models.predictor import ModelRegistry
from ml.routing.astar_router import find_safe_route
from ml.routing.graph_loader import load_highway_graph

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
settings.configure_logging()
logger = logging.getLogger("apex.ml_agent")

# ---------------------------------------------------------------------------
# Global State (initialized in lifespan)
# ---------------------------------------------------------------------------
model_registry: Optional[ModelRegistry] = None
highway_graph = None
firebase: Optional[FirebaseClient] = None
_start_time: float = time.time()

# Service metrics (simple counters — upgrade to Prometheus for production)
_metrics = {
    "total_predictions": 0,
    "total_reroutes": 0,
    "total_anomalies_injected": 0,
    "prediction_latencies_ms": [],
}


# ---------------------------------------------------------------------------
# Lifespan (replaces deprecated @app.on_event)
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan: initialize models, graph, and Firebase on startup;
    cleanup on shutdown.
    """
    global model_registry, highway_graph, firebase

    logger.info("=" * 60)
    logger.info("A.P.E.X ML Agent — Starting up")
    logger.info("=" * 60)

    # 1. Load ML Models
    try:
        model_registry = ModelRegistry(model_dir=settings.model_dir)
        logger.info(f"Model status: {model_registry.status}")
    except Exception as e:
        logger.error(f"Model loading failed: {e}")
        model_registry = None

    # 2. Load Highway Graph
    try:
        highway_graph = load_highway_graph(graph_path=settings.graph_path)
        logger.info(
            f"Highway graph: {highway_graph.number_of_nodes()} nodes, "
            f"{highway_graph.number_of_edges()} edges"
        )
    except Exception as e:
        logger.error(f"Graph loading failed: {e}")
        highway_graph = None

    # 3. Initialize Firebase Client
    firebase = FirebaseClient(
        database_url=settings.firebase_url,
        enabled=settings.use_firebase,
    )

    logger.info(f"Firebase: {'ENABLED' if settings.use_firebase else 'DISABLED (dry-run)'}")
    logger.info(f"Server port: {settings.port}")
    logger.info("=" * 60)
    logger.info("A.P.E.X ML Agent — Ready for requests")
    logger.info("=" * 60)

    yield

    # Shutdown: close Firebase connections
    if firebase:
        await firebase.close()
    logger.info("A.P.E.X ML Agent — Shut down cleanly")


# ---------------------------------------------------------------------------
# FastAPI App
# ---------------------------------------------------------------------------

app = FastAPI(
    title="A.P.E.X ML Agent",
    description=(
        "Autonomous Predictive Expressway Routing — ML inference, "
        "A* routing, and Firebase integration service."
    ),
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS — Member 3's React frontend needs this for cross-origin requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================================
# ENDPOINT: Health Check
# =========================================================================

@app.get("/health", response_model=HealthResponse, tags=["ops"])
async def health_check():
    """
    Health check for Cloud Run probes and monitoring.

    Returns model load status, graph info, and uptime.
    Used by Cloud Run for liveness/readiness probes.
    """
    return HealthResponse(
        status="healthy" if model_registry and model_registry.xgboost_loaded else "degraded",
        models=model_registry.status if model_registry else {"xgboost": "not_loaded", "random_forest": "not_loaded"},
        graph_nodes=highway_graph.number_of_nodes() if highway_graph else 0,
        graph_edges=highway_graph.number_of_edges() if highway_graph else 0,
        firebase_enabled=settings.use_firebase,
        uptime_seconds=round(time.time() - _start_time, 1),
    )


# =========================================================================
# ENDPOINT: Inject Anomaly
# =========================================================================

@app.post("/inject-anomaly", response_model=AnomalyResponse, tags=["demo"])
async def inject_anomaly(req: AnomalyRequest):
    """
    Inject a disruption anomaly into the system.

    Called by Member 3's frontend when the judge clicks "INJECT DISRUPTION".
    This endpoint:
        1. Writes anomaly to Firebase → supply_chain/anomalies/<id>
        2. If severity > 0.7, auto-triggers A* rerouting
        3. Writes alert to Firebase → supply_chain/alerts/<id>
        4. Returns injection result + reroute summary

    See: shared/firebase-contract.json for data format.
    """
    anomaly_id = f"anomaly-{uuid.uuid4().hex[:8]}"
    timestamp = datetime.now(timezone.utc).isoformat()

    # Build Firebase anomaly record (matches contract exactly)
    anomaly_data = {
        "type": req.type,
        "lat": req.lat,
        "lng": req.lng,
        "severity": req.severity,
        "affectedHighway": req.affectedHighway,
        "timestamp": timestamp,
    }

    # Write anomaly to Firebase (Member 3 reads for red markers on map)
    if firebase:
        await firebase.write(f"supply_chain/anomalies/{anomaly_id}", anomaly_data)

    _metrics["total_anomalies_injected"] += 1

    # Build base response
    response = AnomalyResponse(
        anomaly_id=anomaly_id,
        type=req.type,
        lat=req.lat,
        lng=req.lng,
        severity=req.severity,
        affectedHighway=req.affectedHighway or "NH-48",
        timestamp=timestamp,
    )

    # Auto-trigger rerouting for high-severity anomalies
    if req.severity > 0.7 and highway_graph is not None:
        logger.info(
            f"High severity ({req.severity}) — auto-triggering A* reroute"
        )

        # Determine which nodes are affected based on anomaly type
        disrupted = _get_disrupted_nodes_for_anomaly(req)

        reroute_result = find_safe_route(
            graph=highway_graph,
            origin="WH-DEL-001",
            destination="WH-MUM-003",
            disrupted_nodes=disrupted,
        )

        if reroute_result:
            # Write alert to Firebase (Member 3 displays in timeline)
            alert_id = f"alert-{uuid.uuid4().hex[:8]}"
            alert_data = {
                "message": (
                    f"CRITICAL: {req.type} detected (severity {req.severity}). "
                    f"A* rerouted 12 trucks via {reroute_result.path_description}. "
                    f"₹{reroute_result.cost_saved_estimate_inr:,} demurrage avoided."
                ),
                "severity": "CRITICAL" if req.severity >= 0.9 else "WARNING",
                "costSavedINR": reroute_result.cost_saved_estimate_inr,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }

            if firebase:
                await firebase.write(f"supply_chain/alerts/{alert_id}", alert_data)

                # Update affected routes to REROUTED status
                for i, node_id in enumerate(disrupted[:3]):  # Cap at 3 routes
                    route_update = {
                        "status": "REROUTED",
                        "isRerouted": True,
                        "riskScore": round(req.severity, 2),
                    }
                    await firebase.update(
                        f"supply_chain/active_routes/route-TRK-{100 + i:03d}",
                        route_update,
                    )

            response.rerouted = 12
            response.reroute_path = reroute_result.path
            response.alert_id = alert_id
            response.cost_saved_inr = reroute_result.cost_saved_estimate_inr

            _metrics["total_reroutes"] += 1

    return response


def _get_disrupted_nodes_for_anomaly(req: AnomalyRequest) -> list[str]:
    """
    Determine which graph nodes are disrupted based on anomaly type and
    GPS proximity to actual corridor nodes.

    Uses a two-step approach:
        1. Find corridor nodes within PROXIMITY_THRESHOLD_KM of the anomaly
        2. If no nearby nodes found, fall back to type-based default mapping

    The proximity search uses the real GPS coordinates from ML_CORRIDOR_NODES.
    """
    from ml.routing.astar_router import haversine_km
    from ml.routing.graph_loader import ML_CORRIDOR_NODES

    PROXIMITY_THRESHOLD_KM = 200.0  # Anomaly effect radius

    # Step 1: Proximity-based — find corridor nodes near the anomaly epicenter
    nearby_nodes = []
    for node_id, node_data in ML_CORRIDOR_NODES.items():
        dist = haversine_km(req.lat, req.lng, node_data["lat"], node_data["lng"])
        if dist <= PROXIMITY_THRESHOLD_KM:
            nearby_nodes.append(node_id)

    if nearby_nodes:
        return list(dict.fromkeys(nearby_nodes))  # Deduplicate

    # Step 2: Fallback — type-based default mapping (India-specific knowledge)
    type_to_nodes = {
        "MONSOON":         ["NH48_KHERKI_DAULA", "NH48_SHAHJAHANPUR"],
        "FLOOD":           ["NH48_KARJAN", "NH48_DAHISAR"],
        "ACCIDENT":        ["NH48_THIKARIYA"],
        "RTO_GRIDLOCK":    ["NH48_SHAHJAHANPUR", "TP-PNP-004"],
        "ICEGATE_FAILURE": ["ICD-TKD-001"],
    }

    return type_to_nodes.get(req.type, ["NH48_KHERKI_DAULA"])


# =========================================================================
# ENDPOINT: Predict Delay
# =========================================================================

@app.post("/predict-delay", response_model=PredictDelayResponse, tags=["inference"])
async def predict_delay(req: PredictDelayRequest):
    """
    XGBoost disruption prediction for a single node.

    Returns the probability that the node will experience a
    significant delay (>60 min), along with confidence and
    severity classification.

    Blueprint S11.1: Binary delay classification.
    """
    if model_registry is None or not model_registry.xgboost_loaded:
        raise HTTPException(
            status_code=503,
            detail="XGBoost model not loaded — service is in degraded mode",
        )

    start_time = time.time()

    # Build kwargs from request, mapping snake_case → training column names
    features = {
        "queue_length": req.queue_length,
        "queue_growth": req.queue_growth,
        "processingRate": req.processing_rate,
        "utilization": req.utilization,
        "prev_utilization": req.prev_utilization,
        "downstream_congestion_flag": req.downstream_congestion_flag,
        "weather_severity": req.weather_severity,
    }
    if req.hour_sin is not None:
        features["hour_sin"] = req.hour_sin
    if req.hour_cos is not None:
        features["hour_cos"] = req.hour_cos

    prediction = model_registry.predict_disruption(**features)

    # Track metrics
    latency_ms = (time.time() - start_time) * 1000
    _metrics["total_predictions"] += 1
    _metrics["prediction_latencies_ms"].append(latency_ms)

    return PredictDelayResponse(
        is_disrupted=prediction.is_disrupted,
        delay_probability=prediction.probability,
        confidence=prediction.confidence,
        severity_label=prediction.severity_label,
        threshold=prediction.threshold,
    )


# =========================================================================
# ENDPOINT: Predict Risk
# =========================================================================

@app.post("/predict-risk", response_model=PredictRiskResponse, tags=["inference"])
async def predict_risk(req: PredictRiskRequest):
    """
    Random Forest risk score prediction for a single node.

    Returns a continuous risk score (0.0 = safe, 1.0 = critical)
    with a human-readable risk level classification.

    Blueprint S7.10: Risk = utilization*0.6 + weather*0.4
    """
    if model_registry is None or not model_registry.rf_loaded:
        raise HTTPException(
            status_code=503,
            detail="Random Forest model not loaded — service is in degraded mode",
        )

    features = {
        "queue_length": req.queue_length,
        "queue_growth": req.queue_growth,
        "processingRate": req.processing_rate,
        "utilization": req.utilization,
        "prev_utilization": req.prev_utilization,
        "downstream_congestion_flag": req.downstream_congestion_flag,
        "weather_severity": req.weather_severity,
    }
    if req.hour_sin is not None:
        features["hour_sin"] = req.hour_sin
    if req.hour_cos is not None:
        features["hour_cos"] = req.hour_cos

    prediction = model_registry.predict_risk_score(**features)

    return PredictRiskResponse(
        risk_score=prediction.risk_score,
        risk_level=prediction.risk_level,
    )


# =========================================================================
# ENDPOINT: Trigger Autonomous Reroute
# =========================================================================

@app.post(
    "/trigger-autonomous-reroute",
    response_model=RerouteResponse,
    tags=["routing"],
)
async def trigger_autonomous_reroute(req: RerouteRequest):
    """
    A* routing to find alternative path avoiding disrupted nodes.

    1. Removes disrupted nodes from highway graph copy
    2. Runs A* with haversine heuristic + custom edge weights
    3. Writes alert to Firebase supply_chain/alerts/<id>
    4. Updates affected routes to REROUTED status

    Blueprint S13.2: Custom A* with India-specific heuristic.
    Blueprint S13.4: Dynamic rerouting pseudocode.
    """
    if highway_graph is None:
        raise HTTPException(
            status_code=503,
            detail="Highway graph not loaded — routing unavailable",
        )

    result = find_safe_route(
        graph=highway_graph,
        origin=req.origin,
        destination=req.destination,
        disrupted_nodes=req.disrupted_nodes,
    )

    if result is None:
        raise HTTPException(
            status_code=404,
            detail=(
                f"No path found from {req.origin} → {req.destination} "
                f"avoiding nodes: {req.disrupted_nodes}"
            ),
        )

    # Write alert to Firebase
    alert_id = f"alert-{uuid.uuid4().hex[:8]}"
    trucks_rerouted = 12  # Demo value (Blueprint S3.2)

    alert_data = {
        "message": (
            f"CRITICAL: A* rerouted {trucks_rerouted} trucks via "
            f"{result.path_description}. Avoiding: {', '.join(result.avoided_nodes)}. "
            f"₹{result.cost_saved_estimate_inr:,} demurrage avoided."
        ),
        "severity": "CRITICAL",
        "costSavedINR": result.cost_saved_estimate_inr,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

    if firebase:
        await firebase.write(f"supply_chain/alerts/{alert_id}", alert_data)

        # Update route statuses
        for i in range(min(trucks_rerouted, 5)):
            await firebase.update(
                f"supply_chain/active_routes/route-TRK-{100 + i:03d}",
                {"status": "REROUTED", "isRerouted": True, "riskScore": 0.85},
            )

    _metrics["total_reroutes"] += 1

    return RerouteResponse(
        path=result.path,
        path_description=result.path_description,
        total_distance_km=result.total_distance_km,
        total_toll_cost_inr=result.total_toll_cost_inr,
        estimated_travel_hours=result.estimated_travel_hours,
        total_risk_score=result.total_risk_score,
        avoided_nodes=result.avoided_nodes,
        trucks_rerouted=trucks_rerouted,
        cost_saved_inr=result.cost_saved_estimate_inr,
        alert_id=alert_id,
    )


# =========================================================================
# ENDPOINT: Batch Predict
# =========================================================================

@app.post("/batch-predict", response_model=BatchPredictResponse, tags=["inference"])
async def batch_predict(req: BatchPredictRequest):
    """
    Corridor sweep: batch disruption prediction for multiple nodes.

    Used for scanning all nodes in the corridor to identify emerging
    bottlenecks before they cascade.
    """
    if model_registry is None or not model_registry.xgboost_loaded:
        raise HTTPException(
            status_code=503,
            detail="XGBoost model not loaded",
        )

    features_list = []
    for node in req.nodes:
        features = {
            "queue_length": node.queue_length,
            "queue_growth": node.queue_growth,
            "processingRate": node.processing_rate,
            "utilization": node.utilization,
            "prev_utilization": node.prev_utilization,
            "downstream_congestion_flag": node.downstream_congestion_flag,
            "weather_severity": node.weather_severity,
        }
        if node.hour_sin is not None:
            features["hour_sin"] = node.hour_sin
        if node.hour_cos is not None:
            features["hour_cos"] = node.hour_cos
        features_list.append(features)

    results = model_registry.predict_batch(features_list)
    disrupted_count = sum(1 for r in results if r.get("is_disrupted", False))

    return BatchPredictResponse(
        total_nodes=len(results),
        disrupted_count=disrupted_count,
        results=results,
    )


# =========================================================================
# ENDPOINT: Demo Dual-Shock
# =========================================================================

@app.post("/demo/dual-shock", tags=["demo"])
async def demo_dual_shock():
    """
    Pre-configured dual-shock demo scenario (Blueprint S3.2).

    Injects two simultaneous disruptions:
        1. Western Ghats Monsoon (severity 0.95) → NH-48 corridor
        2. ICEGATE Failure (severity 1.0) → ICD Tughlakabad

    This is the exact scenario described in the hackathon blueprint
    for the live demo. The response includes the full rerouting result.
    """
    results = []

    # Shock 1: Western Ghats Monsoon
    shock1 = AnomalyRequest(
        type="MONSOON",
        lat=17.5,
        lng=73.8,
        severity=0.95,
        affectedHighway="NH-48",
    )
    result1 = await inject_anomaly(shock1)
    results.append({"shock": "Western Ghats Monsoon", "result": result1.model_dump()})

    # Shock 2: ICEGATE Failure
    shock2 = AnomalyRequest(
        type="ICEGATE_FAILURE",
        lat=28.509,
        lng=77.275,
        severity=1.0,
        affectedHighway="NH-19",
    )
    result2 = await inject_anomaly(shock2)
    results.append({"shock": "ICEGATE Failure", "result": result2.model_dump()})

    return {
        "status": "dual_shock_complete",
        "message": (
            "Western Ghats monsoon + ICEGATE failure injected. "
            "A* rerouted trucks to alternate corridors. "
            "Check Firebase for updated routes and alerts."
        ),
        "shocks": results,
        "demo_metrics": {
            "trucks_rerouted": 12,
            "cost_saved_inr": 3_800_000,
            "corridors_affected": ["NH-48", "NH-19"],
        },
    }


# =========================================================================
# ENDPOINT: Metrics
# =========================================================================

@app.get("/metrics", response_model=MetricsResponse, tags=["ops"])
async def get_metrics():
    """
    Service metrics for monitoring and debugging.

    Returns prediction counts, reroute counts, and latency stats.
    """
    latencies = _metrics["prediction_latencies_ms"]
    avg_latency = sum(latencies) / len(latencies) if latencies else 0.0

    return MetricsResponse(
        total_predictions=_metrics["total_predictions"],
        total_reroutes=_metrics["total_reroutes"],
        total_anomalies_injected=_metrics["total_anomalies_injected"],
        avg_prediction_latency_ms=round(avg_latency, 2),
        model_status=model_registry.status if model_registry else {},
    )


# =========================================================================
# Entry Point
# =========================================================================

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "routing_agent:app",
        host="0.0.0.0",
        port=settings.port,
        reload=True,
        log_level=settings.log_level.lower(),
    )
