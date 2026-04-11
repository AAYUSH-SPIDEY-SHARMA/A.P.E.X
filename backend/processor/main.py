"""
A.P.E.X — Cloud Run Processing Service

FastAPI app that processes FASTag telemetry events:
1. Receives events via HTTP POST (from simulator) or Pub/Sub push
2. Groups pings by vehicleRegNo to track trucks
3. Calculates inter-plaza velocity using Haversine (Section 7.2)
4. Applies velocity clipping: discards v < 5 km/h or v > 120 km/h (Section 10.7)
5. Deduplicates via seqNo UUID
6. Computes node utilization (ρ = λ/μ) per Section 7.6
7. Writes updated node status + route data to Firebase RTDB (Section 10.5)

Blueprint references:
  - Section 7.2:  Haversine velocity interpolation
  - Section 7.6:  M/M/1 queueing (utilization factor ρ)
  - Section 7.11: TTR, TTS, SSW resilience metrics
  - Section 10.2: FASTag telemetry payload schema
  - Section 10.5: Firebase RTDB contract
  - Section 10.7: Stream processing strategy

Usage (local):
  cd backend/processor
  pip install -r requirements.txt
  uvicorn main:app --reload --port 8080

Usage (with simulator):
  # Terminal 1: Start processor
  uvicorn main:app --reload --port 8080
  # Terminal 2: Run simulator pointing to processor
  python ../simulator/fastag_simulator.py --mode console --rate 5 --duration 30
  # (Or use the /process endpoint directly with curl)
"""

import json
import math
import os
import logging
import time
import uuid
from collections import defaultdict
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("apex-processor")

# ---------------------------------------------------------------------------
# FastAPI App
# ---------------------------------------------------------------------------
app = FastAPI(
    title="A.P.E.X Processing Service",
    description="FASTag telemetry processor — velocity calc + node status updater",
    version="1.0.0",
)

# CORS for frontend dev (Member 3 needs this)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
FIREBASE_URL = os.getenv("FIREBASE_DATABASE_URL", "http://127.0.0.1:9000")
GCP_PROJECT = os.getenv("GCP_PROJECT_ID", "apex-digital-twin")
USE_FIREBASE = os.getenv("USE_FIREBASE", "false").lower() == "true"

# Velocity clipping bounds (blueprint Section 10.7)
MIN_VELOCITY_KMH = 5.0
MAX_VELOCITY_KMH = 120.0

# Utilization threshold for bottleneck detection (blueprint Section 7.6)
BOTTLENECK_THRESHOLD = 0.85  # ρ > 0.85 → triggers rerouting

# ---------------------------------------------------------------------------
# In-Memory State (replaces Spanner Graph for MVP)
# ---------------------------------------------------------------------------

# Track last ping per vehicle for velocity calculation
vehicle_last_ping: dict = {}  # vehicleRegNo -> {tollPlazaId, lat, lng, timestamp}

# Track arrival counts per node for utilization calculation
node_arrival_counts: dict = defaultdict(int)     # tollPlazaId -> count in current window
node_window_start: dict = {}                     # tollPlazaId -> window start time

# Deduplication set (seqNo UUIDs seen in last 5 minutes)
seen_seq_nos: set = set()
seq_no_cleanup_time: float = time.time()

# Highway graph (loaded at startup)
highway_graph: dict = {}
graph_nodes: dict = {}  # node_id -> node data (quick lookup)

# Firebase RTDB reference (initialized lazily)
firebase_db = None


# ---------------------------------------------------------------------------
# Highway Graph Loader
# ---------------------------------------------------------------------------

def load_highway_graph():
    """Load the highway graph from JSON (blueprint Section 10.1 simplified)."""
    global highway_graph, graph_nodes

    graph_path = Path(__file__).parent.parent / "graph" / "highway_graph.json"
    if not graph_path.exists():
        logger.warning(f"Highway graph not found at {graph_path}. Using empty graph.")
        return

    with open(graph_path, "r") as f:
        highway_graph = json.load(f)

    # Build quick-lookup dict for nodes
    for node in highway_graph.get("nodes", []):
        graph_nodes[node["id"]] = node

    logger.info(
        f"[OK] Highway graph loaded: {len(graph_nodes)} nodes, "
        f"{len(highway_graph.get('links', []))} segments"
    )


def init_firebase():
    """Initialize Firebase Admin SDK (lazy — only when USE_FIREBASE=true)."""
    global firebase_db
    if firebase_db is not None:
        return

    try:
        import firebase_admin
        from firebase_admin import db

        if not firebase_admin._apps:
            firebase_admin.initialize_app(None, {"databaseURL": FIREBASE_URL})
        firebase_db = db
        logger.info(f"[FIREBASE] Firebase RTDB connected: {FIREBASE_URL}")
    except Exception as e:
        logger.error(f"[ERROR] Firebase init failed: {e}. Running without Firebase.")
        firebase_db = None


# ---------------------------------------------------------------------------
# Haversine Distance (blueprint Section 7.2)
# ---------------------------------------------------------------------------

def haversine_distance_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """
    Great-circle distance between two GPS coordinates.
    Blueprint Section 7.2: v_interpolated = Haversine(L1, L2) / Δt
    """
    R = 6371.0  # Earth radius in km
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lng2 - lng1)

    a = (math.sin(dphi / 2) ** 2 +
         math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


# ---------------------------------------------------------------------------
# Velocity Calculation
# ---------------------------------------------------------------------------

def calculate_velocity(
    prev_lat: float, prev_lng: float, prev_time: str,
    curr_lat: float, curr_lng: float, curr_time: str,
) -> Optional[float]:
    """
    Calculate truck velocity between two sequential toll plaza pings.
    Returns velocity in km/h, or None if invalid.

    Blueprint Section 7.2:
      v = Haversine(plaza1, plaza2) / (t2 - t1)

    Blueprint Section 10.7 (velocity clipping):
      Discard if v < 5 km/h (stuck/parked) or v > 120 km/h (GPS error)
    """
    distance_km = haversine_distance_km(prev_lat, prev_lng, curr_lat, curr_lng)

    # Parse timestamps
    try:
        t1 = datetime.fromisoformat(prev_time.replace("Z", "+00:00"))
        t2 = datetime.fromisoformat(curr_time.replace("Z", "+00:00"))
    except (ValueError, AttributeError):
        return None

    delta_hours = (t2 - t1).total_seconds() / 3600.0

    if delta_hours <= 0:
        return None

    velocity = distance_km / delta_hours

    # Velocity clipping (blueprint Section 10.7)
    if velocity < MIN_VELOCITY_KMH or velocity > MAX_VELOCITY_KMH:
        logger.debug(
            f"Velocity clipped: {velocity:.1f} km/h "
            f"(bounds: {MIN_VELOCITY_KMH}-{MAX_VELOCITY_KMH})"
        )
        return None

    return round(velocity, 2)


# ---------------------------------------------------------------------------
# Node Utilization (blueprint Section 7.6 — M/M/1 queueing)
# ---------------------------------------------------------------------------

def update_node_utilization(toll_plaza_id: str) -> dict:
    """
    Calculate utilization factor ρ = λ/μ for a toll plaza.

    Blueprint Section 7.6:
      λ = arrival rate (trucks/minute) — from FASTag ping counts
      μ = processing rate (trucks/minute) — from graph node data
      ρ = λ/μ  (bottleneck when ρ > 0.85)

    Returns dict with utilization metrics for Firebase.
    """
    now = time.time()
    window_seconds = 300  # 5-minute window (blueprint Section 10.7)

    # Initialize window if needed
    if toll_plaza_id not in node_window_start:
        node_window_start[toll_plaza_id] = now

    # Count arrivals in current window
    node_arrival_counts[toll_plaza_id] += 1
    window_elapsed = now - node_window_start[toll_plaza_id]

    if window_elapsed < 1:
        window_elapsed = 1  # Avoid division by zero

    # λ = arrivals per minute
    arrival_rate = (node_arrival_counts[toll_plaza_id] / window_elapsed) * 60.0

    # μ = processing rate from graph (trucks/minute)
    node_data = graph_nodes.get(toll_plaza_id, {})
    processing_rate = node_data.get("processingRate", 10.0)

    # ρ = λ/μ (utilization factor)
    utilization = min(arrival_rate / processing_rate, 0.99) if processing_rate > 0 else 0.5

    # Queue length estimate: L = ρ/(1-ρ) (Little's Law, blueprint Section 7.6)
    if utilization < 1.0:
        queue_length = utilization / (1 - utilization)
    else:
        queue_length = 100  # Saturated

    # Status determination (blueprint Section 10.5)
    if utilization > BOTTLENECK_THRESHOLD:
        status = "DISRUPTED"
    elif utilization > 0.70:
        status = "DELAYED"
    else:
        status = "NORMAL"

    # TTS/TTR estimates (blueprint Section 7.11)
    tts = max(12, int(72 * (1 - utilization)))  # Higher util → lower survival time
    ttr = max(6, int(48 * utilization))          # Higher util → longer recovery

    # Reset window every 5 minutes
    if window_elapsed > window_seconds:
        node_arrival_counts[toll_plaza_id] = 0
        node_window_start[toll_plaza_id] = now

    return {
        "type": node_data.get("type", "TOLL_PLAZA"),
        "name": node_data.get("name", toll_plaza_id),
        "lat": node_data.get("lat", 0),
        "lng": node_data.get("lng", 0),
        "status": status,
        "utilization": round(utilization, 3),
        "queueLength": int(min(queue_length, 200)),
        "tts": tts,
        "ttr": ttr,
    }


# ---------------------------------------------------------------------------
# Deduplication (blueprint Section 10.7)
# ---------------------------------------------------------------------------

def is_duplicate(seq_no: str) -> bool:
    """Check if this seqNo has been processed already."""
    global seq_no_cleanup_time

    # Periodic cleanup of seen set (every 5 minutes)
    now = time.time()
    if now - seq_no_cleanup_time > 300:
        seen_seq_nos.clear()
        seq_no_cleanup_time = now

    if seq_no in seen_seq_nos:
        return True

    seen_seq_nos.add(seq_no)
    return False


# ---------------------------------------------------------------------------
# Firebase Writer (blueprint Section 10.5)
# ---------------------------------------------------------------------------

def write_to_firebase(path: str, data: dict):
    """Write data to Firebase RTDB at the given path."""
    if firebase_db is None:
        return

    try:
        firebase_db.reference(path).set(data)
    except Exception as e:
        logger.error(f"Firebase write failed [{path}]: {e}")


def update_firebase_node(toll_plaza_id: str, node_data: dict):
    """Write node status to Firebase: supply_chain/nodes/<node_id>"""
    write_to_firebase(f"supply_chain/nodes/{toll_plaza_id}", node_data)


def update_firebase_route(truck_id: str, route_data: dict):
    """Write route to Firebase: supply_chain/active_routes/<route_id>"""
    write_to_firebase(f"supply_chain/active_routes/route-{truck_id}", route_data)


# ---------------------------------------------------------------------------
# Pydantic Models (from blueprint Section 10.2)
# ---------------------------------------------------------------------------

class FASTagEvent(BaseModel):
    """FASTag telemetry event — NPCI NETC ICD 2.5 schema."""
    seqNo: str
    vehicleRegNo: str
    tagId: Optional[str] = None
    tollPlazaId: str
    tollPlazaName: Optional[str] = None
    tollPlazaGeocode: str  # "lat,lng"
    laneDirection: Optional[str] = None
    vehicleClass: str
    readerReadTime: str
    signatureAuthStatus: Optional[str] = "SUCCESS"
    # Extended fields
    truckId: Optional[str] = None
    cargoValueINR: Optional[int] = None
    ewayBillNo: Optional[int] = None
    commodity: Optional[str] = None


class ProcessingResult(BaseModel):
    """Response from processing a FASTag event."""
    status: str
    seqNo: str
    vehicleRegNo: str
    tollPlazaId: str
    velocity_kmh: Optional[float] = None
    node_utilization: Optional[float] = None
    node_status: Optional[str] = None
    is_bottleneck: bool = False
    message: str = ""


class HealthResponse(BaseModel):
    """Health check response."""
    status: str = "healthy"
    service: str = "apex-processor"
    version: str = "1.0.0"
    graph_nodes: int = 0
    tracked_vehicles: int = 0
    firebase_connected: bool = False


# ---------------------------------------------------------------------------
# API Endpoints
# ---------------------------------------------------------------------------

@app.on_event("startup")
async def startup():
    """Load highway graph and optionally connect to Firebase."""
    load_highway_graph()
    if USE_FIREBASE:
        init_firebase()
    logger.info("[APEX] A.P.E.X Processing Service started")


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint for Cloud Run."""
    return HealthResponse(
        graph_nodes=len(graph_nodes),
        tracked_vehicles=len(vehicle_last_ping),
        firebase_connected=firebase_db is not None,
    )


@app.post("/process", response_model=ProcessingResult)
async def process_fastag_event(event: FASTagEvent):
    """
    Process a single FASTag telemetry event.

    Pipeline (blueprint Section 8.3 — MVP simplified):
    1. Deduplicate via seqNo
    2. Parse geocode → lat/lng
    3. Calculate velocity from previous ping (Haversine)
    4. Apply velocity clipping (5-120 km/h)
    5. Update node utilization (M/M/1 queueing)
    6. Write to Firebase RTDB
    """

    # Step 1: Deduplication
    if is_duplicate(event.seqNo):
        return ProcessingResult(
            status="duplicate",
            seqNo=event.seqNo,
            vehicleRegNo=event.vehicleRegNo,
            tollPlazaId=event.tollPlazaId,
            message="Duplicate seqNo — skipped",
        )

    # Step 2: Parse geocode
    try:
        parts = event.tollPlazaGeocode.split(",")
        curr_lat = float(parts[0])
        curr_lng = float(parts[1])
    except (ValueError, IndexError):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid tollPlazaGeocode: {event.tollPlazaGeocode}",
        )

    # Step 3: Calculate velocity from previous ping
    velocity = None
    prev = vehicle_last_ping.get(event.vehicleRegNo)
    if prev:
        velocity = calculate_velocity(
            prev["lat"], prev["lng"], prev["timestamp"],
            curr_lat, curr_lng, event.readerReadTime,
        )

    # Store current ping as last ping for this vehicle
    vehicle_last_ping[event.vehicleRegNo] = {
        "tollPlazaId": event.tollPlazaId,
        "lat": curr_lat,
        "lng": curr_lng,
        "timestamp": event.readerReadTime,
    }

    # Step 5: Update node utilization
    node_data = update_node_utilization(event.tollPlazaId)
    is_bottleneck = node_data["utilization"] > BOTTLENECK_THRESHOLD

    # Step 6: Write to Firebase RTDB (if enabled)
    if USE_FIREBASE and firebase_db:
        update_firebase_node(event.tollPlazaId, node_data)

        # Update route if we have truck info
        if event.truckId and event.cargoValueINR:
            route_data = {
                "truckId": event.truckId,
                "vehicleRegNo": event.vehicleRegNo,
                "currentPosition": [curr_lng, curr_lat],
                "status": "NORMAL",
                "isRerouted": False,
                "cargoValueINR": event.cargoValueINR,
                "ewayBillNo": event.ewayBillNo,
                "riskScore": round(node_data["utilization"] * 0.5, 2),
            }
            update_firebase_route(event.truckId, route_data)

    # Build response
    message = f"Processed at {event.tollPlazaName or event.tollPlazaId}"
    if velocity:
        message += f" | velocity={velocity:.1f} km/h"
    if is_bottleneck:
        message += " | [!] BOTTLENECK DETECTED"

    return ProcessingResult(
        status="processed",
        seqNo=event.seqNo,
        vehicleRegNo=event.vehicleRegNo,
        tollPlazaId=event.tollPlazaId,
        velocity_kmh=velocity,
        node_utilization=node_data["utilization"],
        node_status=node_data["status"],
        is_bottleneck=is_bottleneck,
        message=message,
    )


@app.post("/process/batch")
async def process_batch(events: list[FASTagEvent]):
    """Process a batch of FASTag events (for higher throughput)."""
    results = []
    for event in events:
        result = await process_fastag_event(event)
        results.append(result)
    return {"processed": len(results), "results": results}


@app.post("/pubsub/push")
async def pubsub_push_handler(request: Request):
    """
    Handle Pub/Sub push subscription.
    Cloud Pub/Sub sends messages as HTTP POST with base64-encoded data.
    This endpoint is for when this service runs on Cloud Run with
    Pub/Sub push subscription pointing to it.
    """
    import base64

    body = await request.json()
    message = body.get("message", {})
    data = message.get("data", "")

    if not data:
        return {"status": "no data"}

    try:
        decoded = base64.b64decode(data).decode("utf-8")
        event_dict = json.loads(decoded)
        event = FASTagEvent(**event_dict)
        result = await process_fastag_event(event)
        return {"status": "ok", "result": result.dict()}
    except Exception as e:
        logger.error(f"Pub/Sub push handler error: {e}")
        return {"status": "error", "message": str(e)}


@app.get("/nodes")
async def get_all_nodes():
    """
    Get current status of all tracked nodes.
    Returns in-memory state (for debugging / frontend polling fallback).
    """
    nodes = {}
    for node_id, node_data in graph_nodes.items():
        if node_data.get("type") in ("TOLL_PLAZA", "WAREHOUSE", "ICD"):
            count = node_arrival_counts.get(node_id, 0)
            nodes[node_id] = {
                "name": node_data.get("name"),
                "type": node_data.get("type"),
                "lat": node_data.get("lat"),
                "lng": node_data.get("lng"),
                "arrivals": count,
            }
    return {"nodes": nodes, "total_tracked_vehicles": len(vehicle_last_ping)}


@app.get("/vehicles")
async def get_tracked_vehicles():
    """Get last known position of all tracked vehicles."""
    return {
        "count": len(vehicle_last_ping),
        "vehicles": dict(list(vehicle_last_ping.items())[:50]),  # Cap at 50 for response size
    }


@app.get("/graph")
async def get_highway_graph():
    """Return the highway graph (for frontend visualization)."""
    return highway_graph


# ---------------------------------------------------------------------------
# Entry point for local development
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8080)),
        reload=True,
    )
