# A.P.E.X — Automated Predictive Expressway Routing

> An Autonomous Self-Healing Supply Chain Nervous System for India's Highway Freight Network

**Hackathon**: Solution Challenge 2026 India | **Problem**: #3 Smart Supply Chains  
**Team Size**: 3 Members | **Stack**: Google Cloud + React + AI/ML

---

## Quick Start (Day 1 — No GCP Needed)

### 1. Test the FASTag Simulator

```powershell
cd backend\simulator
pip install -r requirements.txt
python fastag_simulator.py --mode console --rate 5 --duration 10
```

You should see 50 FASTag events printed with truck registrations, toll plaza names, and timestamps.

### 2. Verify Firebase Contract

Open `shared/firebase-contract.json` — this is the **single source of truth** for how all 3 members exchange data via Firebase RTDB.

### 3. GCP Setup (When Ready)

```powershell
.\scripts\gcp-setup.ps1 -ProjectId "your-project-id"
```

This enables Pub/Sub, Cloud Run, and Firebase APIs, creates the `fastag-telemetry-stream` topic, and sets up service accounts.

---

## Project Structure

```
apex/
├── backend/
│   ├── simulator/          ← FASTag event generator (Day 1-2) ✅
│   ├── processor/          ← Cloud Run processing service (Day 3-4)
│   ├── mock-apis/          ← Mock DPI APIs (Day 5-6)
│   └── graph/              ← Highway graph JSON (Day 3-4)
├── shared/
│   └── firebase-contract.json   ← Integration contract (CRITICAL)
├── scripts/
│   └── gcp-setup.ps1       ← One-time GCP setup
├── docker-compose.dev.yml   ← Local emulators
├── firebase.json            ← Firebase emulator config
└── README.md
```

## Architecture (MVP)

```
FASTag Simulator → Pub/Sub → Cloud Run FastAPI → Firebase RTDB → React Dashboard
                              (velocity calc)     (real-time)     (deck.gl map)
                              (XGBoost predict)
                              (A* routing)
```

## Team Division

| Member | Role | Days 1-6 Focus |
|--------|------|----------------|
| **Member 1** (Aayush) | Backend/Infra | Simulator, Cloud Run processor, Firebase writer |
| **Member 2** | ML/Routing | XGBoost model, A* routing engine, Cloud Run agent |
| **Member 3** | Frontend | React + deck.gl dashboard, Firebase listeners, KPI gauges |

## Key Commands

```powershell
# Simulator (console mode — no GCP)
python backend\simulator\fastag_simulator.py --mode console --rate 10

# Simulator (Pub/Sub mode — requires GCP)
python backend\simulator\fastag_simulator.py --mode pubsub --project apex-digital-twin

# Firebase emulator
firebase emulators:start --only database

# Processor (Day 3-4)
cd backend\processor && uvicorn main:app --reload --port 8080
```
