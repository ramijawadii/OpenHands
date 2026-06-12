"""CloudGuard security-posture read API — key custody + audit tamper-evidence + tenancy state,
read from the live engine (cloudguard.tenant_crypto / tenancy / tenant_audit). POSTURE ONLY:
returns provider type + whether keys are configured, NEVER any key material. CISO key-custody
attestation surface (Settings · Encryption & Keys). `require_cap("read")`.
"""

from __future__ import annotations

import importlib
import os

from fastapi import APIRouter, Depends, HTTPException

from openhands.server.routes.cloudguard_principal import require_cap

router = APIRouter(prefix="/api/cloudguard")

_CUSTODY = {
    "LocalKeyProvider": "Local KEK (dev / self-hosted)",
    "KmsKeyProvider": "External KMS / HYOK (customer-held)",
    "WrappedKeyProvider": "Per-tenant wrapped DEK (crypto-erasure)",
}


def _safe(import_name: str):
    try:
        return importlib.import_module(import_name)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=503, detail=f"cloudguard unavailable: {exc}") from exc


@router.get("/encryption/keys")
async def encryption_keys(p=Depends(require_cap("read"))):
    crypto = _safe("cloudguard.tenant_crypto")
    tenancy = _safe("cloudguard.tenancy")
    try:
        provider_name = type(crypto.get_provider()).__name__
    except Exception:  # noqa: BLE001
        provider_name = "unknown"
    hmac_set = bool(os.environ.get("CLOUDGUARD_EVENT_HMAC_KEY"))
    return {
        "provider": provider_name,
        "custody": _CUSTODY.get(provider_name, provider_name),
        "per_tenant_keys": provider_name in ("KmsKeyProvider", "WrappedKeyProvider"),
        "master_kek_configured": bool(os.environ.get("CLOUDGUARD_MASTER_KEK")),
        "audit_hmac_configured": hmac_set,
        "audit_integrity": (
            "tamper-evident (HMAC)" if hmac_set else "tamper-detecting (SHA-256 only)"
        ),
        "tenancy": {"enabled": tenancy.is_enabled(), "strict": tenancy.is_strict()},
        "tenant_id": p.tenant_id,
    }
