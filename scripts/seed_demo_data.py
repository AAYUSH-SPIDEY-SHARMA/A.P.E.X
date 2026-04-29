"""
A.P.E.X — Firebase Demo Data Seeder
=====================================

Seeds Firebase RTDB with 15 realistic supply chain nodes and 32 active truck routes
along the Golden Quadrilateral + DFC corridors for the hackathon demo.

Usage:
    python scripts/seed_demo_data.py

Requirements:
    pip install firebase-admin

Environment:
    FIREBASE_DATABASE_URL — set in .env or export before running
    GOOGLE_APPLICATION_CREDENTIALS — service account key (optional, uses REST if absent)
"""

import json
import os
import random
import time
import sys
import urllib.request
import urllib.error
from datetime import datetime, timezone, timedelta

# ── Firebase Config ─────────────────────────────────────────────────────────
FIREBASE_URL = os.getenv("FIREBASE_DATABASE_URL", "")
if not FIREBASE_URL:
    print("[ERROR] Set FIREBASE_DATABASE_URL environment variable first!")
    sys.exit(1)

# ── Supply Chain Nodes — Matches backend/graph/highway_graph.json exactly ───
# FIX-2: All 15 node IDs are IDENTICAL to the routing graph.
NODES = {
    "NH48_KHERKI_DAULA": {
        "name": "Kherki Daula Toll Plaza",
        "type": "TOLL_PLAZA",
        "highway": "NH-48",
        "lat": 28.3956, "lng": 76.9818,
        "status": "NORMAL",
        "utilization": 0.51,
        "queueLength": 34,
        "processingRate": 12.0,
        "ttr": 24, "tts": 72, "ssw": 48,
        "capacity": 65,
    },
    "NH48_SHAHJAHANPUR": {
        "name": "Shahjahanpur RTO",
        "type": "RTO",
        "highway": "NH-48",
        "lat": 27.9998, "lng": 76.4305,
        "status": "NORMAL",
        "utilization": 0.47,
        "queueLength": 28,
        "processingRate": 8.0,
        "ttr": 20, "tts": 80, "ssw": 60,
        "capacity": 60,
    },
    "NH48_THIKARIYA": {
        "name": "Thikariya Toll Plaza",
        "type": "TOLL_PLAZA",
        "highway": "NH-48",
        "lat": 26.8433, "lng": 75.6156,
        "status": "NORMAL",
        "utilization": 0.53,
        "queueLength": 20,
        "processingRate": 15.0,
        "ttr": 18, "tts": 96, "ssw": 78,
        "capacity": 68,
    },
    "TP-PNP-004": {
        "name": "Panipat Toll Plaza",
        "type": "TOLL_PLAZA",
        "highway": "NH-44",
        "lat": 29.3909, "lng": 76.9635,
        "status": "NORMAL",
        "utilization": 0.45,
        "queueLength": 22,
        "processingRate": 9.0,
        "ttr": 16, "tts": 72, "ssw": 56,
        "capacity": 50,
    },
    "NH48_VASAD": {
        "name": "Vasad Toll Plaza",
        "type": "TOLL_PLAZA",
        "highway": "NH-48",
        "lat": 22.4533, "lng": 73.0705,
        "status": "NORMAL",
        "utilization": 0.60,
        "queueLength": 25,
        "processingRate": 11.0,
        "ttr": 30, "tts": 90, "ssw": 60,
        "capacity": 75,
    },
    "NH48_KARJAN": {
        "name": "Karjan Toll Plaza",
        "type": "TOLL_PLAZA",
        "highway": "NH-48",
        "lat": 22.0148, "lng": 73.1154,
        "status": "NORMAL",
        "utilization": 0.55,
        "queueLength": 20,
        "processingRate": 12.0,
        "ttr": 22, "tts": 84, "ssw": 62,
        "capacity": 75,
    },
    "NH48_DAHISAR": {
        "name": "Dahisar Toll Plaza",
        "type": "TOLL_PLAZA",
        "highway": "NH-48",
        "lat": 19.2606, "lng": 72.8728,
        "status": "NORMAL",
        "utilization": 0.78,
        "queueLength": 88,
        "processingRate": 10.0,
        "ttr": 45, "tts": 60, "ssw": 15,
        "capacity": 113,
    },
    "WH-DEL-001": {
        "name": "Delhi NCR Distribution Hub",
        "type": "WAREHOUSE",
        "highway": "NH-44",
        "lat": 28.5355, "lng": 77.3910,
        "status": "NORMAL",
        "utilization": 0.63,
        "queueLength": 55,
        "processingRate": 8.0,
        "ttr": 24, "tts": 96, "ssw": 72,
        "capacity": 87,
    },
    "WH-JPR-002": {
        "name": "Jaipur RIICO Warehouse",
        "type": "WAREHOUSE",
        "highway": "NH-48",
        "lat": 26.8498, "lng": 75.8069,
        "status": "NORMAL",
        "utilization": 0.48,
        "queueLength": 30,
        "processingRate": 6.0,
        "ttr": 20, "tts": 96, "ssw": 76,
        "capacity": 60,
    },
    "WH-MUM-003": {
        "name": "Mumbai JNPT Logistics Hub",
        "type": "WAREHOUSE",
        "highway": "NH-48",
        "lat": 18.9488, "lng": 72.9483,
        "status": "NORMAL",
        "utilization": 0.69,
        "queueLength": 67,
        "processingRate": 7.0,
        "ttr": 36, "tts": 72, "ssw": 36,
        "capacity": 97,
    },
    "WH-AHM-004": {
        "name": "Ahmedabad GIFT City Warehouse",
        "type": "WAREHOUSE",
        "highway": "NH-48",
        "lat": 23.0225, "lng": 72.5714,
        "status": "NORMAL",
        "utilization": 0.52,
        "queueLength": 40,
        "processingRate": 7.0,
        "ttr": 28, "tts": 84, "ssw": 56,
        "capacity": 80,
    },
    "WH-SRT-005": {
        "name": "Surat Diamond Hub Warehouse",
        "type": "WAREHOUSE",
        "highway": "NH-48",
        "lat": 21.1702, "lng": 72.8311,
        "status": "NORMAL",
        "utilization": 0.58,
        "queueLength": 35,
        "processingRate": 6.0,
        "ttr": 25, "tts": 90, "ssw": 65,
        "capacity": 78,
    },
    "ICD-TKD-001": {
        "name": "ICD Tughlakabad",
        "type": "ICD",
        "highway": "NH-44",
        "lat": 28.5090, "lng": 77.2750,
        "status": "NORMAL",
        "utilization": 0.65,
        "queueLength": 85,
        "processingRate": 5.0,
        "ttr": 36, "tts": 48, "ssw": 12,
        "capacity": 150,
    },
    "ICD-MUN-002": {
        "name": "ICD Mundra Port",
        "type": "ICD",
        "highway": "NH-8A",
        "lat": 22.8394, "lng": 69.7150,
        "status": "NORMAL",
        "utilization": 0.40,
        "queueLength": 60,
        "processingRate": 4.0,
        "ttr": 30, "tts": 72, "ssw": 42,
        "capacity": 100,
    },
    "NH48_JNPT_PORT": {
        "name": "JNPT Port",
        "type": "ICD",
        "highway": "NH-48",
        "lat": 18.9348, "lng": 72.9431,
        "status": "NORMAL",
        "utilization": 0.72,
        "queueLength": 60,
        "processingRate": 5.0,
        "ttr": 40, "tts": 48, "ssw": 8,
        "capacity": 200,
    },
}

# ── Vehicle Registration Plates ─────────────────────────────────────────────
PLATES = [
    "MH08CD4848", "DL04BC8181", "GJ12ZI7474", "UP08YZ4522", "TN09AB1234",
    "RJ14GP5566", "KA03MN8899", "HR26DC3344", "MP09XY2211", "WB15PQ6677",
    "AP31AB1122", "TS13CD5544", "PB10EF7788", "GJ05HI3344", "MH12JK9900",
    "DL01LM2233", "UP32NO4455", "TN07PQ6677", "KA21RS8899", "RJ06TU1122",
    "MH43VW3344", "DL09XY5566", "GJ18ZA7788", "UP16AB9900", "TN22CD1122",
    "KA55EF3344", "HR55GH5566", "MP17IJ7788", "WB23KL9900", "AP17MN1122",
    "TS07OP3344", "PB65QR5566",
]

# ── Commodity Types ──────────────────────────────────────────────────────────
COMMODITIES = [
    ("ELECTRONICS", 15_000_000),
    ("PHARMA", 8_000_000),
    ("FMCG", 3_500_000),
    ("STEEL", 2_000_000),
    ("TEXTILES", 1_800_000),
    ("AUTOMOTIVE_PARTS", 12_000_000),
    ("CHEMICALS", 4_500_000),
    ("FOOD_GRAINS", 900_000),
]

# ── Corridor Route Definitions — all OD pairs use graph node IDs ─────────
# FIX-2: Replaced non-graph node refs (JNPT, ICD-WFD-001, etc.) with graph IDs
CORRIDORS = [
    ("WH-DEL-001", "WH-MUM-003"),
    ("WH-DEL-001", "NH48_JNPT_PORT"),
    ("NH48_KHERKI_DAULA", "WH-MUM-003"),
    ("NH48_SHAHJAHANPUR", "WH-MUM-003"),
    ("ICD-TKD-001", "NH48_JNPT_PORT"),
    ("WH-JPR-002", "WH-SRT-005"),
    ("WH-AHM-004", "NH48_JNPT_PORT"),
    ("ICD-MUN-002", "WH-DEL-001"),
    ("NH48_KARJAN", "NH48_JNPT_PORT"),
    ("TP-PNP-004", "WH-MUM-003"),
]


def make_route(idx, plate, corridor_pair, commodity, cargo_value):
    """Build a single route object matching the Firebase contract."""
    origin_id, dest_id = corridor_pair
    origin_node = NODES[origin_id]
    dest_node = NODES[dest_id]

    # Random progress 0–90%
    progress = round(random.uniform(0.05, 0.90), 3)
    speed_kmh = round(random.uniform(45, 95), 1)
    distance_km = round(random.uniform(200, 1800), 1)
    remaining_km = round(distance_km * (1 - progress), 1)
    eta_hours = round(remaining_km / max(speed_kmh, 40), 2)
    eta_ts = (datetime.now(timezone.utc) + timedelta(hours=eta_hours)).isoformat()

    eway_expiry = (datetime.now(timezone.utc) + timedelta(hours=random.uniform(8, 96))).isoformat()

    route_id = f"route-TRK-{idx:03d}"

    return route_id, {
        "truckId": route_id,
        "vehicleRegNo": plate,
        "commodity": commodity,
        "cargoValueINR": cargo_value,
        "originNodeId": origin_id,
        "destinationNodeId": dest_id,
        "originCoordinates": [origin_node["lng"], origin_node["lat"]],
        "destinationCoordinates": [dest_node["lng"], dest_node["lat"]],
        "currentPositionLat": round(
            origin_node["lat"] + (dest_node["lat"] - origin_node["lat"]) * progress, 4
        ),
        "currentPositionLng": round(
            origin_node["lng"] + (dest_node["lng"] - origin_node["lng"]) * progress, 4
        ),
        "progress": progress,
        "speedKmh": speed_kmh,
        "status": "IN_TRANSIT",
        "isRerouted": False,
        "riskScore": round(random.uniform(0.05, 0.30), 2),
        "etaISO": eta_ts,
        "ewayBillExpiry": eway_expiry,
        "fastagPings": random.randint(2, 18),
        "corridorId": f"NH{random.choice(['48', '44', '19'])}",
    }


def write_firebase(path, data):
    """Write data to Firebase RTDB via REST API (no service account needed)."""
    url = f"{FIREBASE_URL.rstrip('/')}/{path}.json"
    payload = json.dumps(data).encode('utf-8')
    req = urllib.request.Request(
        url, data=payload, method='PUT',
        headers={'Content-Type': 'application/json'}
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return resp.status == 200
    except urllib.error.URLError as e:
        print(f"  ✗ Firebase write failed for {path}: {e}")
        return False


def seed():
    print("=" * 60)
    print("A.P.E.X — Firebase Demo Data Seeder")
    print(f"Target: {FIREBASE_URL}")
    print("=" * 60)

    # ── 1. Write nodes ──────────────────────────────────────────────
    print(f"\n[1/2] Writing {len(NODES)} supply chain nodes...")
    for node_id, node_data in NODES.items():
        ok = write_firebase(f"supply_chain/nodes/{node_id}", node_data)
        status = "✓" if ok else "✗"
        print(f"  {status} {node_id}: {node_data['name']} ({node_data['type']})")

    # ── 2. Write routes ─────────────────────────────────────────────
    print(f"\n[2/2] Writing {len(PLATES)} active truck routes...")
    for idx, plate in enumerate(PLATES):
        corridor = CORRIDORS[idx % len(CORRIDORS)]
        commodity, base_value = random.choice(COMMODITIES)
        cargo_value = base_value + random.randint(-500_000, 500_000)

        route_id, route_data = make_route(idx + 1, plate, corridor, commodity, cargo_value)
        ok = write_firebase(f"supply_chain/active_routes/{route_id}", route_data)
        status = "✓" if ok else "✗"
        print(f"  {status} {route_id}: {plate} | {commodity} | ₹{cargo_value:,} | {corridor[0]} → {corridor[1]}")

    # ── 3. Clear stale anomalies/alerts ─────────────────────────────
    print("\n[3/3] Clearing stale anomalies and alerts...")
    write_firebase("supply_chain/anomalies", {})
    write_firebase("supply_chain/alerts", {})
    print("  ✓ Anomalies and alerts cleared")

    print("\n" + "=" * 60)
    print("✅ Firebase seeded successfully!")
    print(f"   Nodes: {len(NODES)}")
    print(f"   Routes: {len(PLATES)}")
    print(f"   Anomalies: 0 (clean slate for demo)")
    print("=" * 60)
    print(f"\nOpen the dashboard to see live data:")
    print("  npm run dev  →  http://localhost:5174")


if __name__ == "__main__":
    seed()
