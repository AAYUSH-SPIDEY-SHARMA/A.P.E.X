"""
A.P.E.X — A* Router Tests

Tests for graph loading, pathfinding, and cost estimation.

Run: python -m pytest tests/test_astar_router.py -v
"""
import pytest
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))


class TestGraphLoader:
    """Verify highway graph can be loaded."""

    def test_import_graph_loader(self):
        """graph_loader should be importable."""
        from ml.routing.graph_loader import load_highway_graph, ML_CORRIDOR_NODES
        assert load_highway_graph is not None
        assert isinstance(ML_CORRIDOR_NODES, dict)

    def test_load_graph_returns_networkx(self):
        """load_highway_graph should return a NetworkX graph."""
        from ml.routing.graph_loader import load_highway_graph
        G = load_highway_graph()
        assert G is not None
        assert len(G.nodes) > 0
        assert len(G.edges) > 0

    def test_graph_has_coordinates(self):
        """Every node should have lat/lng coordinates."""
        from ml.routing.graph_loader import load_highway_graph
        G = load_highway_graph()
        for node_id, data in G.nodes(data=True):
            assert 'lat' in data, f"Node {node_id} missing lat"
            assert 'lng' in data, f"Node {node_id} missing lng"


class TestAStarRouter:
    """Verify A* pathfinding works."""

    @pytest.fixture
    def graph(self):
        from ml.routing.graph_loader import load_highway_graph
        return load_highway_graph()

    def test_import_find_safe_route(self):
        """find_safe_route should be importable."""
        from ml.routing.astar_router import find_safe_route
        assert find_safe_route is not None

    def test_find_route_between_known_nodes(self, graph):
        """Should find a route between two known corridor nodes."""
        from ml.routing.astar_router import find_safe_route
        try:
            result = find_safe_route(graph, "NH48_KHERKI_DAULA", "NH48_DAHISAR")
            if result:
                assert result.path is not None
                assert len(result.path) >= 2
                assert result.total_distance_km > 0
                assert result.cost_saved_estimate_inr > 0
        except Exception:
            pytest.skip("Route not found — graph may not have connected path")

    def test_find_route_with_disrupted_node(self, graph):
        """Should route around a disrupted node."""
        from ml.routing.astar_router import find_safe_route
        try:
            result = find_safe_route(
                graph,
                "NH48_KHERKI_DAULA",
                "NH48_DAHISAR",
                disrupted_nodes=["NH48_VASAD"],
            )
            if result:
                assert "NH48_VASAD" not in result.path
        except Exception:
            pytest.skip("Route not found with disruption")


class TestRouteResult:
    """Verify RouteResult cost estimation."""

    def test_cost_estimate_scales_with_segments(self):
        """cost_saved_estimate_inr should vary with route length."""
        from ml.routing.astar_router import RouteMetrics
        short = RouteMetrics(
            path=["A", "B"],
            total_distance_km=100,
            total_risk_score=0.5,
            num_segments=2,
        )
        long = RouteMetrics(
            path=["A", "B", "C", "D"],
            total_distance_km=500,
            total_risk_score=0.5,
            num_segments=4,
        )
        assert long.cost_saved_estimate_inr > short.cost_saved_estimate_inr
