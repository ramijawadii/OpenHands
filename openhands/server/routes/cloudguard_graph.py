"""CloudGuard graph read API (plan step C7).

Serves the tenant-scoped security graph to the two admin graphs (Explorer /
Security Graph) from the new graph platform (`cloudguard.api.graph`, backed by
the ingestion pipeline). Every route is principal-gated (`require_cap("read")`)
and the tenant comes from the VERIFIED principal — never a query param — so a
request only ever touches its own tenant's engine (existence never leaks across
tenants, same posture as the rest of CloudGuard).

Endpoints mirror the frontend `GraphSource` seam:
  GET /snapshot        full estate (initial render)      → HttpGraphSource.snapshot()
  GET /neighborhood    bounded ego-graph                 → .neighborhood()
  GET /reach           reachable ids                     → .reach()
  GET /blast-radius    blast radius + fan-in             → .blastRadius()/.fanIn()
  GET /metrics         quality metrics + freshness       → .metrics()

Data source: in a live deployment the ingestion `serving.publish()` path
registers each tenant's graph. For dev/demo (no live store yet) set
`CLOUDGUARD_GRAPH_SEED_SAMPLE=1` to lazily seed the Sample estate on first read;
otherwise a tenant with no ingested graph gets a clean 404 (never another
tenant's data, never a silent empty graph masquerading as real).
"""

from __future__ import annotations

import importlib
import os

from fastapi import APIRouter, Depends, HTTPException, Query

from openhands.server.routes.cloudguard_principal import require_cap

router = APIRouter(prefix="/api/cloudguard/graph")


def _graph():
    try:
        return importlib.import_module("cloudguard.api.graph")
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=503, detail=f"graph api unavailable: {exc}") from exc


def _engine_or_seed(gapi, tenant_id: str):
    """Return the tenant engine, lazily seeding Sample only when explicitly enabled."""
    try:
        gapi.nodes(tenant_id)  # cheap existence probe (raises GraphNotFound)
        return
    except gapi.GraphNotFound:
        if os.environ.get("CLOUDGUARD_GRAPH_SEED_SAMPLE", "").strip() in ("1", "true", "yes"):
            gapi.seed_sample(tenant_id)
            return
        raise HTTPException(status_code=404, detail="no graph for this tenant")


def _guard(gapi, fn):
    try:
        return fn()
    except gapi.GraphNotFound:
        raise HTTPException(status_code=404, detail="no graph for this tenant") from None


@router.get("/snapshot")
async def snapshot(p=Depends(require_cap("read"))):
    """Full tenant estate (nodes + lineage-bearing edges) + freshness."""
    gapi = _graph()
    _engine_or_seed(gapi, p.tenant_id)
    return _guard(gapi, lambda: gapi.snapshot(p.tenant_id))


@router.get("/neighborhood")
async def neighborhood(
    root: str,
    direction: str = "down",
    depth: int = Query(0, ge=0, le=12),
    limit: int = Query(1500, ge=1, le=20000),
    p=Depends(require_cap("read")),
):
    gapi = _graph()
    _engine_or_seed(gapi, p.tenant_id)
    return _guard(gapi, lambda: gapi.neighborhood(p.tenant_id, root, direction, depth, None, limit))


@router.get("/reach")
async def reach(
    root: str,
    direction: str = "down",
    depth: int = Query(0, ge=0, le=12),
    p=Depends(require_cap("read")),
):
    gapi = _graph()
    _engine_or_seed(gapi, p.tenant_id)
    return _guard(gapi, lambda: {"ids": gapi.reach(p.tenant_id, root, direction, depth)})


@router.get("/blast-radius")
async def blast_radius(root: str, p=Depends(require_cap("read"))):
    gapi = _graph()
    _engine_or_seed(gapi, p.tenant_id)
    return _guard(
        gapi,
        lambda: {"blastRadius": gapi.blast_radius(p.tenant_id, root), "fanIn": gapi.fan_in(p.tenant_id, root)},
    )


@router.get("/metrics")
async def metrics(p=Depends(require_cap("read"))):
    gapi = _graph()
    _engine_or_seed(gapi, p.tenant_id)
    return _guard(gapi, lambda: gapi.metrics(p.tenant_id))
