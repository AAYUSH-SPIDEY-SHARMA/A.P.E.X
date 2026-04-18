"""
A.P.E.X — Reset demo environment.
Clears Firebase data and re-seeds fresh demo data.

Usage:
    python scripts/reset_demo.py
"""
import subprocess
import sys
import os

FIREBASE_URL = "https://project-96d2fc7b-e1a1-418a-87a-default-rtdb.asia-southeast1.firebasedatabase.app"

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
print("[APEX] ML Agent: https://apex-ml-agent-246320615957.asia-south1.run.app")
print("[APEX] Run 'npm run dev' in frontend/ to start dashboard")
