import pandas as pd
import numpy as np
import xgboost as xgb
from sklearn.model_selection import RandomizedSearchCV
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score, roc_auc_score
import joblib
import os
import matplotlib.pyplot as plt

# --- CONFIGURATION (PORTABLE RELATIVE PATHS) ---
# Resolved relative to this file — works on any machine, Docker, and Cloud Run
DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data")
MODEL_DIR = os.path.dirname(os.path.abspath(__file__))

def train_apex_model():
    print("🚀 Initializing A.P.E.X XGBoost Training & Tuning Pipeline...")
    print(f"📂 Looking for data in: {DATA_DIR}")

    # 1. Load the Data
    try:
        train_df = pd.read_csv(os.path.join(DATA_DIR, "train.csv"))
        test_df = pd.read_csv(os.path.join(DATA_DIR, "test.csv"))
        print(f"✅ Successfully loaded train.csv ({len(train_df)} rows) and test.csv ({len(test_df)} rows)")
    except FileNotFoundError as e:
        print(f"❌ Error loading data: {e}")
        return

    # 2. Feature Selection
    drop_cols = ["node_id", "is_disrupted"]
    features = [c for c in train_df.columns if c not in drop_cols]
    
    X_train = train_df[features]
    y_train = train_df["is_disrupted"]
    X_test = test_df[features]
    y_test = test_df["is_disrupted"]

    # 3. Dynamic Cost-Sensitive Learning (Crucial for Imbalance)
    num_negatives = (y_train == 0).sum()
    num_positives = (y_train == 1).sum()
    spw = num_negatives / num_positives
    print(f"⚖️ Class Imbalance detected. Dynamic scale_pos_weight = {spw:.2f}")

    # 4. Hyperparameter Tuning Grid
    print("\n⚙️ Starting Deep Randomized Search (30 Combinations)...")
    print("☕ This will train 90 total models (30 configs * 3 CV folds). Give it a minute...")
    
    param_grid = {
        'max_depth': [4, 5, 6, 7],
        'learning_rate': [0.01, 0.05, 0.1, 0.15],
        'n_estimators': [100, 200, 300, 400],
        'subsample': [0.7, 0.8, 0.9, 1.0],
        'colsample_bytree': [0.7, 0.8, 0.9, 1.0] 
    }

    # Base model
    xgb_base = xgb.XGBClassifier(
        scale_pos_weight=spw, 
        eval_metric="auc",
        random_state=42
    )

    # Fast tuning: Test 30 random combinations with 3-fold Cross Validation
    random_search = RandomizedSearchCV(
        estimator=xgb_base, 
        param_distributions=param_grid, 
        n_iter=30,  # 👈 UPGRADED TO 30
        scoring='roc_auc', 
        cv=3, 
        verbose=2,  # Increased verbosity so you can see the progress bar
        random_state=42,
        n_jobs=-1 # Uses all your CPU cores to blast through the 90 fits
    )

    # Fit the random search model
    random_search.fit(X_train, y_train)

    print("\n🏆 Best Hyperparameters Found:")
    print(random_search.best_params_)

    # 5. Extract and Evaluate the Best Model
    best_model = random_search.best_estimator_
    
    print("\n🔬 --- MODEL EVALUATION ---")
    y_pred = best_model.predict(X_test)
    y_proba = best_model.predict_proba(X_test)[:, 1] 

    print(f"Accuracy:  {accuracy_score(y_test, y_pred):.4f}")
    print(f"ROC-AUC:   {roc_auc_score(y_test, y_proba):.4f} (Target: > 0.90)")
    
    print("\n📋 Classification Report:")
    print(classification_report(y_test, y_pred))
    
    print("🧮 Confusion Matrix:")
    cm = confusion_matrix(y_test, y_pred)
    print(f"True Negatives (Correctly Normal): {cm[0][0]}")
    print(f"False Positives (False Alarms):    {cm[0][1]} <- Okay in logistics")
    print(f"False Negatives (MISSED JAMS):     {cm[1][0]} <- WE WANT THIS TO BE LOW")
    print(f"True Positives (Caught Jams):      {cm[1][1]}")

    # 6. Save the Model
    os.makedirs(MODEL_DIR, exist_ok=True)
    model_path = os.path.join(MODEL_DIR, "xgboost_model.pkl")
    joblib.dump(best_model, model_path)
    print(f"\n💾 Tuned Model successfully saved to {model_path}")

    # 7. Render Feature Importance
    xgb.plot_importance(best_model, importance_type='gain', max_num_features=10, title="A.P.E.X Risk Drivers")
    plt.tight_layout()
    plt.show()

if __name__ == "__main__":
    train_apex_model()