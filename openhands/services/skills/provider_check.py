"""
Provider credential detection for CloudGuard skill registry.

Skills for unauthenticated cloud providers should never appear in the listing —
the model cannot hallucinate them if their names are never in context. This
module detects which providers have valid credentials available in the runtime.

Detection is intentionally LIGHTWEIGHT (env vars + file presence checks).
We do NOT make live API calls during detection — that would slow every
session start. The agent's first real provider call will catch any expired
or invalid credentials with a normal NoCredentials/AccessDenied error.

Public API:
    detect_active_providers() -> list[str]
        Returns the providers whose credentials look usable. Always includes
        ``shared`` and ``internal``; conditionally adds ``aws``, ``azure``,
        ``gcp``.
"""
from __future__ import annotations

import logging
import os
from pathlib import Path

logger = logging.getLogger(__name__)


# ── Public API ──────────────────────────────────────────────────────────────

def detect_active_providers() -> list[str]:
    """Return cloud providers whose credentials appear available.

    Always includes ``shared`` (cross-cloud skills) and ``internal``
    (foundational skills). Adds ``aws``/``azure``/``gcp`` only when their
    credentials are detected.
    """
    providers = ["shared", "internal"]

    if _has_aws_credentials():
        providers.append("aws")
        logger.debug("provider_check: aws credentials detected")
    if _has_azure_credentials():
        providers.append("azure")
        logger.debug("provider_check: azure credentials detected")
    if _has_gcp_credentials():
        providers.append("gcp")
        logger.debug("provider_check: gcp credentials detected")

    logger.info("provider_check: active providers = %s", providers)
    return providers


# ── AWS ─────────────────────────────────────────────────────────────────────

def _has_aws_credentials() -> bool:
    """Detect AWS credentials via env vars, credentials file, or container roles.

    Does NOT check instance metadata (IMDSv2) — that costs an HTTP call.
    The agent will discover IMDS credentials at first real API call.
    """
    # 1. Static access keys via env
    if os.environ.get("AWS_ACCESS_KEY_ID") and os.environ.get("AWS_SECRET_ACCESS_KEY"):
        return True

    # 2. SSO / session token
    if os.environ.get("AWS_SESSION_TOKEN") or os.environ.get("AWS_PROFILE"):
        return True

    # 3. Credentials file
    creds_path = Path(
        os.environ.get("AWS_SHARED_CREDENTIALS_FILE")
        or os.path.expanduser("~/.aws/credentials")
    )
    if creds_path.is_file():
        return True

    # 4. ECS / Fargate container credentials endpoint
    if os.environ.get("AWS_CONTAINER_CREDENTIALS_RELATIVE_URI"):
        return True
    if os.environ.get("AWS_CONTAINER_CREDENTIALS_FULL_URI"):
        return True

    # 5. Web identity (EKS Pod Identity / IRSA)
    if os.environ.get("AWS_WEB_IDENTITY_TOKEN_FILE"):
        return True

    return False


# ── Azure ───────────────────────────────────────────────────────────────────

def _has_azure_credentials() -> bool:
    """Detect Azure credentials via env vars or az CLI cache.

    Recognises service principal env vars, managed identity, and an existing
    `az login` cache directory.
    """
    # 1. Service principal (client secret)
    if (
        os.environ.get("AZURE_CLIENT_ID")
        and os.environ.get("AZURE_CLIENT_SECRET")
        and os.environ.get("AZURE_TENANT_ID")
    ):
        return True

    # 2. Service principal (certificate)
    if (
        os.environ.get("AZURE_CLIENT_ID")
        and os.environ.get("AZURE_CLIENT_CERTIFICATE_PATH")
        and os.environ.get("AZURE_TENANT_ID")
    ):
        return True

    # 3. Federated credentials (workload identity)
    if (
        os.environ.get("AZURE_CLIENT_ID")
        and os.environ.get("AZURE_FEDERATED_TOKEN_FILE")
        and os.environ.get("AZURE_TENANT_ID")
    ):
        return True

    # 4. Managed identity (Azure-hosted compute)
    if os.environ.get("MSI_ENDPOINT") or os.environ.get("IDENTITY_ENDPOINT"):
        return True

    # 5. Local az CLI cache
    az_dir = Path(os.path.expanduser("~/.azure"))
    if (az_dir / "accessTokens.json").is_file() or (az_dir / "msal_token_cache.json").is_file():
        return True

    return False


# ── GCP ─────────────────────────────────────────────────────────────────────

def _has_gcp_credentials() -> bool:
    """Detect GCP credentials via env vars or Application Default Credentials.

    Recognises GOOGLE_APPLICATION_CREDENTIALS, gcloud ADC, and the
    CloudGuard-specific GOOGLE_CREDENTIALS_B64 env var (see BUG-R10).
    """
    # 1. Explicit service account key file
    gac = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
    if gac and Path(gac).is_file():
        return True

    # 2. CloudGuard base64-encoded credentials (BUG-R10 mechanism)
    if os.environ.get("GOOGLE_CREDENTIALS_B64"):
        return True

    # 3. gcloud Application Default Credentials
    adc_paths = [
        Path(os.path.expanduser("~/.config/gcloud/application_default_credentials.json")),
        Path(os.path.expanduser("~/AppData/Roaming/gcloud/application_default_credentials.json")),  # Windows
        Path("/tmp/gcloud-creds.json"),  # CloudGuard runtime location
    ]
    if any(p.is_file() for p in adc_paths):
        return True

    # 4. GCE / GKE metadata server (env hint)
    if os.environ.get("GCE_METADATA_HOST") or os.environ.get("CLOUDSDK_CORE_PROJECT"):
        return True

    return False
