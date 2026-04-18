// Firebase configuration
// Replace with real values once Member 1 sets up the GCP project

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBlrzzFgr2tBR0tL_5D1lHyBV5G7g44QkM",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "project-96d2fc7b-e1a1-418a-87a.firebaseapp.com",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://project-96d2fc7b-e1a1-418a-87a-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "project-96d2fc7b-e1a1-418a-87a",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "project-96d2fc7b-e1a1-418a-87a.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "246320615957",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:246320615957:web:0827c31b3fafaea441b41c"
};

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8082";

export const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

// Map defaults — center on Nagpur (geographic center of India)
export const MAP_CONFIG = {
  center: { lat: 21.1458, lng: 79.0882 },
  zoom: 5,
  minZoom: 4,
  maxZoom: 12,
};

// Status constants
export const STATUS = {
  NORMAL: 'NORMAL',
  DELAYED: 'DELAYED',
  DISRUPTED: 'DISRUPTED',
  REROUTED: 'REROUTED',
};

// Anomaly types
export const ANOMALY_TYPES = [
  { value: 'MONSOON', label: 'Monsoon Storm', icon: '🌧️', description: 'Heavy rainfall causing landslides' },
  { value: 'FLOOD', label: 'Flooding', icon: '🌊', description: 'Water logging on highways' },
  { value: 'ACCIDENT', label: 'Major Accident', icon: '🚗', description: 'Highway collision blocking corridor' },
  { value: 'RTO_GRIDLOCK', label: 'RTO Gridlock', icon: '🚧', description: 'State border checkpoint congestion' },
  { value: 'ICEGATE_FAILURE', label: 'ICEGATE Failure', icon: '🖥️', description: 'Customs portal system failure' },
];

// Preset locations for anomaly injection
export const PRESET_LOCATIONS = [
  { label: 'Western Ghats (NH-48)', lat: 17.5, lng: 73.8 },
  { label: 'ICD Tughlakabad', lat: 28.5, lng: 77.3 },
  { label: 'Walayar Checkpoint (TN-KL)', lat: 10.9, lng: 76.8 },
  { label: 'Kherki Daula Toll (NH-48)', lat: 28.4167, lng: 77.05 },
  { label: 'Panipat (NH-44)', lat: 29.3909, lng: 76.9635 },
  { label: 'Surat (NH-48)', lat: 21.1702, lng: 72.8311 },
  { label: 'Mumbai Entry', lat: 19.2183, lng: 72.9781 },
];

// Colors for map layers
export const MAP_COLORS = {
  arcNormal: [37, 99, 235, 200],      // Blue
  arcDisrupted: [239, 68, 68, 220],    // Red
  arcRerouted: [16, 185, 129, 220],    // Green
  nodeNormal: [16, 185, 129, 200],     // Green
  nodeDelayed: [245, 158, 11, 220],    // Amber
  nodeDisrupted: [239, 68, 68, 220],   // Red
};

export default firebaseConfig;
