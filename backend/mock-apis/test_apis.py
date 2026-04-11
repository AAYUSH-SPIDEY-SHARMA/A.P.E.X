"""Quick test script for Mock DPI APIs."""
import httpx
import json

BASE = "http://127.0.0.1:8081"

# Test 1: Vahan lookup (hardcoded vehicle)
r = httpx.get(f"{BASE}/api/vahan/MH04AB1234")
d = r.json()
print("=== VAHAN (MH04AB1234) ===")
print(f"  Owner: {d['owner']}")
print(f"  Model: {d['vehicle_manufacturer_name']} {d['model']}")
print(f"  GrossWeight: {d['grossWeight']}")
print(f"  BS Norm: {d['norms_type']}")

# Test 2: Vahan lookup (dynamic vehicle)
r = httpx.get(f"{BASE}/api/vahan/RJ14KL7890")
d = r.json()
print(f"\n=== VAHAN (RJ14KL7890 - dynamic) ===")
print(f"  Owner: {d['owner']}")
print(f"  Status: {d['status']}")

# Test 3: eWay Bill lookup
r = httpx.get(f"{BASE}/api/eway-bill/3410987654")
d = r.json()
print(f"\n=== EWAY BILL ===")
print(f"  From: {d['fromPincode']} -> To: {d['toPincode']}")
print(f"  Value: INR {d['totalValue']:,}")
print(f"  Commodity: {d['commodityDescription']}")

# Test 4: eWay Bill Part-B update
r = httpx.post(
    f"{BASE}/api/eway-bill/update-part-b",
    json={"ewayBillNo": 3410987654, "newVehicleNo": "GJ06EF9012"},
)
d = r.json()
print(f"\n=== PART-B UPDATE ===")
print(f"  Status: {d['status']}")
print(f"  New Vehicle: {d['newVehicle']}")

# Test 5: Weather
r = httpx.get(f"{BASE}/api/ulip/weather/mumbai")
d = r.json()
print(f"\n=== WEATHER (Mumbai) ===")
print(f"  Condition: {d['condition']}")
print(f"  Severity: {d['severity']}")
print(f"  Advisory: {d['advisory']}")

print("\n[OK] All 5 DPI API tests passed!")
