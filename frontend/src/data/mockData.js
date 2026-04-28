// ══════════════════════════════════════════════════════════
// Mock Data — Simulates Firebase RTDB structure (Section 10.5)
// Used for independent development until Members 1 & 2 set up Firebase
// ══════════════════════════════════════════════════════════

// BUG-04 FIX: Generate eWay Bill expiry dates relative to current time
// so they're always 1-8 hours in the future (never already expired)
function futureExpiry(hoursFromNow) {
  return new Date(Date.now() + hoursFromNow * 3600000).toISOString();
}

// Major Indian cities / logistics hubs with real coordinates
export const mockNodes = {
  'TP-KD-01': {
    type: 'TOLL_PLAZA', name: 'Kherki Daula Toll Plaza', highway: 'NH-48',
    lat: 28.4167, lng: 77.0500, status: 'NORMAL',
    utilization: 0.62, queueLength: 38, tts: 72, ttr: 48,
  },
  'TP-MN-02': {
    type: 'TOLL_PLAZA', name: 'Manesar Toll Plaza', highway: 'NH-48',
    lat: 28.3590, lng: 76.9430, status: 'NORMAL',
    utilization: 0.55, queueLength: 25, tts: 80, ttr: 36,
  },
  'TP-JP-03': {
    type: 'TOLL_PLAZA', name: 'Jaipur-Ajmer Toll Plaza', highway: 'NH-48',
    lat: 26.9124, lng: 75.7873, status: 'NORMAL',
    utilization: 0.48, queueLength: 18, tts: 96, ttr: 24,
  },
  'TP-PNP-04': {
    type: 'TOLL_PLAZA', name: 'Panipat Toll Plaza', highway: 'NH-44',
    lat: 29.3909, lng: 76.9635, status: 'NORMAL',
    utilization: 0.52, queueLength: 28, tts: 72, ttr: 36,
  },
  'TP-VD-05': {
    type: 'TOLL_PLAZA', name: 'Vadodara Toll Plaza', highway: 'NH-48',
    lat: 22.3072, lng: 73.1812, status: 'NORMAL',
    utilization: 0.45, queueLength: 20, tts: 120, ttr: 30,
  },
  'TP-SRT-06': {
    type: 'TOLL_PLAZA', name: 'Surat Toll Plaza', highway: 'NH-48',
    lat: 21.1702, lng: 72.8311, status: 'NORMAL',
    utilization: 0.58, queueLength: 34, tts: 90, ttr: 40,
  },
  'TP-MUM-07': {
    type: 'TOLL_PLAZA', name: 'Mumbai Entry Toll', highway: 'NH-48',
    lat: 19.2183, lng: 72.9781, status: 'NORMAL',
    utilization: 0.71, queueLength: 52, tts: 60, ttr: 45,
  },
  'WH-DEL-01': {
    type: 'WAREHOUSE', name: 'Delhi NCR Mega Warehouse', highway: 'NH-44',
    lat: 28.6139, lng: 77.2090, status: 'NORMAL',
    utilization: 0.68, queueLength: 0, tts: 96, ttr: 24,
  },
  'ICD-TKD-01': {
    type: 'ICD', name: 'ICD Tughlakabad', highway: 'NH-44',
    lat: 28.5100, lng: 77.2800, status: 'NORMAL',
    utilization: 0.72, queueLength: 85, tts: 48, ttr: 116,
  },
  'WH-MUM-01': {
    type: 'WAREHOUSE', name: 'JNPT Mumbai Port Warehouse', highway: 'NH-48',
    lat: 18.9500, lng: 72.9500, status: 'NORMAL',
    utilization: 0.60, queueLength: 0, tts: 72, ttr: 36,
  },
  'WH-CHN-01': {
    type: 'WAREHOUSE', name: 'Chennai Logistics Hub', highway: 'NH-44',
    lat: 13.0827, lng: 80.2707, status: 'NORMAL',
    utilization: 0.52, queueLength: 0, tts: 84, ttr: 28,
  },
  'TP-BLR-01': {
    type: 'TOLL_PLAZA', name: 'Bangalore Toll (Nice Road)', highway: 'NH-44',
    lat: 12.9716, lng: 77.5946, status: 'NORMAL',
    utilization: 0.65, queueLength: 42, tts: 72, ttr: 36,
  },
  'RTO-WLR-01': {
    type: 'RTO_CHECKPOINT', name: 'Walayar Checkpoint (TN-KL)', highway: 'NH-544',
    lat: 10.9200, lng: 76.7800, status: 'NORMAL',
    utilization: 0.58, queueLength: 32, tts: 72, ttr: 36,
  },
  'WH-KOL-01': {
    type: 'WAREHOUSE', name: 'Kolkata Logistics Park', highway: 'NH-44',
    lat: 22.5726, lng: 88.3639, status: 'NORMAL',
    utilization: 0.50, queueLength: 0, tts: 96, ttr: 20,
  },
  'ICD-WF-01': {
    type: 'ICD', name: 'ICD Whitefield (Bengaluru)', highway: 'NH-44',
    lat: 12.9698, lng: 77.7500, status: 'NORMAL',
    utilization: 0.45, queueLength: 30, tts: 96, ttr: 40,
  },
};

// Active truck routes across India — with corridor assignment for PathLayer
export const mockRoutes = {
  'R-001': {
    truckId: 'TRK-001', vehicleRegNo: 'MH04AB1234',
    originCoordinates: [77.2090, 28.6139],     // Delhi
    destinationCoordinates: [72.8777, 19.0760], // Mumbai
    currentPosition: [76.5, 26.8],
    status: 'NORMAL', isRerouted: false,
    cargoValueINR: 1250000, ewayBillNo: 3410987654, ewayBillExpiry: futureExpiry(3.2),
    eta: '2026-04-12T14:00:00Z', riskScore: 0.82,
    corridor: 'NH-48', commodity: 'Auto Parts',
  },
  'R-002': {
    truckId: 'TRK-002', vehicleRegNo: 'DL01CD5678',
    originCoordinates: [77.2090, 28.6139],     // Delhi
    destinationCoordinates: [80.2707, 13.0827], // Chennai
    currentPosition: [78.5, 22.3],
    status: 'NORMAL', isRerouted: false,
    cargoValueINR: 850000, ewayBillNo: 3410987655, ewayBillExpiry: futureExpiry(6.5),
    eta: '2026-04-13T10:00:00Z', riskScore: 0.23,
    corridor: 'NH-44', commodity: 'Electronics',
  },
  'R-003': {
    truckId: 'TRK-003', vehicleRegNo: 'GJ05EF9012',
    originCoordinates: [72.8311, 21.1702],     // Surat
    destinationCoordinates: [88.3639, 22.5726], // Kolkata
    currentPosition: [78.0, 22.0],
    status: 'NORMAL', isRerouted: false,
    cargoValueINR: 680000, ewayBillNo: 3410987656, ewayBillExpiry: futureExpiry(7.0),
    eta: '2026-04-14T08:00:00Z', riskScore: 0.15,
    corridor: 'NH-44-EAST-ALT', commodity: 'Textiles',
  },
  'R-004': {
    truckId: 'TRK-004', vehicleRegNo: 'RJ14GH3456',
    originCoordinates: [75.7873, 26.9124],     // Jaipur
    destinationCoordinates: [72.9781, 19.2183], // Mumbai
    currentPosition: [74.2, 23.5],
    status: 'NORMAL', isRerouted: false,
    cargoValueINR: 920000, ewayBillNo: 3410987657, ewayBillExpiry: futureExpiry(2.5),
    eta: '2026-04-12T18:00:00Z', riskScore: 0.12,
    corridor: 'NH-48', commodity: 'Marble & Stone',
  },
  'R-005': {
    truckId: 'TRK-005', vehicleRegNo: 'KA01IJ7890',
    originCoordinates: [77.5946, 12.9716],     // Bangalore
    destinationCoordinates: [77.2090, 28.6139], // Delhi
    currentPosition: [77.8, 18.5],
    status: 'NORMAL', isRerouted: false,
    cargoValueINR: 1100000, ewayBillNo: 3410987658, ewayBillExpiry: futureExpiry(5.0),
    eta: '2026-04-13T22:00:00Z', riskScore: 0.78,
    corridor: 'NH-44', commodity: 'IT Equipment',
  },
  'R-006': {
    truckId: 'TRK-006', vehicleRegNo: 'MH12KL2345',
    originCoordinates: [73.8567, 18.5204],     // Pune
    destinationCoordinates: [80.2707, 13.0827], // Chennai
    currentPosition: [76.5, 16.2],
    status: 'NORMAL', isRerouted: false,
    cargoValueINR: 750000, ewayBillNo: 3410987659, ewayBillExpiry: futureExpiry(1.5),
    eta: '2026-04-12T16:00:00Z', riskScore: 0.20,
    corridor: 'NH-44', commodity: 'Pharma',
  },
  'R-007': {
    truckId: 'TRK-007', vehicleRegNo: 'TN09MN6789',
    originCoordinates: [80.2707, 13.0827],     // Chennai
    destinationCoordinates: [88.3639, 22.5726], // Kolkata
    currentPosition: [83.5, 17.8],
    status: 'NORMAL', isRerouted: false,
    cargoValueINR: 540000, ewayBillNo: 3410987660, ewayBillExpiry: futureExpiry(4.0),
    eta: '2026-04-13T12:00:00Z', riskScore: 0.17,
    corridor: 'NH-44-EAST-ALT', commodity: 'FMCG',
  },
  'R-008': {
    truckId: 'TRK-008', vehicleRegNo: 'HR26OP1234',
    originCoordinates: [76.9635, 29.3909],     // Panipat
    destinationCoordinates: [73.1812, 22.3072], // Vadodara
    currentPosition: [75.8, 26.5],
    status: 'NORMAL', isRerouted: false,
    cargoValueINR: 480000, ewayBillNo: 3410987661, ewayBillExpiry: futureExpiry(2.0),
    eta: '2026-04-12T20:00:00Z', riskScore: 0.10,
    corridor: 'NH-48', commodity: 'Steel Coils',
  },
  'R-009': {
    truckId: 'TRK-009', vehicleRegNo: 'AP09QR5678',
    originCoordinates: [78.4867, 17.3850],     // Hyderabad
    destinationCoordinates: [72.8777, 19.0760], // Mumbai
    currentPosition: [75.5, 18.2],
    status: 'NORMAL', isRerouted: false,
    cargoValueINR: 1050000, ewayBillNo: 3410987662, ewayBillExpiry: futureExpiry(0.8),
    eta: '2026-04-12T15:00:00Z', riskScore: 0.88,
    corridor: 'NH-44', commodity: 'Chemicals',
  },
  'R-010': {
    truckId: 'TRK-010', vehicleRegNo: 'WB34ST9012',
    originCoordinates: [88.3639, 22.5726],     // Kolkata
    destinationCoordinates: [77.2090, 28.6139], // Delhi
    currentPosition: [82.0, 25.5],
    status: 'NORMAL', isRerouted: false,
    cargoValueINR: 790000, ewayBillNo: 3410987663, ewayBillExpiry: futureExpiry(5.5),
    eta: '2026-04-13T06:00:00Z', riskScore: 0.19,
    corridor: 'NH-44-EAST-ALT', commodity: 'Jute & Fibers',
  },
  'R-011': {
    truckId: 'TRK-011', vehicleRegNo: 'MH04UV3456',
    originCoordinates: [72.8777, 19.0760],     // Mumbai
    destinationCoordinates: [77.5946, 12.9716], // Bangalore
    currentPosition: [76.0, 16.0],
    status: 'NORMAL', isRerouted: false,
    cargoValueINR: 960000, ewayBillNo: 3410987664, ewayBillExpiry: futureExpiry(3.8),
    eta: '2026-04-12T22:00:00Z', riskScore: 0.14,
    corridor: 'NH-48', commodity: 'Cotton Bales',
  },
  'R-012': {
    truckId: 'TRK-012', vehicleRegNo: 'UP32WX7890',
    originCoordinates: [80.9462, 26.8467],     // Lucknow
    destinationCoordinates: [72.8311, 21.1702], // Surat
    currentPosition: [77.5, 24.5],
    status: 'NORMAL', isRerouted: false,
    cargoValueINR: 620000, ewayBillNo: 3410987665, ewayBillExpiry: futureExpiry(6.0),
    eta: '2026-04-13T14:00:00Z', riskScore: 0.16,
    corridor: 'NH-48', commodity: 'Food Grains',
  },
  'R-013': {
    truckId: 'TRK-013', vehicleRegNo: 'GJ01YZ1234',
    originCoordinates: [72.5714, 23.0225],     // Ahmedabad
    destinationCoordinates: [77.2090, 28.6139], // Delhi
    currentPosition: [74.8, 25.8],
    status: 'NORMAL', isRerouted: false,
    cargoValueINR: 830000, ewayBillNo: 3410987666, ewayBillExpiry: futureExpiry(1.2),
    eta: '2026-04-12T19:00:00Z', riskScore: 0.76,
    corridor: 'NH-48', commodity: 'Ceramic Tiles',
  },
  'R-014': {
    truckId: 'TRK-014', vehicleRegNo: 'KA05AB5678',
    originCoordinates: [77.5946, 12.9716],     // Bangalore
    destinationCoordinates: [80.2707, 13.0827], // Chennai
    currentPosition: [78.6, 12.9],
    status: 'NORMAL', isRerouted: false,
    cargoValueINR: 410000, ewayBillNo: 3410987667, ewayBillExpiry: futureExpiry(7.5),
    eta: '2026-04-11T10:00:00Z', riskScore: 0.08,
    corridor: 'NH-44', commodity: 'Machinery',
  },
  'R-015': {
    truckId: 'TRK-015', vehicleRegNo: 'DL08CD9012',
    originCoordinates: [77.2090, 28.6139],     // Delhi
    destinationCoordinates: [88.3639, 22.5726], // Kolkata
    currentPosition: [80.5, 26.0],
    status: 'NORMAL', isRerouted: false,
    cargoValueINR: 1180000, ewayBillNo: 3410987668, ewayBillExpiry: futureExpiry(4.5),
    eta: '2026-04-13T08:00:00Z', riskScore: 0.25,
    corridor: 'NH-44-EAST-ALT', commodity: 'Petroleum Products',
  },
};

export const mockAnomalies = {};

export const mockAlerts = {
  'ALT-001': {
    message: 'A.P.E.X initialized. Monitoring 15 nodes across NH-48/NH-44 corridors. All systems nominal.',
    severity: 'INFO',
    costSavedINR: 0,
    timestamp: new Date().toISOString(),
  },
};

// KPI initial values
export const mockKPIs = {
  etaAccuracy: 94.2,
  costSavedINR: 0,
  trucksRerouted: 0,
  networkHealth: 73,
  activeRoutes: Object.keys(mockRoutes).length,
  activeNodes: Object.keys(mockNodes).length,
};
