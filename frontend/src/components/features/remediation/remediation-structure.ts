/**
 * The Remediation Action record, as a structure rather than as markup.
 *
 * This file is the single transcription of the specified taxonomy: five
 * top-level views, one of which (Lifecycle) carries ten ordered stages, each
 * with its own fields. Everything else — the rail, the panes, the search index,
 * the export — is derived from it, so the shape can never be true in one place
 * and stale in another. Adding a field is an edit HERE and nowhere else.
 *
 * Ordering is meaningful and is preserved exactly as specified: the lifecycle
 * stages are numbered because they are a sequence, and a renderer that sorted
 * them alphabetically would be wrong.
 */

export interface RemediationGroup {
  /** Stable slug — used by the rail, deep links and the search index. */
  id: string;
  label: string;
  fields: string[];
}

export interface RemediationView {
  id: string;
  label: string;
  /** Present only on Lifecycle: ordered stages, each a group of fields. */
  stages?: RemediationGroup[];
  /** Present on every other view: the groups shown in the pane. */
  groups?: RemediationGroup[];
}

/** `"Risk Comparison (Before / After)"` → `risk-comparison-before-after`. */
export function slug(label: string): string {
  return label
    .toLowerCase()
    .replace(/^\d+\.\s*/, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const g = (label: string, fields: string[]): RemediationGroup => ({
  id: slug(label),
  label,
  fields,
});

/** The ten lifecycle stages, in order. The number is part of the label. */
export const LIFECYCLE_STAGES: RemediationGroup[] = [
  g("1. Discovery", [
    "Detection Details",
    "Discovery Source",
    "Initial Evidence",
    "Affected Resources",
  ]),
  g("2. Triage", [
    "Asset Context",
    "Business Context",
    "Exposure Analysis",
    "Compliance Mapping",
  ]),
  g("3. Risk Assessment", [
    "Risk Score",
    "Business Impact",
    "Exploitability",
    "Data Sensitivity",
    "Compliance Impact",
    "Risk Justification",
  ]),
  g("4. Investigation", [
    "Root Cause",
    "Event Timeline",
    "MITRE ATT&CK",
    "Related Assets",
    "Attack Path",
    "Logs & Events",
    "Supporting Evidence",
  ]),
  g("5. Blast Radius Analysis", [
    "Impacted Resources",
    "Dependency Graph",
    "Connected Identities",
    "Network Reachability",
    "Upstream Services",
    "Downstream Services",
    "Potential Service Disruption",
    "Estimated Downtime",
    "Rollback Risk",
    "Risk Comparison (Before / After)",
  ]),
  g("6. Remediation Plan", [
    "Recommended Fix",
    "Auto Remediation",
    "Manual Steps",
    "IaC Changes",
    "Rollback Plan",
    "Maintenance Window",
    "Dependencies",
    "Assigned Teams",
    "Success Criteria",
  ]),
  g("7. Execution", [
    "Tasks",
    "Automation Runs",
    "Change Requests",
    "Jira / GitHub",
    "Progress",
    "Approvals",
    "Activity Feed",
  ]),
  g("8. Execution Results", [
    "Execution Status",
    "Successful Actions",
    "Failed Actions",
    "Partial Success",
    "Resource Changes",
    "Configuration Diff",
    "Policy Changes",
    "Error Logs",
    "Rollback Status",
    "Automation Output",
  ]),
  g("9. Validation", [
    "Rescan Results",
    "Before / After Comparison",
    "Compliance Verification",
    "Runtime Verification",
    "Regression Checks",
    "Remaining Findings",
    "Validation Evidence",
  ]),
  g("10. Closure", [
    "Resolution Summary",
    "Final Risk Reduction",
    "Audit Evidence",
    "Compliance Mapping",
    "Lessons Learned",
    "Linked Incidents",
    "Linked Change Requests",
    "Linked Pull Requests",
    "Exception History",
    "Closure Report",
  ]),
];

export const REMEDIATION_VIEWS: RemediationView[] = [
  {
    id: "overview",
    label: "Overview",
    groups: [g("Summary", ["Summary", "Scope", "Risk Reduction", "Lifecycle"])],
  },
  {
    id: "related-findings",
    label: "Related Findings",
    groups: [
      g("Findings", ["Findings"]),
      g("Assets", ["Assets"]),
      g("Controls", ["Controls"]),
      g("Frameworks", ["Frameworks"]),
    ],
  },
  { id: "lifecycle", label: "Lifecycle", stages: LIFECYCLE_STAGES },
  {
    id: "approvals",
    label: "Approvals",
    groups: [
      g("Approvals", [
        "Current Status",
        "Approval Workflow",
        "Required Approvers",
        "Approval History",
        "Escalation History",
        "SLA Tracking",
        "Delegations",
      ]),
    ],
  },
  {
    id: "activity",
    label: "Activity",
    groups: [
      g("Activity", [
        "Timeline",
        "User Actions",
        "Automation Events",
        "System Events",
      ]),
    ],
  },
  {
    id: "evidence",
    label: "Evidence",
    groups: [
      g("Evidence", [
        "Logs",
        "Scan Results",
        "Cloud Events",
        "IaC Diffs",
        "Pull Requests",
        "Attachments",
        "Validation Reports",
      ]),
    ],
  },
  {
    id: "audit",
    label: "Audit",
    groups: [
      g("Audit", [
        "Metadata",
        "Change History",
        "Compliance Evidence",
        "Exception History",
        "Immutable Audit Log",
        "Evidence Export",
      ]),
    ],
  },
];

/** Every group in the record, flattened — used by search and export. */
export function allGroups(): RemediationGroup[] {
  return REMEDIATION_VIEWS.flatMap((v) => v.stages ?? v.groups ?? []);
}
