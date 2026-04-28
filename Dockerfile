FROM python:3.11-slim

WORKDIR /app

# Copy and install Python dependencies first (Docker cache layer)
COPY backend/processor/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY backend/processor/ ./backend/processor/
COPY backend/graph/ ./backend/graph/
COPY ml/ ./ml/

# Set PYTHONPATH so imports resolve correctly
ENV PORT=8080
ENV PYTHONPATH=/app
ENV DEMO_MODE=true

# Run the FastAPI server
CMD ["sh", "-c", "uvicorn backend.processor.main:app --host 0.0.0.0 --port $PORT --workers 1"]
