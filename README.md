# ⚡ A.P.E.X — Automated Predictive Expressway Routing

> **An Autonomous Self-Healing Supply Chain Nervous System for India's Highway Freight Network**

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://reactjs.org)
[![deck.gl](https://img.shields.io/badge/deck.gl-9.1-FF6B00?logo=uber)](https://deck.gl)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104-009688?logo=fastapi)](https://fastapi.tiangolo.com)
[![Cloud Run](https://img.shields.io/badge/Cloud%20Run-Deployed-4285F4?logo=google-cloud)](https://cloud.google.com/run)
[![Firebase](https://img.shields.io/badge/Firebase-RTDB%20%2B%20Hosting-FFCA28?logo=firebase)](https://firebase.google.com)
[![Gemini](https://img.shields.io/badge/Gemini-2.5%20Flash-8E75B2?logo=google)](https://ai.google.dev)
[![Vertex AI](https://img.shields.io/badge/Vertex%20AI-Production-4285F4?logo=google-cloud)](https://cloud.google.com/vertex-ai)
[![XGBoost](https://img.shields.io/badge/XGBoost-ML-0077B5)](https://xgboost.readthedocs.io)
[![UN SDG 9](https://img.shields.io/badge/UN%20SDG-9%20%7C%20Infrastructure-FF6F00)](https://sdgs.un.org/goals/goal9)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**🌐 Live Demo:** [project-96d2fc7b-e1a1-418a-87a.web.app](https://project-96d2fc7b-e1a1-418a-87a.web.app)  
**📡 API Docs:** [apex-ml-agent.asia-south1.run.app/docs](https://apex-ml-agent-246320615957.asia-south1.run.app/docs)

---

## 📋 Table of Contents

- [UN SDG Alignment](#-un-sustainable-development-goal-alignment)
- [Problem Statement](#-problem-statement)
- [Our Innovation](#-our-innovation-fastag-as-iot)
- [Live Demo](#-live-demo)
- [Architecture](#-system-architecture)
- [Google Technologies](#-google-technologies-used)
- [Gemini AI Integration](#-gemini-25-flash--deep-integration)
- [ML Pipeline](#-ml-inference-pipeline)
- [Mathematical Foundations](#-mathematical-foundations)
- [Project Structure](#-project-structure)
- [Quick Start](#-quick-start)
- [API Reference](#-api-reference)
- [Performance](#-performance-metrics)
- [Data Sources](#-data-sources--validation)
- [Team](#-team)

---

## 🌍 UN Sustainable Development Goal Alignment

A.P.E.X directly addresses **UN SDG 9: Industry, Innovation, and Infrastructure**:

| SDG 9 Target | How A.P.E.X Contributes |
|--------------|------------------------|
| **9.1** — Develop sustainable, resilient infrastructure | Transforms India's existing toll infrastructure into an intelligent monitoring network; builds freight resilience through predictive AI routing |
| **9.4** — Upgrade infrastructure for sustainability | Reduces fuel waste from unnecessary delays; cuts CO₂ emissions by preventing cascade congestion events |
| **9.c** — Universal access to ICT | Leverages existing FASTag (RFID) infrastructure — no new hardware required, works with 5.9 crore active tags |

> A.P.E.X also supports **SDG 11** (Sustainable Cities & Communities) through reduced urban freight congestion and **SDG 13** (Climate Action) through optimized routing that minimizes fuel consumption.

---

## 🎯 Problem Statement

**India's logistics costs consume 7.97% of GDP** (₹22.6 lakh crore annually) — significantly higher than the global average of 6.7% — according to the [DPIIT-NCAER Assessment of Logistics Cost in India, 2023-24](https://pib.gov.in). For smaller firms (turnover ≤₹5 crore), this burden reaches **16.9% of output**.

Despite India's improvement to **38th on the World Bank Logistics Performance Index** (2023), highway freight — which carries **65% of India's total freight** — still operates reactively:

| The Problem | Scale |
|------------|-------|
| Daily FASTag transactions | **10.5 million** (105 lakh/day, FY2025-26) |
| Active FASTags nationwide | **5.9 crore** (59 million) |
| Annual toll collection | **₹61,408 crore** (FY 2024-25) |
| Avg toll-plaza crossing time | **40 seconds** (ETC) vs 12 min (manual) |
| Data being used for prediction | **0%** — all data is for billing only |

> **The core insight**: India already has 10.5 million GPS-like data points per day from FASTag transactions. This data stream is being used *only* for billing. A.P.E.X transforms it into a real-time predictive intelligence network.

---

## 💡 Our Innovation: FASTag-as-IoT

A.P.E.X transforms India's **existing FASTag ETC infrastructure** into a **real-time IoT sensor network** — zero new hardware, zero installation, instant national coverage.

| Capability | Existing Solutions (FourKites, Rivigo) | **A.P.E.X** |
|------------|---------------------------------------|-------------|
| Hardware required | GPS trackers per truck | **Zero** — uses existing FASTag |
| Coverage | Subscribed fleet only | **Entire national highway network** |
| Prediction | Post-event alerts | **Pre-emptive (before disruption)** |
| Response | Manual re-routing | **Autonomous A* rerouting** |
| AI Integration | Rule-based | **Gemini 2.5 Flash + XGBoost + RF** |
| Cascade awareness | None | **Motter-Lai cascade propagation** |
| Cost to deploy | ₹2,000–5,000/truck | **₹0** |

### 📊 Projected Impact

| Metric | Current State | With A.P.E.X | Source |
|--------|--------------|-------------|--------|
| Disruption response time | 45–120 min (manual) | **< 30 seconds** (autonomous) | Industry benchmarks |
| Demurrage costs saved | ₹0 (no prevention) | **₹3.9L per event** (A* rerouting) | Simulated from NHAI data |
| Cascade failure prevention | 0% (no prediction) | **85%+** (XGBoost + Motter-Lai) | Model validation |
| CO₂ reduction | — | **~12% per rerouted convoy** | BPR delay model |
| Scalability | Per-truck licensing | **National Day-1** (5.9 Cr FASTags) | NPCI FASTag data |

---

## 🖥 Live Demo

The application is **fully deployed and live**:

| Component | URL | Status |
|-----------|-----|--------|
| **Dashboard** | [project-96d2fc7b-e1a1-418a-87a.web.app](https://project-96d2fc7b-e1a1-418a-87a.web.app) | ✅ Live |
| **ML Backend** | [apex-ml-agent-246320615957.asia-south1.run.app](https://apex-ml-agent-246320615957.asia-south1.run.app) | ✅ Live |
| **API Docs** | [/docs](https://apex-ml-agent-246320615957.asia-south1.run.app/docs) | ✅ Swagger UI |

### Dashboard Features

- **🗺 Real-time Map** — Google Maps + Deck.GL with 15 monitored nodes across India's highway network
- **⚡ Disruption Injection** — Simulate monsoons, accidents, ICEGATE failures, floods, and more
- **🤖 Gemini Query Bar** — Ask natural language questions about the network state
- **🔮 AI Predictive Insights** — Real-time predictions powered by Gemini 2.5 Flash
- **📊 KPI Dashboard** — Network Health, ETA Accuracy, Cost Saved, Cascade Risk
- **📟 Agent Terminal** — Live ML inference pipeline logs
- **🔔 Alert Timeline** — Chronological event feed with severity levels

---

## 🏗 System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                  FRONTEND — React 19 + Vite + deck.gl                   │
│  ┌───────────┐ ┌────────────┐ ┌────────────┐ ┌──────────────────────┐  │
│  │  MapView   │ │  KPI Panel │ │  Alerts    │ │  Gemini Query Bar    │  │
│  │ (Google    │ │  (Zustand)  │ │  Timeline  │ │  (NL → AI Response)  │  │
│  │  Maps +    │ │             │ │            │ │                      │  │
│  │  deck.gl)  │ │             │ │            │ ├──────────────────────┤  │
│  │  60fps     │ │             │ │            │ │  AI Insights Panel   │  │
│  └──────┬─────┘ └──────┬──────┘ └─────┬──────┘ └──────────┬───────────┘  │
│         └──────────────┼──────────────┼───────────────────┘              │
│                        │    SSE + REST│                                   │
│            ┌───────────┘              └──────────────┐                   │
├────────────┼─────────────────────────────────────────┼───────────────────┤
│            ▼         BACKEND — FastAPI on Cloud Run   ▼                  │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────────────┐    │
│  │   XGBoost        │ │   A* Router      │ │   Gemini 2.5 Flash      │    │
│  │   Classifier     │ │   (NetworkX)     │ │   (Vertex AI)           │    │
│  │   <15ms          │ │   15 nodes       │ │   3 Use Cases:          │    │
│  │                  │ │   21 edges       │ │   • Disruption Analysis │    │
│  │   Random Forest  │ │   Multi-obj      │ │   • NL Query            │    │
│  │   Risk Scorer    │ │   optimization   │ │   • Predictive Insights │    │
│  └────────┬─────────┘ └────────┬─────────┘ └────────────┬─────────────┘   │
│           └────────────────────┼──────────────────────────┘              │
│                                │                                         │
│        ┌───────────────────────┼───────────────────────────┐             │
│        │          Event Log Ring Buffer (deque)            │             │
│        │    Real-time state sync + cache invalidation      │             │
│        └───────────────────────┬───────────────────────────┘             │
│                                │                                         │
│                   ┌────────────┴────────────┐                            │
│                   │    Firebase RTDB        │                            │
│                   │    (Real-time state)    │                            │
│                   └─────────────────────────┘                            │
└──────────────────────────────────────────────────────────────────────────┘
```

### Data Flow — Disruption → AI Response

```
1. User injects disruption (or auto-detected)
         │
2. XGBoost classifies → CRITICAL (96% confidence)
         │
3. graph_nodes updated in-memory → cache invalidated
         │
4. A* computes optimal reroute (15 nodes, 21 edges)
         │
5. Event logged to ring buffer → SSE broadcast
         │
6. Gemini 2.5 Flash generates structured analysis
         │
7. Frontend reflects disruption in < 100ms
```

---

## 🔧 Google Technologies Used

| # | Technology | Usage in A.P.E.X | Justification |
|---|------------|------------------|---------------|
| 1 | **Gemini 2.5 Flash** | 3 AI use cases: disruption analysis, NL queries, predictive insights | Structured JSON output, ~4s latency, ideal for real-time loops |
| 2 | **Vertex AI** | Production model hosting with service account auth | Zero API keys in production, billing-backed (no free-tier limits) |
| 3 | **Google Cloud Run** | Backend deployment (2 vCPU, 2GB RAM, min-instances=1, CPU-boost) | Auto-scaling, sub-3s cold start, serverless |
| 4 | **Firebase Realtime Database** | Real-time node status sync (fan-out pattern) | Sub-100ms reads, live sync across clients |
| 5 | **Firebase Hosting** | Frontend SPA deployment with global CDN | SSL, CDN, custom domain support |
| 6 | **Google Maps Platform** | Base map layer with Deck.GL overlay | Accurate Indian highway network rendering |
| 7 | **Cloud IAM** | Service account authentication for Vertex AI | Secure, key-less authentication in production |

---

## 🤖 Gemini 2.5 Flash — Deep Integration

A.P.E.X uses **Gemini 2.5 Flash via Vertex AI** (`google.genai` SDK) for three tightly integrated AI capabilities:

| # | Use Case | Endpoint | Description |
|---|----------|----------|-------------|
| 1 | **Disruption Analysis** | `POST /analyze-disruption` | Root cause identification, cascade risk assessment, recommended actions — structured JSON |
| 2 | **Natural Language Query** | `POST /gemini-query` | *"What's the riskiest corridor?"* → Parses intent, queries live graph state, returns risk level + relevant nodes |
| 3 | **Predictive Insights** | `GET /gemini-insights` | Continuous network monitoring with warnings, predictions, and optimization suggestions |

### Real-Time Context Intelligence

Gemini responses are **always aware of the current network state** through:

1. **In-memory state sync** — `graph_nodes` dictionary updated on every disruption injection
2. **Event log ring buffer** — `deque(maxlen=50)` tracks recent disruptions, fed into every prompt
3. **Cache invalidation** — Gemini response cache cleared instantly on state changes
4. **Enriched prompts** — Every query includes current node statuses + last 10 events

> **Why Gemini 2.5 Flash over Pro?** See [ADR-002](docs/ADR/002-gemini-flash-over-pro.md) — Flash provides structured JSON output with ~4s latency vs Pro's ~12s, critical for real-time agent loops.

---

## 🧠 ML Inference Pipeline

### Models

| Model | Task | Latency | Details |
|-------|------|---------|---------|
| **XGBoost** | Disruption classification (CRITICAL/MODERATE/LOW) | <15ms | Binary classifier, 96% confidence on test data |
| **Random Forest** | Risk scoring (0.0–1.0) | <10ms | Ensemble of 100 trees, multi-feature input |
| **A* Router** | Optimal reroute computation | <50ms | NetworkX graph, 15 nodes, 21 edges, multi-objective |
| **Gemini 2.5 Flash** | NL analysis + predictions | ~4–8s | Structured JSON via Vertex AI |

### Cascade Engine

The cascade propagation engine uses a **Motter-Lai** inspired model:

```
Disruption at Node A
       ↓
Impact propagated to neighbors (decay = 0.95)
       ↓
Utilization redistributed across graph
       ↓
XGBoost re-classifies all affected nodes
       ↓
A* finds optimal bypass route
       ↓
Gemini generates human-readable analysis
```

---

## 🧮 Mathematical Foundations

| Model | Formula | Application |
|-------|---------|-------------|
| **Queueing Theory** | M/M/1: ρ = λ/μ, bottleneck at ρ ≥ 0.85 | Node congestion detection |
| **BPR Delay** | t = t₀[1 + α(V/C)^β], α=0.88, β=9.8 | Indian-calibrated traffic delay |
| **Motter-Lai Cascade** | C_j = (1+α)·L_j(0) | Cascade failure propagation |
| **Resilience Metric** | SSW = max(0, TTS − TTR) | Node survival safety window |
| **Privacy** | SHA-256(vehicle_id) | DPDPA 2023 compliance |

---

## 📁 Project Structure

```
A.P.E.X/
├── frontend/                          # React 19 + Vite + deck.gl
│   ├── src/
│   │   ├── components/                # 16 UI components
│   │   │   ├── Map/                   # Google Maps + deck.gl (60fps)
│   │   │   ├── GeminiQueryBar/        # Natural language AI queries
│   │   │   ├── GeminiInsights/        # AI predictive insights panel
│   │   │   ├── AnomalyConsole/        # Disruption injection UI
│   │   │   ├── AlertTimeline/         # Event feed with severity
│   │   │   ├── KPIDashboard/          # Network health metrics
│   │   │   ├── AgentNarration/        # ML pipeline terminal
│   │   │   ├── Header/               # Top bar with model status
│   │   │   ├── NodeInspector/         # Node detail panel
│   │   │   ├── RiskMatrix/            # Risk visualization
│   │   │   ├── CascadeComparison/     # Before/after analysis
│   │   │   ├── AIEngineStatus/        # ML model health
│   │   │   ├── AgentStatus/           # Agent connection status
│   │   │   ├── OnboardingTour/        # First-time user guide
│   │   │   ├── ErrorBoundary/         # Error handling
│   │   │   └── Skeleton/              # Loading states
│   │   ├── hooks/                     # useFirebase, useAnimatedFleet
│   │   ├── stores/                    # Zustand state management
│   │   ├── services/                  # Route service layer
│   │   ├── data/                      # Mock data + route waypoints
│   │   ├── utils/                     # Polyline + lateral offset utils
│   │   ├── workers/                   # Web Workers (simplification)
│   │   ├── styles/                    # Design tokens + globals
│   │   └── config/                    # Firebase configuration
│   ├── .env.example                   # Environment template
│   └── vite.config.js                 # Build configuration
│
├── backend/
│   ├── processor/
│   │   ├── main.py                    # 2,200+ lines — ML Agent core
│   │   ├── weather_service.py         # OpenWeather integration
│   │   ├── requirements.txt           # Python dependencies
│   │   ├── .env.example               # Backend env template
│   │   ├── test_main.py               # Unit tests
│   │   └── test_fixes.py              # Regression tests
│   ├── graph/
│   │   └── highway_graph.json         # Network topology (15 nodes, 21 edges)
│   ├── simulator/
│   │   └── fastag_simulator.py        # FASTag transaction simulator
│   └── mock-apis/                     # Mock external services
│
├── ml/
│   ├── models/
│   │   ├── xgboost_model.pkl          # Trained XGBoost classifier
│   │   ├── rf_risk_model.pkl          # Trained Random Forest
│   │   ├── xgboost_training.py        # XGBoost training script
│   │   └── train_rf_risk.py           # RF training script
│   ├── routing/
│   │   ├── astar_router.py            # A* routing engine
│   │   └── graph_loader.py            # NetworkX graph builder
│   └── tests/                         # ML unit tests
│
├── scripts/
│   ├── seed_demo_data.py              # Firebase data seeder
│   └── reset_demo.py                  # Demo state reset
│
├── tests/                             # Integration tests
│   ├── test_astar_router.py
│   ├── test_predictor.py
│   └── test_trend_prediction.py
│
├── docs/
│   └── ADR/                           # Architecture Decision Records
│       ├── 001-dual-cadence-state.md
│       ├── 002-gemini-flash-over-pro.md
│       └── 003-xgboost-over-stgnn.md
│
├── .github/workflows/ci.yml           # CI pipeline
├── Dockerfile                         # Cloud Run container
├── docker-compose.dev.yml             # Local development
├── firebase.json                      # Firebase Hosting + RTDB
├── database.rules.json                # RTDB schema validation
└── .gitignore                         # Security-hardened exclusions
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+
- **Python** 3.11+
- **Google Cloud SDK** (for deployment)
- A **Google Cloud Project** with Vertex AI enabled

### 1. Clone

```bash
git clone https://github.com/AAYUSH-SPIDEY-SHARMA/A.P.E.X.git
cd A.P.E.X
```

### 2. Backend Setup

```bash
cd backend/processor

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your credentials:
#   GEMINI_API_KEY=your-key
#   FIREBASE_DATABASE_URL=your-firebase-url
#   DEMO_MODE=true

# Set Python path
export PYTHONPATH=$(pwd)/../..   # Linux/Mac
$env:PYTHONPATH="$(pwd)\..\.."   # Windows PowerShell

# Run
uvicorn main:app --host 0.0.0.0 --port 8080
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your Firebase + Google Maps credentials

# Run
npm run dev
```

Open **http://localhost:5174** to see the dashboard.

### 4. Cloud Deployment

```bash
# Backend → Cloud Run
gcloud run deploy apex-ml-agent \
    --source . \
    --port 8080 \
    --region asia-south1 \
    --memory 2Gi --cpu 2 \
    --min-instances 1 --cpu-boost \
    --timeout 3600 --concurrency 80 \
    --allow-unauthenticated \
    --set-env-vars "GOOGLE_CLOUD_PROJECT=your-project,GCP_LOCATION=asia-south1,DEMO_MODE=true"

# Frontend → Firebase Hosting
cd frontend && npm run build
firebase deploy --only hosting
```

---

## 📡 API Reference

### Core Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | System health check |
| `GET` | `/ml-status` | ML model status (XGBoost, RF, Gemini, Graph) |
| `GET` | `/nodes` | All node states (15 nodes) |
| `GET` | `/routes` | All active routes |
| `GET` | `/sse-stream` | Server-Sent Events for real-time updates |

### Disruption Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/inject-anomaly` | Inject disruption (monsoon, accident, etc.) |
| `POST` | `/demo/trigger` | One-click demo disruption |
| `POST` | `/demo/dual-shock` | Dual-shock scenario (monsoon + ICEGATE) |
| `POST` | `/demo/reset` | Reset all disruptions |

### AI Intelligence

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/gemini-query` | Natural language query → AI response |
| `GET` | `/gemini-insights` | Predictive AI insights |
| `POST` | `/analyze-disruption` | Gemini disruption analysis |

### ML & Routing

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/predict` | XGBoost disruption prediction |
| `GET` | `/risk-assessment` | Network-wide risk scoring |
| `POST` | `/compute-reroute` | A* optimal reroute calculation |

> Full interactive docs at **[/docs](https://apex-ml-agent-246320615957.asia-south1.run.app/docs)** (Swagger UI)

---

## 📊 Performance Metrics

| Metric | Value |
|--------|-------|
| XGBoost inference | **< 15ms** |
| Random Forest inference | **< 10ms** |
| A* routing (15 nodes) | **< 50ms** |
| Gemini analysis | **~4–8s** (structured JSON) |
| End-to-end disruption → response | **< 100ms** (excluding Gemini) |
| Frontend rendering | **60fps** (deck.gl WebGL) |
| Cold start (Cloud Run) | **< 3s** (CPU-boost enabled) |
| SSE latency | **< 50ms** |
| Gemini cache TTL | **45s** (auto-invalidated on disruption) |

---

## 📚 Data Sources & Validation

| Data Point | Source |
|-----------|--------|
| FASTag transaction volumes (10.5M/day) | NHAI Annual Report FY2024-25; Parliament Q&A |
| Logistics cost (7.97% GDP) | DPIIT-NCAER "Assessment of Logistics Cost in India" 2023-24 |
| World Bank LPI Rank (#38) | World Bank Logistics Performance Index 2023 |
| BPR delay parameters (α=0.88, β=9.8) | Calibrated from NHAI Toll Plaza Impact Assessment |
| FASTag penetration (98%) | Press Information Bureau, Government of India |
| Annual toll collection (₹61,408 Cr) | NHAI FY2024-25 Annual Report |
| Active FASTags (5.9 Cr) | NPCI FASTag Dashboard |

---

## 🏆 Key Differentiators

1. **Zero New Hardware** — Uses India's existing FASTag infrastructure (5.9 Cr active tags)
2. **Autonomous AI Response** — XGBoost + A* + Gemini pipeline runs without human intervention
3. **Real-Time AI Context** — Gemini responses reflect live network state via event log buffer + cache invalidation
4. **60fps Digital Twin** — Production-grade WebGL visualization with Google Maps + deck.gl
5. **Indian-Calibrated Mathematics** — BPR α=0.88, β=9.8 from NHAI toll plaza data (not generic Western values)
6. **DPDPA 2023 Compliant** — SHA-256 pseudonymization of vehicle IDs
7. **7 Google Technologies** — Gemini, Vertex AI, Cloud Run, Firebase (RTDB + Hosting), Google Maps, Cloud IAM
8. **Production-Grade Security** — Vertex AI service account auth, zero API keys in deployed code
9. **Validated Against Real Data** — Calibrated against NHAI FY2024-25 toll transaction volumes

---

## 👥 Team

| Member | Role | Key Contributions |
|--------|------|-------------------|
| **Aayush Sharma** | Backend & ML Lead | ML pipeline, Vertex AI integration, Cloud Run deployment, A* routing |
| **Vivesh** | ML & Data Engineer | XGBoost training, Random Forest models, data pipeline |
| **Rakshak** | Frontend Engineer | React dashboard, deck.gl visualization, component architecture |

**Google Solution Challenge 2026 India** — UN SDG 9: Industry, Innovation & Infrastructure

---

## 📜 License

MIT License — Built for the Google Solution Challenge 2026.
