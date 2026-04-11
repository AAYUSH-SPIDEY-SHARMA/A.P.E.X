# A.P.E.X — Member 1 (Aayush) Complete Guide

## Backend & Cloud Infrastructure Engineer

> **Read this ENTIRE document before writing any code.**
> This guide replaces the need to read the full 3000-line blueprint.
> Section numbers like `(S10.2)` refer to the main `A.P.E.X.md` blueprint for deeper details.

---

## TABLE OF CONTENTS

1. [Your Role — What You Own](#1-your-role)
2. [What You Build vs Skip](#2-what-you-build-vs-skip)
3. [Dependencies With Other Members](#3-dependencies-with-other-members)
4. [Your Directory Structure](#4-your-directory-structure)
5. [The Firebase Contract — YOUR Write Paths](#5-the-firebase-contract)
6. [Day 1: GCP Setup + Firebase Init](#6-day-1-gcp-setup--firebase-init)
7. [Day 2: FASTag Simulator](#7-day-2-fastag-simulator)
8. [Day 3-4: Cloud Run Processor](#8-day-3-4-cloud-run-processor)
9. [Day 5-6: Mock DPI APIs](#9-day-5-6-mock-dpi-apis)
10. [Day 7-9: Integration & Deployment](#10-day-7-9-integration--deployment)
11. [Day 10-12: Pipeline Polish](#11-day-10-12-pipeline-polish)
12. [Day 13-18: Testing & Demo Prep](#12-day-13-18-testing--demo-prep)
13. [FAQ — Common Confusions Answered](#13-faq)
14. [📊 Progress Tracker](#14-progress-tracker)

---

## 1. YOUR ROLE

You build **everything that moves data from Point A to Point B:**
- The FASTag telemetry simulator (generates fake truck transit events)
- The Cloud Run processor (receives events, calculates velocity, writes to Firebase)
- The Mock DPI APIs (Vahan, eWay Bill, ULIP, IMD Weather)
- The GCP infrastructure (Pub/Sub topic, Firebase RTDB, Cloud Run deployment)
- The highway graph (nodes + edges describing India's toll network)

**What you DON'T own:**
- ML model training (Member 2)
- Routing algorithms (Member 2)
- The React dashboard UI (Member 3)

**Your pipeline:**
```
FASTag Simulator → Pub/Sub → Cloud Run Processor → Firebase RTDB → (Member 3 reads)
```

---

## 2. WHAT YOU BUILD VS SKIP

| Component | Action | Why |
|-----------|--------|-----|
| **FASTag Simulator** | ✅ ALREADY BUILT | `backend/simulator/fastag_simulator.py` — 570 lines, done |
| **Cloud Run FastAPI Processor** | ✅ ALREADY BUILT | `backend/processor/main.py` — Haversine, M/M/1, Firebase writer |
| **Highway Graph JSON** | ✅ ALREADY BUILT | `backend/graph/highway_graph.json` — 14 nodes, 20 edges |
| **Mock DPI APIs** | ✅ ALREADY BUILT | `backend/mock-apis/mock_dpi.py` — 5 endpoints |
| **Firebase RTDB Contract** | ✅ ALREADY BUILT | `shared/firebase-contract.json` |
| **GCP Setup Script** | ✅ ALREADY BUILT | `scripts/gcp-setup.ps1` |
| **Dockerfile** | ✅ ALREADY BUILT | `backend/processor/Dockerfile` |
| **GCP Deployment** | 🟢 DAY 7-9 | Deploy Cloud Run + Firebase to production |
| **Pub/Sub action-topic** | 🟢 DAY 8 | Action topic for autonomous rerouting triggers |
| **Demo data pre-seeding** | 🟢 DAY 16 | Pre-seed 50 trucks for Golden Quadrilateral demo |
| **Apache Beam / Dataflow** | 🔴 SKIP | Too complex for 18 days — Cloud Run handles it |
| **Cloud Spanner** | 🔴 SKIP | Firebase RTDB is sufficient for demo scale |
| **BigQuery analytics** | 🔴 SKIP | Not needed for MVP demo |
| **Terraform/Pulumi IaC** | 🔴 SKIP | Use gcloud CLI directly |
| **CI/CD GitHub Actions** | 🔴 SKIP | Manual deploy for hackathon |

---

## 3. DEPENDENCIES WITH OTHER MEMBERS

### 🔑 THE KEY FACT: Nobody depends on you until Day 7

| Days | Who Needs You? | What They Need |
|------|----------------|----------------|
| **Days 1-6** | **Nobody** | Member 2 generates own synthetic data. Member 3 uses static/mock data. |
| **Day 7** | **Member 3** | Member 3 needs YOUR Cloud Run processor writing real data to Firebase RTDB. They've been testing with mock data — now they need YOUR live data to show up on their map. |
| **Day 7** | **Member 2** | Member 2 needs to verify their XGBoost predictions match YOUR Firebase RTDB node features. They need YOUR processor to be writing `utilization`, `queue_length` etc. |
| **Day 8+** | **Both** | Full live pipeline: Simulator → Pub/Sub → Cloud Run → Firebase → Dashboard + ML Agent |

### What Each Member Writes to Firebase

| Firebase Path | Who Writes | Who Reads |
|---------------|-----------|-----------|
| `supply_chain/nodes/*` | **YOU** (from Cloud Run processor) | Member 2 (model input), Member 3 (map dots) |
| `supply_chain/active_routes/*` | **YOU** (from Cloud Run processor) | Member 2 (which trucks to reroute), Member 3 (arc lines) |
| `supply_chain/anomalies/*` | Member 2 (from `/inject-anomaly`) | Member 3 (red disruption markers) |
| `supply_chain/alerts/*` | Member 2 (after rerouting) | Member 3 (alert timeline) |

### How Your Data Flows to Member 3's Dashboard

```
YOUR Simulator generates FASTag ping → publishes to Pub/Sub
    ↓
YOUR Cloud Run processor receives the ping → calculates velocity, utilization
    ↓
YOUR processor writes to Firebase RTDB:
  → supply_chain/nodes/TP-KHD-001 = { status: "DELAYED", utilization: 0.87, queueLength: 75 }
  → supply_chain/active_routes/route-TRK-001 = { status: "NORMAL", currentPosition: [76.5, 25.3] }
    ↓
Member 3's dashboard has onValue listener → sees update within 200ms
    ↓
Map dot turns yellow, arc position updates
```

### How Your Data Feeds into Member 2's Model

Member 2's XGBoost model expects these features (from S7.1):
- `queue_length` — YOUR processor calculates this
- `utilization` — YOUR processor calculates this (ρ = λ/μ, S7.6)
- `processing_rate` — YOUR processor knows this from the highway graph

Member 2 trains their model on SYNTHETIC data with the same column names. At integration time (Day 7+), Member 2's agent can read YOUR Firebase RTDB node data as input to their model. **The column names in their training data match the field names YOUR processor writes.**

---

## 4. YOUR DIRECTORY STRUCTURE

```
apex/
├── backend/                    # YOUR directory
│   ├── simulator/
│   │   ├── fastag_simulator.py  # ✅ BUILT — 570 lines
│   │   └── requirements.txt     # ✅ BUILT
│   ├── processor/
│   │   ├── main.py              # ✅ BUILT — FastAPI Cloud Run service
│   │   ├── requirements.txt     # ✅ BUILT
│   │   └── Dockerfile           # ✅ BUILT
│   ├── graph/
│   │   └── highway_graph.json   # ✅ BUILT — 14 nodes, 20 edges
│   └── mock-apis/
│       ├── mock_dpi.py          # ✅ BUILT — 5 mock endpoints
│       ├── test_apis.py         # ✅ BUILT — test script
│       └── requirements.txt     # ✅ BUILT
├── shared/
│   └── firebase-contract.json   # ✅ BUILT — THE shared data contract
├── scripts/
│   └── gcp-setup.ps1            # ✅ BUILT — GCP initialization
└── firebase.json                # ✅ BUILT — RTDB emulator config
```

> **ALL of your Days 1-6 code is already written!** Your next work starts at Day 7.

---

## 5. THE FIREBASE CONTRACT

Open `shared/firebase-contract.json`. Here are YOUR write paths:

### Path: `supply_chain/nodes/<node_id>` — You write this

```json
{
  "type": "TOLL_PLAZA",
  "name": "Kherki Daula Toll Plaza",
  "lat": 28.4167,
  "lng": 77.0500,
  "status": "NORMAL",         // NORMAL | DELAYED | DISRUPTED
  "utilization": 0.65,        // ρ = λ/μ (M/M/1 queueing, S7.6)
  "queueLength": 42,
  "tts": 72,                  // Time to Survive (hours) — S7.10
  "ttr": 48                   // Time to Recover (hours) — S7.10
}
```

**Status logic (your processor calculates this):**
- `utilization < 0.7` → `"NORMAL"`
- `0.7 ≤ utilization < 0.85` → `"DELAYED"`
- `utilization ≥ 0.85` → `"DISRUPTED"` (bottleneck detected, S7.6)

### Path: `supply_chain/active_routes/<route_id>` — You write this

```json
{
  "truckId": "TRK-001",
  "vehicleRegNo": "MH04AB1234",
  "originCoordinates": [77.1025, 28.7041],
  "destinationCoordinates": [72.8777, 19.0760],
  "currentPosition": [76.5, 25.3],
  "status": "NORMAL",         // Member 2 may update to "REROUTED"
  "isRerouted": false,        // Member 2 may update to true
  "cargoValueINR": 850000,
  "ewayBillNo": 3410987654,
  "eta": "2026-04-07T14:00:00Z",
  "riskScore": 0.23
}
```

**Important:** You create initial routes. Member 2 may later UPDATE `status` and `isRerouted` when rerouting occurs.

---

## 6. DAY 1: GCP SETUP

> ✅ **Already done!** The setup script, Firebase config, and contract are built.

### What's already in place:
- `scripts/gcp-setup.ps1` — creates Pub/Sub topic, enables APIs
- `firebase.json` — configures RTDB emulator at port 9000
- `database.rules.json` — open rules for dev
- `shared/firebase-contract.json` — the shared schema

### What you still need to do:
1. Run `scripts/gcp-setup.ps1` against your GCP project
2. Set environment variables:

```powershell
$env:PROJECT_ID = "apex-digital-twin"
$env:FIREBASE_DATABASE_URL = "https://apex-digital-twin-default-rtdb.firebaseio.com"
$env:PUBSUB_TOPIC = "fastag-telemetry"
```

---

## 7. DAY 2: FASTAG SIMULATOR

> ✅ **Already built!** See `backend/simulator/fastag_simulator.py`

### What it does:
- Generates fake FASTag transaction events following NPCI NETC ICD 2.5 schema (S10.2)
- 7 real NHAI toll plazas with correct GPS coordinates
- Creates 50 trucks with realistic routes along NH-48 (Delhi-Mumbai corridor)
- Supports 3 output modes: `console`, `pubsub`, `firebase`
- Generates events every 5 seconds (configurable)

### How to run:

```bash
cd apex
pip install -r backend/simulator/requirements.txt

# Console mode (see events printed)
python backend/simulator/fastag_simulator.py --mode console --rate 2 --trucks 10

# Firebase mode (writes directly to Firebase RTDB)
python backend/simulator/fastag_simulator.py --mode firebase --rate 5 --trucks 50

# Pub/Sub mode (publishes to Pub/Sub topic)
python backend/simulator/fastag_simulator.py --mode pubsub --rate 5 --trucks 50
```

### Sample output event:

```json
{
  "seqNo": "550e8400-e29b-41d4-a716-446655440000",
  "vehicleRegNo": "MH04AB1234",
  "tagId": "34161FA1B3C2E5D8",
  "tollPlazaId": "TP-KHD-001",
  "tollPlazaName": "Kherki Daula",
  "tollPlazaGeocode": "28.4167,77.05",
  "laneDirection": "N",
  "vehicleClass": "HCV",
  "readerReadTime": "2026-04-07T10:30:00.000Z",
  "signatureAuthStatus": "SUCCESS",
  "truckId": "TRK-001",
  "cargoValueINR": 850000,
  "ewayBillNo": 3410987654,
  "commodity": "Auto Parts"
}
```

---

## 8. DAY 3-4: CLOUD RUN PROCESSOR

> ✅ **Already built!** See `backend/processor/main.py`

### What it does:
- Receives FASTag events (via HTTP POST or Pub/Sub push)
- Calculates velocity using Haversine distance formula (S7.2)
- Clips velocity to 5-120 km/h range
- Updates M/M/1 utilization per node: ρ = λ/μ (S7.6)
- Detects bottlenecks when ρ > 0.85
- Writes node status + route data to Firebase RTDB
- Deduplicates events using `seqNo`

### Key endpoints:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/process` | POST | Receive a single FASTag event |
| `/process/batch` | POST | Process multiple events at once |
| `/pubsub/push` | POST | Receive Pub/Sub push messages |
| `/health` | GET | Health check |
| `/nodes` | GET | Current node statuses |
| `/vehicles` | GET | Tracked vehicle positions |
| `/graph` | GET | Highway graph data |

### How to run locally:

```bash
cd apex
pip install -r backend/processor/requirements.txt
cd backend/processor
uvicorn main:app --port 8080 --reload
```

### How to test:

```bash
# Send a test FASTag event
curl -X POST http://localhost:8080/process \
  -H "Content-Type: application/json" \
  -d '{
    "seqNo": "550e8400-e29b-41d4-a716-446655440000",
    "vehicleRegNo": "MH04AB1234",
    "tagId": "34161FA1B3C2E5D8",
    "tollPlazaId": "TP-KHD-001",
    "tollPlazaName": "Kherki Daula",
    "tollPlazaGeocode": "28.4167,77.05",
    "laneDirection": "N",
    "vehicleClass": "HCV",
    "readerReadTime": "2026-04-07T10:30:00Z"
  }'
```

---

## 9. DAY 5-6: MOCK DPI APIs

> ✅ **Already built!** See `backend/mock-apis/mock_dpi.py`

### What it does:
5 mock government API endpoints that simulate India's DPI:

| Endpoint | Real API | What It Returns |
|----------|----------|-----------------|
| `GET /api/vahan/{vehicle_reg_no}` | Vahan (MoRTH) | Vehicle registration details |
| `GET /api/eway-bill/{eway_bill_no}` | GST eWay Bill portal | eWay bill details |
| `POST /api/eway-bill/update-part-b` | GST eWay Bill portal | Part-B update for transporter change |
| `GET /api/ulip/fastag/{tag_id}` | ULIP FASTag gateway | FASTag account + recent transactions |
| `GET /api/ulip/weather/{location}` | IMD weather API | Temperature, rainfall, wind speed, severity |

### How to run:

```bash
cd apex
pip install -r backend/mock-apis/requirements.txt
cd backend/mock-apis
uvicorn mock_dpi:app --port 8081 --reload
```

### How to test:

```bash
python backend/mock-apis/test_apis.py
# Should print 5 ✅ passes
```

---

## 10. DAY 7-9: INTEGRATION & DEPLOYMENT

### This is where YOUR work gets real. Days 1-6 are done. Now you connect everything.

### Day 7: First Integration Test

**Goal: Simulator sends events → Cloud Run processes them → Firebase has data → Member 3 sees dots**

1. Start Firebase emulator:
```bash
cd apex
npx firebase-tools emulators:start --only database --project apex-digital-twin
```

2. Start your Cloud Run processor:
```bash
cd apex/backend/processor
SET FIREBASE_DATABASE_URL=http://127.0.0.1:9000
SET USE_FIREBASE=true
uvicorn main:app --port 8080 --reload
```

3. Start your simulator in firebase mode:
```bash
cd apex
python backend/simulator/fastag_simulator.py --mode firebase --rate 5 --trucks 20
```

4. Verify Firebase has data:
```bash
curl http://localhost:9000/supply_chain/nodes.json
# Should return: {"TP-KHD-001": {"status": "NORMAL", "utilization": 0.45, ...}, ...}

curl http://localhost:9000/supply_chain/active_routes.json
# Should return: {"route-TRK-001": {"truckId": "TRK-001", ...}, ...}
```

5. Tell Member 3 to open their dashboard → they should see live dots + arcs!

### Day 8: Pub/Sub Action Topic

Create a second Pub/Sub topic for autonomous actions:

```bash
gcloud pubsub topics create action-topic --project=apex-digital-twin
```

When utilization > 0.85 (bottleneck detected), your processor should also publish an action message to `action-topic`. Member 2's agent can subscribe to this for automatic disruption detection.

### Day 9: Deploy to Cloud Run

```bash
cd apex/backend/processor

# Build and push container
gcloud builds submit --tag gcr.io/apex-digital-twin/processor .

# Deploy to Cloud Run
gcloud run deploy apex-processor \
  --image gcr.io/apex-digital-twin/processor \
  --platform managed \
  --region asia-south1 \
  --allow-unauthenticated \
  --set-env-vars="FIREBASE_DATABASE_URL=https://apex-digital-twin-default-rtdb.firebaseio.com,USE_FIREBASE=true"

# Get the Cloud Run URL
gcloud run services describe apex-processor --region asia-south1 --format="value(status.url)"
# Output: https://apex-processor-xxxxx-as.a.run.app
```

Give this URL to Member 3 for their `.env.local`:
```
VITE_PROCESSOR_API_URL=https://apex-processor-xxxxx-as.a.run.app
```

---

## 11. DAY 10-12: PIPELINE POLISH

### Fix Integration Bugs (Day 10-11)

Common issues at this stage:

| Problem | Fix |
|---------|-----|
| Firebase data not appearing on dashboard | Check CORS on Cloud Run. Add `--allow-unauthenticated` flag. |
| Utilization always reads 0.0 | Check that simulator is sending events with correct plazaId format (TP-KHD-001). |
| Duplicate events in Firebase | Verify seqNo deduplication is working in your processor. |
| Firebase rules blocking writes | Use open rules for dev: `{"rules": {".read": true, ".write": true}}` |
| Cloud Run cold start is slow | Set `--min-instances=1` on Cloud Run deployment. |

### Pre-Seed Demo Data (Day 11-12)

Create a script to pre-seed Firebase with realistic data for the demo:

```python
# scripts/seed_demo_data.py
"""
Pre-seed Firebase RTDB with 50 trucks for the Golden Quadrilateral demo.
Run: python scripts/seed_demo_data.py
"""
import json
import httpx

FIREBASE_URL = "https://apex-digital-twin-default-rtdb.firebaseio.com"
# Use "http://localhost:9000" for local emulator

# 50 truck routes along NH-48 (Delhi → Jaipur → Ahmedabad → Mumbai)
trucks = []
for i in range(50):
    trucks.append({
        f"route-TRK-{i+1:03d}": {
            "truckId": f"TRK-{i+1:03d}",
            "vehicleRegNo": f"MH{i%20+1:02d}AB{i+1000}",
            "originCoordinates": [77.1025 + (i % 5) * 0.1, 28.7041 - (i % 3) * 0.1],
            "destinationCoordinates": [72.8777 + (i % 5) * 0.1, 19.0760 + (i % 3) * 0.1],
            "currentPosition": [75.0 + i * 0.1, 23.0 + i * 0.05],
            "status": "NORMAL",
            "isRerouted": False,
            "cargoValueINR": 500000 + i * 10000,
            "ewayBillNo": 3410000000 + i,
            "eta": "2026-04-07T14:00:00Z",
            "riskScore": round(0.1 + (i % 10) * 0.05, 2),
        }
    })

# Write to Firebase
for truck_data in trucks:
    for route_id, data in truck_data.items():
        r = httpx.put(f"{FIREBASE_URL}/supply_chain/active_routes/{route_id}.json", json=data)
        print(f"Seeded {route_id}: {r.status_code}")

# Seed all 7 nodes as NORMAL
nodes = {
    "TP-KHD-001": {"type":"TOLL_PLAZA","name":"Kherki Daula","lat":28.4167,"lng":77.05,"status":"NORMAL","utilization":0.45,"queueLength":20,"tts":72,"ttr":48},
    "TP-MNR-002": {"type":"TOLL_PLAZA","name":"Manesar","lat":28.357,"lng":76.934,"status":"NORMAL","utilization":0.3,"queueLength":12,"tts":96,"ttr":24},
    "TP-JPR-003": {"type":"TOLL_PLAZA","name":"Shahpura","lat":26.9124,"lng":75.7873,"status":"NORMAL","utilization":0.55,"queueLength":30,"tts":60,"ttr":36},
    "TP-PNP-004": {"type":"TOLL_PLAZA","name":"Panipat","lat":29.3909,"lng":76.9635,"status":"NORMAL","utilization":0.4,"queueLength":18,"tts":84,"ttr":30},
    "TP-VDR-005": {"type":"TOLL_PLAZA","name":"Vadodara","lat":22.3072,"lng":73.1812,"status":"NORMAL","utilization":0.5,"queueLength":25,"tts":70,"ttr":40},
    "TP-SRT-006": {"type":"TOLL_PLAZA","name":"Surat","lat":21.1702,"lng":72.8311,"status":"NORMAL","utilization":0.35,"queueLength":15,"tts":90,"ttr":20},
    "TP-MUM-007": {"type":"TOLL_PLAZA","name":"Mumbai Entry","lat":19.2183,"lng":72.9781,"status":"NORMAL","utilization":0.6,"queueLength":35,"tts":55,"ttr":45},
}

for node_id, data in nodes.items():
    r = httpx.put(f"{FIREBASE_URL}/supply_chain/nodes/{node_id}.json", json=data)
    print(f"Seeded {node_id}: {r.status_code}")

print("Demo data seeded!")
```

---

## 12. DAY 13-18: TESTING & DEMO PREP

### Integration Testing (Day 13-14)

Run the full pipeline:

```bash
# Terminal 1: Firebase emulator
npx firebase-tools emulators:start --only database

# Terminal 2: Your processor
cd backend/processor && uvicorn main:app --port 8080 --reload

# Terminal 3: Member 2's ML agent
cd ml/deployment && uvicorn routing_agent:app --port 8082 --reload

# Terminal 4: Your simulator
python backend/simulator/fastag_simulator.py --mode firebase --rate 2 --trucks 50

# Terminal 5: Member 3's dashboard
cd frontend && npm run dev
```

### End-to-End Test Checklist

- [ ] Simulator generates 50+ truck events in 30 seconds
- [ ] Processor calculates velocity for each event
- [ ] Firebase RTDB nodes show correct utilization values
- [ ] Firebase RTDB routes show correct truck positions
- [ ] Member 3's dashboard shows all dots and arcs
- [ ] When simulator generates high utilization, status changes to "DELAYED" or "DISRUPTED"
- [ ] Member 2 can inject anomaly and it appears on Member 3's map
- [ ] Full pipeline (inject → predict → reroute → dashboard update) takes < 5 seconds

### Demo Prep (Day 16-18)

**Your specific demo responsibilities:**
1. Pre-seed 50 trucks using `scripts/seed_demo_data.py`
2. Start the simulator with `--rate 2` (one event every 2 seconds = visual but not overwhelming)
3. Ensure Firebase RTDB is clean before demo start
4. Have a "Reset Demo" command ready:

```bash
# Reset Firebase for demo
curl -X DELETE "http://localhost:9000/supply_chain.json"
python scripts/seed_demo_data.py
```

---

## 13. FAQ — COMMON CONFUSIONS ANSWERED

### Q: "Does Member 2 need my data for training?"

**NO.** Member 2 generates their OWN synthetic training data (see their guide). Your data matters at INFERENCE time (Day 7+), when Member 2's model reads Firebase RTDB node features that YOUR processor wrote. But training is completely independent.

### Q: "Why isn't my code using Dataflow/Spanner?"

The blueprint describes the FULL architecture. For the MVP (18-day hackathon), we skip Dataflow and Spanner to save time. Cloud Run + Firebase RTDB gives the same demo result. See blueprint S24.1 for the MVP priority decisions.

### Q: "What about the action-topic for autonomous rerouting?"

Your processor publishes a message to Pub/Sub `action-topic` when it detects a bottleneck (ρ > 0.85). Member 2's agent can subscribe to this. But for MVP, Member 2 can also just subscribe to Firebase RTDB changes directly. The action-topic is a nice-to-have.

### Q: "How do I deploy to production?"

```bash
# 1. Build Docker image
cd backend/processor
gcloud builds submit --tag gcr.io/apex-digital-twin/processor .

# 2. Deploy to Cloud Run
gcloud run deploy apex-processor \
  --image gcr.io/apex-digital-twin/processor \
  --platform managed --region asia-south1 \
  --allow-unauthenticated \
  --set-env-vars="FIREBASE_DATABASE_URL=https://apex-digital-twin-default-rtdb.firebaseio.com,USE_FIREBASE=true"

# 3. Point Firebase rules to production
# Update database.rules.json with appropriate security rules
firebase deploy --only database:rules --project apex-digital-twin
```

### Q: "What coordinates are in the highway graph?"

```
Delhi Warehouses:    28.5355°N, 77.3910°E
Kherki Daula Toll:   28.4167°N, 77.0500°E
Manesar Toll:        28.3570°N, 76.9340°E
Shahpura Toll:       26.9124°N, 75.7873°E
Panipat Toll:        29.3909°N, 76.9635°E
Vadodara Toll:       22.3072°N, 73.1812°E
Surat Toll:          21.1702°N, 72.8311°E
Mumbai Entry Toll:   19.2183°N, 72.9781°E
```

### Q: "What if the Pub/Sub emulator isn't working?"

Use `firebase` mode in the simulator instead of `pubsub` mode. The simulator can write directly to Firebase RTDB, bypassing Pub/Sub entirely. For the demo, this is simpler and more reliable.

### Q: "What's the difference between my processor and Member 2's agent?"

| Your Processor | Member 2's Agent |
|----------------|-----------------|
| Receives raw FASTag events | Receives prediction/routing requests |
| Calculates velocity, utilization | Runs XGBoost, A\* routing |
| Writes nodes + routes to Firebase | Writes anomalies + alerts to Firebase |
| Port 8080 | Port 8082 |
| `backend/processor/main.py` | `ml/deployment/routing_agent.py` |

---

## 14. 📊 PROGRESS TRACKER

> **Last updated: April 12, 2026**
>
> Use this section to track everything you've done, what's tested, what's blocked, and what's remaining.

---

### ✅ PHASE 1: CODE — What's Built (Days 1-6)

Everything below is **written and ready**. No more coding needed for Phase 1.

| # | Component | File | Lines | Status | Tested? |
|---|-----------|------|-------|--------|---------|
| 1 | **FASTag Simulator** | `backend/simulator/fastag_simulator.py` | ~570 | ✅ Built | ⏳ Not yet — run with `--mode console` to test |
| 2 | **Cloud Run Processor** | `backend/processor/main.py` | ~593 | ✅ Built | ⏳ Not yet — start with `uvicorn main:app --port 8080` |
| 3 | **Highway Graph** | `backend/graph/highway_graph.json` | ~392 | ✅ Built | ✅ Verified — 14 nodes, 20 edges, coordinates correct |
| 4 | **Mock DPI APIs** | `backend/mock-apis/mock_dpi.py` | ~358 | ✅ Built | ⏳ Not yet — run `python test_apis.py` to test |
| 5 | **Firebase Contract** | `shared/firebase-contract.json` | ~69 | ✅ Built | ✅ Verified — matches all member guides |
| 6 | **Shared Constants** | `shared/constants.py` | ~57 | ✅ Built | ✅ Verified — all enums, statuses, ports defined |
| 7 | **Dockerfile** | `backend/processor/Dockerfile` | ~15 | ✅ Built | ⏳ Not yet — needs billing for Cloud Run |
| 8 | **GCP Setup Script** | `scripts/gcp-setup.ps1` | ~100 | ✅ Built | ⚠️ Partial (see cloud setup below) |
| 9 | **Docker Compose** | `docker-compose.dev.yml` | ~35 | ✅ Built | ⏳ Not yet — needs Docker Desktop running |
| 10 | **Firebase Config** | `firebase.json` + `database.rules.json` | ~21 | ✅ Built | ✅ Working |

---

### ☁️ CLOUD / MANUAL SETUP — What's Done Online

| # | Setup Task | Where | Status | Notes |
|---|------------|-------|--------|-------|
| 1 | **GCP Project** | Cloud Console | ✅ Done | Project: `vigilant-cider-439218-b7` |
| 2 | **Enable Pub/Sub API** | Cloud Console | ✅ Done | `pubsub.googleapis.com` enabled |
| 3 | **Enable Firebase API** | Cloud Console | ✅ Done | `firebasedatabase.googleapis.com` enabled |
| 4 | **Enable Maps API** | Cloud Console | ✅ Done | `maps-backend.googleapis.com` enabled |
| 5 | **Enable Cloud Run API** | Cloud Console | ❌ **BLOCKED** | Needs billing account — bank blocked autopay (error `OR_BACR2_44`) |
| 6 | **GCP Billing Account** | Cloud Console | ❌ **BLOCKED** | Try again tomorrow or use different account/card |
| 7 | **Firebase RTDB** | Firebase Console | ✅ Done | URL: `https://apex-digital-twin-493017-default-rtdb.asia-southeast1.firebasedatabase.app` |
| 8 | **Firebase Web App** | Firebase Console | ✅ Done | Config object generated — shared with Member 3 |
| 9 | **Google Maps API Key** | Cloud Console | ❌ **BLOCKED** | Needs billing account |
| 10 | **Google Maps dark Map ID** | Cloud Console | ❌ **BLOCKED** | Needs billing account |
| 11 | **GCP Service Account Keys** | Cloud Console | ❌ **BLOCKED** | Needs billing account |
| 12 | **GitHub Repo** | GitHub | ✅ Done | `https://github.com/AAYUSH-SPIDEY-SHARMA/A.P.E.X.git` — 27 files pushed |
| 13 | **GitHub Collaborators** | GitHub Settings | ⏳ Pending | Add Vivesh + Rakshak's GitHub usernames |

---

### 📤 SHARING WITH TEAM — What's Shared

| # | What to Share | Who Needs It | Status | How |
|---|--------------|-------------|--------|-----|
| 1 | **GitHub repo URL** | Both | ✅ Shared | They clone: `git clone https://github.com/AAYUSH-SPIDEY-SHARMA/A.P.E.X.git` |
| 2 | **Firebase RTDB URL** | Both | ✅ Ready to share | `https://apex-digital-twin-493017-default-rtdb.asia-southeast1.firebasedatabase.app` |
| 3 | **Firebase config object** | Member 3 | ✅ Ready to share | apiKey, authDomain, databaseURL, projectId (see Section 6) |
| 4 | **Google Maps API Key** | Member 3 | ❌ Blocked (billing) | Share once billing resolved |
| 5 | **Google Maps dark Map ID** | Member 3 | ❌ Blocked (billing) | Share once billing resolved |
| 6 | **GCP service account keys** | Both | ❌ Blocked (billing) | Share `.json` key files via WhatsApp (NOT Git!) |
| 7 | **highway_graph.json** | Member 2 | ✅ In repo | Already pushed — `backend/graph/highway_graph.json` |
| 8 | **firebase-contract.json** | Both | ✅ In repo | Already pushed — `shared/firebase-contract.json` |
| 9 | **constants.py** | Both | ✅ In repo | Already pushed — `shared/constants.py` |

---

### 🧪 LOCAL TESTING — What to Test Next

Run these tests **in this order** to verify everything works before Day 7 integration:

| # | Test | How to Run | Expected Result | Tested? |
|---|------|-----------|----------------|---------|
| 1 | **Simulator console test** | `python backend/simulator/fastag_simulator.py --mode console --rate 2 --trucks 5` | Events print to terminal every 2 seconds | ⏳ |
| 2 | **Processor starts clean** | `cd backend/processor && uvicorn main:app --port 8080 --reload` | Server starts at `localhost:8080`, no errors | ⏳ |
| 3 | **Processor health check** | `curl http://localhost:8080/health` | Returns `{"status": "healthy"}` | ⏳ |
| 4 | **Send test FASTag event** | `curl -X POST http://localhost:8080/process -H "Content-Type: application/json" -d '{...}'` (see Section 8) | Returns processed event with velocity | ⏳ |
| 5 | **Check node statuses** | `curl http://localhost:8080/nodes` | Returns JSON with 7 toll plaza statuses | ⏳ |
| 6 | **Check vehicle list** | `curl http://localhost:8080/vehicles` | Returns JSON with tracked vehicles | ⏳ |
| 7 | **Check graph endpoint** | `curl http://localhost:8080/graph` | Returns highway graph data | ⏳ |
| 8 | **Mock DPI APIs start** | `cd backend/mock-apis && uvicorn mock_dpi:app --port 8081 --reload` | Server starts at `localhost:8081` | ⏳ |
| 9 | **Test all mock APIs** | `python backend/mock-apis/test_apis.py` | 5 ✅ passes printed | ⏳ |
| 10 | **Firebase emulator start** | `npx firebase-tools emulators:start --only database --project apex-digital-twin` | Emulator runs at `localhost:9000` | ⏳ |
| 11 | **Simulator → Firebase test** | `python backend/simulator/fastag_simulator.py --mode firebase --rate 5 --trucks 10` | Data appears at `localhost:9000/supply_chain/nodes.json` | ⏳ |
| 12 | **Full pipeline (local)** | Processor + Simulator + Firebase emulator all running simultaneously | Nodes show utilization, routes show truck positions | ⏳ |

**Mark each as ✅ when you test it!**

---

### 📅 DAY-WISE REMAINING WORK

#### ▶ IMMEDIATE (Today/Tomorrow — before Day 7)

| # | Task | Priority | Time Estimate | Status |
|---|------|----------|--------------|--------|
| 1 | **Add Vivesh + Rakshak as GitHub collaborators** | 🔴 HIGH | 2 min | ⏳ Do now |
| 2 | **Share Firebase URL + config with team on WhatsApp** | 🔴 HIGH | 5 min | ⏳ Do now |
| 3 | **Run local test #1-#9 from testing table above** | 🔴 HIGH | 30 min | ⏳ |
| 4 | **Fix billing (try different card/account/tomorrow)** | 🟡 MEDIUM | 10 min | ❌ Blocked |
| 5 | **Install firebase-tools locally** (`npm install -g firebase-tools`) | 🟡 MEDIUM | 5 min | ⏳ |

#### ▶ DAY 7 — First Integration (THE BIG DAY)

| # | Task | Priority | Time Estimate | Status |
|---|------|----------|--------------|--------|
| 1 | Start Firebase emulator + Processor + Simulator together | 🔴 HIGH | 15 min | ⏳ |
| 2 | Verify `supply_chain/nodes` has data in Firebase | 🔴 HIGH | 5 min | ⏳ |
| 3 | Verify `supply_chain/active_routes` has data in Firebase | 🔴 HIGH | 5 min | ⏳ |
| 4 | Tell Member 3 to connect their dashboard → verify dots appear | 🔴 HIGH | 30 min | ⏳ |
| 5 | Tell Member 2 to read Firebase node data → verify model input works | 🟡 MEDIUM | 20 min | ⏳ |
| 6 | Fix any bugs that appear during integration | 🔴 HIGH | 1-2 hrs | ⏳ |

#### ▶ DAY 8 — Pub/Sub Action Topic

| # | Task | Priority | Time Estimate | Status |
|---|------|----------|--------------|--------|
| 1 | Create `action-topic` in Pub/Sub | 🟡 MEDIUM | 5 min | ⏳ |
| 2 | Add code to processor: when ρ > 0.85, publish to action-topic | 🟡 MEDIUM | 30 min | ⏳ |
| 3 | Test: send high-traffic events → verify action message published | 🟡 MEDIUM | 15 min | ⏳ |

#### ▶ DAY 9 — Cloud Run Deployment (NEEDS BILLING)

| # | Task | Priority | Time Estimate | Status |
|---|------|----------|--------------|--------|
| 1 | Fix billing (MUST be resolved by now) | 🔴 HIGH | — | ❌ Blocked |
| 2 | Enable Cloud Run API | 🔴 HIGH | 2 min | ⏳ |
| 3 | `gcloud builds submit --tag gcr.io/PROJECT/processor .` | 🔴 HIGH | 5 min | ⏳ |
| 4 | `gcloud run deploy apex-processor ...` | 🔴 HIGH | 5 min | ⏳ |
| 5 | Share Cloud Run URL with Member 3 | 🔴 HIGH | 1 min | ⏳ |
| 6 | Create & share Google Maps API Key + Map ID with Member 3 | 🔴 HIGH | 10 min | ⏳ |
| 7 | Create & share GCP service account keys with both members | 🟡 MEDIUM | 10 min | ⏳ |

> **⚠️ FALLBACK if billing never works:** Skip Cloud Run. Run processor on your laptop during demo. Demo looks exactly the same to judges. Use `localhost:8080` instead of Cloud Run URL.

#### ▶ DAY 10-12 — Pipeline Polish

| # | Task | Priority | Time Estimate | Status |
|---|------|----------|--------------|--------|
| 1 | Fix all integration bugs from Day 7-9 | 🔴 HIGH | 2-3 hrs | ⏳ |
| 2 | Update Firebase URL in processor from emulator to production | 🟡 MEDIUM | 5 min | ⏳ |
| 3 | Pre-seed Firebase with demo data (`scripts/seed_demo_data.py`) | 🟡 MEDIUM | 15 min | ⏳ |
| 4 | Test full pipeline 3x end-to-end to ensure stability | 🔴 HIGH | 1 hr | ⏳ |

#### ▶ DAY 13-15 — Testing Sprint

| # | Task | Priority | Time Estimate | Status |
|---|------|----------|--------------|--------|
| 1 | Full pipeline test with Member 2 + 3 simultaneously | 🔴 HIGH | 2 hrs | ⏳ |
| 2 | Test Dual-Shock scenario (Monsoon + ICEGATE failure) | 🔴 HIGH | 1 hr | ⏳ |
| 3 | Optimize pipeline latency to < 5 seconds end-to-end | 🟡 MEDIUM | 1 hr | ⏳ |
| 4 | Fix all bugs from testing | 🔴 HIGH | 2-3 hrs | ⏳ |

#### ▶ DAY 16-18 — Demo Prep

| # | Task | Priority | Time Estimate | Status |
|---|------|----------|--------------|--------|
| 1 | Pre-seed 50 trucks on Golden Quadrilateral route | 🔴 HIGH | 15 min | ⏳ |
| 2 | Create "Reset Demo" command (curl DELETE + re-seed) | 🔴 HIGH | 10 min | ⏳ |
| 3 | Demo rehearsal #1 — run full 5-minute script | 🔴 HIGH | 30 min | ⏳ |
| 4 | Demo rehearsal #2 + #3 — refine timing | 🔴 HIGH | 1 hr | ⏳ |
| 5 | Record backup demo video | 🟡 MEDIUM | 30 min | ⏳ |
| 6 | Final rehearsal #4 | 🔴 HIGH | 30 min | ⏳ |
| 7 | Deploy to production GCP (if billing works) | 🟡 MEDIUM | 30 min | ⏳ |

---

### 📈 OVERALL PROGRESS

```
Phase 1 (Code):          ██████████████████████ 100% — ALL code written!
Cloud Setup:             ████████░░░░░░░░░░░░░  40% — Firebase done, billing blocked
Local Testing:           ░░░░░░░░░░░░░░░░░░░░░   0% — Need to run tests 1-12
Integration (Day 7):     ░░░░░░░░░░░░░░░░░░░░░   0% — Not yet
Deployment (Day 9):      ░░░░░░░░░░░░░░░░░░░░░   0% — Blocked by billing
Demo Prep (Day 16-18):   ░░░░░░░░░░░░░░░░░░░░░   0% — Future
```

**Overall: ~35% complete | Next step: Run local tests #1-#12 from the testing table!**

---

> **REMEMBER: The backend that RUNS RELIABLY is more valuable than a complex backend that crashes during the demo. Your code is already built — now focus on TESTING and making it rock-solid.**
