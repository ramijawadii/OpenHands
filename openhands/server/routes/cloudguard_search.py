"""CloudGuard log / volume search API — backed by a self-hosted OpenSearch cluster.

OpenSearch is a SERVER-SIDE engine; the browser never talks to it directly (that would expose
the cluster). The SPA calls this tenant-scoped route, which queries OpenSearch with the app's
service credentials and filters every query to the caller's tenant.

Config (env):
  OPENSEARCH_URL            e.g. https://opensearch:9200   (unset → route returns 503 "not configured")
  OPENSEARCH_USER / OPENSEARCH_PASSWORD
  OPENSEARCH_LOGS_INDEX     default "cloudguard-logs-*"
  OPENSEARCH_VERIFY_CERTS   "1"/"0" (default "0" for self-host with the bundled demo certs)

Graceful by design: if `opensearchpy` isn't installed or the cluster is unreachable, endpoints
return 503 with a clear message instead of crashing the app.
"""

from __future__ import annotations

import os
import time

from fastapi import APIRouter, Depends, HTTPException, Query

from openhands.server.routes.cloudguard_principal import require_cap

router = APIRouter(prefix="/api/cloudguard/search")

_CLIENT = None
_CLIENT_KEY: tuple | None = None


def _config() -> dict:
    return {
        "url": os.environ.get("OPENSEARCH_URL", "").strip(),
        "user": os.environ.get("OPENSEARCH_USER", "admin"),
        "password": os.environ.get("OPENSEARCH_PASSWORD", "admin"),
        "index": os.environ.get("OPENSEARCH_LOGS_INDEX", "cloudguard-logs-*"),
        "verify": os.environ.get("OPENSEARCH_VERIFY_CERTS", "0") in ("1", "true", "True"),
    }


def _client():
    """Lazily build + cache the OpenSearch client; re-build if the config changed."""
    global _CLIENT, _CLIENT_KEY
    cfg = _config()
    if not cfg["url"]:
        raise HTTPException(
            status_code=503,
            detail="log search not configured (set OPENSEARCH_URL)",
        )
    key = (cfg["url"], cfg["user"], cfg["verify"])
    if _CLIENT is not None and _CLIENT_KEY == key:
        return _CLIENT
    try:
        from opensearchpy import OpenSearch
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=503,
            detail=f"opensearch client unavailable: {exc} (pip install opensearch-py)",
        ) from exc
    _CLIENT = OpenSearch(
        hosts=[cfg["url"]],
        http_auth=(cfg["user"], cfg["password"]),
        use_ssl=cfg["url"].startswith("https"),
        verify_certs=cfg["verify"],
        ssl_show_warn=False,
        timeout=10,
        max_retries=2,
        retry_on_timeout=True,
    )
    _CLIENT_KEY = key
    return _CLIENT


def _tenant_id() -> str:
    """Server-side tenant resolution (never trusted from the request body/params)."""
    try:
        import importlib

        return importlib.import_module("cloudguard.tenancy").resolve_tenant_id()
    except Exception:  # noqa: BLE001
        return "default"


@router.get("/health")
async def health(_p=Depends(require_cap("read"))):
    """Connectivity probe for the OpenSearch backend (used by the admin status surface)."""
    cfg = _config()
    if not cfg["url"]:
        return {"configured": False, "ok": False, "detail": "OPENSEARCH_URL not set"}
    try:
        info = _client().info()
        return {
            "configured": True,
            "ok": True,
            "cluster": info.get("cluster_name"),
            "version": info.get("version", {}).get("number"),
            "index": cfg["index"],
        }
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        return {"configured": True, "ok": False, "detail": str(exc)}


@router.get("/logs")
async def search_logs(
    q: str = Query("", description="full-text query (empty = recent)"),
    size: int = Query(25, ge=1, le=100),
    offset: int = Query(0, ge=0, alias="from"),
    stream: str = Query("", description="optional stream/source filter"),
    since: str = Query("now-7d", description="time window lower bound (date-math)"),
    _p=Depends(require_cap("read")),
):
    """Tenant-scoped log / volume search over the OpenSearch logs index.

    Returns hits + total + a `stream` facet for the result set. Every query is hard-filtered to
    the caller's tenant_id, so one tenant can never read another's logs.
    """
    cfg = _config()
    client = _client()
    tenant = _tenant_id()

    must: list = [{"term": {"tenant_id": tenant}}]
    if q.strip():
        must.append(
            {
                "simple_query_string": {
                    "query": q,
                    "fields": ["message^3", "stream", "actor", "resource", "*"],
                    "default_operator": "and",
                }
            }
        )
    if stream.strip():
        must.append({"term": {"stream": stream}})
    body = {
        "size": size,
        "from": offset,
        "track_total_hits": True,
        "sort": [{"@timestamp": {"order": "desc"}}],
        "query": {
            "bool": {
                "must": must,
                "filter": [{"range": {"@timestamp": {"gte": since}}}],
            }
        },
        "aggs": {"stream": {"terms": {"field": "stream", "size": 12}}},
    }
    started = time.time()
    try:
        res = client.search(index=cfg["index"], body=body)
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"opensearch query failed: {exc}") from exc

    hits = [
        {"id": h.get("_id"), "score": h.get("_score"), **(h.get("_source") or {})}
        for h in res.get("hits", {}).get("hits", [])
    ]
    total = res.get("hits", {}).get("total", {})
    facet = {
        b["key"]: b["doc_count"]
        for b in res.get("aggregations", {}).get("stream", {}).get("buckets", [])
    }
    return {
        "total": total.get("value", len(hits)) if isinstance(total, dict) else total,
        "took_ms": int((time.time() - started) * 1000),
        "tenant_id": tenant,
        "hits": hits,
        "facets": {"stream": facet},
    }
