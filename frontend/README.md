# Frontend Directory — Member 3 (Rakshak) ONLY

This directory contains the React + deck.gl dashboard.

## Structure (Blueprint Section 27.1):
```
frontend/
├── src/
│   ├── components/     # Map, NodeInspector, AlertPanel, KPIDashboard
│   ├── hooks/          # useFirebaseRoutes, useFirebaseNodes
│   ├── layers/         # deck.gl layer configurations
│   ├── config/         # Firebase config
│   └── App.jsx
├── public/
├── .env.local          # API keys (git-ignored)
└── package.json
```

## Setup (Blueprint Section 20.5):
```bash
npm create vite@latest . -- --template react
npm install @deck.gl/core @deck.gl/layers @deck.gl/google-maps firebase recharts
npm run dev  # → http://localhost:5173
```

See `docs/MEMBER_3_GUIDE_RAKSHAK.md` for full instructions.
