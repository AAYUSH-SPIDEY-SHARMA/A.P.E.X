"""
A.P.E.X — Highway Graph Loader

Loads the highway_graph.json into a NetworkX graph.
Node IDs in the graph now match the synthetic training data IDs
(e.g., "NH48_KHERKI_DAULA") — no mapping layer needed.

Graph specification (from backend/graph/highway_graph.json):
    - 15 nodes: 7 corridor nodes + 1 alternate toll + 5 warehouses + 2 ICDs
    - 21 edges: highway segments with distanceKm, riskScore, tollCostINR, etc.
    - Format: NetworkX node_link_data compatible

Blueprint References:
    - S10.1: Highway graph DDL (simplified to JSON)
    - S13.2: A* edge weight attributes
"""

import json
import logging
from pathlib import Path
from typing import Optional

import networkx as nx

logger = logging.getLogger("apex.routing.graph_loader")

# ---------------------------------------------------------------------------
# Module-level singleton cache
# ---------------------------------------------------------------------------
_cached_graph: Optional[nx.Graph] = None
_cached_graph_path: Optional[str] = None

# ---------------------------------------------------------------------------
# ML Corridor Nodes — Actual GPS Coordinates
# ---------------------------------------------------------------------------
# These are the REAL toll plaza / RTO / ICD locations along the NH-48
# Delhi–Mumbai corridor. Used by the routing engine for haversine
# calculations and by the deployment agent for anomaly injection.
# These IDs now match the highway_graph.json node IDs directly.
# ---------------------------------------------------------------------------

ML_CORRIDOR_NODES: dict[str, dict] = {
    "NH48_KHERKI_DAULA": {
        "type": "TOLL_PLAZA", "name": "Kherki Daula Toll Plaza",
        "lat": 28.395604, "lng": 76.981760,
        "highway": "NH-48", "processingRate": 12.0, "avgQueueLength": 35,
    },
    "NH48_SHAHJAHANPUR": {
        "type": "RTO", "name": "Shahjahanpur RTO",
        "lat": 27.999780, "lng": 76.430522,
        "highway": "NH-48", "processingRate": 8.0, "avgQueueLength": 45,
    },
    "NH48_THIKARIYA": {
        "type": "TOLL_PLAZA", "name": "Thikariya Toll Plaza",
        "lat": 26.843328, "lng": 75.615578,
        "highway": "NH-48", "processingRate": 15.0, "avgQueueLength": 20,
    },
    "NH48_VASAD": {
        "type": "TOLL_PLAZA", "name": "Vasad Toll Plaza",
        "lat": 22.453260, "lng": 73.070492,
        "highway": "NH-48", "processingRate": 11.0, "avgQueueLength": 25,
    },
    "NH48_KARJAN": {
        "type": "TOLL_PLAZA", "name": "Karjan Toll Plaza",
        "lat": 22.014778, "lng": 73.115375,
        "highway": "NH-48", "processingRate": 12.0, "avgQueueLength": 20,
    },
    "NH48_DAHISAR": {
        "type": "TOLL_PLAZA", "name": "Dahisar Toll Plaza",
        "lat": 19.260565, "lng": 72.872801,
        "highway": "NH-48", "processingRate": 10.0, "avgQueueLength": 40,
    },
    "NH48_JNPT_PORT": {
        "type": "ICD", "name": "JNPT Port",
        "lat": 18.934750, "lng": 72.943125,
        "highway": "NH-48", "processingRate": 5.0, "avgQueueLength": 60,
    },
}


def get_node_id_mapping() -> dict[str, str]:
    """
    Return identity mapping — graph IDs now match synthetic data IDs.
    Kept for backward compatibility with any code that calls this.
    """
    return {nid: nid for nid in ML_CORRIDOR_NODES}


def _resolve_graph_path(custom_path: Optional[str] = None) -> Path:
    """
    Resolve the highway graph JSON path.

    Search order:
        1. Explicit custom_path argument
        2. Relative to this file: ../../backend/graph/highway_graph.json
        3. Relative to CWD: backend/graph/highway_graph.json

    Raises:
        FileNotFoundError: if no graph file can be located.
    """
    if custom_path:
        p = Path(custom_path)
        if p.exists():
            return p
        raise FileNotFoundError(f"Custom graph path does not exist: {custom_path}")

    # Try relative to this module (ml/routing/ → project root → backend/graph/)
    relative_to_module = Path(__file__).resolve().parent.parent.parent / "backend" / "graph" / "highway_graph.json"
    if relative_to_module.exists():
        return relative_to_module

    # Try relative to CWD
    relative_to_cwd = Path("backend") / "graph" / "highway_graph.json"
    if relative_to_cwd.exists():
        return relative_to_cwd

    raise FileNotFoundError(
        "highway_graph.json not found. Expected at:\n"
        f"  1. {relative_to_module}\n"
        f"  2. {relative_to_cwd.resolve()}\n"
        "Ensure the graph file has been created."
    )


def _validate_graph(graph: nx.Graph) -> None:
    """
    Validate graph integrity — ensures required attributes exist on
    nodes and edges so downstream A* routing doesn't crash.

    Raises:
        ValueError: on structural issues that would break routing.
    """
    if graph.number_of_nodes() == 0:
        raise ValueError("Highway graph has zero nodes — file may be empty or corrupt.")

    if graph.number_of_edges() == 0:
        raise ValueError("Highway graph has zero edges — routing is impossible.")

    # Verify at least some nodes have lat/lng for heuristic
    nodes_with_coords = sum(
        1 for _, data in graph.nodes(data=True)
        if "lat" in data and "lng" in data
    )
    if nodes_with_coords < 2:
        raise ValueError(
            f"Only {nodes_with_coords} nodes have lat/lng coordinates. "
            "A* heuristic requires at least origin and destination coordinates."
        )

    # Verify edges have distanceKm (primary weight attribute)
    edges_with_distance = sum(
        1 for _, _, data in graph.edges(data=True)
        if "distanceKm" in data
    )
    if edges_with_distance == 0:
        logger.warning(
            "No edges have 'distanceKm' attribute. "
            "A* will use default distance of 100km per edge."
        )

    logger.info(
        f"Graph validation passed: {graph.number_of_nodes()} nodes, "
        f"{graph.number_of_edges()} edges, "
        f"{nodes_with_coords} nodes with coordinates"
    )


def load_highway_graph(
    graph_path: Optional[str] = None,
    force_reload: bool = False,
) -> nx.Graph:
    """
    Load the highway network graph from JSON.

    Uses module-level caching — subsequent calls return the same graph
    instance unless force_reload=True or a different path is specified.

    Args:
        graph_path:    Override path to highway_graph.json. If None, uses
                       auto-discovery (relative to module or CWD).
        force_reload:  If True, bypass cache and re-read from disk.

    Returns:
        NetworkX undirected Graph with node/edge attributes.

    Raises:
        FileNotFoundError: if graph file cannot be located.
        ValueError:        if graph fails structural validation.
        json.JSONDecodeError: if JSON is malformed.
    """
    global _cached_graph, _cached_graph_path

    resolved_path = str(_resolve_graph_path(graph_path))

    # Return cached graph if path matches and no force reload
    if not force_reload and _cached_graph is not None and _cached_graph_path == resolved_path:
        logger.debug("Returning cached highway graph")
        return _cached_graph

    logger.info(f"Loading highway graph from: {resolved_path}")

    with open(resolved_path, "r", encoding="utf-8") as f:
        raw_data = json.load(f)

    # Strip _meta key (not part of NetworkX schema) before parsing
    graph_data = {k: v for k, v in raw_data.items() if k != "_meta"}

    # NetworkX 3.3: use link="links" (the default) to match highway_graph.json key name
    graph = nx.node_link_graph(graph_data, directed=False, multigraph=False)

    _validate_graph(graph)

    # Cache for subsequent calls
    _cached_graph = graph
    _cached_graph_path = resolved_path

    logger.info(
        f"Highway graph loaded successfully: "
        f"{graph.number_of_nodes()} nodes, {graph.number_of_edges()} edges"
    )
    return graph


def get_graph_node_data(graph: nx.Graph, node_id: str) -> dict:
    """
    Safely retrieve node attribute dict by ID.

    Args:
        graph:   The loaded highway graph.
        node_id: Node ID (e.g., "NH48_KHERKI_DAULA" or "WH-DEL-001").

    Returns:
        Node attribute dict, or empty dict if not found.
    """
    # Direct graph lookup (IDs now match everywhere)
    if node_id in graph.nodes:
        return dict(graph.nodes[node_id])

    # Fallback: ML corridor nodes dict (in case graph wasn't loaded)
    if node_id in ML_CORRIDOR_NODES:
        return ML_CORRIDOR_NODES[node_id].copy()

    logger.warning(f"Node '{node_id}' not found in graph or corridor nodes")
    return {}
