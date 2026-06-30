"""CloudGuard log/volume search + client-search index payload — extreme-isolation hardened.

Backed by a self-hosted OpenSearch cluster. OpenSearch is SERVER-SIDE; the browser never talks to it
directly. This route is the only path in, and it enforces tenant isolation in **two independent
layers** (defense-in-depth, security-vendor bar):

  Layer 1 (app):   every query is hard-filtered to the principal's tenant_id and targets only that
                   tenant's index (silo `tenant-logs-<tid>-*`); fail-closed; field allow-list; caps.
  Layer 2 (infra): in jwt auth mode the app passes a short-lived tenant-scoped JWT (token broker),
                   and OpenSearch FGAC maps it to a templated role `tenant-logs-${attr.jwt.tenant_id}-*`
                   that the engine refuses to cross — even if Layer 1 has a bug.

Plan: docs/security/extreme-isolation/search-novu-orama-plan.md (O0/O1/O2 + R1).

Env (see the plan / deploy/opensearch):
  OPENSEARCH_URL, OPENSEARCH_USER, OPENSEARCH_PASSWORD   (basic mode = dev only)
  OPENSEARCH_AUTH_MODE   "basic" (default) | "jwt"        (jwt = production, drops admin)
  OPENSEARCH_INDEX_MODE  "silo" (default) | "pooled"
  OPENSEARCH_LOGS_INDEX  pooled-mode index, default "cloudguard-logs-*"
  OPENSEARCH_VERIFY_CERTS, OPENSEARCH_MAX_WINDOW (default 1000), OPENSEARCH_RPS (per-tenant, default 5)
"""

from __future__ import annotations

import importlib
import os
import threading
import time

from fastapi import APIRouter, Depends, HTTPException, Query

from openhands.server.routes.cloudguard_principal import require_cap

router = APIRouter(prefix="/api/cloudguard/search")

# Searchable fields are an explicit ALLOW-LIST — never "*" (no scanning unknown/sensitive fields).
_SEARCH_FIELDS = ["message^3", "actor", "resource", "action", "decision", "stream"]

_CLIENT = None
_CLIENT_KEY: tuple | None = None
_RATE: dict[str, list] = {}
_RATE_LOCK = threading.Lock()


def _safe(mod: str):
    try:
        return importlib.import_module(mod)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=503, detail=f"cloudguard unavailable: {exc}") from exc


def _config() -> dict:
    return {
        "url": os.environ.get("OPENSEARCH_URL", "").strip(),
        "user": os.environ.get("OPENSEARCH_USER", "admin"),
        "password": os.environ.get("OPENSEARCH_PASSWORD", "admin"),
        "auth_mode": os.environ.get("OPENSEARCH_AUTH_MODE", "basic").lower(),
        "index_mode": os.environ.get("OPENSEARCH_INDEX_MODE", "silo").lower(),
        "pooled_index": os.environ.get("OPENSEARCH_LOGS_INDEX", "cloudguard-logs-*"),
        "verify": os.environ.get("OPENSEARCH_VERIFY_CERTS", "0") in ("1", "true", "True"),
        "max_window": int(os.environ.get("OPENSEARCH_MAX_WINDOW", "1000")),
        "rps": int(os.environ.get("OPENSEARCH_RPS", "5")),
    }


def _tenant_index(tenant: str, cfg: dict) -> str:
    """Silo: target ONLY this tenant's physical index. Pooled (interim): the shared index + the
    app-layer tenant filter still applies as Layer 1."""
    if cfg["index_mode"] == "silo":
        return f"tenant-logs-{tenant}-*"
    return cfg["pooled_index"]


def _rate_limit(tenant: str, rps: int) -> None:
    """Per-tenant in-memory token bucket. NOTE: per-process; use Redis for a multi-replica deploy."""
    now = time.time()
    with _RATE_LOCK:
        window = [t for t in _RATE.get(tenant, []) if now - t < 1.0]
        if len(window) >= rps:
            raise HTTPException(status_code=429, detail="search rate limit exceeded for tenant")
        window.append(now)
        _RATE[tenant] = window


def _basic_client(cfg: dict):
    global _CLIENT, _CLIENT_KEY
    key = (cfg["url"], cfg["user"], cfg["verify"])
    if _CLIENT is not None and _CLIENT_KEY == key:
        return _CLIENT
    OpenSearch = _opensearch_cls()
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


def _jwt_client(cfg: dict, tenant: str, subject: str):
    """Per-request client authenticated with a short-lived tenant-scoped JWT (Layer 2)."""
    broker = _safe("cloudguard.search_token_broker")
    try:
        token = broker.mint(tenant, subject)
    except broker.BrokerError as exc:  # noqa: BLE001
        raise HTTPException(status_code=503, detail=f"token broker: {exc}") from exc
    OpenSearch = _opensearch_cls()
    return OpenSearch(
        hosts=[cfg["url"]],
        use_ssl=cfg["url"].startswith("https"),
        verify_certs=cfg["verify"],
        ssl_show_warn=False,
        timeout=10,
        headers={"Authorization": f"Bearer {token}"},
    )


def _opensearch_cls():
    try:
        from opensearchpy import OpenSearch

        return OpenSearch
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=503,
            detail=f"opensearch client unavailable: {exc} (pip install opensearch-py)",
        ) from exc


def _client_for(cfg: dict, tenant: str, subject: str):
    if not cfg["url"]:
        raise HTTPException(status_code=503, detail="log search not configured (set OPENSEARCH_URL)")
    return _jwt_client(cfg, tenant, subject) if cfg["auth_mode"] == "jwt" else _basic_client(cfg)


def _audit(tenant: str, action: str, **extra) -> None:
    try:
        importlib.import_module("cloudguard.tenant_audit").append(tenant, action, **extra)
    except Exception:  # noqa: BLE001 — audit best-effort, never block the read
        pass


@router.get("/health")
async def health(_p=Depends(require_cap("read"))):
    cfg = _config()
    if not cfg["url"]:
        return {"configured": False, "ok": False, "detail": "OPENSEARCH_URL not set"}
    try:
        info = _basic_client(cfg).info()
        return {
            "configured": True,
            "ok": True,
            "auth_mode": cfg["auth_mode"],
            "index_mode": cfg["index_mode"],
            "cluster": info.get("cluster_name"),
            "version": info.get("version", {}).get("number"),
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
    stream: str = Query(""),
    since: str = Query("now-7d"),
    p=Depends(require_cap("read")),
):
    """Tenant-scoped log search. The principal already fail-closed-resolved the tenant (STRICT →
    401 upstream); we use p.tenant_id and ALSO hard-filter + silo-target it (defense in depth)."""
    cfg = _config()
    tenant = p.tenant_id
    # Layer-1 belt-and-braces: never query a shared/ambiguous tenant under STRICT.
    if _safe("cloudguard.tenancy").is_strict() and tenant in ("", "default"):
        raise HTTPException(status_code=403, detail="no canonical tenant (fail-closed)")
    if offset + size > cfg["max_window"]:
        raise HTTPException(status_code=400, detail=f"window too deep (max {cfg['max_window']})")
    _rate_limit(tenant, cfg["rps"])

    client = _client_for(cfg, tenant, p.subject)
    must: list = [{"term": {"tenant_id": tenant}}]  # Layer-1 filter (kept even in silo mode)
    if q.strip():
        must.append(
            {
                "simple_query_string": {
                    "query": q,
                    "fields": _SEARCH_FIELDS,  # allow-list, never "*"
                    "default_operator": "and",
                    "lenient": True,
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
            "bool": {"must": must, "filter": [{"range": {"@timestamp": {"gte": since}}}]}
        },
        "aggs": {"stream": {"terms": {"field": "stream", "size": 12}}},
    }
    started = time.time()
    try:
        res = client.search(index=_tenant_index(tenant, cfg), body=body)
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        # An FGAC denial (Layer 2 catching a Layer-1 bug) surfaces here — audit it as a security event.
        _audit(tenant, "search.denied", actor=p.subject, resource="logs", decision="denied", error=str(exc)[:200])
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
    took = int((time.time() - started) * 1000)
    _audit(tenant, "search.logs", actor=p.subject, resource="logs", decision="allowed",
           query=q[:200], hits=len(hits), took_ms=took)
    return {
        "total": total.get("value", len(hits)) if isinstance(total, dict) else total,
        "took_ms": took,
        "tenant_id": tenant,
        "hits": hits,
        "facets": {"stream": facet},
    }


@router.get("/index")
async def search_index(p=Depends(require_cap("read"))):
    """Server-built client-search payload (extreme-isolation R1). The browser's Orama index of
    *entities* must be constructed HERE, scoped to the principal's tenant + role — never client-side.
    Returns only this tenant's searchable records that this role may see; heap-dumping the SPA then
    yields nothing beyond the session's own scope. (Static UI navigation stays client-side; it is
    not tenant data.)"""
    tenant = p.tenant_id
    if _safe("cloudguard.tenancy").is_strict() and tenant in ("", "default"):
        raise HTTPException(status_code=403, detail="no canonical tenant (fail-closed)")
    records: list = []
    try:
        tc = importlib.import_module("cloudguard.tenant_collections")
        raw = tc.list_items(tenant, "search_entities") if tc else []
        # role gate: only expose records whose required capability the principal holds
        caps = set(p.capabilities)
        for r in raw or []:
            need = r.get("requires") or "read"
            if need in caps:
                records.append(
                    {
                        "group": str(r.get("group", "Records")),
                        "label": str(r.get("label", "")),
                        "sub": str(r.get("sub", "")),
                        "to": str(r.get("to", "")),
                    }
                )
    except Exception:  # noqa: BLE001 — no entity store yet → empty (no client-side leakage)
        records = []
    _audit(tenant, "search.index", actor=p.subject, resource="search_entities",
           decision="allowed", count=len(records))
    return {"tenant_id": tenant, "role": str(p.role), "records": records}
