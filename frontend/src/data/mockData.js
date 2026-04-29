// ══════════════════════════════════════════════════════════
// Mock Data — Simulates Firebase RTDB structure (Section 10.5)
// ══════════════════════════════════════════════════════════
// FIX-1: Node IDs now EXACTLY match backend/graph/highway_graph.json
// so frontend mock mode and backend are always consistent.
// ══════════════════════════════════════════════════════════

// BUG-04 FIX: Generate eWay Bill expiry dates relative to current time
function futureExpiry(hoursFromNow) {
  return new Date(Date.now() + hoursFromNow * 3600000).toISOString();
}

// ── 15 nodes: IDs match highway_graph.json exactly ──────────────────────
export const mockNodes = {
  // ─── Toll Plazas (7) ───
  'NH48_KHERKI_DAULA': {
    type: 'TOLL_PLAZA', name: 'Kherki Daula Toll Plaza', highway: 'NH-48',
    lat: 28.3956, lng: 76.9818, status: 'NORMAL',
    utilization: 0.51, queueLength: 34, tts: 72, ttr: 24,
    processingRate: 12.0,
  },
  'NH48_SHAHJAHANPUR': {
    type: 'RTO', name: 'Shahjahanpur RTO', highway: 'NH-48',
    lat: 27.9998, lng: 76.4305, status: 'NORMAL',
    utilization: 0.47, queueLength: 28, tts: 80, ttr: 20,
    processingRate: 8.0,
  },
  'NH48_THIKARIYA': {
    type: 'TOLL_PLAZA', name: 'Thikariya Toll Plaza', highway: 'NH-48',
    lat: 26.8433, lng: 75.6156, status: 'NORMAL',
    utilization: 0.53, queueLength: 20, tts: 96, ttr: 18,
    processingRate: 15.0,
  },
  'TP-PNP-004': {
    type: 'TOLL_PLAZA', name: 'Panipat Toll Plaza', highway: 'NH-44',
    lat: 29.3909, lng: 76.9635, status: 'NORMAL',
    utilization: 0.45, queueLength: 22, tts: 72, ttr: 16,
    processingRate: 9.0,
  },
  'NH48_VASAD': {
    type: 'TOLL_PLAZA', name: 'Vasad Toll Plaza', highway: 'NH-48',
    lat: 22.4533, lng: 73.0705, status: 'NORMAL',
    utilization: 0.60, queueLength: 25, tts: 90, ttr: 30,
    processingRate: 11.0,
  },
  'NH48_KARJAN': {
    type: 'TOLL_PLAZA', name: 'Karjan Toll Plaza', highway: 'NH-48',
    lat: 22.0148, lng: 73.1154, status: 'NORMAL',
    utilization: 0.55, queueLength: 20, tts: 84, ttr: 22,
    processingRate: 12.0,
  },
  'NH48_DAHISAR': {
    type: 'TOLL_PLAZA', name: 'Dahisar Toll Plaza', highway: 'NH-48',
    lat: 19.2606, lng: 72.8728, status: 'NORMAL',
    utilization: 0.78, queueLength: 88, tts: 60, ttr: 45,
    processingRate: 10.0,
  },

  // ─── Warehouses (5) ───
  'WH-DEL-001': {
    type: 'WAREHOUSE', name: 'Delhi NCR Distribution Hub', highway: 'NH-44',
    lat: 28.5355, lng: 77.3910, status: 'NORMAL',
    utilization: 0.63, queueLength: 55, tts: 96, ttr: 24,
    processingRate: 8.0,
  },
  'WH-JPR-002': {
    type: 'WAREHOUSE', name: 'Jaipur RIICO Warehouse', highway: 'NH-48',
    lat: 26.8498, lng: 75.8069, status: 'NORMAL',
    utilization: 0.48, queueLength: 30, tts: 96, ttr: 20,
    processingRate: 6.0,
  },
  'WH-MUM-003': {
    type: 'WAREHOUSE', name: 'Mumbai JNPT Logistics Hub', highway: 'NH-48',
    lat: 18.9488, lng: 72.9483, status: 'NORMAL',
    utilization: 0.69, queueLength: 67, tts: 72, ttr: 36,
    processingRate: 7.0,
  },
  'WH-AHM-004': {
    type: 'WAREHOUSE', name: 'Ahmedabad GIFT City Warehouse', highway: 'NH-48',
    lat: 23.0225, lng: 72.5714, status: 'NORMAL',
    utilization: 0.52, queueLength: 40, tts: 84, ttr: 28,
    processingRate: 7.0,
  },
  'WH-SRT-005': {
    type: 'WAREHOUSE', name: 'Surat Diamond Hub Warehouse', highway: 'NH-48',
    lat: 21.1702, lng: 72.8311, status: 'NORMAL',
    utilization: 0.58, queueLength: 35, tts: 90, ttr: 25,
    processingRate: 6.0,
  },

  // ─── ICDs (2) + Port (1) ───
  'ICD-TKD-001': {
    type: 'ICD', name: 'ICD Tughlakabad', highway: 'NH-44',
    lat: 28.5090, lng: 77.2750, status: 'NORMAL',
    utilization: 0.65, queueLength: 85, tts: 48, ttr: 36,
    processingRate: 5.0,
  },
  'ICD-MUN-002': {
    type: 'ICD', name: 'ICD Mundra Port', highway: 'NH-8A',
    lat: 22.8394, lng: 69.7150, status: 'NORMAL',
    utilization: 0.40, queueLength: 60, tts: 72, ttr: 30,
    processingRate: 4.0,
  },
  'NH48_JNPT_PORT': {
    type: 'ICD', name: 'JNPT Port', highway: 'NH-48',
    lat: 18.9348, lng: 72.9431, status: 'NORMAL',
    utilization: 0.72, queueLength: 60, tts: 48, ttr: 40,
    processingRate: 5.0,
  },
};

// Active truck routes — OD pairs use graph node IDs
export const mockRoutes = {
  'R-001': {
    truckId: 'TRK-001', vehicleRegNo: 'MH04AB1234',
    originCoordinates: [77.3910, 28.5355],     // WH-DEL-001
    destinationCoordinates: [72.9483, 18.9488], // WH-MUM-003
    currentPosition: [76.5, 26.8],
    status: 'NORMAL', isRerouted: false,
    cargoValueINR: 1250000, ewayBillNo: 3410987654, ewayBillExpiry: futureExpiry(3.2),
    eta: '2026-04-12T14:00:00Z', riskScore: 0.22,
    corridor: 'NH-48', commodity: 'Auto Parts',
  },
  'R-002': {
    truckId: 'TRK-002', vehicleRegNo: 'DL01CD5678',
    originCoordinates: [77.3910, 28.5355],     // WH-DEL-001
    destinationCoordinates: [72.9431, 18.9348], // NH48_JNPT_PORT
    currentPosition: [75.5, 24.0],
    status: 'NORMAL', isRerouted: false,
    cargoValueINR: 850000, ewayBillNo: 3410987655, ewayBillExpiry: futureExpiry(6.5),
    eta: '2026-04-13T10:00:00Z', riskScore: 0.18,
    corridor: 'NH-48', commodity: 'Electronics',
  },
  'R-003': {
    truckId: 'TRK-003', vehicleRegNo: 'GJ05EF9012',
    originCoordinates: [72.8311, 21.1702],     // WH-SRT-005
    destinationCoordinates: [77.2750, 28.5090], // ICD-TKD-001
    currentPosition: [75.0, 24.5],
    status: 'NORMAL', isRerouted: false,
    cargoValueINR: 680000, ewayBillNo: 3410987656, ewayBillExpiry: futureExpiry(7.0),
    eta: '2026-04-14T08:00:00Z', riskScore: 0.15,
    corridor: 'NH-48', commodity: 'Textiles',
  },
  'R-004': {
    truckId: 'TRK-004', vehicleRegNo: 'RJ14GH3456',
    originCoordinates: [75.8069, 26.8498],     // WH-JPR-002
    destinationCoordinates: [72.9483, 18.9488], // WH-MUM-003
    currentPosition: [74.2, 23.5],
    status: 'NORMAL', isRerouted: false,
    cargoValueINR: 920000, ewayBillNo: 3410987657, ewayBillExpiry: futureExpiry(2.5),
    eta: '2026-04-12T18:00:00Z', riskScore: 0.12,
    corridor: 'NH-48', commodity: 'Marble & Stone',
  },
  'R-005': {
    truckId: 'TRK-005', vehicleRegNo: 'KA01IJ7890',
    originCoordinates: [72.5714, 23.0225],     // WH-AHM-004
    destinationCoordinates: [77.3910, 28.5355], // WH-DEL-001
    currentPosition: [75.0, 26.0],
    status: 'NORMAL', isRerouted: false,
    cargoValueINR: 1100000, ewayBillNo: 3410987658, ewayBillExpiry: futureExpiry(5.0),
    eta: '2026-04-13T22:00:00Z', riskScore: 0.19,
    corridor: 'NH-48', commodity: 'IT Equipment',
  },
  'R-006': {
    truckId: 'TRK-006', vehicleRegNo: 'MH12KL2345',
    originCoordinates: [72.9483, 18.9488],     // WH-MUM-003
    destinationCoordinates: [72.5714, 23.0225], // WH-AHM-004
    currentPosition: [72.9, 20.5],
    status: 'NORMAL', isRerouted: false,
    cargoValueINR: 750000, ewayBillNo: 3410987659, ewayBillExpiry: futureExpiry(1.5),
    eta: '2026-04-12T16:00:00Z', riskScore: 0.14,
    corridor: 'NH-48', commodity: 'Pharma',
  },
  'R-007': {
    truckId: 'TRK-007', vehicleRegNo: 'TN09MN6789',
    originCoordinates: [77.2750, 28.5090],     // ICD-TKD-001
    destinationCoordinates: [72.9431, 18.9348], // NH48_JNPT_PORT
    currentPosition: [75.5, 24.0],
    status: 'NORMAL', isRerouted: false,
    cargoValueINR: 540000, ewayBillNo: 3410987660, ewayBillExpiry: futureExpiry(4.0),
    eta: '2026-04-13T12:00:00Z', riskScore: 0.17,
    corridor: 'NH-48', commodity: 'FMCG',
  },
  'R-008': {
    truckId: 'TRK-008', vehicleRegNo: 'HR26OP1234',
    originCoordinates: [76.9635, 29.3909],     // TP-PNP-004
    destinationCoordinates: [73.0705, 22.4533], // NH48_VASAD
    currentPosition: [75.8, 26.5],
    status: 'NORMAL', isRerouted: false,
    cargoValueINR: 480000, ewayBillNo: 3410987661, ewayBillExpiry: futureExpiry(2.0),
    eta: '2026-04-12T20:00:00Z', riskScore: 0.10,
    corridor: 'NH-48', commodity: 'Steel Coils',
  },
  'R-009': {
    truckId: 'TRK-009', vehicleRegNo: 'AP09QR5678',
    originCoordinates: [72.8311, 21.1702],     // WH-SRT-005
    destinationCoordinates: [72.9483, 18.9488], // WH-MUM-003
    currentPosition: [72.8, 19.8],
    status: 'NORMAL', isRerouted: false,
    cargoValueINR: 1050000, ewayBillNo: 3410987662, ewayBillExpiry: futureExpiry(0.8),
    eta: '2026-04-12T15:00:00Z', riskScore: 0.25,
    corridor: 'NH-48', commodity: 'Chemicals',
  },
  'R-010': {
    truckId: 'TRK-010', vehicleRegNo: 'WB34ST9012',
    originCoordinates: [69.7150, 22.8394],     // ICD-MUN-002
    destinationCoordinates: [77.3910, 28.5355], // WH-DEL-001
    currentPosition: [73.5, 25.5],
    status: 'NORMAL', isRerouted: false,
    cargoValueINR: 790000, ewayBillNo: 3410987663, ewayBillExpiry: futureExpiry(5.5),
    eta: '2026-04-13T06:00:00Z', riskScore: 0.16,
    corridor: 'NH-48', commodity: 'Jute & Fibers',
  },
  'R-011': {
    truckId: 'TRK-011', vehicleRegNo: 'MH04UV3456',
    originCoordinates: [72.9483, 18.9488],     // WH-MUM-003
    destinationCoordinates: [75.8069, 26.8498], // WH-JPR-002
    currentPosition: [74.0, 22.0],
    status: 'NORMAL', isRerouted: false,
    cargoValueINR: 960000, ewayBillNo: 3410987664, ewayBillExpiry: futureExpiry(3.8),
    eta: '2026-04-12T22:00:00Z', riskScore: 0.14,
    corridor: 'NH-48', commodity: 'Cotton Bales',
  },
  'R-012': {
    truckId: 'TRK-012', vehicleRegNo: 'UP32WX7890',
    originCoordinates: [77.3910, 28.5355],     // WH-DEL-001
    destinationCoordinates: [72.8311, 21.1702], // WH-SRT-005
    currentPosition: [75.5, 25.0],
    status: 'NORMAL', isRerouted: false,
    cargoValueINR: 620000, ewayBillNo: 3410987665, ewayBillExpiry: futureExpiry(6.0),
    eta: '2026-04-13T14:00:00Z', riskScore: 0.11,
    corridor: 'NH-48', commodity: 'Food Grains',
  },
  'R-013': {
    truckId: 'TRK-013', vehicleRegNo: 'GJ01YZ1234',
    originCoordinates: [72.5714, 23.0225],     // WH-AHM-004
    destinationCoordinates: [72.9431, 18.9348], // NH48_JNPT_PORT
    currentPosition: [72.8, 21.5],
    status: 'NORMAL', isRerouted: false,
    cargoValueINR: 830000, ewayBillNo: 3410987666, ewayBillExpiry: futureExpiry(1.2),
    eta: '2026-04-12T19:00:00Z', riskScore: 0.20,
    corridor: 'NH-48', commodity: 'Ceramic Tiles',
  },
  'R-014': {
    truckId: 'TRK-014', vehicleRegNo: 'KA05AB5678',
    originCoordinates: [77.2750, 28.5090],     // ICD-TKD-001
    destinationCoordinates: [72.5714, 23.0225], // WH-AHM-004
    currentPosition: [75.0, 26.0],
    status: 'NORMAL', isRerouted: false,
    cargoValueINR: 410000, ewayBillNo: 3410987667, ewayBillExpiry: futureExpiry(7.5),
    eta: '2026-04-11T10:00:00Z', riskScore: 0.08,
    corridor: 'NH-48', commodity: 'Machinery',
  },
  'R-015': {
    truckId: 'TRK-015', vehicleRegNo: 'DL08CD9012',
    originCoordinates: [77.3910, 28.5355],     // WH-DEL-001
    destinationCoordinates: [69.7150, 22.8394], // ICD-MUN-002
    currentPosition: [73.5, 25.5],
    status: 'NORMAL', isRerouted: false,
    cargoValueINR: 1180000, ewayBillNo: 3410987668, ewayBillExpiry: futureExpiry(4.5),
    eta: '2026-04-13T08:00:00Z', riskScore: 0.18,
    corridor: 'NH-48', commodity: 'Petroleum Products',
  },
};

export const mockAnomalies = {};

export const mockAlerts = {
  'ALT-001': {
    message: 'A.P.E.X initialized. Monitoring 15 supply chain nodes across NH-48/NH-44 corridors. All systems nominal.',
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
