"""Diagram Template Library — serve a per-tenant store of starter architecture diagrams.

Zero-trust / licensing: the templates are the OPERATOR's runtime data (a gitignored store mounted at
CLOUDGUARD_TEMPLATES_DIR), never baked into the product image or committed. Two audiences:

  * HUMAN / frontend (principal-authed): GET /index (the catalog metadata) + GET /file/{id} (one .drawio,
    streamed — tolerates the 30 MB+ files) so the picker can load a template into a NEW workspace doc.
  * AGENT / sandbox (HMAC diagram token, reusing the diagram seam auth): POST /search (semantic + faceted
    over the metadata) + POST /fetch (return one template's XML) so diagram_find_template /
    diagram_load_template can find and load a reference architecture, then adapt it with the P8/P9 ops.

Flag-gated by the store's presence: if CLOUDGUARD_TEMPLATES_DIR / templates.json is absent, endpoints
report an empty catalog (feature simply off).
"""

from __future__ import annotations

import json
import logging
import os
import pathlib

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel

from openhands.server.routes.cloudguard_diagram import _verify  # reuse the diagram HMAC token
from openhands.server.routes.cloudguard_principal import require_principal

logger = logging.getLogger("openhands")
router = APIRouter(prefix="/api/cloudguard/templates")

_MAX_Q = 200
_MAX_K = 12


def _dir() -> pathlib.Path:
    return pathlib.Path(os.environ.get("CLOUDGUARD_TEMPLATES_DIR", "/app/templates"))


_INDEX_CACHE: dict = {}


def _index() -> dict:
    """Load + cache templates.json (mtime-invalidated)."""
    p = _dir() / "templates.json"
    if not p.exists():
        return {"count": 0, "templates": []}
    mt = p.stat().st_mtime
    if _INDEX_CACHE.get("mt") != mt:
        _INDEX_CACHE["data"] = json.loads(p.read_text(encoding="utf-8"))
        _INDEX_CACHE["mt"] = mt
        _INDEX_CACHE.pop("vectors", None)  # invalidate embeddings
    return _INDEX_CACHE["data"]


def _entry(template_id: str) -> "dict | None":
    for t in _index().get("templates", []):
        if t.get("id") == template_id:
            return t
    return None


def _doc(t: dict) -> str:
    return " ".join(str(x) for x in (
        t.get("title", ""), t.get("summary", ""), t.get("category", ""),
        " ".join(t.get("also_in", []) or []), " ".join(t.get("products", []) or []),
    ))


def _semantic(query: str, cands: list[dict], k: int) -> "list[dict] | None":
    """Rank candidates by meaning using the app's model2vec (shared with the shape index). None if the
    embedder isn't available → caller falls back to substring."""
    try:
        from cloudguard.diagram import shapes as _sh
        import numpy as np

        emb = _sh._embedder()
        if not emb:
            return None
        vecs = _INDEX_CACHE.get("vectors")
        if vecs is None or _INDEX_CACHE.get("vec_n") != len(_index().get("templates", [])):
            allt = _index().get("templates", [])
            m = emb.encode([_doc(t) for t in allt]).astype("float32")
            m /= (np.linalg.norm(m, axis=1, keepdims=True) + 1e-9)
            _INDEX_CACHE["vectors"] = vecs = {t["id"]: m[i] for i, t in enumerate(allt)}
            _INDEX_CACHE["vec_n"] = len(allt)
        qv = emb.encode([query])[0].astype("float32")
        qv /= (np.linalg.norm(qv) + 1e-9)
        scored = [(float(vecs[t["id"]] @ qv), t) for t in cands if t.get("id") in vecs]
        scored.sort(key=lambda s: -s[0])
        return [dict(t, score=round(sc, 3)) for sc, t in scored[:k]]
    except Exception:  # noqa: BLE001
        return None


def _facet(cands: list[dict], category: "str | None", provider: "str | None") -> list[dict]:
    out = cands
    if category:
        c = category.lower()
        out = [t for t in out if c == (t.get("category") or "").lower() or c in [x.lower() for x in (t.get("also_in") or [])]]
    if provider:
        p = provider.lower()
        out = [t for t in out if any(p in str(x).lower() for x in (t.get("products") or []))]
    return out


def _slim(t: dict) -> dict:
    return {k: t.get(k) for k in ("id", "title", "summary", "category", "also_in", "products", "pages") if k in t} | (
        {"score": t["score"]} if "score" in t else {}
    )


# ── HUMAN / frontend (principal) ──
@router.get("/index")
async def index(_p=Depends(require_principal)):
    """The catalog metadata for the picker (grouped by category client-side)."""
    idx = _index()
    return {"count": idx.get("count", len(idx.get("templates", []))), "templates": idx.get("templates", [])}


@router.get("/file/{template_id}", response_class=PlainTextResponse)
async def file(template_id: str, _p=Depends(require_principal)):
    """Return one template's .drawio XML (immutable source). Streamed as text for the picker to load."""
    t = _entry(template_id)
    if not t:
        raise HTTPException(status_code=404, detail="unknown template")
    fp = _dir() / os.path.basename(t["file"])  # basename → no traversal
    if not fp.exists():
        raise HTTPException(status_code=404, detail="template file missing")
    return PlainTextResponse(fp.read_text(encoding="utf-8"), media_type="application/xml")


# ── AGENT / sandbox (HMAC diagram token) ──
class _Search(BaseModel):
    cid: str
    sig: str
    query: str = ""
    category: str | None = None
    provider: str | None = None
    k: int = 6


@router.post("/search")
async def search(req: _Search):
    """Agent: find reference templates by use-case (semantic) + optional category/provider facets."""
    if not _verify(req.cid, req.sig):
        raise HTTPException(status_code=403, detail="unauthorized")
    cands = _facet(_index().get("templates", []), req.category, req.provider)
    q = (req.query or "")[:_MAX_Q].strip()
    k = max(1, min(int(req.k), _MAX_K))
    hits = (_semantic(q, cands, k) if q else None)
    if hits is None:  # substring fallback (or no query → facet order)
        ql = q.lower()
        hits = sorted(cands, key=lambda t: (ql not in _doc(t).lower(), t.get("title", "")))[:k] if q else cands[:k]
    return {"ok": True, "results": [_slim(t) for t in hits]}


class _Fetch(BaseModel):
    cid: str
    sig: str
    id: str


@router.post("/fetch")
async def fetch(req: _Fetch):
    """Agent: return one template's XML (file-mode load — the sandbox writes it into /workspace)."""
    if not _verify(req.cid, req.sig):
        raise HTTPException(status_code=403, detail="unauthorized")
    t = _entry(req.id)
    if not t:
        raise HTTPException(status_code=404, detail="unknown template")
    fp = _dir() / os.path.basename(t["file"])
    if not fp.exists():
        raise HTTPException(status_code=404, detail="template file missing")
    return {"ok": True, "id": req.id, "file": t["file"], "title": t.get("title"), "xml": fp.read_text(encoding="utf-8")}


@router.get("/healthz")
async def healthz():
    idx = _index()
    return {"ok": True, "seam": "templates", "count": idx.get("count", len(idx.get("templates", [])))}
