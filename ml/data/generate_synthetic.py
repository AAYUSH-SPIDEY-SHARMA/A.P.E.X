import pandas as pd
import numpy as np
import math
import os
from datetime import datetime, timedelta

# --- CONFIGURATION ---
OUTPUT_DIR = "./"
TIMESTEPS = 15000  # 15,000 steps * 7 nodes = 105,000 rows
STEP_MINUTES = 15

# SYNCED WITH AAYUSH'S BACKEND GRAPH
# Order matters for cascading congestion: [0] is Origin (Delhi), [6] is Destination (Mumbai)
NODES = [
    {"id": "NH48_KHERKI_DAULA", "processingRate": 12.0},
    {"id": "NH48_SHAHJAHANPUR", "processingRate": 8.0},  # RTO bottleneck
    {"id": "NH48_THIKARIYA",    "processingRate": 15.0},
    {"id": "NH48_VASAD",        "processingRate": 11.0}, # 7th Node (Gujarat)
    {"id": "NH48_KARJAN",       "processingRate": 12.0},
    {"id": "NH48_DAHISAR",      "processingRate": 10.0},
    {"id": "NH48_JNPT_PORT",    "processingRate": 5.0}   # Port bottleneck
]

def generate_time_series_data():
    print(f"🚀 Initializing A.P.E.X Data Generator (7 Nodes, Stabilized Physics)...")
    print(f"⏳ Simulating {TIMESTEPS} timesteps (105,000 rows total)...")
    
    # State tracking dictionary for the "Lag" features
    state = {
        n["id"]: {
            "queue_length": 0.0,
            "utilization": 0.5,
            "weather_severity": 0.1,
            "weather_state": "NORMAL" 
        } for n in NODES
    }
    
    data = []
    current_time = datetime(2025, 1, 1, 0, 0)
    
    for t in range(TIMESTEPS):
        hour = current_time.hour
        hour_sin = math.sin(2 * math.pi * hour / 24)
        hour_cos = math.cos(2 * math.pi * hour / 24)
        
        # --- STABILIZED CORRIDOR LOAD ---
        # Instead of absolute trucks, we load the highway as a % of capacity
        # Night Pulse (10PM-5AM): Highway runs at 65-85% capacity
        # Day (Off-Peak): Highway runs at 35-60% capacity
        is_night_pulse = 1 if (hour >= 22 or hour <= 5) else 0
        corridor_load = np.random.uniform(0.65, 0.85) if is_night_pulse else np.random.uniform(0.35, 0.60)
        
        downstream_utilization = 0.0 
        
        # Process backwards (Destination to Origin) for cascading shockwaves
        for i in range(len(NODES) - 1, -1, -1):
            node = NODES[i]
            nid = node["id"]
            proc_rate = node["processingRate"] 
            
            # --- 1. Weather Persistence ---
            if state[nid]["weather_state"] == "NORMAL":
                if np.random.random() < 0.02: # 2% chance storm rolls in
                    state[nid]["weather_state"] = "SEVERE"
                    weather = np.random.uniform(0.7, 1.0)
                else:
                    weather = np.random.uniform(0.0, 0.3)
            else:
                if np.random.random() < 0.10: # 10% chance storm clears up
                    state[nid]["weather_state"] = "NORMAL"
                    weather = np.random.uniform(0.0, 0.3)
                else:
                    weather = np.random.uniform(0.7, 1.0)
            
            # --- 2. Traffic Physics ---
            effective_proc_rate = proc_rate * (1 - (weather * 0.4))
            
            # Downstream congestion backup penalty (Shockwave effect)
            downstream_congestion_flag = 1 if downstream_utilization > 0.90 else 0
            cascade_penalty = 0.10 if downstream_congestion_flag else 0.0
            
            # Arrivals are relative to the node's capacity (prevents infinite queues)
            arrivals = proc_rate * corridor_load * np.random.uniform(0.85, 1.15)
            departures = effective_proc_rate
            
            # --- 3. Queue & Utilization Calculation ---
            prev_queue = state[nid]["queue_length"]
            prev_util = state[nid]["utilization"]
            
            new_queue = max(0.0, prev_queue + arrivals - departures)
            new_queue = min(new_queue, 150.0) # Hard cap queue length
            
            queue_growth = new_queue - prev_queue
            utilization = min(1.0, (arrivals / effective_proc_rate) + cascade_penalty)
            
            # --- 4. Tipping Point Labeling ---
            is_disrupted = 0
            if utilization >= 0.96:
                is_disrupted = 1 # Guaranteed gridlock
            elif 0.80 <= utilization < 0.96 and weather > 0.8:
                is_disrupted = 1 # Fragile system breaks under weather
            elif utilization < 0.75 and np.random.random() < 0.001:
                # 0.1% chance of severe random accident on clear road (Black Swan)
                is_disrupted = 1 
                
            data.append({
                "timestamp": current_time, 
                "node_id": nid,
                "queue_length": round(new_queue, 1),
                "queue_growth": round(queue_growth, 1),
                "processingRate": round(proc_rate, 1),
                "utilization": round(utilization, 3),
                "prev_utilization": round(prev_util, 3),
                "downstream_congestion_flag": downstream_congestion_flag,
                "weather_severity": round(weather, 3),
                "hour_sin": round(hour_sin, 4),
                "hour_cos": round(hour_cos, 4),
                "is_disrupted": is_disrupted
            })
            
            # --- Update State for next loop ---
            state[nid]["queue_length"] = new_queue
            state[nid]["utilization"] = utilization
            state[nid]["weather_severity"] = weather
            
            # Pass this node's utilization upstream for the next iteration
            downstream_utilization = utilization
            
        current_time += timedelta(minutes=STEP_MINUTES)
        
        if (t + 1) % 3000 == 0:
            print(f"✅ Generated {t + 1} timesteps...")

    return pd.DataFrame(data)

# --- EXECUTION & SPLITTING ---
if __name__ == "__main__":
    df = generate_time_series_data()
    
    # Sort chronologically to preserve the time-series state
    df = df.sort_values(by=["timestamp", "node_id"]).reset_index(drop=True)
    
    print("\n📊 Dataset Statistics:")
    print(f"Total Rows: {len(df)}")
    print(f"Max Queue Length: {df['queue_length'].max():.1f} trucks")
    print(f"Disruption Rate: {df['is_disrupted'].mean() * 100:.2f}%")
    
    # Drop timestamp before saving (XGBoost doesn't need raw datetime strings)
    df.drop(columns=["timestamp"], inplace=True)
    
    # Chronological Split (80/20) - Vital for time-series forecasting
    split_idx = int(len(df) * 0.8)
    train_df = df.iloc[:split_idx]
    test_df = df.iloc[split_idx:]
    
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    train_df.to_csv(os.path.join(OUTPUT_DIR, "train.csv"), index=False)
    test_df.to_csv(os.path.join(OUTPUT_DIR, "test.csv"), index=False)
    
    print(f"\n💾 Saved train.csv ({len(train_df)} rows) and test.csv ({len(test_df)} rows)")
    print("🎯 READY FOR XGBOOST TRAINING!")