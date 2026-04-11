# A.P.E.X — GCP Project Setup Script
# Run this ONCE when setting up the project for the first time.
# Requires: gcloud CLI installed and authenticated.
#
# Usage: .\scripts\gcp-setup.ps1
# Or with custom project ID: .\scripts\gcp-setup.ps1 -ProjectId "my-project"

param(
    [string]$ProjectId = "apex-digital-twin",
    [string]$Region = "asia-south1"
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " A.P.E.X — GCP Project Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check gcloud is installed
Write-Host "[1/7] Checking gcloud CLI..." -ForegroundColor Yellow
try {
    $gcloudVersion = gcloud version --format="value(Google Cloud SDK)" 2>$null
    Write-Host "  ✅ gcloud SDK found: $gcloudVersion" -ForegroundColor Green
} catch {
    Write-Host "  ❌ gcloud CLI not found. Install from: https://cloud.google.com/sdk/docs/install" -ForegroundColor Red
    exit 1
}

# Step 2: Set project
Write-Host "[2/7] Setting project to: $ProjectId" -ForegroundColor Yellow
gcloud config set project $ProjectId 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ⚠️  Project '$ProjectId' may not exist. Create it in console.cloud.google.com first." -ForegroundColor Red
    Write-Host "  Or run: gcloud projects create $ProjectId --name='A.P.E.X Digital Twin'" -ForegroundColor Yellow
}
Write-Host "  ✅ Project set" -ForegroundColor Green

# Step 3: Enable required APIs (MVP only — no Dataflow, Spanner, BigQuery)
Write-Host "[3/7] Enabling required APIs (MVP only)..." -ForegroundColor Yellow
$apis = @(
    "pubsub.googleapis.com",           # Cloud Pub/Sub — message bus
    "run.googleapis.com",              # Cloud Run — serverless containers
    "firebasedatabase.googleapis.com", # Firebase RTDB — real-time state
    "firebase.googleapis.com",         # Firebase management
    "cloudbuild.googleapis.com"        # Cloud Build — for Cloud Run deployment
)

foreach ($api in $apis) {
    Write-Host "  Enabling $api..."
    gcloud services enable $api --quiet 2>$null
}
Write-Host "  ✅ All MVP APIs enabled" -ForegroundColor Green

# Step 4: Create Pub/Sub topic (blueprint: "fastag-telemetry-stream")
Write-Host "[4/7] Creating Pub/Sub topic: fastag-telemetry-stream" -ForegroundColor Yellow
gcloud pubsub topics create fastag-telemetry-stream --quiet 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✅ Topic created" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  Topic may already exist (OK)" -ForegroundColor Yellow
}

# Also create the action-topic for routing commands (Day 7+)
gcloud pubsub topics create action-topic --quiet 2>$null
Write-Host "  ✅ action-topic created" -ForegroundColor Green

# Step 5: Create Pub/Sub subscriptions
Write-Host "[5/7] Creating Pub/Sub subscriptions..." -ForegroundColor Yellow
gcloud pubsub subscriptions create fastag-processor-sub `
    --topic=fastag-telemetry-stream `
    --ack-deadline=60 `
    --quiet 2>$null
Write-Host "  ✅ Subscription created" -ForegroundColor Green

# Step 6: Create service account for Cloud Run
Write-Host "[6/7] Creating service account: apex-backend" -ForegroundColor Yellow
gcloud iam service-accounts create apex-backend `
    --display-name="A.P.E.X Backend Service" `
    --quiet 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✅ Service account created" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  Service account may already exist (OK)" -ForegroundColor Yellow
}

# Grant required roles
$sa = "apex-backend@${ProjectId}.iam.gserviceaccount.com"
$roles = @(
    "roles/pubsub.subscriber",
    "roles/pubsub.publisher",
    "roles/firebasedatabase.admin",
    "roles/run.invoker"
)

foreach ($role in $roles) {
    gcloud projects add-iam-policy-binding $ProjectId `
        --member="serviceAccount:$sa" `
        --role="$role" `
        --quiet 2>$null
}
Write-Host "  ✅ IAM roles granted" -ForegroundColor Green

# Step 7: Summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " ✅ GCP Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Project:      $ProjectId" -ForegroundColor White
Write-Host "Region:       $Region" -ForegroundColor White
Write-Host "Pub/Sub:      fastag-telemetry-stream, action-topic" -ForegroundColor White
Write-Host "Service Acct: $sa" -ForegroundColor White
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Run FASTag simulator: python backend/simulator/fastag_simulator.py --mode pubsub" -ForegroundColor White
Write-Host "  2. Build processor:      See backend/processor/ (Day 3-4)" -ForegroundColor White
Write-Host "  3. Set up Firebase:      firebase init (select RTDB)" -ForegroundColor White
Write-Host ""
