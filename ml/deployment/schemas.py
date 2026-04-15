"""
A.P.E.X — Pydantic v2 Request/Response Schemas

Defines all API payload models for the ML Agent FastAPI service.
These schemas enforce validation, provide OpenAPI documentation,
and ensure the Firebase contract (shared/firebase-contract.json)
is respected.

Schema Groups:
    1. Anomaly Injection  — /inject-anomaly
    2. Delay Prediction   — /predict-delay
    3. Risk Prediction    — /predict-risk
    4. Autonomous Reroute — /trigger-autonomous-reroute
    5. Batch Prediction   — /batch-predict
    6. Demo Scenarios     — /demo/dual-shock
    7. Health Check       — /health
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, field_validator


# =========================================================================
# Anomaly Injection
# =========================================================================

# Valid anomaly types from shared/firebase-contract.json
VALID_ANOMALY_TYPES = {"MONSOON", "FLOOD", "ACCIDENT", "RTO_GRIDLOCK", "ICEGATE_FAILURE"}
VALID_ALERT_SEVERITIES = {"CRITICAL", "WARNING", "INFO"}


class AnomalyRequest(BaseModel):
    """
    Request to inject a disruption anomaly (called by frontend judge button).

    Maps directly to Firebase path: supply_chain/anomalies/<anomaly_id>
    See: shared/firebase-contract.json
    """
    type: str = Field(
        ...,
        description="Anomaly type — must be one of: MONSOON, FLOOD, ACCIDENT, RTO_GRIDLOCK, ICEGATE_FAILURE",
        examples=["MONSOON"],
    )
    lat: float = Field(..., ge=-90, le=90, description="Latitude of anomaly epicenter")
    lng: float = Field(..., ge=-180, le=180, description="Longitude of anomaly epicenter")
    severity: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Severity index (0.0 = minor, 1.0 = catastrophic)",
        examples=[0.95],
    )
    affectedHighway: Optional[str] = Field(
        default="NH-48",
        description="Highway designation affected by this anomaly",
    )

    @field_validator("type")
    @classmethod
    def validate_anomaly_type(cls, v: str) -> str:
        v_upper = v.upper()
        if v_upper not in VALID_ANOMALY_TYPES:
            raise ValueError(
                f"Invalid anomaly type '{v}'. "
                f"Must be one of: {', '.join(sorted(VALID_ANOMALY_TYPES))}"
            )
        return v_upper


class AnomalyResponse(BaseModel):
    """Response after anomaly injection + optional autonomous reroute."""
    status: str = "injected"
    anomaly_id: str
    type: str
    lat: float
    lng: float
    severity: float
    affectedHighway: str
    timestamp: str

    # Auto-reroute results (populated if severity > 0.7)
    rerouted: int = Field(default=0, description="Number of trucks autonomously rerouted")
    reroute_path: Optional[list[str]] = Field(default=None, description="A* rerouted path node IDs")
    alert_id: Optional[str] = Field(default=None, description="Firebase alert ID if reroute occurred")
    cost_saved_inr: Optional[int] = Field(default=None, description="Estimated cost savings in INR")


# =========================================================================
# Delay Prediction
# =========================================================================

class PredictDelayRequest(BaseModel):
    """
    Request for XGBoost disruption prediction on a single node.

    Feature names accept both API-style (snake_case) and training-style
    (camelCase) — the predictor module handles mapping internally.
    """
    queue_length: float = Field(default=0.0, ge=0, description="Current truck queue (0-200)")
    queue_growth: float = Field(default=0.0, description="Queue delta from previous window")
    processing_rate: float = Field(
        default=10.0,
        gt=0,
        description="Node throughput — trucks processed per minute",
        alias="processingRate",
    )
    utilization: float = Field(default=0.5, ge=0, le=1.0, description="Current ρ = λ/μ")
    prev_utilization: float = Field(default=0.5, ge=0, le=1.0, description="Previous window utilization")
    downstream_congestion_flag: int = Field(
        default=0,
        ge=0,
        le=1,
        description="1 if downstream node ρ > 0.90",
    )
    weather_severity: float = Field(default=0.0, ge=0, le=1.0, description="IMD weather index")
    hour_sin: Optional[float] = Field(default=None, ge=-1, le=1, description="sin(2π·hour/24)")
    hour_cos: Optional[float] = Field(default=None, ge=-1, le=1, description="cos(2π·hour/24)")

    model_config = {"populate_by_name": True}


class PredictDelayResponse(BaseModel):
    """Response from XGBoost disruption prediction."""
    is_disrupted: bool
    delay_probability: float = Field(description="P(disrupted) — 0.0 to 1.0")
    confidence: float = Field(description="Model confidence — 0.0 to 1.0")
    severity_label: str = Field(description="NORMAL / LOW / MODERATE / HIGH / CRITICAL")
    threshold: float = 0.5


# =========================================================================
# Risk Prediction
# =========================================================================

class PredictRiskRequest(BaseModel):
    """Request for Random Forest risk score prediction."""
    queue_length: float = Field(default=0.0, ge=0)
    queue_growth: float = Field(default=0.0)
    processing_rate: float = Field(default=10.0, gt=0, alias="processingRate")
    utilization: float = Field(default=0.5, ge=0, le=1.0)
    prev_utilization: float = Field(default=0.5, ge=0, le=1.0)
    downstream_congestion_flag: int = Field(default=0, ge=0, le=1)
    weather_severity: float = Field(default=0.0, ge=0, le=1.0)
    hour_sin: Optional[float] = Field(default=None)
    hour_cos: Optional[float] = Field(default=None)

    model_config = {"populate_by_name": True}


class PredictRiskResponse(BaseModel):
    """Response from Random Forest risk scorer."""
    risk_score: float = Field(description="Risk score — 0.0 (safe) to 1.0 (critical)")
    risk_level: str = Field(description="MINIMAL / LOW / MODERATE / HIGH / CRITICAL")


# =========================================================================
# Autonomous Reroute
# =========================================================================

class RerouteRequest(BaseModel):
    """
    Request to trigger A* rerouting around disrupted nodes.

    Node IDs can be either graph IDs (e.g., "TP-KHD-001") or
    synthetic data IDs (e.g., "NH48_KHERKI_DAULA") — the router
    handles the mapping automatically.
    """
    disrupted_nodes: list[str] = Field(
        ...,
        min_length=1,
        description="Node IDs to avoid (graph or synthetic IDs)",
        examples=[["TP-KHD-001", "TP-MNR-002"]],
    )
    origin: str = Field(
        default="WH-DEL-001",
        description="Route starting point (default: Delhi warehouse)",
    )
    destination: str = Field(
        default="WH-MUM-003",
        description="Route ending point (default: Mumbai warehouse)",
    )


class RerouteResponse(BaseModel):
    """Response after A* rerouting completes."""
    status: str = "rerouted"
    path: list[str]
    path_description: str
    total_distance_km: float
    total_toll_cost_inr: float
    estimated_travel_hours: float
    total_risk_score: float
    avoided_nodes: list[str]
    trucks_rerouted: int = 12
    cost_saved_inr: int
    alert_id: str


# =========================================================================
# Batch Prediction
# =========================================================================

class BatchPredictRequest(BaseModel):
    """Request for corridor-sweep batch prediction."""
    nodes: list[PredictDelayRequest] = Field(
        ...,
        min_length=1,
        description="List of node feature sets to predict",
    )


class BatchPredictResponse(BaseModel):
    """Response from batch prediction."""
    total_nodes: int
    disrupted_count: int
    results: list[dict]


# =========================================================================
# Health Check
# =========================================================================

class HealthResponse(BaseModel):
    """Health check response for Cloud Run probes."""
    status: str = "healthy"
    service: str = "apex-ml-agent"
    version: str = "1.0.0"
    models: dict = Field(default_factory=dict, description="Model load status")
    graph_nodes: int = Field(default=0, description="Number of nodes in highway graph")
    graph_edges: int = Field(default=0, description="Number of edges in highway graph")
    firebase_enabled: bool = False
    uptime_seconds: float = 0.0


# =========================================================================
# Metrics
# =========================================================================

class MetricsResponse(BaseModel):
    """Prometheus-style metrics response."""
    total_predictions: int = 0
    total_reroutes: int = 0
    total_anomalies_injected: int = 0
    avg_prediction_latency_ms: float = 0.0
    model_status: dict = Field(default_factory=dict)
