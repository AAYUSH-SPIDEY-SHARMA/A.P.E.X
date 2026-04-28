"""
A.P.E.X — Automated Predictive Expressway Routing
FASTag RFID Telemetry Simulator

Generates realistic FASTag toll plaza ping events simulating trucks
traversing the Indian highway network (Golden Quadrilateral corridor).

Based on blueprint Section 10.2 (NPCI NETC ICD 2.5 schema) and
Section 12.2 (simulator specification).

Modes:
  - console: prints events to stdout (for testing without GCP)
  - pubsub:  publishes to Google Cloud Pub/Sub topic
  - firebase: writes directly to Firebase RTDB (for local integration testing)

Usage:
  python fastag_simulator.py --mode console --rate 5 --duration 30
  python fastag_simulator.py --mode pubsub --project apex-digital-twin --rate 10
  python fastag_simulator.py --mode firebase --duration 60
"""

import asyncio
import argparse
import json
import math
import random
import sys
import uuid
import os
from datetime import datetime, timezone, timedelta
from typing import Optional

# ---------------------------------------------------------------------------
# TOLL PLAZA DEFINITIONS — 7 real NHAI toll plazas on the Golden Quadrilateral
# Coordinates verified against NHAI public data.
# Blueprint: Section 10.1 (TollPlazas table), Section 7.2 (Haversine).
# ---------------------------------------------------------------------------

TOLL_PLAZAS = [
    {
        "tollPlazaId": "TP-KHD-001",
        "tollPlazaName": "Kherki Daula Toll Plaza",
        "lat": 28.4167,
        "lng": 77.0500,
        "highway": "NH-48",
        "lanes": ["N", "S"],
    },
    {
        "tollPlazaId": "TP-MNR-002",
        "tollPlazaName": "Manesar Toll Plaza",
        "lat": 28.3570,
        "lng": 76.9340,
        "highway": "NH-48",
        "lanes": ["N", "S"],
    },
    {
        "tollPlazaId": "TP-JPR-003",
        "tollPlazaName": "Shahpura Toll Plaza",
        "lat": 26.9124,
        "lng": 75.7873,
        "highway": "NH-48",
        "lanes": ["N", "S", "E", "W"],
    },
    {
        "tollPlazaId": "TP-PNP-004",
        "tollPlazaName": "Panipat Toll Plaza",
        "lat": 29.3909,
        "lng": 76.9635,
        "highway": "NH-44",
        "lanes": ["N", "S"],
    },
    {
        "tollPlazaId": "TP-VDR-005",
        "tollPlazaName": "Vadodara Toll Plaza",
        "lat": 22.3072,
        "lng": 73.1812,
        "highway": "NH-48",
        "lanes": ["N", "S", "E", "W"],
    },
    {
        "tollPlazaId": "TP-SRT-006",
        "tollPlazaName": "Surat Toll Plaza",
        "lat": 21.1702,
        "lng": 72.8311,
        "highway": "NH-48",
        "lanes": ["N", "S"],
    },
    {
        "tollPlazaId": "TP-MUM-007",
        "tollPlazaName": "Mumbai Entry Toll Plaza",
        "lat": 19.2183,
        "lng": 72.9781,
        "highway": "NH-48",
        "lanes": ["N", "S"],
    },
]

# ---------------------------------------------------------------------------
# REAL TRAFFIC DENSITY — Google Maps Routes API Integration (Phase 5)
# Uses real-world traffic conditions to modulate FASTag event rates.
# ---------------------------------------------------------------------------

# Per-plaza density factor (1.0 = normal, >1.0 = congested, <1.0 = empty)
_traffic_density: dict = {}  # tollPlazaId -> float
_TRAFFIC_FETCH_INTERVAL = 60  # seconds between API calls


async def fetch_real_traffic_density(api_key: str):
    """
    Calls Google Maps Routes API to estimate real traffic density
    at each toll plaza. Compares durationInTraffic vs staticDuration
    to derive a congestion ratio.

    Runs in a background loop, updating _traffic_density every 60 seconds.
    """
    import aiohttp

    while True:
        try:
            async with aiohttp.ClientSession() as session:
                for i in range(len(TOLL_PLAZAS) - 1):
                    origin = TOLL_PLAZAS[i]
                    dest = TOLL_PLAZAS[i + 1]

                    payload = {
                        "origin": {
                            "location": {
                                "latLng": {"latitude": origin["lat"], "longitude": origin["lng"]}
                            }
                        },
                        "destination": {
                            "location": {
                                "latLng": {"latitude": dest["lat"], "longitude": dest["lng"]}
                            }
                        },
                        "travelMode": "DRIVE",
                        "routingPreference": "TRAFFIC_AWARE",
                    }

                    headers = {
                        "Content-Type": "application/json",
                        "X-Goog-Api-Key": api_key,
                        "X-Goog-FieldMask": "routes.duration,routes.staticDuration",
                    }

                    async with session.post(
                        "https://routes.googleapis.com/directions/v2:computeRoutes",
                        json=payload,
                        headers=headers,
                    ) as resp:
                        if resp.status == 200:
                            data = await resp.json()
                            routes = data.get("routes", [])
                            if routes:
                                # Parse durations (format: "1234s")
                                dur_str = routes[0].get("duration", "0s").rstrip("s")
                                static_str = routes[0].get("staticDuration", "0s").rstrip("s")
                                dur = float(dur_str) if dur_str else 1.0
                                static = float(static_str) if static_str else 1.0

                                # Congestion ratio: traffic_time / normal_time
                                ratio = dur / static if static > 0 else 1.0
                                ratio = max(0.3, min(2.0, ratio))  # clamp

                                _traffic_density[origin["tollPlazaId"]] = ratio

                                print(
                                    f"  [TRAFFIC] {origin['tollPlazaName']}: "
                                    f"density={ratio:.2f}x "
                                    f"(traffic={dur:.0f}s vs normal={static:.0f}s)"
                                )
                        else:
                            print(f"  [TRAFFIC] API error {resp.status} for {origin['tollPlazaName']}")

                    await asyncio.sleep(0.5)  # Rate limit between requests

        except Exception as e:
            print(f"  [TRAFFIC] Error fetching traffic data: {e}")

        await asyncio.sleep(_TRAFFIC_FETCH_INTERVAL)

# ---------------------------------------------------------------------------
# TRUCK FLEET — 50 simulated trucks with Indian registration format
# Format from blueprint Section 10.2: ^[A-Z]{2}[0-9]{2}[A-Z]{1,2}[0-9]{4}$
# ---------------------------------------------------------------------------

STATE_CODES = ["MH", "DL", "GJ", "RJ", "KA", "TN", "UP", "HR", "MP", "AP"]
RTO_CODES = ["01", "02", "04", "06", "09", "12", "14", "20"]
LETTER_COMBOS = ["AB", "CD", "EF", "GH", "KL", "MN", "PQ", "RS", "TU", "XY"]

# Vehicle classes from NHAI axle-based classification
VEHICLE_CLASSES = ["VC4", "VC5", "VC6", "VC7"]  # 3-axle to 7-axle trucks

# Commodity types for eWay Bill integration (Section 10.3)
COMMODITIES = [
    {"hsn": "8703", "desc": "Auto Parts (JIT)", "valueRange": [500000, 2500000]},
    {"hsn": "3004", "desc": "Pharmaceuticals", "valueRange": [800000, 5000000]},
    {"hsn": "1001", "desc": "Wheat/Grain (FCI)", "valueRange": [200000, 800000]},
    {"hsn": "2710", "desc": "Petroleum Products", "valueRange": [1000000, 8000000]},
    {"hsn": "7208", "desc": "Steel Coils", "valueRange": [600000, 3000000]},
    {"hsn": "6109", "desc": "Textiles/Garments", "valueRange": [300000, 1500000]},
    {"hsn": "8471", "desc": "Electronics/IT Equipment", "valueRange": [1500000, 10000000]},
    {"hsn": "0402", "desc": "Dairy Products (Cold Chain)", "valueRange": [400000, 2000000]},
]


def generate_truck_fleet(count: int = 50) -> list:
    """Generate a fleet of trucks with realistic Indian registrations."""
    trucks = []
    for i in range(count):
        state = random.choice(STATE_CODES)
        rto = random.choice(RTO_CODES)
        letters = random.choice(LETTER_COMBOS)
        number = random.randint(1000, 9999)
        reg_no = f"{state}{rto}{letters}{number}"

        commodity = random.choice(COMMODITIES)
        cargo_value = random.randint(commodity["valueRange"][0], commodity["valueRange"][1])

        # Assign a route: pick a starting toll plaza index
        start_idx = random.randint(0, len(TOLL_PLAZAS) - 2)
        # Direction: either forward or backward through the plaza list
        direction = random.choice([1, -1])

        trucks.append({
            "truckId": f"TRK-{i+1:03d}",
            "vehicleRegNo": reg_no,
            "tagId": uuid.uuid4().hex[:16].upper(),
            "vehicleClass": random.choice(VEHICLE_CLASSES),
            "currentPlazaIndex": start_idx,
            "direction": direction,
            "commodity": commodity,
            "cargoValueINR": cargo_value,
            "ewayBillNo": random.randint(1000000000, 9999999999),
            "lastPingTime": None,
        })
    return trucks


def haversine_distance_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """
    Calculate great-circle distance between two points.
    Blueprint Section 7.2: Haversine formula for velocity interpolation.
    """
    R = 6371.0  # Earth radius in km
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lng2 - lng1)

    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


def generate_fastag_event(truck: dict, plaza: dict) -> dict:
    """
    Generate a single FASTag telemetry event following the
    NPCI NETC ICD 2.5 schema (blueprint Section 10.2).

    All required fields from the JSON schema are included:
    seqNo, vehicleRegNo, tollPlazaId, tollPlazaGeocode, readerReadTime, vehicleClass
    """
    now = datetime.now(timezone.utc)

    event = {
        "seqNo": str(uuid.uuid4()),
        "vehicleRegNo": truck["vehicleRegNo"],
        "tagId": truck["tagId"],
        "tollPlazaId": plaza["tollPlazaId"],
        "tollPlazaName": plaza["tollPlazaName"],
        "tollPlazaGeocode": f"{plaza['lat']},{plaza['lng']}",
        "laneDirection": random.choice(plaza["lanes"]),
        "vehicleClass": truck["vehicleClass"],
        "readerReadTime": now.strftime("%Y-%m-%dT%H:%M:%S.") + f"{now.microsecond // 1000:03d}Z",
        "signatureAuthStatus": "SUCCESS",
        # --- Extended fields (for downstream processing) ---
        "truckId": truck["truckId"],
        "cargoValueINR": truck["cargoValueINR"],
        "ewayBillNo": truck["ewayBillNo"],
        "commodity": truck["commodity"]["desc"],
    }
    return event


def interpolate_position(plaza1: dict, plaza2: dict, progress: float) -> list:
    """Linearly interpolate truck position between two toll plazas."""
    lat = plaza1["lat"] + (plaza2["lat"] - plaza1["lat"]) * progress
    lng = plaza1["lng"] + (plaza2["lng"] - plaza1["lng"]) * progress
    return [round(lng, 4), round(lat, 4)]  # [lng, lat] for GeoJSON


def create_firebase_route_entry(truck: dict, current_plaza: dict, next_plaza: Optional[dict]) -> dict:
    """
    Create an active_routes entry matching the Firebase RTDB contract
    (blueprint Section 10.5 / shared/firebase-contract.json).
    """
    origin = TOLL_PLAZAS[0] if truck["direction"] == 1 else TOLL_PLAZAS[-1]
    dest = TOLL_PLAZAS[-1] if truck["direction"] == 1 else TOLL_PLAZAS[0]

    # Estimate position — progress along current segment
    progress = random.uniform(0.1, 0.9)
    target = next_plaza if next_plaza else current_plaza
    current_pos = interpolate_position(current_plaza, target, progress)

    # Estimate ETA (rough: remaining distance / avg speed 50 km/h)
    remaining_km = haversine_distance_km(
        current_pos[1], current_pos[0], dest["lat"], dest["lng"]
    )
    eta_hours = remaining_km / 50.0
    eta = datetime.now(timezone.utc) + timedelta(hours=eta_hours)

    return {
        "truckId": truck["truckId"],
        "vehicleRegNo": truck["vehicleRegNo"],
        "originCoordinates": [origin["lng"], origin["lat"]],
        "destinationCoordinates": [dest["lng"], dest["lat"]],
        "currentPosition": current_pos,
        "status": "NORMAL",
        "isRerouted": False,
        "cargoValueINR": truck["cargoValueINR"],
        "ewayBillNo": truck["ewayBillNo"],
        "eta": eta.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "riskScore": round(random.uniform(0.05, 0.35), 2),
    }


def create_firebase_node_entry(plaza: dict) -> dict:
    """
    Create a nodes/ entry matching the Firebase RTDB contract
    (blueprint Section 10.5).

    Generates realistic queue and utilization values.
    """
    utilization = round(random.uniform(0.3, 0.85), 2)
    queue_length = random.randint(5, 80)

    # TTS and TTR from blueprint Section 7.11
    tts = random.randint(24, 120)  # hours
    ttr = random.randint(12, 96)   # hours

    status = "NORMAL"
    if utilization > 0.85:
        status = "DISRUPTED"
    elif utilization > 0.70:
        status = "DELAYED"

    return {
        "type": "TOLL_PLAZA",
        "name": plaza["tollPlazaName"],
        "lat": plaza["lat"],
        "lng": plaza["lng"],
        "status": status,
        "utilization": utilization,
        "queueLength": queue_length,
        "tts": tts,
        "ttr": ttr,
    }


# ---------------------------------------------------------------------------
# OUTPUT MODES
# ---------------------------------------------------------------------------

class ConsolePublisher:
    """Prints events to stdout for local testing (no GCP needed)."""

    def __init__(self):
        self.event_count = 0

    async def publish(self, event: dict):
        self.event_count += 1
        color = "\033[92m" if event["signatureAuthStatus"] == "SUCCESS" else "\033[91m"
        reset = "\033[0m"
        print(
            f"{color}[{self.event_count:04d}]{reset} "
            f"{event['vehicleRegNo']} @ {event['tollPlazaName']} "
            f"[{event['vehicleClass']}] "
            f"lane={event['laneDirection']} "
            f"time={event['readerReadTime']}"
        )

    async def close(self):
        print(f"\n[OK] Total events published: {self.event_count}")


class HttpPublisher:
    """Publishes events to the A.P.E.X backend via HTTP POST /process."""

    def __init__(self, base_url: str = "http://localhost:8080"):
        self.base_url = base_url
        self.event_count = 0
        self.errors = 0
        self._session = None
        print(f"[HTTP] Sending events to: {self.base_url}/process")

    async def _get_session(self):
        if self._session is None:
            import aiohttp
            self._session = aiohttp.ClientSession()
        return self._session

    async def publish(self, event: dict):
        self.event_count += 1
        try:
            session = await self._get_session()
            async with session.post(
                f"{self.base_url}/process",
                json=event,
                timeout=__import__('aiohttp').ClientTimeout(total=5),
            ) as resp:
                if resp.status != 200:
                    self.errors += 1
                elif self.event_count % 50 == 0:
                    data = await resp.json()
                    status = data.get("node_status", "?")
                    util = data.get("node_utilization", 0)
                    print(
                        f"  [HTTP] {self.event_count} events | "
                        f"{event['vehicleRegNo']} @ {event['tollPlazaName']} | "
                        f"status={status} util={util:.2f}"
                    )
        except Exception as e:
            self.errors += 1
            if self.errors <= 3:
                print(f"  [HTTP] Error: {e}")

    async def close(self):
        if self._session:
            await self._session.close()
        print(f"\n[OK] Total events sent via HTTP: {self.event_count} (errors: {self.errors})")


class PubSubPublisher:
    """Publishes events to Google Cloud Pub/Sub topic."""

    def __init__(self, project_id: str, topic_id: str = "fastag-telemetry-stream"):
        try:
            from google.cloud import pubsub_v1
        except ImportError:
            print("[ERROR] google-cloud-pubsub not installed. Run: pip install google-cloud-pubsub")
            sys.exit(1)

        self.publisher = pubsub_v1.PublisherClient()
        self.topic_path = self.publisher.topic_path(project_id, topic_id)
        self.event_count = 0
        print(f"[PUBSUB] Publishing to Pub/Sub: {self.topic_path}")

    async def publish(self, event: dict):
        data = json.dumps(event).encode("utf-8")
        # Pub/Sub publish is synchronous, wrap in executor for async
        loop = asyncio.get_event_loop()
        future = await loop.run_in_executor(
            None,
            lambda: self.publisher.publish(
                self.topic_path,
                data,
                vehicleRegNo=event["vehicleRegNo"],
                tollPlazaId=event["tollPlazaId"],
            )
        )
        self.event_count += 1
        if self.event_count % 50 == 0:
            print(f"  [PUBSUB] Published {self.event_count} events...")

    async def close(self):
        print(f"\n[OK] Total events published to Pub/Sub: {self.event_count}")


class FirebasePublisher:
    """Writes events + route state directly to Firebase RTDB."""

    def __init__(self, database_url: Optional[str] = None):
        try:
            import firebase_admin
            from firebase_admin import credentials, db
        except ImportError:
            print("[ERROR] firebase-admin not installed. Run: pip install firebase-admin")
            sys.exit(1)

        # Initialize Firebase (uses GOOGLE_APPLICATION_CREDENTIALS env var)
        if not firebase_admin._apps:
            if database_url:
                firebase_admin.initialize_app(None, {"databaseURL": database_url})
            else:
                # Default to emulator URL
                firebase_admin.initialize_app(None, {
                    "databaseURL": "http://127.0.0.1:9000"
                })

        self.db = db
        self.event_count = 0
        print(f"[FIREBASE] Publishing to Firebase RTDB")

    async def publish(self, event: dict):
        """Write event as a telemetry log entry."""
        self.db.reference(f"supply_chain/telemetry/{event['seqNo']}").set(event)
        self.event_count += 1

    async def publish_route(self, route_id: str, route_data: dict):
        """Write/update active route entry per firebase-contract.json."""
        self.db.reference(f"supply_chain/active_routes/{route_id}").set(route_data)

    async def publish_node(self, node_id: str, node_data: dict):
        """Write/update node entry per firebase-contract.json."""
        self.db.reference(f"supply_chain/nodes/{node_id}").set(node_data)

    async def close(self):
        print(f"\n[OK] Total events written to Firebase: {self.event_count}")


# ---------------------------------------------------------------------------
# MAIN SIMULATION LOOP
# ---------------------------------------------------------------------------

async def run_simulation(
    publisher,
    rate: int = 10,
    duration: int = 60,
    truck_count: int = 50,
):
    """
    Run the FASTag telemetry simulation.

    Args:
        publisher: Output handler (ConsolePublisher, PubSubPublisher, or FirebasePublisher)
        rate: Events per second
        duration: Total simulation duration in seconds
        truck_count: Number of simulated trucks
    """
    trucks = generate_truck_fleet(truck_count)
    base_interval = 1.0 / rate if rate > 0 else 1.0
    total_events = rate * duration

    print(f"\n[APEX] A.P.E.X FASTag Simulator")
    print(f"   Trucks: {truck_count}")
    print(f"   Toll plazas: {len(TOLL_PLAZAS)}")
    print(f"   Rate: {rate} events/sec")
    print(f"   Duration: {duration} seconds")
    print(f"   Expected events: ~{total_events}")
    print(f"   {'=' * 50}\n")

    # Seed initial node states to Firebase if in firebase mode
    if hasattr(publisher, 'publish_node'):
        print("[FIREBASE] Seeding initial node states to Firebase RTDB...")
        for plaza in TOLL_PLAZAS:
            node_data = create_firebase_node_entry(plaza)
            await publisher.publish_node(plaza["tollPlazaId"], node_data)
        print(f"   [OK] {len(TOLL_PLAZAS)} nodes seeded\n")

        # Seed initial routes
        print("[FIREBASE] Seeding initial active routes to Firebase RTDB...")
        for truck in trucks[:20]:  # Seed first 20 trucks as active routes
            plaza = TOLL_PLAZAS[truck["currentPlazaIndex"]]
            next_idx = truck["currentPlazaIndex"] + truck["direction"]
            next_plaza = TOLL_PLAZAS[next_idx] if 0 <= next_idx < len(TOLL_PLAZAS) else None
            route_data = create_firebase_route_entry(truck, plaza, next_plaza)
            await publisher.publish_route(f"route-{truck['truckId']}", route_data)
        print(f"   [OK] 20 active routes seeded\n")

    event_count = 0
    start_time = asyncio.get_event_loop().time()

    try:
        while True:
            elapsed = asyncio.get_event_loop().time() - start_time
            if elapsed >= duration:
                break

            # Pick a random truck and generate its next ping
            truck = random.choice(trucks)
            plaza = TOLL_PLAZAS[truck["currentPlazaIndex"]]

            event = generate_fastag_event(truck, plaza)
            await publisher.publish(event)
            event_count += 1

            # Modulate event rate based on real traffic density for this plaza
            density = _traffic_density.get(plaza["tollPlazaId"], 1.0)
            # Higher density = shorter interval = more events (congestion simulation)
            interval = base_interval / density

            # Advance truck to next toll plaza (simulates movement)
            next_idx = truck["currentPlazaIndex"] + truck["direction"]
            if 0 <= next_idx < len(TOLL_PLAZAS):
                truck["currentPlazaIndex"] = next_idx
            else:
                # Truck reached end of route, reverse direction
                truck["direction"] *= -1

            truck["lastPingTime"] = event["readerReadTime"]

            # Update Firebase route if in firebase mode
            if hasattr(publisher, 'publish_route') and random.random() < 0.3:
                next_idx2 = truck["currentPlazaIndex"] + truck["direction"]
                next_plaza = TOLL_PLAZAS[next_idx2] if 0 <= next_idx2 < len(TOLL_PLAZAS) else None
                route_data = create_firebase_route_entry(truck, plaza, next_plaza)
                await publisher.publish_route(f"route-{truck['truckId']}", route_data)

            # Update Firebase node utilization periodically
            if hasattr(publisher, 'publish_node') and event_count % 20 == 0:
                rand_plaza = random.choice(TOLL_PLAZAS)
                node_data = create_firebase_node_entry(rand_plaza)
                await publisher.publish_node(rand_plaza["tollPlazaId"], node_data)

            await asyncio.sleep(interval)

    except KeyboardInterrupt:
        print("\n[WARN] Simulation interrupted by user")

    await publisher.close()
    print(f"[TIME] Simulation ran for {elapsed:.1f} seconds")
    return event_count


# ---------------------------------------------------------------------------
# CLI ENTRY POINT
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="A.P.E.X FASTag RFID Telemetry Simulator",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Console mode (no GCP needed — test immediately):
  python fastag_simulator.py --mode console --rate 5 --duration 10

  # Pub/Sub mode (requires GCP project):
  python fastag_simulator.py --mode pubsub --project apex-digital-twin --rate 10

  # Firebase mode (requires Firebase emulator or credentials):
  python fastag_simulator.py --mode firebase --duration 60

  # High-throughput stress test:
  python fastag_simulator.py --mode console --rate 100 --duration 5 --trucks 100
        """,
    )

    parser.add_argument(
        "--mode",
        choices=["console", "http", "pubsub", "firebase"],
        default="console",
        help="Output mode (default: console)",
    )
    parser.add_argument(
        "--rate",
        type=int,
        default=10,
        help="Events per second (default: 10)",
    )
    parser.add_argument(
        "--duration",
        type=int,
        default=30,
        help="Simulation duration in seconds (default: 30)",
    )
    parser.add_argument(
        "--trucks",
        type=int,
        default=50,
        help="Number of simulated trucks (default: 50)",
    )
    parser.add_argument(
        "--project",
        type=str,
        default="apex-digital-twin",
        help="GCP project ID (for pubsub mode)",
    )
    parser.add_argument(
        "--topic",
        type=str,
        default="fastag-telemetry-stream",
        help="Pub/Sub topic name (default: fastag-telemetry-stream)",
    )
    parser.add_argument(
        "--firebase-url",
        type=str,
        default=None,
        help="Firebase RTDB URL (default: http://127.0.0.1:9000 for emulator)",
    )
    parser.add_argument(
        "--real-traffic",
        action="store_true",
        help="Enable real Google Maps traffic density modulation (requires GOOGLE_MAPS_API_KEY env var)",
    )

    args = parser.parse_args()

    # Create publisher based on mode
    if args.mode == "console":
        publisher = ConsolePublisher()
    elif args.mode == "http":
        publisher = HttpPublisher()
    elif args.mode == "pubsub":
        publisher = PubSubPublisher(args.project, args.topic)
    elif args.mode == "firebase":
        publisher = FirebasePublisher(args.firebase_url)
    else:
        print(f"[ERROR] Unknown mode: {args.mode}")
        sys.exit(1)

    # Start real traffic density loop if enabled
    traffic_task = None
    if args.real_traffic:
        api_key = os.getenv("GOOGLE_MAPS_API_KEY") or os.getenv("VITE_GOOGLE_MAPS_API_KEY")
        if api_key:
            print("[TRAFFIC] REAL TRAFFIC DATA ENABLED -- Google Maps Routes API")
            print(f"   Fetching live density every {_TRAFFIC_FETCH_INTERVAL}s...")

            async def run_with_traffic():
                traffic = asyncio.create_task(fetch_real_traffic_density(api_key))
                try:
                    await run_simulation(
                        publisher=publisher,
                        rate=args.rate,
                        duration=args.duration,
                        truck_count=args.trucks,
                    )
                finally:
                    traffic.cancel()

            asyncio.run(run_with_traffic())
        else:
            print("[TRAFFIC] WARNING: --real-traffic set but no GOOGLE_MAPS_API_KEY found. Using simulated density.")
            asyncio.run(run_simulation(
                publisher=publisher,
                rate=args.rate,
                duration=args.duration,
                truck_count=args.trucks,
            ))
    else:
        # Run simulation without real traffic
        asyncio.run(run_simulation(
            publisher=publisher,
            rate=args.rate,
            duration=args.duration,
            truck_count=args.trucks,
        ))


if __name__ == "__main__":
    main()
