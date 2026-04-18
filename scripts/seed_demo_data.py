"""
A.P.E.X — Pre-seed Firebase RTDB with demo data.
Seeds 15 nodes (from highway graph) + 30 truck routes along NH-48.

Usage:
    python scripts/seed_demo_data.py
    python scripts/seed_demo_data.py --reset  (clears data first)
"""
import json
import sys
import os
import random

try:
    import httpx
except ImportError:
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "httpx"])
    import httpx

FIREBASE_URL = "https://project-96d2fc7b-e1a1-418a-87a-default-rtdb.asia-southeast1.firebasedatabase.app"

# ── Load real nodes from highway graph ──────────────────────────────
GRAPH_PATH = os.path.join(os.path.dirname(__file__), "..", "backend", "graph", "highway_graph.json")
with open(GRAPH_PATH, "r") as f:
    graph = json.load(f)

print(f"[APEX] Loaded {len(graph['nodes'])} nodes from highway_graph.json")

# ── Reset if requested ──────────────────────────────────────────────
if "--reset" in sys.argv:
    print("[APEX] Resetting supply_chain data...")
    r = httpx.delete(f"{FIREBASE_URL}/supply_chain.json")
    print(f"[APEX] Reset: {r.status_code}")

# ── Seed Nodes ──────────────────────────────────────────────────────
print("\n[APEX] Seeding nodes...")
nodes_data = {}
for node in graph["nodes"]:
    node_id = node["id"]
    # Give each node a realistic baseline utilization
    base_util = round(random.uniform(0.25, 0.65), 2)
    queue = int(base_util * 50)
    
    status = "NORMAL"
    if base_util > 0.85:
        status = "DISRUPTED"
    elif base_util > 0.70:
        status = "DELAYED"
    
    nodes_data[node_id] = {
        "type": node["type"],
        "name": node["name"],
        "lat": node["lat"],
        "lng": node["lng"],
        "status": status,
        "utilization": base_util,
        "queueLength": queue,
        "tts": random.randint(48, 96),
        "ttr": random.randint(12, 48),
        "ssw": round(random.uniform(0.6, 1.0), 2),
        "lastUpdated": "2026-04-18T21:00:00Z"
    }

# Write all nodes at once (batch)
r = httpx.put(f"{FIREBASE_URL}/supply_chain/nodes.json", json=nodes_data)
print(f"[APEX] Seeded {len(nodes_data)} nodes: {r.status_code}")

# ── Seed Truck Routes ───────────────────────────────────────────────
print("\n[APEX] Seeding truck routes...")

# Real Indian cities along NH-48 corridor
origins = [
    {"name": "Delhi", "coords": [77.1025, 28.7041]},
    {"name": "Gurgaon", "coords": [77.0266, 28.4595]},
    {"name": "Jaipur", "coords": [75.7873, 26.9124]},
]
destinations = [
    {"name": "Mumbai", "coords": [72.8777, 19.0760]},
    {"name": "Ahmedabad", "coords": [72.5714, 23.0225]},
    {"name": "Surat", "coords": [72.8311, 21.1702]},
    {"name": "Vadodara", "coords": [73.1812, 22.3072]},
]

commodities = ["Auto Parts", "Electronics", "Textiles", "Pharmaceuticals", "FMCG", "Steel", "Chemicals", "Agri-produce"]
vehicle_classes = ["HCV", "LCV", "MAV"]
states = ["MH", "RJ", "GJ", "DL", "HR", "UP", "MP"]

routes_data = {}
for i in range(30):
    origin = random.choice(origins)
    dest = random.choice(destinations)
    
    # Interpolate current position between origin and destination
    progress = random.uniform(0.1, 0.9)
    cur_lng = origin["coords"][0] + (dest["coords"][0] - origin["coords"][0]) * progress
    cur_lat = origin["coords"][1] + (dest["coords"][1] - origin["coords"][1]) * progress
    
    route_id = f"route-TRK-{i+1:03d}"
    risk = round(random.uniform(0.05, 0.55), 2)
    
    routes_data[route_id] = {
        "truckId": f"TRK-{i+1:03d}",
        "vehicleRegNo": f"{random.choice(states)}{random.randint(1,20):02d}{chr(65+i%26)}{chr(66+i%26)}{random.randint(1000,9999)}",
        "originCoordinates": origin["coords"],
        "destinationCoordinates": dest["coords"],
        "currentPosition": [round(cur_lng, 4), round(cur_lat, 4)],
        "status": "NORMAL",
        "isRerouted": False,
        "cargoValueINR": random.randint(3, 15) * 100000,
        "ewayBillNo": 3410000000 + i,
        "eta": "2026-04-19T14:00:00Z",
        "riskScore": risk,
        "commodity": random.choice(commodities),
        "vehicleClass": random.choice(vehicle_classes),
    }

# Write all routes at once (batch)
r = httpx.put(f"{FIREBASE_URL}/supply_chain/active_routes.json", json=routes_data)
print(f"[APEX] Seeded {len(routes_data)} truck routes: {r.status_code}")

# ── Verify ──────────────────────────────────────────────────────────
print("\n[APEX] Verifying...")
nodes_check = httpx.get(f"{FIREBASE_URL}/supply_chain/nodes.json").json()
routes_check = httpx.get(f"{FIREBASE_URL}/supply_chain/active_routes.json").json()
print(f"[APEX] Firebase has {len(nodes_check)} nodes and {len(routes_check)} routes")
print("[APEX] Demo data seeded successfully!")
