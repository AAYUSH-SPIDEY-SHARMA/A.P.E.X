"""
A.P.E.X — Reset demo environment.
Clears Firebase data and re-seeds fresh demo data.

Usage:
    python scripts/reset_demo.py
"""
import subprocess
import sys
import os

FIREBASE_URL = os.environ.get("FIREBASE_DATABASE_URL", "")
if not FIREBASE_URL:
    print("[ERROR] Set FIREBASE_DATABASE_URL environment variable first!")
    sys.exit(1)

ML_AGENT_URL = os.environ.get("ML_AGENT_URL", "")

print("[APEX] ===== DEMO RESET =====")
print("[APEX] Step 1: Clearing all supply_chain data...")

try:
    import httpx
except ImportError:
    subprocess.check_call([sys.executable, "-m", "pip", "install", "httpx"])
    import httpx

r = httpx.delete(f"{FIREBASE_URL}/supply_chain.json")
print(f"[APEX] Cleared: {r.status_code}")

print("[APEX] Step 2: Re-seeding demo data...")
seed_script = os.path.join(os.path.dirname(__file__), "seed_demo_data.py")
subprocess.check_call([sys.executable, seed_script])

print("\n[APEX] ===== DEMO READY =====")
print(f"[APEX] Firebase: {FIREBASE_URL}")
if ML_AGENT_URL:
    print(f"[APEX] ML Agent: {ML_AGENT_URL}")
print("[APEX] Run 'npm run dev' in frontend/ to start dashboard")

