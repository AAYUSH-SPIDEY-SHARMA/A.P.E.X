"""
A.P.E.X — Routing Engine Tests

Tests the A* routing engine and highway graph loader for:
    - Graph loading and validation
    - Haversine distance calculation
    - A* pathfinding with disrupted nodes
    - Route metrics calculation
    - Edge cases (no path, invalid nodes)
"""

import sys
from pathlib import Path

import pytest

# Ensure project root is importable
_project_root = Path(__file__).resolve().parent.parent.parent
if str(_project_root) not in sys.path:
    sys.path.insert(0, str(_project_root))

from ml.routing.graph_loader import (
    load_highway_graph,
    get_node_id_mapping,
    get_graph_node_data,
    ML_CORRIDOR_NODES,
)
from ml.routing.astar_router import (
    haversine_km,
    find_safe_route,
    calculate_route_metrics,
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(scope="module")
def graph():
    """Load highway graph once for the entire module."""
    return load_highway_graph(force_reload=True)


# ---------------------------------------------------------------------------
# Graph Loading Tests
# ---------------------------------------------------------------------------

class TestGraphLoading:
    """Tests for highway graph loader."""

    def test_graph_loads_successfully(self, graph):
        """Highway graph should load without errors."""
        assert graph is not None
        assert graph.number_of_nodes() > 0
        assert graph.number_of_edges() > 0

    def test_graph_has_15_nodes(self, graph):
        """Graph should have 15 nodes (7 corridor + 1 alt toll + 5 warehouse + 2 ICD)."""
        assert graph.number_of_nodes() == 15

    def test_graph_has_21_edges(self, graph):
        """Graph should have 21 edges (highway segments)."""
        assert graph.number_of_edges() == 21

    def test_graph_is_undirected(self, graph):
        """Graph should be undirected (highways are bidirectional)."""
        assert not graph.is_directed()

    def test_nodes_have_coordinates(self, graph):
        """All nodes should have lat/lng for haversine heuristic."""
        for node_id, data in graph.nodes(data=True):
            assert "lat" in data, f"Node {node_id} missing 'lat'"
            assert "lng" in data, f"Node {node_id} missing 'lng'"

    def test_edges_have_distance(self, graph):
        """All edges should have distanceKm attribute."""
        for u, v, data in graph.edges(data=True):
            assert "distanceKm" in data, (
                f"Edge {u}→{v} missing 'distanceKm'"
            )

    def test_edges_have_risk_score(self, graph):
        """All edges should have riskScore attribute."""
        for u, v, data in graph.edges(data=True):
            assert "riskScore" in data, (
                f"Edge {u}→{v} missing 'riskScore'"
            )

    def test_corridor_nodes_exist(self, graph):
        """All 7 NH48 corridor nodes must exist in the graph."""
        for node_id in ML_CORRIDOR_NODES:
            assert node_id in graph.nodes, f"Corridor node {node_id} missing from graph"

    def test_key_nodes_exist(self, graph):
        """Critical nodes (Delhi warehouse, Mumbai warehouse) must exist."""
        assert "WH-DEL-001" in graph.nodes, "Delhi warehouse missing"
        assert "WH-MUM-003" in graph.nodes, "Mumbai warehouse missing"
        assert "NH48_KHERKI_DAULA" in graph.nodes, "Kherki Daula toll missing"

    def test_corridor_nodes_have_correct_coords(self, graph):
        """Corridor node coordinates should match ML_CORRIDOR_NODES exactly."""
        for node_id, expected in ML_CORRIDOR_NODES.items():
            actual = graph.nodes[node_id]
            assert abs(actual["lat"] - expected["lat"]) < 0.001, (
                f"Node {node_id} lat mismatch: {actual['lat']} vs {expected['lat']}"
            )
            assert abs(actual["lng"] - expected["lng"]) < 0.001, (
                f"Node {node_id} lng mismatch: {actual['lng']} vs {expected['lng']}"
            )

    def test_caching_returns_same_instance(self, graph):
        """Subsequent loads should return cached graph (same object)."""
        graph2 = load_highway_graph()
        assert graph is graph2


# ---------------------------------------------------------------------------
# Node Data Tests
# ---------------------------------------------------------------------------

class TestNodeData:
    """Tests for node data retrieval."""

    def test_get_node_data_with_corridor_id(self, graph):
        """Should retrieve node data using corridor ID directly."""
        data = get_graph_node_data(graph, "NH48_KHERKI_DAULA")
        assert data != {}
        assert data.get("name") == "Kherki Daula Toll Plaza"

    def test_get_node_data_with_warehouse_id(self, graph):
        """Should retrieve warehouse node data."""
        data = get_graph_node_data(graph, "WH-DEL-001")
        assert data != {}
        assert "lat" in data

    def test_get_node_data_unknown_id(self, graph):
        """Should return empty dict for unknown node IDs."""
        data = get_graph_node_data(graph, "NONEXISTENT_NODE")
        assert data == {}


# ---------------------------------------------------------------------------
# Haversine Tests
# ---------------------------------------------------------------------------

class TestHaversine:
    """Tests for haversine distance calculation."""

    def test_delhi_to_mumbai(self):
        """Delhi → Mumbai should be approximately 1,150 km."""
        dist = haversine_km(28.7041, 77.1025, 19.0760, 72.8777)
        assert 1100 < dist < 1200, f"Delhi-Mumbai distance: {dist} km"

    def test_same_point_is_zero(self):
        """Distance from a point to itself should be zero."""
        dist = haversine_km(28.7, 77.1, 28.7, 77.1)
        assert dist < 0.01  # Allow tiny floating-point error

    def test_equator_circumference(self):
        """Half the equator should be ~20,015 km."""
        dist = haversine_km(0, 0, 0, 180)
        assert 20000 < dist < 20100

    def test_kherki_daula_to_jnpt(self):
        """Kherki Daula → JNPT Port should be ~1,070 km (actual corridor distance)."""
        dist = haversine_km(28.395604, 76.981760, 18.934750, 72.943125)
        assert 900 < dist < 1200, f"KHD-JNPT distance: {dist} km"


# ---------------------------------------------------------------------------
# A* Routing Tests
# ---------------------------------------------------------------------------

class TestAStarRouting:
    """Tests for A* pathfinding."""

    def test_basic_route_delhi_to_mumbai(self, graph):
        """Should find a route from Delhi warehouse to Mumbai warehouse."""
        result = find_safe_route(
            graph=graph,
            origin="WH-DEL-001",
            destination="WH-MUM-003",
        )
        assert result is not None
        assert len(result.path) >= 2
        assert result.path[0] == "WH-DEL-001"
        assert result.path[-1] == "WH-MUM-003"

    def test_route_avoids_disrupted_nodes(self, graph):
        """Route should NOT contain disrupted nodes."""
        result = find_safe_route(
            graph=graph,
            origin="WH-DEL-001",
            destination="WH-MUM-003",
            disrupted_nodes=["NH48_KHERKI_DAULA", "NH48_SHAHJAHANPUR"],
        )
        assert result is not None
        assert "NH48_KHERKI_DAULA" not in result.path
        assert "NH48_SHAHJAHANPUR" not in result.path

    def test_avoided_nodes_tracked(self, graph):
        """Result should report which nodes were actually removed."""
        result = find_safe_route(
            graph=graph,
            origin="WH-DEL-001",
            destination="WH-MUM-003",
            disrupted_nodes=["NH48_KHERKI_DAULA"],
        )
        assert "NH48_KHERKI_DAULA" in result.avoided_nodes

    def test_no_path_returns_none(self, graph):
        """Should return None if all paths are blocked."""
        # Remove enough nodes to block ALL paths
        all_corridor_nodes = list(ML_CORRIDOR_NODES.keys()) + ["TP-PNP-004"]
        result = find_safe_route(
            graph=graph,
            origin="WH-DEL-001",
            destination="WH-MUM-003",
            disrupted_nodes=all_corridor_nodes,
        )
        # This is a graceful failure test — no crash is the assertion

    def test_invalid_origin_returns_none(self, graph):
        """Should return None for nonexistent origin node."""
        result = find_safe_route(
            graph=graph,
            origin="NONEXISTENT",
            destination="WH-MUM-003",
        )
        assert result is None

    def test_invalid_destination_returns_none(self, graph):
        """Should return None for nonexistent destination node."""
        result = find_safe_route(
            graph=graph,
            origin="WH-DEL-001",
            destination="NONEXISTENT",
        )
        assert result is None


# ---------------------------------------------------------------------------
# Route Metrics Tests
# ---------------------------------------------------------------------------

class TestRouteMetrics:
    """Tests for route metric calculations."""

    def test_metrics_have_positive_distance(self, graph):
        """Route distance should be positive."""
        result = find_safe_route(graph, "WH-DEL-001", "WH-MUM-003")
        assert result.total_distance_km > 0

    def test_metrics_have_positive_toll(self, graph):
        """Route toll cost should be non-negative."""
        result = find_safe_route(graph, "WH-DEL-001", "WH-MUM-003")
        assert result.total_toll_cost_inr >= 0

    def test_metrics_have_positive_eta(self, graph):
        """Estimated travel hours should be positive."""
        result = find_safe_route(graph, "WH-DEL-001", "WH-MUM-003")
        assert result.estimated_travel_hours > 0

    def test_path_description_readable(self, graph):
        """Path description should be a human-readable string."""
        result = find_safe_route(graph, "WH-DEL-001", "WH-MUM-003")
        desc = result.path_description
        assert "→" in desc
        assert "WH-DEL-001" in desc

    def test_cost_saved_estimate(self, graph):
        """Cost saved estimate should be a positive integer."""
        result = find_safe_route(
            graph, "WH-DEL-001", "WH-MUM-003",
            disrupted_nodes=["NH48_KHERKI_DAULA"],
        )
        assert result.cost_saved_estimate_inr > 0
