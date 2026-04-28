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

# ── Supply Chain Nodes — Golden Quadrilateral + DFC ─────────────────────────
NODES = {
    "JNPT": {
        "name": "JNPT Nhava Sheva",
        "type": "PORT",
        "highway": "NH-48",
        "lat": 18.945, "lng": 72.944,
        "status": "NORMAL",
        "utilization": 0.72,
        "queueLength": 143,
        "processingRate": 0.58,
        "ttr": 2.4, "tts": 48.0, "ssw": 0.0,
        "capacity": 200,
    },
    "ICD-TKD-001": {
        "name": "ICD Tughlakabad (Delhi)",
        "type": "ICD",
        "highway": "NH-44",
        "lat": 28.509, "lng": 77.275,
        "status": "NORMAL",
        "utilization": 0.65,
        "queueLength": 98,
        "processingRate": 0.62,
        "ttr": 1.8, "tts": 36.0, "ssw": 0.0,
        "capacity": 150,
    },
    "ICD-WFD-001": {
        "name": "ICD Whitefield (Bengaluru)",
        "type": "ICD",
        "highway": "NH-44",
        "lat": 12.966, "lng": 77.750,
        "status": "NORMAL",
        "utilization": 0.58,
        "queueLength": 72,
        "processingRate": 0.70,
        "ttr": 1.2, "tts": 24.0, "ssw": 0.0,
        "capacity": 120,
    },
    "NH48_KHERKI_DAULA": {
        "name": "Kherki Daula Toll Plaza",
        "type": "TOLL_PLAZA",
        "highway": "NH-48",
        "lat": 28.395, "lng": 76.985,
        "status": "NORMAL",
        "utilization": 0.51,
        "queueLength": 34,
        "processingRate": 0.85,
        "ttr": 0.4, "tts": 8.0, "ssw": 0.0,
        "capacity": 65,
    },
    "NH48_SHAHJAHANPUR": {
        "name": "Shahjahanpur Toll Plaza",
        "type": "TOLL_PLAZA",
        "highway": "NH-48",
        "lat": 27.895, "lng": 76.625,
        "status": "NORMAL",
        "utilization": 0.47,
        "queueLength": 28,
        "processingRate": 0.88,
        "ttr": 0.3, "tts": 6.0, "ssw": 0.0,
        "capacity": 60,
    },
    "NH48_KARJAN": {
        "name": "Karjan Toll Plaza (NH-48)",
        "type": "TOLL_PLAZA",
        "highway": "NH-48",
        "lat": 22.015, "lng": 73.123,
        "status": "NORMAL",
        "utilization": 0.60,
        "queueLength": 45,
        "processingRate": 0.80,
        "ttr": 0.6, "tts": 12.0, "ssw": 0.0,
        "capacity": 75,
    },
    "WH-DEL-001": {
        "name": "Delhi Logistics Hub",
        "type": "WAREHOUSE",
        "highway": "NH-44",
        "lat": 28.703, "lng": 77.102,
        "status": "NORMAL",
        "utilization": 0.63,
        "queueLength": 55,
        "processingRate": 0.75,
        "ttr": 1.5, "tts": 72.0, "ssw": 0.0,
        "capacity": 87,
    },
    "WH-MUM-003": {
        "name": "Bhiwandi Mega Warehouse",
        "type": "WAREHOUSE",
        "highway": "NH-48",
        "lat": 19.296, "lng": 73.063,
        "status": "NORMAL",
        "utilization": 0.69,
        "queueLength": 67,
        "processingRate": 0.72,
        "ttr": 1.9, "tts": 48.0, "ssw": 0.0,
        "capacity": 97,
    },
    "TP-PNP-004": {
        "name": "Panipat Toll Plaza",
        "type": "TOLL_PLAZA",
        "highway": "NH-44",
        "lat": 29.387, "lng": 76.970,
        "status": "NORMAL",
        "utilization": 0.45,
        "queueLength": 22,
        "processingRate": 0.90,
        "ttr": 0.25, "tts": 4.0, "ssw": 0.0,
        "capacity": 50,
    },
    "NH44_NAGPUR": {
        "name": "Nagpur Interchange",
        "type": "INTERCHANGE",
        "highway": "NH-44",
        "lat": 21.146, "lng": 79.088,
        "status": "NORMAL",
        "utilization": 0.48,
        "queueLength": 30,
        "processingRate": 0.82,
        "ttr": 0.4, "tts": 8.0, "ssw": 0.0,
        "capacity": 65,
    },
    "NH44_HYDERABAD": {
        "name": "Shamshabad Toll (Hyd)",
        "type": "TOLL_PLAZA",
        "highway": "NH-44",
        "lat": 17.237, "lng": 78.429,
        "status": "NORMAL",
        "utilization": 0.55,
        "queueLength": 40,
        "processingRate": 0.78,
        "ttr": 0.5, "tts": 10.0, "ssw": 0.0,
        "capacity": 72,
    },
    "ICD-SURAT": {
        "name": "Surat Diamond Hub",
        "type": "WAREHOUSE",
        "highway": "NH-48",
        "lat": 21.170, "lng": 72.831,
        "status": "NORMAL",
        "utilization": 0.67,
        "queueLength": 52,
        "processingRate": 0.73,
        "ttr": 1.4, "tts": 36.0, "ssw": 0.0,
        "capacity": 78,
    },
    "NH48_DAHISAR": {
        "name": "Dahisar Toll Plaza (Mumbai)",
        "type": "TOLL_PLAZA",
        "highway": "NH-48",
        "lat": 19.248, "lng": 72.854,
        "status": "NORMAL",
        "utilization": 0.78,
        "queueLength": 88,
        "processingRate": 0.60,
        "ttr": 1.5, "tts": 18.0, "ssw": 0.0,
        "capacity": 113,
    },
    "DFC-REWARI": {
        "name": "DFC Rewari Junction",
        "type": "RAIL_ICD",
        "highway": "DFC-WESTERN",
        "lat": 28.197, "lng": 76.617,
        "status": "NORMAL",
        "utilization": 0.40,
        "queueLength": 18,
        "processingRate": 0.92,
        "ttr": 0.2, "tts": 24.0, "ssw": 0.0,
        "capacity": 45,
    },
    "NH48_THIKARIYA": {
        "name": "Thikariya Toll (Jaipur)",
        "type": "TOLL_PLAZA",
        "highway": "NH-48",
        "lat": 26.832, "lng": 75.813,
        "status": "NORMAL",
        "utilization": 0.53,
        "queueLength": 36,
        "processingRate": 0.84,
        "ttr": 0.45, "tts": 9.0, "ssw": 0.0,
        "capacity": 68,
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

# ── Corridor Route Definitions ───────────────────────────────────────────────
CORRIDORS = [
    ("NH48_KHERKI_DAULA", "WH-MUM-003"),
    ("NH48_SHAHJAHANPUR", "WH-MUM-003"),
    ("WH-DEL-001", "JNPT"),
    ("WH-DEL-001", "ICD-WFD-001"),
    ("ICD-TKD-001", "ICD-WFD-001"),
    ("NH44_NAGPUR", "JNPT"),
    ("NH44_HYDERABAD", "JNPT"),
    ("ICD-SURAT", "ICD-TKD-001"),
    ("DFC-REWARI", "JNPT"),
    ("NH48_KARJAN", "JNPT"),
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
