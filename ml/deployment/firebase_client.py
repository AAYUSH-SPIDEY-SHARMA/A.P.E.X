"""
A.P.E.X — Async Firebase RTDB Client

Lightweight REST-based client for Firebase Realtime Database.
Uses httpx for async HTTP with connection pooling, retry logic,
and exponential backoff.

This avoids the heavyweight firebase-admin SDK dependency — the REST
API is sufficient for our write-heavy use case (anomalies, alerts,
route updates).

Firebase RTDB REST API:
    PUT    /{path}.json  — Write (overwrite)
    PATCH  /{path}.json  — Update (merge)
    GET    /{path}.json  — Read
    DELETE /{path}.json  — Delete

Paths used by ML Agent (from shared/firebase-contract.json):
    - supply_chain/anomalies/<anomaly_id>    (WRITE by ML Agent)
    - supply_chain/alerts/<alert_id>         (WRITE by ML Agent)
    - supply_chain/active_routes/<route_id>  (UPDATE by ML Agent)
    - supply_chain/nodes/<node_id>           (READ — written by Member 1)
"""

import asyncio
import json
import logging
from typing import Any, Optional

import httpx

logger = logging.getLogger("apex.firebase_client")

# ---------------------------------------------------------------------------
# Retry Configuration
# ---------------------------------------------------------------------------
MAX_RETRIES: int = 3
BASE_BACKOFF_SECONDS: float = 0.5      # 0.5s → 1s → 2s
REQUEST_TIMEOUT_SECONDS: float = 10.0


class FirebaseClient:
    """
    Async Firebase Realtime Database client using REST API.

    Features:
        - Async connection pooling via httpx.AsyncClient
        - Retry with exponential backoff on transient failures
        - Graceful degradation (logs errors, doesn't crash the service)
        - Support for both emulator and production Firebase URLs

    Usage:
        >>> client = FirebaseClient("https://your-project.firebaseio.com")
        >>> await client.write("supply_chain/anomalies/a1", {"type": "MONSOON"})
        >>> data = await client.read("supply_chain/nodes/TP-KHD-001")
        >>> await client.close()
    """

    def __init__(self, database_url: str, enabled: bool = True):
        """
        Initialize the Firebase client.

        Args:
            database_url: Firebase RTDB URL (e.g., https://project.firebaseio.com
                          or http://127.0.0.1:9000 for emulator).
            enabled:      If False, all operations are no-ops (for local dev
                          without Firebase).
        """
        # Strip trailing slash for consistent URL construction
        self._base_url = database_url.rstrip("/")
        self._enabled = enabled
        self._client: Optional[httpx.AsyncClient] = None

        if not enabled:
            logger.info("Firebase client DISABLED — all writes will be no-ops")
        else:
            logger.info(f"Firebase client initialized: {self._base_url}")

    async def _get_client(self) -> httpx.AsyncClient:
        """Lazy-initialize the async HTTP client with connection pooling."""
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                timeout=httpx.Timeout(REQUEST_TIMEOUT_SECONDS),
                limits=httpx.Limits(
                    max_connections=20,
                    max_keepalive_connections=10,
                ),
            )
        return self._client

    async def close(self) -> None:
        """Close the HTTP client and release connections."""
        if self._client and not self._client.is_closed:
            await self._client.aclose()
            logger.debug("Firebase HTTP client closed")

    def _build_url(self, path: str) -> str:
        """Build full Firebase URL: {base}/{path}.json"""
        # Normalize path — strip leading/trailing slashes
        clean_path = path.strip("/")
        return f"{self._base_url}/{clean_path}.json"

    async def _request_with_retry(
        self,
        method: str,
        url: str,
        data: Optional[dict] = None,
    ) -> Optional[Any]:
        """
        Execute an HTTP request with exponential backoff retry.

        Args:
            method: HTTP method (PUT, PATCH, GET, DELETE).
            url:    Full Firebase URL.
            data:   JSON payload for PUT/PATCH.

        Returns:
            Parsed JSON response, or None on failure.
        """
        client = await self._get_client()

        for attempt in range(MAX_RETRIES):
            try:
                if method == "GET":
                    response = await client.get(url)
                elif method == "DELETE":
                    response = await client.delete(url)
                elif method == "PUT":
                    response = await client.put(url, json=data)
                elif method == "PATCH":
                    response = await client.patch(url, json=data)
                else:
                    raise ValueError(f"Unsupported HTTP method: {method}")

                # Firebase returns 200 for success, 401 for auth errors, etc.
                if response.status_code == 200:
                    return response.json()
                elif response.status_code == 401:
                    logger.error(f"Firebase auth error (401) on {method} {url}")
                    return None  # Don't retry auth errors
                else:
                    logger.warning(
                        f"Firebase {method} {url} returned {response.status_code} "
                        f"(attempt {attempt + 1}/{MAX_RETRIES})"
                    )

            except httpx.TimeoutException:
                logger.warning(
                    f"Firebase timeout on {method} {url} "
                    f"(attempt {attempt + 1}/{MAX_RETRIES})"
                )
            except httpx.ConnectError:
                logger.warning(
                    f"Firebase connection refused on {method} {url} "
                    f"(attempt {attempt + 1}/{MAX_RETRIES}) — is Firebase running?"
                )
            except Exception as e:
                logger.error(
                    f"Firebase unexpected error on {method} {url}: {e} "
                    f"(attempt {attempt + 1}/{MAX_RETRIES})"
                )

            # Exponential backoff before retry
            if attempt < MAX_RETRIES - 1:
                backoff = BASE_BACKOFF_SECONDS * (2 ** attempt)
                await asyncio.sleep(backoff)

        logger.error(f"Firebase {method} {url} FAILED after {MAX_RETRIES} retries")
        return None

    # -----------------------------------------------------------------
    # Public API
    # -----------------------------------------------------------------

    async def write(self, path: str, data: dict) -> bool:
        """
        Write (overwrite) data at the specified Firebase path.

        Uses HTTP PUT — completely replaces data at path.
        Maps to Firebase contract paths like:
            supply_chain/anomalies/<anomaly_id>

        Args:
            path: Firebase RTDB path (without .json extension).
            data: JSON-serializable dictionary to write.

        Returns:
            True if write succeeded, False otherwise.
        """
        if not self._enabled:
            logger.debug(f"[DRY-RUN] Firebase write: {path} → {json.dumps(data)[:100]}...")
            return True

        url = self._build_url(path)
        result = await self._request_with_retry("PUT", url, data)

        if result is not None:
            logger.info(f"✅ Firebase WRITE: {path}")
            return True
        return False

    async def update(self, path: str, data: dict) -> bool:
        """
        Update (merge) data at the specified Firebase path.

        Uses HTTP PATCH — merges with existing data instead of overwriting.
        Used for updating route status without clobbering other fields.

        Args:
            path: Firebase RTDB path.
            data: Fields to merge into existing record.

        Returns:
            True if update succeeded, False otherwise.
        """
        if not self._enabled:
            logger.debug(f"[DRY-RUN] Firebase update: {path} → {json.dumps(data)[:100]}...")
            return True

        url = self._build_url(path)
        result = await self._request_with_retry("PATCH", url, data)

        if result is not None:
            logger.info(f"✅ Firebase UPDATE: {path}")
            return True
        return False

    async def read(self, path: str) -> Optional[dict]:
        """
        Read data from the specified Firebase path.

        Args:
            path: Firebase RTDB path.

        Returns:
            Parsed JSON dict, or None if read failed / path doesn't exist.
        """
        if not self._enabled:
            logger.debug(f"[DRY-RUN] Firebase read: {path}")
            return None

        url = self._build_url(path)
        return await self._request_with_retry("GET", url)

    async def delete(self, path: str) -> bool:
        """
        Delete data at the specified Firebase path.

        Args:
            path: Firebase RTDB path.

        Returns:
            True if delete succeeded, False otherwise.
        """
        if not self._enabled:
            logger.debug(f"[DRY-RUN] Firebase delete: {path}")
            return True

        url = self._build_url(path)
        result = await self._request_with_retry("DELETE", url)
        return result is not None
