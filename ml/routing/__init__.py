"""
A.P.E.X — Routing Engine Package

Provides weighted A* search over the Indian highway network graph,
with haversine-based heuristics and India-specific edge cost functions.

Public API:
    - load_highway_graph()       → NetworkX Graph
    - find_safe_route()          → optimal path avoiding disrupted nodes
    - calculate_route_metrics()  → distance, toll, ETA, risk summary

Blueprint References:
    - S7.2:  Haversine velocity interpolation
    - S13.2: Custom A* with India-specific heuristic
    - S13.4: Dynamic rerouting pseudocode
"""

from ml.routing.graph_loader import load_highway_graph, get_node_id_mapping, ML_CORRIDOR_NODES
from ml.routing.astar_router import find_safe_route, calculate_route_metrics

__all__ = [
    "load_highway_graph",
    "get_node_id_mapping",
    "ML_CORRIDOR_NODES",
    "find_safe_route",
    "calculate_route_metrics",
]
