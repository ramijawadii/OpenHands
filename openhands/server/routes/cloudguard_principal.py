"""CloudGuard edge auth — resolves the trusted Principal (tenant + role + subject) for every
CloudGuard management API request, and exposes GET /api/cloudguard/me.

This is a THIN FastAPI layer over `cloudguard.principal`; the security logic + fail-closed
invariants live in the audited cloudguard package and its test battery
(`tests/tenant_isolation/test_principal.py`). See
docs/architecture/frontend-backend-wiring/03_TENANCY_AND_AUTH_WIRING.md.

Token trust model (CISO):
  • No Authorization header → unauthenticated. Under STRICT tenancy that is rejected downstream
    (fail-closed); under non-strict (self-hosted/dev) it resolves the default tenant — unchanged
    behaviour for today's single-tenant deployments.
  • Authorization: Bearer <jwt> + OIDC JWKS configured → the token is VERIFIED (signature via
    JWKS, plus audience/issuer when configured) before any claim is trusted.
  • Bearer token present but NO JWKS configured → STRICT: 503 (refuse to trust an unverifiable
    token); non-strict: decode WITHOUT verification, returned as untrusted dev hints only
    (authenticated=False).
"""

from __future__ import annotations

import importlib
import os

from fastapi import APIRouter, Depends, Header, HTTPException

router = APIRouter(prefix="/api/cloudguard")

_JWKS_URL_ENV = "CLOUDGUARD_OIDC_JWKS_URL"
_ISSUER_ENV = "CLOUDGUARD_OIDC_ISSUER"
_AUDIENCE_ENV = "CLOUDGUARD_OIDC_AUDIENCE"
_CLIENT_ID_ENV = "CLOUDGUARD_OIDC_CLIENT_ID"

_jwks_client = None  # lazily-built PyJWKClient (cached across requests)


def _safe(import_name: str):
    """Import a cloudguard module; 503 if the package isn't on PYTHONPATH (same pattern as the
    approvals routes)."""
    try:
        return importlib.import_module(import_name)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=503, detail=f"cloudguard unavailable: {exc}") from exc


def _bearer(authorization: "str | None") -> "str | None":
    if not authorization:
        return None
    parts = authorization.split(" ", 1)
    if len(parts) == 2 and parts[0].lower() == "bearer" and parts[1].strip():
        return parts[1].strip()
    return None


def _verify_token(token: str) -> dict:
    """Verify a JWT against the configured OIDC JWKS. Raises on any failure."""
    import jwt
    from jwt import PyJWKClient

    jwks_url = os.environ.get(_JWKS_URL_ENV)
    if not jwks_url:
        raise RuntimeError("no JWKS configured")
    global _jwks_client
    if _jwks_client is None:
        _jwks_client = PyJWKClient(jwks_url)
    signing_key = _jwks_client.get_signing_key_from_jwt(token).key
    audience = os.environ.get(_AUDIENCE_ENV) or None
    issuer = os.environ.get(_ISSUER_ENV) or None
    return jwt.decode(
        token,
        signing_key,
        algorithms=["RS256", "RS384", "RS512", "ES256", "ES384"],
        audience=audience,
        issuer=issuer,
        options={"verify_aud": bool(audience), "verify_iss": bool(issuer)},
    )


def _resolve_claims(authorization: "str | None") -> "tuple[dict, bool]":
    """Return (claims, authenticated). Fail-closed under STRICT when a token can't be trusted."""
    tenancy = _safe("cloudguard.tenancy")
    token = _bearer(authorization)
    if not token:
        return {}, False
    if os.environ.get(_JWKS_URL_ENV):
        try:
            return _verify_token(token), True
        except HTTPException:
            raise
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(status_code=401, detail=f"invalid token: {exc}") from exc
    # No JWKS configured.
    if tenancy.is_strict():
        raise HTTPException(
            status_code=503,
            detail="OIDC JWKS not configured but a bearer token was presented (strict tenancy)",
        )
    # Dev/self-hosted: decode WITHOUT verification — untrusted hints only (authenticated=False).
    try:
        import jwt

        return jwt.decode(token, options={"verify_signature": False}), False
    except Exception:  # noqa: BLE001
        return {}, False


async def require_principal(authorization: "str | None" = Header(default=None)):
    """FastAPI dependency: the trusted Principal for this request (fail-closed under STRICT)."""
    principal = _safe("cloudguard.principal")
    claims, authenticated = _resolve_claims(authorization)
    try:
        return principal.resolve_principal(
            claims,
            authenticated=authenticated,
            client_id=os.environ.get(_CLIENT_ID_ENV) or None,
        )
    except principal.PrincipalError as exc:
        raise HTTPException(status_code=exc.status, detail=str(exc)) from exc


def require_cap(capability: str):
    """FastAPI dependency factory: require a capability (deny-by-default → 403)."""

    async def _dep(p=Depends(require_principal)):
        principal = _safe("cloudguard.principal")
        try:
            return principal.require_capability(p, capability)
        except principal.PrincipalError as exc:
            raise HTTPException(status_code=exc.status, detail=str(exc)) from exc

    return _dep


def gate_conversation(principal, conversation_id: "str | None") -> None:
    """Ensure `principal` is allowed to act on `conversation_id`'s tenant. Used to retrofit the
    conversation-scoped routes (approvals/mode/tasks/...) that were tenant-blind.

    Backward-compatible by policy:
      • tenancy OFF        → no scoping (single-tenant; today's behaviour).
      • ON + bound conv    → cross-tenant gate (404 on mismatch, role-independent).
      • ON + unbound conv  → STRICT: 404 (fail-closed); non-strict: allowed (rollout tolerance,
        matching the existing `_scope` that keeps unstamped records during rollout).
    """
    tenancy = _safe("cloudguard.tenancy")
    if not tenancy.is_enabled():
        return
    conv_tenant = _safe("cloudguard.conversation_tenant")
    owner = conv_tenant.get_conversation_tenant(conversation_id) if conversation_id else None
    if not owner:
        if tenancy.is_strict():
            raise HTTPException(status_code=404, detail="not found")
        return
    principal_mod = _safe("cloudguard.principal")
    try:
        principal_mod.gate_resource_tenant(principal, owner)
    except principal_mod.PrincipalError as exc:
        raise HTTPException(status_code=exc.status, detail=str(exc)) from exc


@router.get("/me")
async def me_route(p=Depends(require_principal)):
    """Bootstrap the SPA: returns {tenant_id, role, subject, capabilities, max_tier}."""
    principal = _safe("cloudguard.principal")
    return principal.me(p)
