# -*- coding: utf-8 -*-
"""Quick verification of all 10 fixes."""
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

import requests
import json
import time

BASE = "http://localhost:8080"
PASS = 0
FAIL = 0

def check(name, condition, detail=""):
    global PASS, FAIL
    if condition:
        PASS += 1
        print(f"  [PASS] {name} {detail}")
    else:
        FAIL += 1
        print(f"  [FAIL] {name} {detail}")

def test_inject(payload):
    r = requests.post(f"{BASE}/inject-anomaly", json=payload, timeout=15)
    return r.json()

# ============================================================
print("=" * 60)
print("TEST 1: MONSOON - ML prediction + routing")
d1 = test_inject({"type": "MONSOON", "severity": 0.95, "lat": 22.4, "lng": 73.0})
check("ML probability exists", d1["ml_prediction"].get("probability") is not None,
      f'P={d1["ml_prediction"].get("probability")}')
check("Route found (F3 OD fix)", len(d1.get("route_path", "")) > 0,
      f'route={d1.get("route_path", "(none)")}')
check("Severity label present", d1["ml_prediction"].get("severity_label") is not None,
      f'label={d1["ml_prediction"].get("severity_label")}')

# ============================================================
print()
print("=" * 60)
print("TEST 2: ACCIDENT - Single node disruption")
d2 = test_inject({"type": "ACCIDENT", "severity": 0.8, "lat": 28.0, "lng": 76.4})
check("Route found", len(d2.get("route_path", "")) > 0,
      f'route={d2.get("route_path", "(none)")}')
check("Rerouted trucks > 0", d2["rerouted"] > 0, f'count={d2["rerouted"]}')
check("Cost saved > 0", d2["cost_saved_inr"] > 0, f'cost={d2["cost_saved_inr"]}')

# ============================================================
print()
print("=" * 60)
print("TEST 3: F2 - Different severity = different ML prediction")
r_low = test_inject({"type": "TOLL_SYSTEM_CRASH", "severity": 0.3, "lat": 28.4, "lng": 77.0})
r_high = test_inject({"type": "TOLL_SYSTEM_CRASH", "severity": 1.0, "lat": 28.4, "lng": 77.0})
p_low = r_low["ml_prediction"].get("probability", 0)
p_high = r_high["ml_prediction"].get("probability", 0)
check("ML responds to severity (F2)", p_low != p_high,
      f'low={p_low}, high={p_high}')

# ============================================================
print()
print("=" * 60)
print("TEST 4: F9 - /demo/dual-shock endpoint")
r5 = requests.post(f"{BASE}/demo/dual-shock", timeout=15)
d5 = r5.json()
check("Endpoint exists", r5.status_code == 200)
check("Status is dual_shock_complete", d5.get("status") == "dual_shock_complete")
check("Two shock groups", len(d5.get("shocks", [])) == 2, f'shocks={d5.get("shocks")}')
check("Route found in dual-shock", len(d5.get("demo_metrics", {}).get("route_path", "")) > 0,
      f'route={d5.get("demo_metrics", {}).get("route_path", "(none)")}')

# ============================================================
print()
print("=" * 60)
print("TEST 5: F9 - /demo/reset endpoint")
r6 = requests.post(f"{BASE}/demo/reset", timeout=10)
d6 = r6.json()
check("Endpoint exists", r6.status_code == 200)
check("Status is reset", d6.get("status") == "reset")
check("Recovered nodes returned", len(d6.get("recovered_nodes", [])) > 0,
      f'recovered={d6.get("recovered_nodes")}')

# ============================================================
print()
print("=" * 60)
print("TEST 6: /ml-status shows models loaded")
r7 = requests.get(f"{BASE}/ml-status", timeout=5)
d7 = r7.json()
check("XGBoost loaded", d7.get("xgboost") == True)
check("RF loaded", d7.get("random_forest") == True)
check("Graph loaded", d7.get("graph_nodes", 0) > 0, f'{d7.get("graph_nodes")}N/{d7.get("graph_edges")}E')

# ============================================================
print()
print("=" * 60)
print("TEST 7: PORT_CONGESTION routing")
d_pc = test_inject({"type": "PORT_CONGESTION", "severity": 0.9, "lat": 19.2, "lng": 72.8})
check("Route found", len(d_pc.get("route_path", "")) > 0,
      f'route={d_pc.get("route_path", "(none)")}')

# ============================================================
print()
print("=" * 60)
print(f"\nRESULTS: {PASS} passed, {FAIL} failed out of {PASS+FAIL} checks")
if FAIL == 0:
    print("ALL TESTS PASSED!")
else:
    print(f"WARNING: {FAIL} test(s) failed")
