"""
A.P.E.X — Configuration Module

Environment-based configuration for the ML Agent service.
All configurable values are read from environment variables with
sensible defaults for local development.

Environment Variables:
    FIREBASE_DATABASE_URL  — Firebase RTDB URL (emulator or production)
    USE_FIREBASE           — Enable Firebase writes ("true"/"false")
    MODEL_DIR              — Path to directory containing .pkl model files
    GRAPH_PATH             — Path to highway_graph.json
    LOG_LEVEL              — Logging verbosity (DEBUG, INFO, WARNING, ERROR)
    PORT                   — Server port for uvicorn
    CORS_ORIGINS           — Comma-separated allowed CORS origins

Usage:
    from ml.deployment.config import settings
    print(settings.firebase_url)
"""

import os
import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional


def _resolve_model_dir() -> str:
    """Resolve default model directory relative to this file."""
    return str(Path(__file__).resolve().parent.parent / "models")


def _resolve_graph_path() -> str:
    """Resolve default graph path relative to this file."""
    return str(
        Path(__file__).resolve().parent.parent.parent
        / "backend" / "graph" / "highway_graph.json"
    )


@dataclass
class Settings:
    """
    Application settings loaded from environment variables.

    All fields have defaults suitable for local development — no .env
    file required to start the service.
    """

    # --- Firebase ---
    firebase_url: str = ""
    use_firebase: bool = False

    # --- Model Paths ---
    model_dir: str = ""
    graph_path: str = ""

    # --- Server ---
    port: int = 8082
    log_level: str = "INFO"
    cors_origins: list[str] = field(default_factory=lambda: ["*"])

    # --- Feature Flags ---
    enable_metrics: bool = True
    enable_batch_predict: bool = True

    def __post_init__(self):
        """Override defaults with environment variables if present."""
        self.firebase_url = os.getenv(
            "FIREBASE_DATABASE_URL",
            self.firebase_url or "http://127.0.0.1:9000",
        )
        self.use_firebase = os.getenv(
            "USE_FIREBASE", str(self.use_firebase)
        ).lower() == "true"

        self.model_dir = os.getenv("MODEL_DIR", self.model_dir or _resolve_model_dir())
        self.graph_path = os.getenv("GRAPH_PATH", self.graph_path or _resolve_graph_path())
        self.port = int(os.getenv("PORT", str(self.port)))
        self.log_level = os.getenv("LOG_LEVEL", self.log_level).upper()

        cors_env = os.getenv("CORS_ORIGINS")
        if cors_env:
            self.cors_origins = [origin.strip() for origin in cors_env.split(",")]

    def configure_logging(self) -> None:
        """Apply log level from settings to root logger."""
        numeric_level = getattr(logging, self.log_level, logging.INFO)
        logging.basicConfig(
            level=numeric_level,
            format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
            force=True,  # Override any previous basicConfig calls
        )


# Module-level singleton — import this from other modules
settings = Settings()
