"""
A.P.E.X — Real-Time Weather Service

Fetches live weather data for the 7 NH-48 corridor nodes from OpenWeatherMap.
Converts rain + wind into a unified severity score (0.0–1.0) for ML inference.

Uses OpenWeatherMap Free API (1000 calls/day, 7 nodes × 1/min = 420/day = fine).

Blueprint Reference: S7.10 (weather severity as ML feature)
"""

import asyncio
import logging
from typing import Dict

logger = logging.getLogger("apex.weather")

# 7 corridor node GPS locations (from highway_graph.json)
CORRIDOR_LOCATIONS: Dict[str, tuple] = {
    "NH48_KHERKI_DAULA": (28.3956, 76.9818),
    "NH48_SHAHJAHANPUR": (27.9998, 76.4305),
    "NH48_THIKARIYA":    (26.8433, 75.6156),
    "NH48_VASAD":        (22.4533, 73.0705),
    "NH48_KARJAN":       (22.0148, 73.1154),
    "NH48_DAHISAR":      (19.2606, 72.8728),
    "NH48_JNPT_PORT":    (18.9348, 72.9431),
}

# Cache: node_id → weather_severity (0.0–1.0)
_weather_cache: Dict[str, float] = {}
_last_fetch_time: float = 0.0
_fetch_count: int = 0


def _rain_to_severity(rain_mm_3h: float, wind_speed_kmh: float, visibility_m: float = 10000) -> float:
    """
    Convert raw weather metrics into a unified 0–1 severity score.

    Scoring:
      - Rain: 50mm/3h = max severity (monsoon conditions on NH-48)
      - Wind: 80 km/h = max severity (truck rollover risk)
      - Visibility: < 200m = max severity (dense fog on Rajasthan stretch)

    Weights: rain 50%, wind 25%, visibility 25%
    """
    rain_score = min(rain_mm_3h / 50.0, 1.0)
    wind_score = min(wind_speed_kmh / 80.0, 1.0)
    vis_score = max(0, 1.0 - (visibility_m / 10000.0))
    return round(min(rain_score * 0.50 + wind_score * 0.25 + vis_score * 0.25, 1.0), 3)


async def fetch_weather(api_key: str) -> Dict[str, float]:
    """
    Fetch live weather for all 7 corridor nodes from OpenWeatherMap.

    Returns: { node_id → severity_score }
    """
    import httpx

    global _last_fetch_time, _fetch_count

    if not api_key:
        logger.warning("[WEATHER] No API key configured — using defaults")
        return {}

    import time
    _last_fetch_time = time.time()
    _fetch_count += 1

    async with httpx.AsyncClient(timeout=10.0) as client:
        for node_id, (lat, lng) in CORRIDOR_LOCATIONS.items():
            try:
                resp = await client.get(
                    "https://api.openweathermap.org/data/2.5/weather",
                    params={
                        "lat": lat,
                        "lon": lng,
                        "appid": api_key,
                        "units": "metric",
                    },
                )
                if resp.status_code == 200:
                    data = resp.json()
                    rain = data.get("rain", {}).get("3h", 0.0) or data.get("rain", {}).get("1h", 0.0)
                    wind = (data.get("wind", {}).get("speed", 0.0)) * 3.6  # m/s → km/h
                    visibility = data.get("visibility", 10000)
                    weather_main = data.get("weather", [{}])[0].get("main", "Clear")

                    severity = _rain_to_severity(rain, wind, visibility)
                    _weather_cache[node_id] = severity

                    logger.debug(
                        f"[WEATHER] {node_id}: {weather_main} rain={rain}mm "
                        f"wind={wind:.0f}kmh vis={visibility}m → severity={severity}"
                    )
                elif resp.status_code == 401:
                    logger.error("[WEATHER] Invalid API key — check OPENWEATHER_API_KEY")
                    break
                else:
                    logger.warning(f"[WEATHER] HTTP {resp.status_code} for {node_id}")

            except Exception as e:
                logger.warning(f"[WEATHER] Failed for {node_id}: {e}")

    logger.info(
        f"[WEATHER] Fetch #{_fetch_count} complete — "
        f"{len(_weather_cache)}/7 nodes updated: "
        f"avg_severity={sum(_weather_cache.values()) / max(len(_weather_cache), 1):.3f}"
    )
    return _weather_cache.copy()


def get_weather_cache() -> Dict[str, float]:
    """Return current cached weather data."""
    return _weather_cache.copy()


def get_weather_stats() -> dict:
    """Return weather service stats for /weather endpoint."""
    return {
        "nodes": _weather_cache.copy(),
        "fetch_count": _fetch_count,
        "last_fetch_time": _last_fetch_time,
        "nodes_covered": len(_weather_cache),
        "avg_severity": round(
            sum(_weather_cache.values()) / max(len(_weather_cache), 1), 3
        ),
    }
