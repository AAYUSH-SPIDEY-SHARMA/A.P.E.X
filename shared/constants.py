"""
A.P.E.X — Shared Constants (Blueprint Section 27.1)

Shared enums, node types, and status codes used across all members.
This file is READ-ONLY after Day 1 — changes require all 3 members' agreement.
"""

# --- Node Types (from highway_graph.json) ---
NODE_TYPE_TOLL_PLAZA = "TOLL_PLAZA"
NODE_TYPE_WAREHOUSE = "WAREHOUSE"
NODE_TYPE_ICD = "ICD"
NODE_TYPE_RTO_CHECKPOINT = "RTO_CHECKPOINT"

# --- Node Statuses (from firebase-contract.json) ---
STATUS_NORMAL = "NORMAL"
STATUS_DELAYED = "DELAYED"
STATUS_DISRUPTED = "DISRUPTED"

# --- Route Statuses ---
ROUTE_STATUS_NORMAL = "NORMAL"
ROUTE_STATUS_DISRUPTED = "DISRUPTED"
ROUTE_STATUS_REROUTED = "REROUTED"

# --- Anomaly Types (Section 3.2 — India-specific disruptions) ---
ANOMALY_MONSOON = "MONSOON"
ANOMALY_FLOOD = "FLOOD"
ANOMALY_ACCIDENT = "ACCIDENT"
ANOMALY_RTO_GRIDLOCK = "RTO_GRIDLOCK"
ANOMALY_ICEGATE_FAILURE = "ICEGATE_FAILURE"

# --- Alert Severities ---
SEVERITY_CRITICAL = "CRITICAL"
SEVERITY_WARNING = "WARNING"
SEVERITY_INFO = "INFO"

# --- Utilization Thresholds (Section 7.6 — M/M/1 queueing) ---
BOTTLENECK_THRESHOLD = 0.85   # ρ > 0.85 → triggers rerouting
DELAYED_THRESHOLD = 0.70      # ρ > 0.70 → DELAYED status

# --- Velocity Clipping (Section 10.7) ---
MIN_VELOCITY_KMH = 5.0        # Below = parked/stuck (discard)
MAX_VELOCITY_KMH = 120.0      # Above = GPS/sensor error (discard)

# --- Firebase RTDB Paths (Section 10.5) ---
FB_PATH_NODES = "supply_chain/nodes"
FB_PATH_ROUTES = "supply_chain/active_routes"
FB_PATH_ANOMALIES = "supply_chain/anomalies"
FB_PATH_ALERTS = "supply_chain/alerts"

# --- Service Ports (local development) ---
PORT_PROCESSOR = 8080          # Member 1 — Cloud Run processor
PORT_MOCK_DPI = 8081           # Member 1 — Mock DPI APIs
PORT_ML_AGENT = 8082           # Member 2 — ML routing agent
PORT_FRONTEND = 5173           # Member 3 — React dev server

# --- Firebase RTDB URL ---
FIREBASE_DATABASE_URL = "https://apex-digital-twin-493017-default-rtdb.asia-southeast1.firebasedatabase.app"
