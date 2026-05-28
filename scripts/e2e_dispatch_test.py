"""End-to-end dispatch verification — mimics CloudGuardAgent._skill_aware_process_obs.

Run inside the container:
    docker exec cloudguard-app python3 /app/scripts/e2e_dispatch_test.py
"""
from openhands.agenthub.cloudguard_agent.cloudguard_agent import (
    _SKILL_READY_RE, _agent_load_skill, _get_skill_registry
)


def simulate_dispatch(ipython_cell_output: str):
    """Replicate the exact dispatch path in _skill_aware_process_obs."""
    match = _SKILL_READY_RE.search(ipython_cell_output)
    if not match:
        return None
    skill_name = match.group(1)
    skill_args = match.group(2) or ""
    content = _agent_load_skill(skill_name, skill_args)
    if content is None:
        return None
    return {"skill_name": skill_name, "args": skill_args, "len": len(content)}


def main() -> int:
    cases = [
        ("short legacy",     "[SKILL_READY:iam-aws]",                              "aws:iam-aws"),
        ("short+args",       "[SKILL_READY:s3-exposure:args=bucket=prod]",         "aws:s3-exposure"),
        ("qualified aws",    "[SKILL_READY:aws:cis-benchmarks]",                   "aws:cis-benchmarks"),
        ("qualified shared", "[SKILL_READY:shared:kubernetes-security]",           "shared:kubernetes-security"),
        ("qualified azure",  "[SKILL_READY:azure:iam-azure]",                      "azure:iam-azure"),
        ("qualified gcp",    "[SKILL_READY:gcp:iam-gcp]",                          "gcp:iam-gcp"),
        ("qualified+args",   "[SKILL_READY:aws:iam-aws:args=PassRole]",            "aws:iam-aws"),
        ("internal skill",   "[SKILL_READY:internal:mermaid]",                     "internal:mermaid"),
        ("unknown skill",    "[SKILL_READY:nonexistent-skill]",                    None),
    ]

    reg = _get_skill_registry()
    print(f"Registry loaded {reg.stats()['total']} skills")
    print(f"by_provider: {reg.stats()['by_provider']}")
    print()
    all_ok = True
    for desc, cell, expected in cases:
        r = simulate_dispatch(cell)
        if r is None:
            ok = expected is None
            result_str = "SKIPPED (not loaded)"
        else:
            entry = reg.get(r["skill_name"])
            ok = bool(entry) and expected in (entry.name, entry.short_name)
            src = entry.source_path.replace("/workspace/cloudguard-runtime/", "") if entry else "?"
            result_str = f"len={r['len']}c src={src}"
        status = "PASS" if ok else "FAIL"
        all_ok = all_ok and ok
        print(f"  [{status}] {desc:<22s}: {result_str}")
    print()
    print(f"OVERALL: {'ALL PASS' if all_ok else 'FAILED'}")
    return 0 if all_ok else 1


if __name__ == "__main__":
    import sys
    sys.exit(main())
