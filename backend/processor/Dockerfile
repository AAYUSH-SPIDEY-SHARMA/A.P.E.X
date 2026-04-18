# A.P.E.X Processing Service — Cloud Run Container
# Build from PROJECT ROOT: docker build -f backend/processor/Dockerfile .
# Or for Cloud Run: gcloud run deploy apex-processor --source backend/processor
#
# For local dev, just use: uvicorn main:app --reload --port 8080

FROM python:3.11-slim

WORKDIR /app

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY main.py .

# Cloud Run uses PORT env var
ENV PORT=8080
ENV USE_FIREBASE=true

EXPOSE 8080

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
