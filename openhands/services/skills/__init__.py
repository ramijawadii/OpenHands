"""
CloudGuard skill system — provider-namespaced security microagent registry.

Public exports:
    SkillRegistry      — main registry class (loading, listing, lookup, lazy content)
    SkillEntry         — dataclass representing one skill
    detect_active_providers — credential-gated provider detection
"""
from openhands.services.skills.registry import SkillEntry, SkillRegistry
from openhands.services.skills.provider_check import detect_active_providers

__all__ = ["SkillEntry", "SkillRegistry", "detect_active_providers"]
