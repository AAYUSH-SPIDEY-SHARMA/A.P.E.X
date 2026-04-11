# A.P.E.X — Member 3 (Rakshak) Complete Guide

## Frontend & Visualization Engineer

> **Read this ENTIRE document before writing any code.**
> This guide replaces the need to read the full 3000-line blueprint.
> Section numbers like `(S16.2)` refer to the main `A.P.E.X.md` blueprint for deeper details.

---

## TABLE OF CONTENTS

1. [Your Role — What You Own](#1-your-role)
2. [What You Build vs Skip](#2-what-you-build-vs-skip)
3. [Dependencies With Other Members](#3-dependencies-with-other-members)
4. [Your Directory Structure](#4-your-directory-structure)
5. [The Firebase Contract — YOUR Read Paths](#5-the-firebase-contract)
6. [Day 1-2: React + Vite + Google Maps + deck.gl](#6-day-1-2-scaffold)
7. [Day 3-4: Firebase Listeners + Dynamic Data](#7-day-3-4-firebase-listeners)
8. [Day 5-6: Node Inspector + Anomaly Injection Console](#8-day-5-6-node-inspector--anomaly-console)
9. [Day 7-9: KPI Dashboard + Animations](#9-day-7-9-kpi-dashboard)
10. [Day 10-12: Polish + Stretch Goals](#10-day-10-12-polish)
11. [Day 13-18: Testing & Demo Prep](#11-day-13-18-testing--demo-prep)
12. [FAQ — Common Confusions Answered](#12-faq)

---

## 1. YOUR ROLE

> **You are THE most important member for winning.** The UI IS the product for judges. If the dashboard looks like a student project, you lose. If it looks like a military-grade control center, you win.

**You own everything judges SEE:**
- The dark-mode Google Maps with deck.gl overlays
- Truck route arcs (blue = normal, red = rerouted)
- Node status dots (green/yellow/red)
- The Anomaly Injection Console (judges click this!)
- The KPI dashboard with animated counters
- The Alert Timeline
- The Node Inspector panel

**What you DON'T own:**
- Backend data processing (Member 1)
- ML prediction & routing (Member 2)
- Firebase RTDB schema (already defined in `shared/firebase-contract.json`)

**Your only job: make Firebase data look AMAZING on screen.**

---

## 2. WHAT YOU BUILD VS SKIP

| Component | Action | Why |
|-----------|--------|-----|
| **React + Vite app** | 🟢 BUILD NOW | Your foundation |
| **Google Maps dark mode** | 🟢 BUILD NOW | Base map — center on India |
| **deck.gl ArcLayer** | 🟢 BUILD NOW | Truck route visualization — your killer feature |
| **deck.gl ScatterplotLayer** | 🟢 BUILD NOW | Node status dots (toll plazas, warehouses) |
| **Firebase `onValue` listeners** | 🟢 BUILD NOW | Real-time data binding |
| **Anomaly Injection Console** | 🟢 BUILD NOW | Judge interaction point — must be beautiful |
| **Node Inspector panel** | 🟢 BUILD NOW | Click node → see details (utilization, TTR, TTS) |
| **Alert Timeline** | 🟢 BUILD NOW | Shows system actions (rerouted X trucks, saved ₹Y) |
| **KPI Dashboard (Recharts)** | 🟢 BUILD NOW | Animated counters: ₹3.8M saved, 12 trucks rerouted |
| **Dark theme + glassmorphism** | 🟢 BUILD NOW | Professional look — command center aesthetic |
| **Three.js 3D visualization** | 🟡 STRETCH (Day 10+) | Only if core dashboard is polished |
| **Playwright E2E tests** | 🔴 SKIP | Test manually |
| **Responsive design** | 🔴 SKIP | Focus on laptop screen only (demo device) |
| **User authentication** | 🔴 SKIP | Not needed for demo |

---

## 3. DEPENDENCIES WITH OTHER MEMBERS

### 🔑 THE BIG ANSWER: You can start working on Day 1 with NO dependencies

You don't need anyone's code to start. Here's the timeline:

| Days | Dependency Status | What You Do |
|------|-------------------|-------------|
| **Days 1-2** | ❌ NO DEPENDENCY | You use hardcoded static data for arcs and dots. Build the map, get deck.gl rendering. |
| **Days 3-4** | ❌ NO DEPENDENCY | You connect to Firebase emulator. You write your OWN test data to Firebase to verify listeners work. |
| **Days 5-6** | ⚠️ SOFT DEPENDENCY | You build the Anomaly Console which calls Member 2's `/inject-anomaly`. If Member 2 isn't ready, just `console.log` the request and mock the response. |
| **Days 7-9** | ✅ FIRST INTEGRATION | Member 1's processor writes real data to Firebase. Member 2's agent writes anomalies/alerts. Your dashboard should show ALL of it live. |
| **Days 10+** | ✅ FULL INTEGRATION | Full pipeline: simulator → processor → ML → Firebase → YOUR DASHBOARD |

### What Each Member Writes — What You Read

| Firebase Path | Who Writes | What You Display |
|---------------|-----------|------------------|
| `supply_chain/active_routes/*` | **Member 1** | **ArcLayer** — Blue arcs for normal routes, red for rerouted |
| `supply_chain/nodes/*` | **Member 1** | **ScatterplotLayer** — Green/yellow/red dots at toll plazas |
| `supply_chain/anomalies/*` | **Member 2** | **IconLayer** — Red disruption markers on map |
| `supply_chain/alerts/*` | **Member 2** | **Alert Timeline** — Scrolling feed of system actions |

### API Calls You Make to Member 2

| When | Endpoint | What Happens |
|------|----------|-------------|
| Judge clicks "INJECT DISRUPTION" button | `POST http://<member2-url>/inject-anomaly` | Member 2 writes anomaly to Firebase, triggers prediction + rerouting |
| (Optional) Click "Predict" on node | `POST http://<member2-url>/predict-delay` | Returns disruption probability |

**For local dev**, Member 2 runs on `http://localhost:8082`.
Put this in your `.env.local`:
```
VITE_ML_API_URL=http://localhost:8082
```

---

## 4. YOUR DIRECTORY STRUCTURE

```
apex/
└── frontend/                        # YOUR directory — only YOU edit here
    ├── public/
    │   └── index.html
    ├── src/
    │   ├── App.jsx                  # Main app layout
    │   ├── App.css                  # Global styles
    │   ├── main.jsx                 # Entry point
    │   ├── components/
    │   │   ├── MapView.jsx          # Google Maps + deck.gl layers
    │   │   ├── NodeInspector.jsx    # Right panel — node details
    │   │   ├── AnomalyConsole.jsx   # Bottom-right — disruption injection
    │   │   ├── AlertTimeline.jsx    # Right panel — system alerts feed
    │   │   ├── KPIDashboard.jsx     # Bottom bar — animated counters
    │   │   └── Header.jsx           # Top bar — "A.P.E.X Control Center"
    │   ├── hooks/
    │   │   ├── useFirebaseRoutes.js
    │   │   ├── useFirebaseNodes.js
    │   │   ├── useFirebaseAnomalies.js
    │   │   └── useFirebaseAlerts.js
    │   ├── config/
    │   │   └── firebase.js          # Firebase initialization
    │   └── styles/
    │       └── theme.css            # Dark theme variables
    ├── .env.local                   # API keys (git-ignored)
    └── package.json
```

**Files you need to READ (not edit):**
- `shared/firebase-contract.json` — the exact Firebase paths and field names you subscribe to
- `backend/graph/highway_graph.json` — for initial static node positions (toll plaza coordinates)

---

## 5. THE FIREBASE CONTRACT

Open `shared/firebase-contract.json` and study it. Here are the EXACT paths you read:

### Path: `supply_chain/active_routes/<route_id>` → ArcLayer

```json
{
  "truckId": "TRK-001",
  "vehicleRegNo": "MH04AB1234",
  "originCoordinates": [77.1025, 28.7041],      // [lng, lat] — GeoJSON order!
  "destinationCoordinates": [72.8777, 19.0760],
  "currentPosition": [76.5, 25.3],
  "status": "NORMAL",                             // NORMAL | DISRUPTED | REROUTED
  "isRerouted": false,                             // true → draw RED arc
  "cargoValueINR": 850000,
  "ewayBillNo": 3410987654,
  "eta": "2026-04-07T14:00:00Z",
  "riskScore": 0.23
}
```

**How to render:**
- `isRerouted === false` → **Blue arc** (normal)
- `isRerouted === true` → **Red arc** (rerouted), thicker width
- Arc from `originCoordinates` to `destinationCoordinates`

### Path: `supply_chain/nodes/<node_id>` → ScatterplotLayer

```json
{
  "type": "TOLL_PLAZA",           // TOLL_PLAZA | WAREHOUSE | ICD | RTO_CHECKPOINT
  "name": "Kherki Daula Toll Plaza",
  "lat": 28.4167,
  "lng": 77.0500,
  "status": "NORMAL",             // NORMAL | DELAYED | DISRUPTED
  "utilization": 0.65,
  "queueLength": 42,
  "tts": 72,                      // Time to Survive (hours)
  "ttr": 48                       // Time to Recover (hours)
}
```

**How to render:**
- `status === "NORMAL"` → **Green dot**
- `status === "DELAYED"` → **Yellow dot**
- `status === "DISRUPTED"` → **Red dot** (pulsing animation)
- Dot radius proportional to `utilization`
- Click dot → show Node Inspector panel

### Path: `supply_chain/anomalies/<anomaly_id>` → IconLayer

```json
{
  "type": "MONSOON",
  "lat": 19.0760,
  "lng": 72.8777,
  "severity": 0.9,
  "affectedHighway": "NH-48",
  "timestamp": "2026-04-06T10:00:00Z"
}
```

**How to render:**
- Red warning icon at `[lng, lat]`
- Size proportional to `severity`
- Tooltip showing type and affected highway

### Path: `supply_chain/alerts/<alert_id>` → Alert Timeline

```json
{
  "message": "CRITICAL: A* rerouted 12 trucks to SH-17. ₹3.8M saved.",
  "severity": "CRITICAL",         // CRITICAL | WARNING | INFO
  "costSavedINR": 420000,
  "timestamp": "2026-04-06T10:05:00Z"
}
```

**How to render:**
- Vertical timeline, newest at top
- Red icon for CRITICAL, yellow for WARNING, blue for INFO
- Show message, timestamp, and cost saved

---

## 6. DAY 1-2: REACT + VITE + GOOGLE MAPS + DECK.GL

### Step 1: Initialize Project

```bash
cd apex
npm create vite@latest frontend -- --template react
cd frontend
```

### Step 2: Install ALL Dependencies

```bash
npm install \
  @deck.gl/core @deck.gl/layers @deck.gl/aggregation-layers @deck.gl/google-maps \
  firebase \
  recharts \
  @vis.gl/react-google-maps
```

> **Note:** Three.js is a STRETCH goal. Don't install it now. Focus on 2D first.

### Step 3: Environment Variables

Create `frontend/.env.local` (git-ignored):

```env
VITE_GOOGLE_MAPS_API_KEY=AIzaSy...your-key-here
VITE_GOOGLE_MAPS_MAP_ID=your-dark-mode-map-id
VITE_FIREBASE_DATABASE_URL=http://127.0.0.1:9000
VITE_FIREBASE_PROJECT_ID=apex-digital-twin
VITE_ML_API_URL=http://localhost:8082
VITE_PROCESSOR_API_URL=http://localhost:8080
```

**Google Maps setup:**
1. Go to Google Cloud Console → APIs & Services → Credentials
2. Create an API key
3. Enable: Maps JavaScript API
4. Create a Map ID with **dark mode** styling at https://console.cloud.google.com/google/maps-platform/map-management

### Step 4: Create Base Map Component

```jsx
// src/components/MapView.jsx

import React, { useEffect, useRef, useState } from 'react';
import { GoogleMapsOverlay } from '@deck.gl/google-maps';
import { ArcLayer, ScatterplotLayer } from '@deck.gl/layers';

// Initial hardcoded data (replace with Firebase on Day 3-4)
const STATIC_NODES = [
  { id: "TP-KHD-001", name: "Kherki Daula",  lat: 28.4167, lng: 77.0500, status: "NORMAL" },
  { id: "TP-MNR-002", name: "Manesar",        lat: 28.3570, lng: 76.9340, status: "NORMAL" },
  { id: "TP-JPR-003", name: "Shahpura",       lat: 26.9124, lng: 75.7873, status: "DELAYED" },
  { id: "TP-PNP-004", name: "Panipat",        lat: 29.3909, lng: 76.9635, status: "NORMAL" },
  { id: "TP-VDR-005", name: "Vadodara",       lat: 22.3072, lng: 73.1812, status: "NORMAL" },
  { id: "TP-SRT-006", name: "Surat",          lat: 21.1702, lng: 72.8311, status: "DISRUPTED" },
  { id: "TP-MUM-007", name: "Mumbai Entry",   lat: 19.2183, lng: 72.9781, status: "NORMAL" },
];

const STATIC_ROUTES = [
  { id: "R1", source: [77.3910, 28.5355], target: [72.9483, 18.9488], isRerouted: false },
  { id: "R2", source: [77.0500, 28.4167], target: [73.1812, 22.3072], isRerouted: false },
  { id: "R3", source: [75.8069, 26.8498], target: [72.8311, 21.1702], isRerouted: true },
];

const STATUS_COLORS = {
  NORMAL:    [0, 255, 100, 180],
  DELAYED:   [255, 200, 0, 200],
  DISRUPTED: [255, 0, 0, 200],
};

export default function MapView({ routes, nodes, anomalies, onNodeClick }) {
  const mapRef = useRef(null);
  const overlayRef = useRef(null);

  // Use live data if available, otherwise static
  const activeRoutes = routes?.length > 0 ? routes : STATIC_ROUTES;
  const activeNodes = nodes?.length > 0 ? nodes : STATIC_NODES;

  useEffect(() => {
    // Initialize Google Map (dark mode)
    if (!mapRef.current) {
      mapRef.current = new window.google.maps.Map(
        document.getElementById('map-container'),
        {
          center: { lat: 21.1458, lng: 79.0882 },  // Nagpur = center of India
          zoom: 5,
          mapId: import.meta.env.VITE_GOOGLE_MAPS_MAP_ID,
          disableDefaultUI: true,
          gestureHandling: 'greedy',
        }
      );
    }

    // Build deck.gl layers
    const layers = [
      // Truck route arcs
      new ArcLayer({
        id: 'truck-routes',
        data: activeRoutes,
        getSourcePosition: d => d.source || d.originCoordinates,
        getTargetPosition: d => d.target || d.destinationCoordinates,
        getSourceColor: d => d.isRerouted ? [255, 50, 50, 220] : [0, 128, 255, 180],
        getTargetColor: d => d.isRerouted ? [255, 50, 50, 220] : [0, 128, 255, 180],
        getWidth: d => d.isRerouted ? 4 : 2,
        pickable: true,
        autoHighlight: true,
      }),

      // Node dots
      new ScatterplotLayer({
        id: 'network-nodes',
        data: activeNodes,
        getPosition: d => [d.lng, d.lat],
        getRadius: d => d.status === 'DISRUPTED' ? 15000 : 8000,
        getFillColor: d => STATUS_COLORS[d.status] || STATUS_COLORS.NORMAL,
        pickable: true,
        onClick: (info) => onNodeClick && onNodeClick(info.object),
      }),
    ];

    // Add anomaly markers if any
    if (anomalies?.length > 0) {
      layers.push(
        new ScatterplotLayer({
          id: 'anomaly-markers',
          data: anomalies,
          getPosition: d => [d.lng, d.lat],
          getRadius: d => d.severity * 25000,
          getFillColor: [255, 0, 0, 150],
          getLineColor: [255, 0, 0, 255],
          stroked: true,
          lineWidthMinPixels: 2,
        })
      );
    }

    // Apply overlay
    if (!overlayRef.current) {
      overlayRef.current = new GoogleMapsOverlay({ layers });
      overlayRef.current.setMap(mapRef.current);
    } else {
      overlayRef.current.setProps({ layers });
    }

  }, [activeRoutes, activeNodes, anomalies, onNodeClick]);

  return (
    <div
      id="map-container"
      style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
    />
  );
}
```

### Step 5: App Layout (S16.2)

```jsx
// src/App.jsx

import React, { useState } from 'react';
import MapView from './components/MapView';
import Header from './components/Header';
// These come later:
// import NodeInspector from './components/NodeInspector';
// import AnomalyConsole from './components/AnomalyConsole';
// import AlertTimeline from './components/AlertTimeline';
// import KPIDashboard from './components/KPIDashboard';
import './App.css';

function App() {
  const [selectedNode, setSelectedNode] = useState(null);

  return (
    <div className="app-container">
      <Header />
      <div className="main-content">
        <MapView
          routes={[]}
          nodes={[]}
          anomalies={[]}
          onNodeClick={setSelectedNode}
        />
        {/* Right panel (Day 5-6) */}
        {/* {selectedNode && <NodeInspector node={selectedNode} />} */}
        {/* <AlertTimeline alerts={[]} /> */}

        {/* Bottom panels (Day 5-9) */}
        {/* <AnomalyConsole /> */}
        {/* <KPIDashboard /> */}
      </div>
    </div>
  );
}

export default App;
```

### Step 6: Dark Theme CSS

```css
/* src/App.css */

:root {
  --bg-primary: #0a0e17;
  --bg-secondary: #111827;
  --bg-panel: rgba(17, 24, 39, 0.85);
  --border-color: rgba(59, 130, 246, 0.3);
  --text-primary: #f1f5f9;
  --text-secondary: #94a3b8;
  --accent-blue: #3b82f6;
  --accent-green: #10b981;
  --accent-red: #ef4444;
  --accent-yellow: #f59e0b;
  --glass: rgba(255, 255, 255, 0.05);
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: 'Inter', 'Roboto', -apple-system, sans-serif;
  background: var(--bg-primary);
  color: var(--text-primary);
  overflow: hidden;
}

.app-container {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.main-content {
  flex: 1;
  position: relative;
}

/* Glassmorphism panel base */
.glass-panel {
  background: var(--bg-panel);
  backdrop-filter: blur(20px);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}
```

### Verification (End of Day 2)

```bash
cd frontend
npm run dev
# Open http://localhost:5173
# You should see:
# ✅ Dark Google Map centered on India
# ✅ 7 colored dots at toll plazas
# ✅ 3 arcs (2 blue, 1 red)
```

---

## 7. DAY 3-4: FIREBASE LISTENERS + DYNAMIC DATA

### Firebase Setup

```javascript
// src/config/firebase.js

import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
```

### Custom Hooks (THE CORE OF YOUR APP)

```javascript
// src/hooks/useFirebaseRoutes.js

import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../config/firebase';

export function useFirebaseRoutes() {
  const [routes, setRoutes] = useState([]);

  useEffect(() => {
    const routesRef = ref(db, 'supply_chain/active_routes');
    const unsubscribe = onValue(routesRef, (snapshot) => {
      if (snapshot.val()) {
        const data = snapshot.val();
        setRoutes(
          Object.entries(data).map(([id, route]) => ({
            id,
            ...route,
            // deck.gl needs source/target as arrays
            source: route.originCoordinates,     // [lng, lat]
            target: route.destinationCoordinates, // [lng, lat]
          }))
        );
      }
    });
    return () => unsubscribe();
  }, []);

  return routes;
}
```

```javascript
// src/hooks/useFirebaseNodes.js

import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../config/firebase';

export function useFirebaseNodes() {
  const [nodes, setNodes] = useState([]);

  useEffect(() => {
    const nodesRef = ref(db, 'supply_chain/nodes');
    const unsubscribe = onValue(nodesRef, (snapshot) => {
      if (snapshot.val()) {
        const data = snapshot.val();
        setNodes(
          Object.entries(data).map(([id, node]) => ({ id, ...node }))
        );
      }
    });
    return () => unsubscribe();
  }, []);

  return nodes;
}
```

Create the same pattern for `useFirebaseAnomalies.js` and `useFirebaseAlerts.js`:
- `useFirebaseAnomalies()` → `ref(db, 'supply_chain/anomalies')`
- `useFirebaseAlerts()` → `ref(db, 'supply_chain/alerts')`

### Update App.jsx to use hooks

```jsx
import { useFirebaseRoutes } from './hooks/useFirebaseRoutes';
import { useFirebaseNodes } from './hooks/useFirebaseNodes';
import { useFirebaseAnomalies } from './hooks/useFirebaseAnomalies';
import { useFirebaseAlerts } from './hooks/useFirebaseAlerts';

function App() {
  const routes = useFirebaseRoutes();
  const nodes = useFirebaseNodes();
  const anomalies = useFirebaseAnomalies();
  const alerts = useFirebaseAlerts();

  return (
    <div className="app-container">
      <Header />
      <div className="main-content">
        <MapView
          routes={routes}
          nodes={nodes}
          anomalies={anomalies}
          onNodeClick={setSelectedNode}
        />
      </div>
    </div>
  );
}
```

### Testing with Mock Data

Before Members 1 & 2 are ready, write test data to Firebase emulator yourself:

```bash
# Start Firebase emulator
cd apex
npx firebase-tools emulators:start --only database --project apex-digital-twin

# Write test data using curl
curl -X PUT "http://localhost:9000/supply_chain/nodes/TP-KHD-001.json" \
  -d '{"type":"TOLL_PLAZA","name":"Kherki Daula","lat":28.4167,"lng":77.05,"status":"DISRUPTED","utilization":0.92,"queueLength":85,"tts":36,"ttr":96}'

curl -X PUT "http://localhost:9000/supply_chain/active_routes/route-TRK-001.json" \
  -d '{"truckId":"TRK-001","vehicleRegNo":"MH04AB1234","originCoordinates":[77.39,28.54],"destinationCoordinates":[72.95,18.95],"currentPosition":[76.5,25.3],"status":"NORMAL","isRerouted":false,"cargoValueINR":850000,"riskScore":0.23}'
```

### Verification (End of Day 4)

```
✅ Map shows live dots from Firebase (not hardcoded)
✅ Arc colors change when you update isRerouted in Firebase
✅ Node dots change color when you update status in Firebase
✅ Data updates appear within 200ms (no page refresh needed)
```

---

## 8. DAY 5-6: NODE INSPECTOR + ANOMALY INJECTION CONSOLE

### Node Inspector (Right Panel)

When user clicks a toll plaza dot on the map, show a sliding panel with:

| Field | Source | Visual |
|-------|--------|--------|
| Name | `node.name` | Large text title |
| Type | `node.type` | Badge (TOLL_PLAZA, WAREHOUSE, ICD) |
| Status | `node.status` | Colored badge (green/yellow/red) |
| Utilization | `node.utilization` | Circular gauge (0-100%) |
| Queue Length | `node.queueLength` | Bar chart |
| TTS | `node.tts` | Number with "hours" label |
| TTR | `node.ttr` | Number with "hours" label |
| SSW | `max(0, ttr - tts)` | **Red if > 0**, green if 0 (S7.11) |

**Key formula from S7.11:**
```
SSW = max(0, TTR - TTS)
If SSW > 0: "INEVITABLE FAILURE — autonomous rerouting triggered"
If SSW = 0: "Network has sufficient resilience"
```

### Anomaly Injection Console (Bottom-Right)

This is what judges interact with. It MUST look premium.

```jsx
// src/components/AnomalyConsole.jsx

import React, { useState } from 'react';

const ANOMALY_PRESETS = [
  { type: 'MONSOON', label: 'Western Ghats Monsoon', lat: 17.5, lng: 73.8, severity: 0.95 },
  { type: 'ICEGATE_FAILURE', label: 'ICEGATE System Failure', lat: 28.509, lng: 77.275, severity: 1.0 },
  { type: 'ACCIDENT', label: 'NH-48 Major Accident', lat: 22.307, lng: 73.181, severity: 0.7 },
  { type: 'RTO_GRIDLOCK', label: 'Walayar RTO Gridlock', lat: 29.391, lng: 76.964, severity: 0.8 },
  { type: 'FLOOD', label: 'Gujarat Flood Warning', lat: 21.170, lng: 72.831, severity: 0.85 },
];

export default function AnomalyConsole() {
  const [selectedType, setSelectedType] = useState('MONSOON');
  const [severity, setSeverity] = useState(0.9);
  const [isLoading, setIsLoading] = useState(false);

  const handleInject = async () => {
    setIsLoading(true);
    const preset = ANOMALY_PRESETS.find(p => p.type === selectedType);

    try {
      const res = await fetch(`${import.meta.env.VITE_ML_API_URL}/inject-anomaly`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: selectedType,
          lat: preset.lat,
          lng: preset.lng,
          severity: severity,
          affectedHighway: 'NH-48',
        }),
      });
      const data = await res.json();
      console.log('Anomaly injected:', data);
      // Show success toast
    } catch (err) {
      console.error('Injection failed:', err);
      // Show error message
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="glass-panel anomaly-console">
      <h3>ANOMALY INJECTION</h3>
      <select value={selectedType} onChange={e => setSelectedType(e.target.value)}>
        {ANOMALY_PRESETS.map(p => (
          <option key={p.type} value={p.type}>{p.label}</option>
        ))}
      </select>
      <div className="severity-slider">
        <label>Severity: {severity.toFixed(1)}</label>
        <input
          type="range" min="0" max="1" step="0.1"
          value={severity}
          onChange={e => setSeverity(parseFloat(e.target.value))}
        />
      </div>
      <button onClick={handleInject} disabled={isLoading}>
        {isLoading ? 'INJECTING...' : 'INJECT DISRUPTION'}
      </button>
    </div>
  );
}
```

**For the demo, include preset buttons for the Dual-Shock scenario (S3.2):**
- "DUAL SHOCK" button → injects BOTH Western Ghats Monsoon + ICEGATE Failure

### Alert Timeline (Right Panel below Node Inspector)

```jsx
// src/components/AlertTimeline.jsx

export default function AlertTimeline({ alerts }) {
  const sorted = [...alerts].sort((a, b) =>
    new Date(b.timestamp) - new Date(a.timestamp)
  );

  const severityColors = {
    CRITICAL: '#ef4444',
    WARNING: '#f59e0b',
    INFO: '#3b82f6',
  };

  return (
    <div className="glass-panel alert-timeline">
      <h3>SYSTEM ACTIVITY</h3>
      {sorted.map((alert, i) => (
        <div key={i} className="alert-item">
          <div
            className="severity-dot"
            style={{ backgroundColor: severityColors[alert.severity] }}
          />
          <div className="alert-content">
            <p className="alert-message">{alert.message}</p>
            {alert.costSavedINR && (
              <p className="cost-saved">Saved: Rs.{alert.costSavedINR.toLocaleString()}</p>
            )}
            <p className="alert-time">
              {new Date(alert.timestamp).toLocaleTimeString()}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
```

---

## 9. DAY 7-9: KPI DASHBOARD + ANIMATIONS

### KPI Bottom Bar

The bottom bar shows 4 animated counters that impress judges:

| KPI | Source | Visual |
|-----|--------|--------|
| **Cost Saved** | Sum of all `alerts[].costSavedINR` | Rs. counter with count-up animation |
| **Trucks Rerouted** | Count of routes where `isRerouted === true` | Integer counter |
| **Network Utilization** | Average of all `nodes[].utilization` | Circular gauge (0-100%) |
| **ETA Accuracy** | Hardcoded: 92% (calculated offline) | Percentage gauge |

**The Rs.3.8M counter is the most impactful visual.** Use a count-up animation library or implement with `requestAnimationFrame`.

### Arc Transition Animations

When a route changes from `isRerouted: false` to `isRerouted: true`, the arc should:
1. Fade from blue to red
2. Animate to the new path (if coordinates change)

deck.gl supports transitions via the `transitions` prop on layers.

---

## 10. DAY 10-12: POLISH

### Design Priorities (P0 — Do These Regardless)

| Item | How |
|------|-----|
| **Dark theme everywhere** | Use CSS variables (`--bg-primary`, `--accent-blue`, etc.) |
| **Glassmorphism panels** | `backdrop-filter: blur(20px)`, semi-transparent backgrounds |
| **Smooth transitions** | CSS `transition: all 0.3s ease` on panels, `transform` for slides |
| **Professional fonts** | Google Fonts: Inter or Roboto (add to index.html) |
| **Subtle glow effects** | `box-shadow: 0 0 20px rgba(59, 130, 246, 0.2)` on active elements |
| **Loading states** | Skeleton screens or spinner while Firebase connects |
| **Error boundaries** | React error boundary component wrapping the app |
| **Offline indicator** | Show "RECONNECTING..." banner if Firebase connection drops |

### Three.js 3D (STRETCH only — Day 10+)

Only attempt this if the core 2D dashboard is beautiful by Day 9. See S17.2 for details.

---

## 11. DAY 13-18: TESTING & DEMO PREP

### Demo Flow (S24.3 — memorize this)

Your dashboard must support this exact 5-minute script:

| Minute | What's on Screen |
|--------|-----------------|
| 0-1 | 50+ blue arcs (trucks moving), 7+ green dots (healthy nodes), KPI counters at 0 |
| 1-2 | Judge clicks "DUAL SHOCK" → map: red weather overlay, 2 nodes turn red |
| 2-3 | AI response: orange pulsing wave across graph, nodes flash yellow→red, SSW values appear |
| 3-4 | Rerouting: blue arcs smoothly transition to red, then to new blue paths on alternate routes |
| 4-5 | KPI counters animate up: "Rs.3.8M saved", "12 trucks rerouted", "0 human interventions" |

### Demo Controls You Need to Build

```
[RESET DEMO]  → Clears all anomalies/alerts, resets routes to NORMAL
[DUAL SHOCK]  → Injects Western Ghats Monsoon + ICEGATE Failure
[START SIMULATION] → Starts Member 1's FASTag simulator
```

### Pre-Demo Checklist

- [ ] Google Maps API key is set and working
- [ ] Firebase URL points to production (not localhost)
- [ ] Member 2's ML agent URL is correct
- [ ] 50+ truck routes visible on map
- [ ] All KPI counters reset to 0 at start
- [ ] "DUAL SHOCK" button triggers full autonomous healing sequence
- [ ] Alert timeline populates within 3 seconds
- [ ] Cost saved counter animates to Rs.3.8M
- [ ] Rehearsed 5+ times without crash

---

## 12. FAQ — COMMON CONFUSIONS ANSWERED

### Q: "Do I need Member 1 or 2's code to start?"

**NO.** Use hardcoded static data (Day 1-2), then Firebase emulator with your own test data (Day 3-4). Connect to real data on Day 7.

### Q: "What's `[lng, lat]` vs `[lat, lng]`?"

**CRITICAL:** The `firebase-contract.json` uses `[longitude, latitude]` order (GeoJSON standard). deck.gl also expects `[lng, lat]`. Google Maps `LatLng` objects use `{lat, lng}`. Don't mix them up.

### Q: "How do I get the Google Maps dark mode?"

Go to Google Cloud Console → Maps Platform → Map Management → Create a Map ID → Choose "Dark" theme. Put the Map ID in your `.env.local`.

### Q: "What if Member 2's agent isn't ready for the Anomaly Console?"

Mock the response! If the fetch fails, write the anomaly directly to Firebase yourself (you have write access to the emulator). The dashboard should still work even without Member 2's agent.

```javascript
// Fallback if Member 2's agent isn't ready
import { ref, set } from 'firebase/database';
import { db } from '../config/firebase';

const mockInject = (anomalyData) => {
  const anomalyId = `anomaly-${Date.now()}`;
  set(ref(db, `supply_chain/anomalies/${anomalyId}`), anomalyData);
};
```

### Q: "What coordinates do I use for the 7 toll plazas?"

Copy them from `backend/graph/highway_graph.json` (already created by Member 1):

| Node ID | Name | Lat | Lng |
|---------|------|-----|-----|
| TP-KHD-001 | Kherki Daula | 28.4167 | 77.0500 |
| TP-MNR-002 | Manesar | 28.3570 | 76.9340 |
| TP-JPR-003 | Shahpura | 26.9124 | 75.7873 |
| TP-PNP-004 | Panipat | 29.3909 | 76.9635 |
| TP-VDR-005 | Vadodara | 22.3072 | 73.1812 |
| TP-SRT-006 | Surat | 21.1702 | 72.8311 |
| TP-MUM-007 | Mumbai Entry | 19.2183 | 72.9781 |

Plus warehouses and ICDs (see the highway graph JSON for all 14 nodes).

### Q: "How frequently does Firebase update?"

Firebase RTDB uses WebSocket — updates arrive in **real-time** (sub-200ms). Your `onValue` listener fires instantly when any member writes new data. No polling needed.

### Q: "What if deck.gl arcs don't show up?"

Common issues:
1. Google Maps API key not set → check browser console for errors
2. Map ID not set → deck.gl overlay needs a WebGL-enabled map
3. Coordinates in wrong order → deck.gl expects `[lng, lat]`, not `[lat, lng]`
4. Overlay not attached → call `overlay.setMap(mapInstance)` after map loads

---

> **REMEMBER: A gorgeous dark-mode dashboard with smooth animations and animated KPI counters will WIN the hackathon — even if the backend XGBoost model is simple. Judges evaluate what they SEE. Make it beautiful.**
