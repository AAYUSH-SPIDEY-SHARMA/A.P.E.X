import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_squared_error, r2_score, mean_absolute_error
import joblib
import os

# --- CONFIGURATION (EXPLICIT WINDOWS PATHS) ---
DATA_DIR = r"C:\Users\vives\OneDrive\Desktop\hackothone\google solution hackathon\A.P.E.X\ml\data"
MODEL_DIR = r"C:\Users\vives\OneDrive\Desktop\hackothone\google solution hackathon\A.P.E.X\ml\models"

def train_risk_regressor():
    print("🚀 Initializing A.P.E.X Random Forest Regressor Pipeline...")

    # 1. Load the Data
    try:
        train_df = pd.read_csv(os.path.join(DATA_DIR, "train.csv"))
        test_df = pd.read_csv(os.path.join(DATA_DIR, "test.csv"))
    except FileNotFoundError as e:
        print(f"❌ Error loading data: {e}")
        return

    # 2. Create the Target Variable (Risk Score)
    # The A.P.E.X architecture defines Risk as a blend of traffic pressure and environmental hazards.
    print("🧮 Calculating baseline Risk Scores for training...")
    
    def calculate_risk(df):
        # Base formula: 60% traffic utilization, 40% weather severity
        risk = (df['utilization'] * 0.6) + (df['weather_severity'] * 0.4)
        # Add a small penalty if the downstream node is congested
        risk += (df['downstream_congestion_flag'] * 0.1)
        # Clamp between 0.0 (Perfect) and 1.0 (Disaster)
        return risk.clip(0.0, 1.0)

    y_train_risk = calculate_risk(train_df)
    y_test_risk = calculate_risk(test_df)

    # 3. Feature Selection
    # Drop node_id (string) and is_disrupted (that's for the XGBoost model)
    drop_cols = ["node_id", "is_disrupted"]
    features = [c for c in train_df.columns if c not in drop_cols]
    
    X_train = train_df[features]
    X_test = test_df[features]

    # 4. Initialize Random Forest Regressor
    # We use fewer trees (n_estimators=50) and a max depth to keep the model 
    # file size small and inference time extremely fast for the real-time API.
    print("🌳 Training Random Forest (50 Trees)...")
    rf_model = RandomForestRegressor(
        n_estimators=50,
        max_depth=10,
        random_state=42,
        n_jobs=-1 # Use all CPU cores
    )

    # 5. Fit the Model
    rf_model.fit(X_train, y_train_risk)

    # 6. Evaluate Performance
    print("\n🔬 --- REGRESSION EVALUATION ---")
    y_pred_risk = rf_model.predict(X_test)

    rmse = np.sqrt(mean_squared_error(y_test_risk, y_pred_risk))
    mae = mean_absolute_error(y_test_risk, y_pred_risk)
    r2 = r2_score(y_test_risk, y_pred_risk)

    print(f"Root Mean Squared Error (RMSE): {rmse:.4f} (Target: < 0.15)")
    print(f"Mean Absolute Error (MAE):      {mae:.4f}")
    print(f"R-Squared (R2 Score):           {r2:.4f} (Closer to 1.0 is better)")

    # 7. Save the Model
    os.makedirs(MODEL_DIR, exist_ok=True)
    model_path = os.path.join(MODEL_DIR, "rf_risk_model.pkl")
    joblib.dump(rf_model, model_path)
    print(f"\n💾 Random Forest Risk Model successfully saved to {model_path}")

if __name__ == "__main__":
    train_risk_regressor()