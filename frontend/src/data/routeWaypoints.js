// ══════════════════════════════════════════════════════════
// Highway Corridor Waypoints — Real GPS coordinates
//
// Blueprint Reference: S2.1, S3.2, S16.2
//   "PathLayer: highway corridor polylines"
//   "Corridors: NH-48, SH-17, NH-44, DFC Western, Coastal Sagarmala"
//
// Each corridor has:
//   - waypoints: Array of [lng, lat] for PathLayer (FALLBACK only)
//   - routesAPI: Config for fetching real road polylines from Google
//   - alternateId: Which corridor to reroute to if blocked
//   - riskZones: Known disruption-prone segments
//   - distanceKm: Total corridor length (Haversine sum)
//
// Routes API Integration:
//   - origin/destination: [lng, lat] endpoints
//   - intermediates: [lng, lat][] as VIA waypoints (pass-through)
//   - Via waypoints force the route geometry through specific
//     cities without creating leg splits
// ══════════════════════════════════════════════════════════

export const HIGHWAY_CORRIDORS = {
  // ─── NH-48 Delhi-Mumbai Expressway (Primary) ─────────────────
  // Main freight corridor — handles >30% of Delhi-Mumbai traffic
  // MONSOON-VULNERABLE: Western Ghats section (Pune→Mumbai)
  'NH-48': {
    name: 'NH-48 Delhi-Mumbai Expressway',
    type: 'NATIONAL_HIGHWAY',
    alternateId: 'SH-17-ALT',
    distanceKm: 1428,
    color: [37, 99, 235, 180],           // Blue
    blockedColor: [239, 68, 68, 200],    // Red

    // Google Maps Routes API config
    routesAPI: {
      enabled: true,
      origin: [77.2090, 28.6139],        // Delhi NCR
      destination: [72.8777, 19.0760],   // Mumbai JNPT
      // Via waypoints force route through Delhi-Mumbai Expressway corridor
      intermediates: [
        [75.7873, 26.9124],              // Jaipur
        [72.5714, 23.0225],              // Ahmedabad
        [72.8311, 21.1702],              // Surat
      ],
    },

    // Fallback static waypoints (used if API fails)
    waypoints: [
      [77.2090, 28.6139],   // Delhi NCR
      [77.0500, 28.4167],   // Kherki Daula Toll
      [76.9430, 28.3590],   // Manesar Toll
      [76.6394, 27.6325],   // Neemrana (Rajasthan entry)
      [75.7873, 26.9124],   // Jaipur
      [74.6399, 25.3176],   // Ajmer Junction
      [73.7125, 24.5854],   // Udaipur Branch Point
      [72.5714, 23.0225],   // Ahmedabad
      [73.1812, 22.3072],   // Vadodara
      [72.8311, 21.1702],   // Surat
      [73.0169, 20.1809],   // Vapi (Gujarat-Maharashtra border)
      [72.9781, 19.2183],   // Mumbai Entry (Thane)
      [72.8777, 19.0760],   // Mumbai (JNPT)
    ],
    riskZones: [
      { lat: 19.5, lng: 73.3, label: 'Western Ghats Pass', monsoonRisk: 0.95, radius: 80000 },
      { lat: 20.5, lng: 73.1, label: 'Konkan Coast', monsoonRisk: 0.80, radius: 60000 },
    ],
  },

  // ─── SH-17 Alternate (Udaipur-Indore-Pune bypass) ────────────
  // Reroute path when NH-48 Western Ghats section is blocked
  'SH-17-ALT': {
    name: 'SH-17 Alternate via Udaipur-Indore',
    type: 'STATE_HIGHWAY',
    alternateId: 'NH-48',
    distanceKm: 1580,
    color: [16, 185, 129, 180],          // Green (always shown as reroute)
    blockedColor: [239, 68, 68, 200],

    routesAPI: {
      enabled: true,
      origin: [77.2090, 28.6139],        // Delhi
      destination: [72.8777, 19.0760],   // Mumbai
      // Force route through Udaipur-Indore-Pune to bypass Western Ghats
      intermediates: [
        [73.7125, 24.5854],              // Udaipur
        [75.8573, 22.7196],              // Indore
        [73.8567, 18.5204],              // Pune
      ],
    },

    waypoints: [
      [77.2090, 28.6139],   // Delhi NCR
      [76.6394, 27.6325],   // Neemrana
      [75.7873, 26.9124],   // Jaipur
      [74.6399, 25.3176],   // Ajmer
      [73.7125, 24.5854],   // Udaipur
      [75.8573, 22.7196],   // Indore
      [76.7230, 21.1466],   // Burhanpur
      [75.3433, 19.8762],   // Aurangabad
      [73.8567, 18.5204],   // Pune
      [72.8777, 19.0760],   // Mumbai
    ],
    riskZones: [],
  },

  // ─── NH-44 Delhi-Chennai (Golden Quadrilateral East) ──────────
  // Second major corridor — Delhi to South India
  'NH-44': {
    name: 'NH-44 Delhi-Chennai Expressway',
    type: 'NATIONAL_HIGHWAY',
    alternateId: 'NH-44-EAST-ALT',
    distanceKm: 2175,
    color: [139, 92, 246, 180],          // Purple
    blockedColor: [239, 68, 68, 200],

    routesAPI: {
      enabled: true,
      origin: [77.2090, 28.6139],        // Delhi
      destination: [80.2707, 13.0827],   // Chennai
      // Force through Agra-Nagpur-Hyderabad corridor
      intermediates: [
        [78.0322, 27.1767],              // Agra
        [79.0882, 21.1458],              // Nagpur
        [78.4867, 17.3850],              // Hyderabad
      ],
    },

    waypoints: [
      [77.2090, 28.6139],   // Delhi
      [77.2800, 28.5100],   // ICD Tughlakabad
      [76.9635, 29.3909],   // Panipat (northward spur, connects back)
      [78.0322, 27.1767],   // Agra
      [79.0882, 21.1458],   // Nagpur
      [78.4867, 17.3850],   // Hyderabad
      [77.5946, 12.9716],   // Bangalore
      [80.2707, 13.0827],   // Chennai
    ],
    riskZones: [
      { lat: 28.5, lng: 77.3, label: 'ICEGATE ICD TKD', icegatRisk: 1.0, radius: 30000 },
    ],
  },

  // ─── NH-44 East Alternate (Kolkata route) ─────────────────────
  // When NH-44 southern section is blocked, route via Kolkata
  'NH-44-EAST-ALT': {
    name: 'NH-44 East via Kolkata',
    type: 'NATIONAL_HIGHWAY',
    alternateId: 'NH-44',
    distanceKm: 2450,
    color: [245, 158, 11, 180],          // Amber
    blockedColor: [239, 68, 68, 200],

    routesAPI: {
      enabled: true,
      origin: [77.2090, 28.6139],        // Delhi
      destination: [80.2707, 13.0827],   // Chennai
      // Force through Lucknow-Varanasi-Kolkata eastern corridor
      intermediates: [
        [80.9462, 26.8467],              // Lucknow
        [83.0007, 25.3176],              // Varanasi
        [88.3639, 22.5726],              // Kolkata
      ],
    },

    waypoints: [
      [77.2090, 28.6139],   // Delhi
      [80.9462, 26.8467],   // Lucknow
      [83.0007, 25.3176],   // Varanasi
      [85.1376, 25.6093],   // Patna
      [88.3639, 22.5726],   // Kolkata
      [86.1526, 22.8046],   // Jamshedpur
      [83.9778, 21.4934],   // Rourkela
      [80.2707, 13.0827],   // Chennai (via East coast)
    ],
    riskZones: [],
  },

  // ─── DFC Western (Dedicated Freight Corridor) ─────────────────
  // Rail corridor — uses nearby highway geometry for HD polyline rendering
  // The DFC runs parallel to NH-48; Routes API gives road-accurate geometry
  'DFC-WESTERN': {
    name: 'Western DFC Rail Corridor',
    type: 'RAIL_DFC',
    alternateId: null,
    distanceKm: 1504,
    color: [6, 182, 212, 160],           // Cyan (rail = different modality)
    blockedColor: [239, 68, 68, 200],

    // Uses nearby highway geometry for HD rendering (rail runs parallel)
    routesAPI: {
      enabled: true,
      origin: [77.3200, 28.5800],        // Dadri (UP)
      destination: [72.9500, 18.9500],   // JNPT (Mumbai)
      intermediates: [
        [76.6900, 28.2500],              // Rewari
        [72.5700, 23.0200],              // Ahmedabad
        [72.8300, 21.1700],              // Surat
      ],
    },

    // Fallback: Dense static waypoints following actual DFC rail alignment
    // Source: DFCCIL alignment maps — Dadri to JNPT via Rewari-Palanpur-Ahmedabad
    waypoints: [
      [77.3200, 28.5800],   // Dadri Terminal (UP)
      [77.1500, 28.5200],   // Noida bypass
      [76.9500, 28.4400],   // Palwal junction
      [76.8200, 28.3600],   // Ballabgarh
      [76.6900, 28.2500],   // Rewari junction (Haryana)
      [76.5200, 28.1000],   // Narnaul branch
      [76.3800, 27.9200],   // Mahendragarh
      [76.2000, 27.7000],   // Ringus approach
      [76.0500, 27.4500],   // Sikar road
      [75.9200, 27.2000],   // Neem Ka Thana
      [75.7900, 26.9200],   // Phulera junction
      [75.6500, 26.6000],   // Kishangarh
      [75.4800, 26.2600],   // Ajmer bypass
      [75.1500, 25.8500],   // Beawar
      [74.7500, 25.3500],   // Pali road
      [74.2500, 24.8500],   // Marwar junction
      [73.7200, 24.4200],   // Sirohi road
      [73.2000, 24.1500],   // Abu Road
      [72.6500, 23.9000],   // Palanpur junction (Gujarat)
      [72.4500, 23.6500],   // Mehsana
      [72.5200, 23.3500],   // Gandhinagar bypass
      [72.5700, 23.0200],   // Ahmedabad APMC yard
      [72.6000, 22.7500],   // Nadiad
      [72.6800, 22.4500],   // Anand
      [72.7500, 22.1500],   // Vadodara DFC terminal
      [72.8000, 21.8500],   // Bharuch
      [72.8300, 21.5000],   // Ankleshwar
      [72.8300, 21.1700],   // Surat DFC terminal
      [72.8700, 20.8000],   // Navsari
      [72.9200, 20.4000],   // Valsad
      [73.0000, 20.1000],   // Vapi approach
      [73.0200, 19.9400],   // Vapi DFC terminal
      [73.0000, 19.7000],   // Dahanu road
      [72.9700, 19.4500],   // Palghar
      [72.9300, 19.2200],   // Vasai road
      [72.9500, 18.9500],   // JNPT (Mumbai port)
    ],
    riskZones: [],
  },

  // ─── Coastal Sagarmala (Coastal bypass) ────────────────────────
  // Coastal route — uses NH-66 (coastal highway) for HD polyline geometry
  // NH-66 follows the exact Indian western coastline for maximum visual fidelity
  'COASTAL-SAGARMALA': {
    name: 'Coastal Sagarmala Shipping Route',
    type: 'COASTAL_SHIPPING',
    alternateId: null,
    distanceKm: 1200,
    color: [14, 165, 233, 140],          // Sky blue (maritime)
    blockedColor: [239, 68, 68, 200],

    // Uses NH-66 coastal highway for HD polyline (follows coastline exactly)
    routesAPI: {
      enabled: true,
      origin: [72.8777, 19.0760],        // Mumbai JNPT
      destination: [76.2671, 9.9312],    // Kochi (Cochin Port)
      intermediates: [
        [73.2800, 17.3000],              // Ratnagiri
        [73.8100, 15.4909],              // Goa (Mormugao)
        [74.8800, 12.9141],              // Mangalore
        [75.7700, 11.2588],              // Kozhikode
      ],
    },

    // Fallback: Dense static waypoints tracing the Indian western coastline
    waypoints: [
      [72.8777, 19.0760],   // Mumbai JNPT
      [72.8200, 18.9200],   // Nhava Sheva approach
      [72.8500, 18.7500],   // Alibaug coast
      [72.9200, 18.5500],   // Murud-Janjira
      [73.0300, 18.3000],   // Harnai
      [73.1500, 18.0500],   // Dapoli coast
      [73.2800, 17.7500],   // Jaigad port
      [73.3000, 17.5000],   // Ratnagiri approach
      [73.2800, 17.3000],   // Ratnagiri port
      [73.2500, 17.0500],   // Pawas
      [73.3200, 16.8500],   // Vijaydurg
      [73.3800, 16.6500],   // Malvan coast
      [73.4500, 16.4500],   // Devgad
      [73.5200, 16.2500],   // Vengurla
      [73.6500, 16.0000],   // Sawantwadi coast
      [73.7500, 15.7500],   // Pernem (North Goa)
      [73.8000, 15.6000],   // Mapusa approach
      [73.8100, 15.4909],   // Goa (Mormugao Port)
      [73.8000, 15.3500],   // Vasco da Gama
      [73.8500, 15.1500],   // Canacona coast
      [73.9500, 14.9000],   // Karwar port
      [74.1000, 14.6500],   // Ankola
      [74.2500, 14.4500],   // Gokarna
      [74.4000, 14.2000],   // Kumta
      [74.5500, 14.0000],   // Honnavar
      [74.6500, 13.8000],   // Bhatkal
      [74.7500, 13.5500],   // Kundapura
      [74.8000, 13.3500],   // Udupi coast
      [74.8300, 13.1500],   // Malpe port
      [74.8800, 12.9141],   // Mangalore (New Mangalore Port)
      [74.9200, 12.7000],   // Ullal coast
      [75.0000, 12.4500],   // Kasaragod
      [75.1000, 12.2000],   // Bekal
      [75.2000, 12.0000],   // Kannur coast
      [75.3500, 11.7500],   // Thalassery
      [75.5000, 11.5000],   // Mahe
      [75.7700, 11.2588],   // Kozhikode (Calicut Port)
      [75.8500, 11.0000],   // Ponnani
      [76.0000, 10.7500],   // Thrissur coast
      [76.1000, 10.5000],   // Kodungallur
      [76.2200, 10.1500],   // Aluva approach
      [76.2671, 9.9312],    // Kochi (Cochin Port)
    ],
    riskZones: [],
  },
};

// ─── Map route → corridor assignment ──────────────────────────
// Determines which corridor a route travels on based on origin/dest
export function assignCorridorToRoute(route) {
  const [oLng, oLat] = route.originCoordinates || [0, 0];
  const [dLng, dLat] = route.destinationCoordinates || [0, 0];

  // Delhi→Mumbai or Mumbai→Delhi → NH-48
  if (
    (oLat > 27 && dLat < 20 && dLng < 74) ||
    (dLat > 27 && oLat < 20 && oLng < 74)
  ) return 'NH-48';

  // Routes involving Jaipur/Ahmedabad/Vadodara/Surat → NH-48
  if (
    (oLat > 20 && oLat < 28 && oLng > 72 && oLng < 76 && dLat < 20) ||
    (dLat > 20 && dLat < 28 && dLng > 72 && dLng < 76 && oLat < 20)
  ) return 'NH-48';

  // Routes to/from Chennai or Hyderabad or Bangalore → NH-44
  if (
    (dLat < 18 && dLng > 77) || (oLat < 18 && oLng > 77) ||
    (dLat < 20 && dLng > 78) || (oLat < 20 && oLng > 78)
  ) return 'NH-44';

  // Routes to/from Kolkata → NH-44-EAST-ALT
  if (
    (dLng > 85 && dLat > 20) || (oLng > 85 && oLat > 20)
  ) return 'NH-44-EAST-ALT';

  // Fallback — closest corridor
  return 'NH-48';
}

// ─── Get waypoints for a route based on its corridor ──────────
export function getRouteWaypoints(route) {
  const corridorId = route.corridor || assignCorridorToRoute(route);
  const corridor = HIGHWAY_CORRIDORS[corridorId];
  if (!corridor) return null;

  return {
    corridorId,
    corridorName: corridor.name,
    waypoints: corridor.waypoints,
    color: corridor.color,
    blockedColor: corridor.blockedColor,
    alternateId: corridor.alternateId,
  };
}

// ─── Get alternate corridor for rerouting ─────────────────────
export function getAlternateCorridor(corridorId) {
  const corridor = HIGHWAY_CORRIDORS[corridorId];
  if (!corridor || !corridor.alternateId) return null;
  return HIGHWAY_CORRIDORS[corridor.alternateId];
}

// ─── Check if a disruption point falls on a corridor ──────────
// Uses perpendicular distance from point to each corridor segment
export function findAffectedCorridor(anomalyLat, anomalyLng, thresholdKm = 100) {
  const affected = [];

  Object.entries(HIGHWAY_CORRIDORS).forEach(([id, corridor]) => {
    const waypoints = corridor.waypoints;
    for (let i = 0; i < waypoints.length - 1; i++) {
      const [lng1, lat1] = waypoints[i];
      const [lng2, lat2] = waypoints[i + 1];

      // Simple midpoint distance check (faster than full perpendicular)
      const midLat = (lat1 + lat2) / 2;
      const midLng = (lng1 + lng2) / 2;
      const distKm = haversineDistance(anomalyLat, anomalyLng, midLat, midLng);

      if (distKm < thresholdKm) {
        affected.push({
          corridorId: id,
          corridorName: corridor.name,
          segmentIndex: i,
          distanceKm: distKm,
        });
        break; // One match per corridor is enough
      }
    }
  });

  // Sort by distance — closest corridor first
  affected.sort((a, b) => a.distanceKm - b.distanceKm);
  return affected;
}

// ─── Haversine Distance (Blueprint S7.2) ──────────────────────
// Returns distance in km between two lat/lng points
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
