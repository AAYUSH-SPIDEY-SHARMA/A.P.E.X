"""Quick API verification script — tests all critical endpoints."""
import requests
import json

BASE = "http://localhost:8080"

# 1. Inject anomaly
r = requests.post(f"{BASE}/inject-anomaly", json={
    "type": "ACCIDENT", "severity": 0.85, "lat": 28.0, "lng": 76.4
})
data = r.json()

print("=== INJECT RESPONSE ===")
critical = ["anomaly_id", "alert_id", "rerouted", "route_path",
            "total_distance_km", "total_toll_cost_inr", "cost_saved_inr",
            "inference_latency_ms"]
all_ok = True
for f in critical:
    v = data.get(f)
    bad = v is None or str(v) in ("nan", "NaN")
    if bad:
        all_ok = False
    print(f"  {'FAIL' if bad else 'OK'}: {f} = {v}")

ml = data.get("ml_prediction", {})
for f in ["is_disrupted", "probability", "severity_label", "confidence"]:
    v = ml.get(f)
    bad = v is None or str(v) in ("nan", "NaN", "undefined")
    if bad:
        all_ok = False
    print(f"  {'FAIL' if bad else 'OK'}: ml.{f} = {v}")

# 2. Demo reset
r = requests.post(f"{BASE}/demo/reset")
reset = r.json()
print(f"\n=== DEMO RESET ===")
print(f"  status: {reset.get('status')}")
print(f"  recovered: {reset.get('recovered_nodes')}")

# 3. Dual shock
r = requests.post(f"{BASE}/demo/dual-shock")
ds = r.json()
dm = ds.get("demo_metrics", {})
print(f"\n=== DUAL SHOCK ===")
print(f"  status: {ds.get('status')}")
print(f"  trucks: {dm.get('trucks_rerouted')}")
print(f"  cost: {dm.get('cost_saved_inr')}")
print(f"  route: {dm.get('route_path')}")
print(f"  ml_prob: {dm.get('ml_prediction', {}).get('probability')}")
print(f"  latency: {dm.get('inference_latency_ms')}ms")

# Final reset
requests.post(f"{BASE}/demo/reset")

print(f"\n=== FINAL VERDICT ===")
print(f"All critical fields present: {'YES' if all_ok else 'NO'}")
print("System is DEMO-READY." if all_ok else "SYSTEM HAS ISSUES.")
