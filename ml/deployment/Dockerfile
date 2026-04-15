# ==========================================================================
# A.P.E.X ML Agent — Production Dockerfile
# ==========================================================================
#
# Multi-stage build for Google Cloud Run deployment.
# Optimized for:
#   - Small image size (python:3.11-slim base)
#   - Fast startup (pre-loads models into image)
#   - Security (non-root user)
#   - Layer caching (deps installed before code copy)
#
# Build:
#   docker build -t apex-ml-agent .
#
# Run locally:
#   docker run -p 8082:8082 \
#     -e USE_FIREBASE=false \
#     apex-ml-agent
#
# Deploy to Cloud Run:
#   gcloud run deploy apex-ml-agent \
#     --image gcr.io/apex-digital-twin/apex-ml-agent \
#     --port 8082 \
#     --memory 1Gi \
#     --set-env-vars USE_FIREBASE=true,FIREBASE_DATABASE_URL=https://...
# ==========================================================================

FROM python:3.11-slim AS base

# Prevent Python from writing bytecode and enable unbuffered output
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8082

# Install system dependencies (needed for some ML package compilations)
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        build-essential \
        curl && \
    rm -rf /var/lib/apt/lists/*

# Create non-root user for security
RUN groupadd -r apex && useradd -r -g apex -d /app -s /sbin/nologin apex

WORKDIR /app

# ---------------------------------------------------------------------------
# Stage 1: Install Python dependencies (cached layer)
# ---------------------------------------------------------------------------
COPY ml/deployment/requirements.txt /app/ml/deployment/requirements.txt
RUN pip install --no-cache-dir -r /app/ml/deployment/requirements.txt

# ---------------------------------------------------------------------------
# Stage 2: Copy application code
# ---------------------------------------------------------------------------

# Copy shared constants and firebase contract
COPY shared/ /app/shared/

# Copy highway graph (from Member 1)
COPY backend/graph/highway_graph.json /app/backend/graph/highway_graph.json

# Copy ML code (models, routing, deployment)
COPY ml/ /app/ml/

# ---------------------------------------------------------------------------
# Stage 3: Configure and run
# ---------------------------------------------------------------------------

# Switch to non-root user
RUN chown -R apex:apex /app
USER apex

# Health check for Cloud Run
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD curl -f http://localhost:${PORT}/health || exit 1

# Expose the service port
EXPOSE ${PORT}

# Run the FastAPI application with uvicorn
# - Workers default to 1 (Cloud Run auto-scales containers instead)
# - Timeout set to 600s for long-running reroute computations
CMD ["python", "-m", "uvicorn", \
     "ml.deployment.routing_agent:app", \
     "--host", "0.0.0.0", \
     "--port", "8082", \
     "--workers", "1", \
     "--timeout-keep-alive", "600"]
