"""
A.P.E.X — Weighted A* Routing Engine

Implements India-specific A* search over the highway network graph,
with a multi-objective edge cost function and haversine-based heuristic.

Cost function (Blueprint S13.2):
    f(n) = g(n) + h(n)
    where:
        g(n) = Σ [α·distanceKm + β·riskScore·100 + γ·ASI·0.5 + δ·tollCostINR/100]
        h(n) = haversine(current_node, destination)  [admissible heuristic]

Key design decisions:
    - Uses NetworkX's built-in astar_path() for correctness guarantees
    - Custom weight function combines distance, risk, accident severity, and toll
    - Disrupted nodes are removed from graph copy (not mutated)
    - Haversine heuristic is admissible (straight-line ≤ road distance always)

Blueprint References:
    - S7.2:  Haversine formula
    - S13.2: Custom A* heuristic design
    - S13.4: Dynamic rerouting pseudocode
"""

import logging
import math
from dataclasses import dataclass, field
from typing import Optional

import networkx as nx



logger = logging.getLogger("apex.routing.astar")

# ---------------------------------------------------------------------------
# A* Weight Coefficients
# ---------------------------------------------------------------------------
# These control the relative importance of each factor in the edge cost.
# Tuned for Indian highway logistics: distance dominates, but risk + accidents
# should discourage dangerous segments even if they're shorter.
# ---------------------------------------------------------------------------

WEIGHT_DISTANCE: float = 1.0       # α — km contribute directly
WEIGHT_RISK: float = 80.0          # β — risk score (0-1) scaled to ~80km equivalent
WEIGHT_ASI: float = 0.4            # γ — accident severity index (0-100) scaled
WEIGHT_TOLL: float = 0.01          # δ — toll cost in INR, minor factor

# Default values when edge attributes are missing
DEFAULT_DISTANCE_KM: float = 100.0
DEFAULT_RISK_SCORE: float = 0.3
DEFAULT_ASI: float = 40.0
DEFAULT_TOLL_COST_INR: float = 200.0
DEFAULT_FREE_FLOW_SPEED_KMH: float = 60.0


# ---------------------------------------------------------------------------
# Haversine Utilities
# ---------------------------------------------------------------------------

def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """
    Great-circle distance between two GPS coordinates in kilometers.

    Uses the Haversine formula (Blueprint S7.2). This is an admissible
    heuristic for A* because straight-line distance ≤ road distance always.

    Args:
        lat1, lng1: Coordinates of point 1 (decimal degrees).
        lat2, lng2: Coordinates of point 2 (decimal degrees).

    Returns:
        Distance in kilometers.
    """
    R = 6371.0  # Earth's mean radius in km

    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lng2 - lng1)

    a = (
        math.sin(delta_phi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return R * c


def _haversine_heuristic(graph: nx.Graph, target: str):
    """
    Factory that returns an A* heuristic function for a given target node.

    The returned function h(u, v) computes haversine distance from node u
    to the target. It gracefully handles missing coordinates by returning 0
    (which makes A* degrade to Dijkstra — still correct, just slower).

    Args:
        graph:  The highway graph (needs lat/lng on nodes).
        target: The destination node ID.

    Returns:
        Callable(u, v) -> float suitable for nx.astar_path heuristic param.
    """
    target_data = graph.nodes.get(target, {})
    target_lat = target_data.get("lat")
    target_lng = target_data.get("lng")

    def heuristic(u: str, v: str) -> float:
        """Haversine distance from u to target (admissible A* heuristic)."""
        if target_lat is None or target_lng is None:
            return 0.0  # Degrade to Dijkstra if target has no coords

        u_data = graph.nodes.get(u, {})
        u_lat = u_data.get("lat")
        u_lng = u_data.get("lng")

        if u_lat is None or u_lng is None:
            return 0.0  # Safe fallback

        return haversine_km(u_lat, u_lng, target_lat, target_lng)

    return heuristic


# ---------------------------------------------------------------------------
# Edge Cost Function
# ---------------------------------------------------------------------------

def _custom_edge_weight(u: str, v: str, edge_data: dict) -> float:
    """
    Multi-objective edge cost for A* search (Blueprint S13.2).

    Combines four factors:
        1. Physical distance (km) — dominating factor
        2. Risk score (0-1) — from historical incident data
        3. Accident Severity Index (0-100) — penalizes dangerous segments
        4. Toll cost (INR) — minor factor, but relevant for cost optimization

    Args:
        u:         Source node ID.
        v:         Target node ID.
        edge_data: NetworkX edge attribute dictionary.

    Returns:
        Combined edge cost (dimensionless, lower is better).
    """
    distance = edge_data.get("distanceKm", DEFAULT_DISTANCE_KM)
    risk = edge_data.get("riskScore", DEFAULT_RISK_SCORE)
    asi = edge_data.get("accidentSeverityIndex", DEFAULT_ASI)
    toll = edge_data.get("tollCostINR", DEFAULT_TOLL_COST_INR)

    cost = (
        WEIGHT_DISTANCE * distance
        + WEIGHT_RISK * risk
        + WEIGHT_ASI * asi
        + WEIGHT_TOLL * toll
    )

    return cost


# ---------------------------------------------------------------------------
# Route Metrics
# ---------------------------------------------------------------------------

@dataclass
class RouteMetrics:
    """Computed metrics for a route through the highway network."""
    path: list[str]
    total_distance_km: float = 0.0
    total_toll_cost_inr: float = 0.0
    total_risk_score: float = 0.0
    estimated_travel_hours: float = 0.0
    num_segments: int = 0
    avoided_nodes: list[str] = field(default_factory=list)

    @property
    def path_description(self) -> str:
        """Human-readable route description for alerts."""
        return " → ".join(self.path)

    @property
    def cost_saved_estimate_inr(self) -> int:
        """
        Estimated demurrage cost saved by rerouting.

        Industry benchmark: ₹1,200/hour/truck average demurrage cost
        in Indian logistics (AITD report 2024). Estimation uses:
          - trucks_affected: proportional to route segments (longer route = more trucks)
          - delay_hours: derived from cumulative risk score on the disrupted path
          - cost_per_hour: ₹1,200 (AITD 2024 national average)
        """
        # Trucks affected scales with route length: ~4 trucks per segment on NH-48
        trucks_affected = max(4, self.num_segments * 4)
        # Delay hours from cumulative risk + distance penalty
        avg_delay_hours = max(1.5, self.total_risk_score * 8 + self.total_distance_km / 500)
        cost_per_hour = 1200  # INR per truck per hour (AITD 2024)

        return int(trucks_affected * avg_delay_hours * cost_per_hour)


def calculate_route_metrics(graph: nx.Graph, path: list[str]) -> RouteMetrics:
    """
    Calculate aggregate metrics for a given route path.

    Args:
        graph: The highway graph.
        path:  Ordered list of node IDs forming the route.

    Returns:
        RouteMetrics with distance, toll, risk, ETA, and segment count.
    """
    metrics = RouteMetrics(path=path, num_segments=len(path) - 1)

    for i in range(len(path) - 1):
        edge_data = graph.get_edge_data(path[i], path[i + 1])
        if edge_data is None:
            logger.warning(f"No edge data between {path[i]} → {path[i+1]}")
            continue

        metrics.total_distance_km += edge_data.get("distanceKm", DEFAULT_DISTANCE_KM)
        metrics.total_toll_cost_inr += edge_data.get("tollCostINR", DEFAULT_TOLL_COST_INR)
        metrics.total_risk_score += edge_data.get("riskScore", DEFAULT_RISK_SCORE)

        # ETA: distance / free-flow speed for this segment
        speed = edge_data.get("freeFlowSpeedKmh", DEFAULT_FREE_FLOW_SPEED_KMH)
        distance = edge_data.get("distanceKm", DEFAULT_DISTANCE_KM)
        metrics.estimated_travel_hours += distance / max(speed, 1.0)

    # Round for cleanliness
    metrics.total_distance_km = round(metrics.total_distance_km, 1)
    metrics.total_toll_cost_inr = round(metrics.total_toll_cost_inr, 0)
    metrics.total_risk_score = round(metrics.total_risk_score, 3)
    metrics.estimated_travel_hours = round(metrics.estimated_travel_hours, 2)

    return metrics


# ---------------------------------------------------------------------------
# Core A* Routing
# ---------------------------------------------------------------------------




def find_safe_route(
    graph: nx.Graph,
    origin: str = "WH-DEL-001",
    destination: str = "WH-MUM-003",
    disrupted_nodes: Optional[list[str]] = None,
) -> Optional[RouteMetrics]:
    """
    Find optimal route avoiding disrupted nodes using A* search.

    Creates a copy of the graph with disrupted nodes removed, then runs
    NetworkX's A* with a haversine heuristic and custom edge weights.

    Args:
        graph:           The loaded highway graph.
        origin:          Starting node ID (graph or synthetic ID).
        destination:     Ending node ID (graph or synthetic ID).
        disrupted_nodes: List of node IDs to avoid (graph or synthetic IDs).
                         Defaults to empty list.

    Returns:
        RouteMetrics if a path exists, None if no path found.

    Example:
        >>> graph = load_highway_graph()
        >>> result = find_safe_route(
        ...     graph,
        ...     origin="WH-DEL-001",
        ...     destination="WH-MUM-003",
        ...     disrupted_nodes=["NH48_KHERKI_DAULA", "NH48_SHAHJAHANPUR"]
        ... )
        >>> print(result.path_description)
        "WH-DEL-001 → ... → WH-MUM-003"
    """
    if disrupted_nodes is None:
        disrupted_nodes = []

    # Create safe subgraph — NEVER mutate the original
    safe_graph = graph.copy()
    removed_nodes = []
    for node_id in disrupted_nodes:
        if node_id in safe_graph:
            safe_graph.remove_node(node_id)
            removed_nodes.append(node_id)
            logger.info(f"Removed disrupted node from graph: {node_id}")
        else:
            logger.warning(f"Disrupted node '{node_id}' not found in graph — skipping")

    # Validate origin and destination exist in safe graph
    if origin not in safe_graph:
        logger.error(f"Origin '{origin}' not in graph (was it removed as disrupted?)")
        return None

    if destination not in safe_graph:
        logger.error(f"Destination '{destination}' not in graph (was it removed as disrupted?)")
        return None

    # Run A* search
    try:
        path = nx.astar_path(
            safe_graph,
            origin,
            destination,
            heuristic=_haversine_heuristic(safe_graph, destination),
            weight=_custom_edge_weight,
        )
    except nx.NetworkXNoPath:
        logger.warning(
            f"No path found from {origin} → {destination} "
            f"(avoiding {removed_nodes})"
        )
        return None
    except nx.NodeNotFound as e:
        logger.error(f"Node not found in graph: {e}")
        return None

    # Calculate metrics for the found route
    metrics = calculate_route_metrics(safe_graph, path)
    metrics.avoided_nodes = removed_nodes

    logger.info(
        f"Route found: {metrics.path_description} | "
        f"{metrics.total_distance_km} km | "
        f"₹{metrics.total_toll_cost_inr} toll | "
        f"~{metrics.estimated_travel_hours}h ETA"
    )

    return metrics
