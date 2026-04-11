"""
A.P.E.X — Mock DPI (Digital Public Infrastructure) APIs

Simulates India's government APIs that we would connect to in production.
For the hackathon, these return realistic hardcoded JSON matching the
actual API schemas documented in the blueprint.

Blueprint references:
  - Section 9.1: ULIP API Gateway
  - Section 9.2: FASTag / NETC System
  - Section 9.3: GST eWay Bill System
  - Section 10.3: eWay Bill Schema
  - Section 10.4: Vahan Database Response

Endpoints:
  GET  /api/vahan/{vehicle_reg_no}        → Vehicle registration details
  POST /api/eway-bill/update-part-b       → Update vehicle assignment
  GET  /api/eway-bill/{eway_bill_no}      → eWay Bill details
  GET  /api/ulip/fastag/{tag_id}          → FASTag toll transaction history
  GET  /api/ulip/weather/{location}       → IMD weather data (for risk scoring)

Usage:
  uvicorn mock_dpi:app --port 8081
"""

import random
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(
    title="A.P.E.X Mock DPI APIs",
    description="Simulated Indian government APIs (ULIP, Vahan, eWay Bill, IMD)",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Mock Data — Vehicle Database (Vahan, Section 10.4)
# ---------------------------------------------------------------------------

MOCK_VEHICLES = {
    "MH04AB1234": {
        "verification_id": "vahan-sim-9982",
        "status": "VALID",
        "reg_no": "MH04AB1234",
        "class": "Heavy Goods Vehicle",
        "chassis": "MA1PA2GC00F123456",
        "engine": "E4A0987654",
        "vehicle_manufacturer_name": "TATA MOTORS LTD",
        "model": "SIGNA 4923.S",
        "type": "DIESEL",
        "norms_type": "BHARAT STAGE VI",
        "grossWeight": "49000",
        "unladenWeight": "9500",
        "owner": "BALAJI LOGISTICS PRIVATE LIMITED",
        "rc_status": "ACTIVE",
        "rc_expiry_date": "23/12/2035",
        "is_commercial": True,
        "reg_authority": "MUMBAI RTO, Maharashtra",
    },
    "DL01CD5678": {
        "verification_id": "vahan-sim-3341",
        "status": "VALID",
        "reg_no": "DL01CD5678",
        "class": "Heavy Goods Vehicle",
        "chassis": "MA1PB3HD99G654321",
        "engine": "E4B1234567",
        "vehicle_manufacturer_name": "ASHOK LEYLAND LTD",
        "model": "BOSS 4225 Ti",
        "type": "DIESEL",
        "norms_type": "BHARAT STAGE VI",
        "grossWeight": "42500",
        "unladenWeight": "8800",
        "owner": "GATI-KWE LTD",
        "rc_status": "ACTIVE",
        "rc_expiry_date": "15/08/2033",
        "is_commercial": True,
        "reg_authority": "DELHI RTO, Delhi NCT",
    },
    "GJ06EF9012": {
        "verification_id": "vahan-sim-7729",
        "status": "VALID",
        "reg_no": "GJ06EF9012",
        "class": "Heavy Goods Vehicle",
        "chassis": "MA1PC4JE88H789012",
        "engine": "E4C9876543",
        "vehicle_manufacturer_name": "BHARAT BENZ",
        "model": "3523R 4x2",
        "type": "DIESEL",
        "norms_type": "BHARAT STAGE VI",
        "grossWeight": "35000",
        "unladenWeight": "7200",
        "owner": "ADANI LOGISTICS LIMITED",
        "rc_status": "ACTIVE",
        "rc_expiry_date": "01/03/2034",
        "is_commercial": True,
        "reg_authority": "SURAT RTO, Gujarat",
    },
}

MANUFACTURERS = ["TATA MOTORS LTD", "ASHOK LEYLAND LTD", "BHARAT BENZ",
                  "EICHER MOTORS", "MAHINDRA & MAHINDRA", "VOLVO TRUCKS INDIA"]
MODELS = ["SIGNA 4923.S", "BOSS 4225 Ti", "3523R 4x2", "Pro 5049",
           "BLAZO X 49", "FH16"]
OWNERS = ["BALAJI LOGISTICS PVT LTD", "GATI-KWE LTD", "ADANI LOGISTICS LTD",
          "RIVIGO SERVICES PVT LTD", "DELHIVERY PVT LTD", "TCI FREIGHT"]
RTOs = ["MUMBAI RTO, Maharashtra", "DELHI RTO, Delhi NCT", "SURAT RTO, Gujarat",
        "JAIPUR RTO, Rajasthan", "BANGALORE RTO, Karnataka"]


# ---------------------------------------------------------------------------
# Vahan API — Vehicle Registration Lookup (Section 9.1, 10.4)
# ---------------------------------------------------------------------------

@app.get("/api/vahan/{vehicle_reg_no}")
async def get_vahan_details(vehicle_reg_no: str):
    """
    Mock Vahan API — returns vehicle registration details.
    Blueprint Section 10.4: Simulated Vahan Database Response.

    In production, this would query MoRTH's Vahan database via ULIP.
    """
    # Return hardcoded data if available
    if vehicle_reg_no.upper() in MOCK_VEHICLES:
        return MOCK_VEHICLES[vehicle_reg_no.upper()]

    # Generate dynamic mock for any registration number
    return {
        "verification_id": f"vahan-sim-{random.randint(1000, 9999)}",
        "status": "VALID",
        "reg_no": vehicle_reg_no.upper(),
        "class": "Heavy Goods Vehicle",
        "chassis": f"MA1P{uuid.uuid4().hex[:12].upper()}",
        "engine": f"E4{uuid.uuid4().hex[:8].upper()}",
        "vehicle_manufacturer_name": random.choice(MANUFACTURERS),
        "model": random.choice(MODELS),
        "type": "DIESEL",
        "norms_type": "BHARAT STAGE VI",
        "grossWeight": str(random.randint(35000, 55000)),
        "unladenWeight": str(random.randint(7000, 12000)),
        "owner": random.choice(OWNERS),
        "rc_status": "ACTIVE",
        "rc_expiry_date": "23/12/2035",
        "is_commercial": True,
        "reg_authority": random.choice(RTOs),
    }


# ---------------------------------------------------------------------------
# eWay Bill API (Section 9.3, 10.3)
# ---------------------------------------------------------------------------

class EwayBillUpdateRequest(BaseModel):
    """Part-B update for eWay Bill — when truck is rerouted."""
    ewayBillNo: int
    newVehicleNo: str
    reason: Optional[str] = "Vehicle rerouted due to disruption"
    updatedBy: Optional[str] = "APEX_AUTONOMOUS_AGENT"


MOCK_EWAY_BILLS = {
    3410987654: {
        "ewayBillNo": 3410987654,
        "ewayBillDate": "2026-04-06T08:00:00Z",
        "validUpto": "2026-04-08T08:00:00Z",
        "fromGstin": "27AABCT1234C1ZZ",
        "fromPincode": 110001,
        "toGstin": "27AABCM5678D1ZZ",
        "toPincode": 400001,
        "transMode": 1,
        "vehicleNo": "MH04AB1234",
        "totalValue": 2850000,
        "hsnCode": "8703",
        "commodityDescription": "Auto Parts (JIT) - Engine Components",
    }
}

HSN_CODES = [
    ("8703", "Auto Parts (JIT)"),
    ("3004", "Pharmaceuticals"),
    ("1001", "Wheat/Grain (FCI)"),
    ("2710", "Petroleum Products"),
    ("7208", "Steel Coils"),
    ("8471", "Electronics/IT Equipment"),
]


@app.get("/api/eway-bill/{eway_bill_no}")
async def get_eway_bill(eway_bill_no: int):
    """
    Mock eWay Bill lookup.
    Blueprint Section 10.3: eWay Bill Schema.
    """
    if eway_bill_no in MOCK_EWAY_BILLS:
        return MOCK_EWAY_BILLS[eway_bill_no]

    # Generate dynamic mock
    hsn, desc = random.choice(HSN_CODES)
    now = datetime.now(timezone.utc)
    return {
        "ewayBillNo": eway_bill_no,
        "ewayBillDate": (now - timedelta(hours=24)).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "validUpto": (now + timedelta(hours=24)).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "fromGstin": f"27AABCT{random.randint(1000, 9999)}C1ZZ",
        "fromPincode": random.choice([110001, 302001, 380001, 400001]),
        "toGstin": f"27AABCM{random.randint(1000, 9999)}D1ZZ",
        "toPincode": random.choice([400001, 500001, 600001, 700001]),
        "transMode": 1,
        "vehicleNo": f"MH04AB{random.randint(1000, 9999)}",
        "totalValue": random.randint(50000, 5000000),
        "hsnCode": hsn,
        "commodityDescription": desc,
    }


@app.post("/api/eway-bill/update-part-b")
async def update_eway_bill_part_b(request: EwayBillUpdateRequest):
    """
    Mock eWay Bill Part-B update — triggered when truck is rerouted.
    Blueprint Section 9.3: Auto-update Part-B when truck is rerouted.

    In production, this would call NIC's eWay Bill API with AES-encrypted payloads
    via a certified GST Suvidha Provider (GSP).
    """
    return {
        "status": "SUCCESS",
        "message": f"Part-B updated for eWay Bill {request.ewayBillNo}",
        "ewayBillNo": request.ewayBillNo,
        "previousVehicle": "MH04AB1234",
        "newVehicle": request.newVehicleNo,
        "reason": request.reason,
        "updatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "updatedBy": request.updatedBy,
        "validityExtended": True,
        "newValidUpto": (datetime.now(timezone.utc) + timedelta(hours=48)).strftime(
            "%Y-%m-%dT%H:%M:%SZ"
        ),
    }


# ---------------------------------------------------------------------------
# ULIP FASTag History API (Section 9.1, 9.2)
# ---------------------------------------------------------------------------

TOLL_PLAZAS = [
    {"id": "TP-KHD-001", "name": "Kherki Daula", "lat": 28.4167, "lng": 77.0500},
    {"id": "TP-MNR-002", "name": "Manesar", "lat": 28.3570, "lng": 76.9340},
    {"id": "TP-JPR-003", "name": "Shahpura", "lat": 26.9124, "lng": 75.7873},
    {"id": "TP-PNP-004", "name": "Panipat", "lat": 29.3909, "lng": 76.9635},
    {"id": "TP-VDR-005", "name": "Vadodara", "lat": 22.3072, "lng": 73.1812},
    {"id": "TP-SRT-006", "name": "Surat", "lat": 21.1702, "lng": 72.8311},
    {"id": "TP-MUM-007", "name": "Mumbai Entry", "lat": 19.2183, "lng": 72.9781},
]


@app.get("/api/ulip/fastag/{tag_id}")
async def get_fastag_history(tag_id: str, limit: int = 10):
    """
    Mock ULIP FASTag transaction history.
    Blueprint Section 9.2: FASTag / NETC System.
    """
    now = datetime.now(timezone.utc)
    transactions = []

    for i in range(min(limit, 20)):
        plaza = random.choice(TOLL_PLAZAS)
        txn_time = now - timedelta(hours=i * 2 + random.uniform(0, 1))
        transactions.append({
            "transactionId": str(uuid.uuid4()),
            "tagId": tag_id,
            "tollPlazaId": plaza["id"],
            "tollPlazaName": plaza["name"],
            "tollPlazaGeocode": f"{plaza['lat']},{plaza['lng']}",
            "timestamp": txn_time.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "laneDirection": random.choice(["N", "S", "E", "W"]),
            "tollAmountINR": random.randint(50, 500),
            "paymentStatus": "DEDUCTED",
        })

    return {
        "tagId": tag_id,
        "totalTransactions": len(transactions),
        "transactions": transactions,
    }


# ---------------------------------------------------------------------------
# IMD Weather API Mock (for risk scoring)
# ---------------------------------------------------------------------------

@app.get("/api/ulip/weather/{location}")
async def get_weather(location: str):
    """
    Mock IMD weather data for risk scoring.
    Used by ML pipeline to adjust risk scores during monsoon/flood events.
    """
    weather_conditions = [
        {"condition": "CLEAR", "severity": 0.0, "rainfall_mm": 0},
        {"condition": "LIGHT_RAIN", "severity": 0.2, "rainfall_mm": 15},
        {"condition": "MODERATE_RAIN", "severity": 0.4, "rainfall_mm": 45},
        {"condition": "HEAVY_RAIN", "severity": 0.7, "rainfall_mm": 120},
        {"condition": "MONSOON", "severity": 0.9, "rainfall_mm": 250},
        {"condition": "FLOOD_WARNING", "severity": 1.0, "rainfall_mm": 400},
    ]

    # Weighted random — most of the time it's clear/light
    weights = [0.4, 0.25, 0.15, 0.10, 0.07, 0.03]
    weather = random.choices(weather_conditions, weights=weights, k=1)[0]

    return {
        "location": location,
        "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "source": "IMD (Simulated)",
        "condition": weather["condition"],
        "severity": weather["severity"],
        "rainfall_mm_per_hour": weather["rainfall_mm"],
        "wind_speed_kmh": random.randint(5, 80),
        "visibility_km": max(0.5, 10 - weather["severity"] * 9),
        "advisory": "No travel advisory" if weather["severity"] < 0.5
                     else "Heavy rain advisory — reduce speed"
                     if weather["severity"] < 0.8
                     else "FLOOD WARNING — avoid low-lying routes",
    }


# ---------------------------------------------------------------------------
# Health Check
# ---------------------------------------------------------------------------

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "service": "apex-mock-dpi",
        "version": "1.0.0",
        "apis": ["vahan", "eway-bill", "ulip/fastag", "ulip/weather"],
    }


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("mock_dpi:app", host="0.0.0.0", port=8081, reload=True)
