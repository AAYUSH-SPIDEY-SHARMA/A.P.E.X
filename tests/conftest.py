"""Shared pytest fixtures for A.P.E.X test suite."""
import sys
from pathlib import Path

# Add project root to path so ml.* imports work
sys.path.insert(0, str(Path(__file__).parent.parent))
