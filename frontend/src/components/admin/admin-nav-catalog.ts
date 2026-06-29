/**
 * Full Enterprise-Administration navigation catalog — the canonical, exhaustive
 * list of every section and sub-tab, so the global search indexes the whole IA
 * (not a sample). Mirrors the admin-shell NAV + each page's tab arrays
 * (organization/identity/workspaces/runtime-governance/security/audit). Sub-tabs
 * deep-link to their exact `?tab=` (or, for Identity, `?group=&tab=`); the pages
 * read those params via `useTabParam` / the Identity group+tab wiring.
 */
import { NAVIGATION, slugify } from "#/components/features/sidebar/sidebar";

export type NavHit = { group: string; label: string; sub: string; to: string };

type Tab = { label: string; id?: string; to?: string };
type Section = { name: string; to: string; blurb: string; tabs?: Tab[] };

const SECTIONS: Section[] = [
  {
    name: "Global Overview",
    to: "/admin/overview",
    blurb: "Cross-domain risk dashboard",
  },
  {
    name: "Organization",
    to: "/admin/organization",
    blurb: "Enterprise structure & defaults",
    tabs: [
      { label: "Profile", id: "profile" },
      { label: "Legal Entities", id: "entities" },
      { label: "Business Units", id: "units" },
      { label: "Regions", id: "regions" },
      { label: "Domains", id: "domains" },
      { label: "Admin Hierarchy", id: "hierarchy" },
      { label: "Default Configuration", id: "defaults" },
      { label: "Self-Service & Collaboration", id: "selfservice" },
      { label: "Lifecycle", id: "lifecycle" },
    ],
  },
  {
    name: "Identity & Access",
    to: "/admin/identity",
    blurb: "Human & service identity, access",
    tabs: [
      { label: "Users", to: "/admin/identity?group=identity&tab=users" },
      {
        label: "Service Identities",
        to: "/admin/identity?group=identity&tab=service",
      },
      {
        label: "Identity Providers",
        to: "/admin/identity?group=identity&tab=providers",
      },
      {
        label: "Authentication & Credentials",
        to: "/admin/identity?group=identity&tab=auth",
      },
      { label: "Sessions", to: "/admin/identity?group=identity&tab=sessions" },
      { label: "Groups", to: "/admin/identity?group=access&tab=groups" },
      { label: "Roles", to: "/admin/identity?group=access&tab=roles" },
      {
        label: "Assignments",
        to: "/admin/identity?group=access&tab=assignments",
      },
      {
        label: "Privileged Access",
        to: "/admin/identity?group=access&tab=privileged",
      },
      {
        label: "Reviews & Certifications",
        to: "/admin/identity?group=access&tab=reviews",
      },
      {
        label: "Active Alerts",
        to: "/admin/identity?group=alerts&tab=alerts-active",
      },
      {
        label: "Threats & Risks",
        to: "/admin/identity?group=alerts&tab=alerts-risks",
      },
      {
        label: "Governance Violations",
        to: "/admin/identity?group=alerts&tab=alerts-gov",
      },
      {
        label: "Alerts Configuration",
        to: "/admin/identity?group=alerts&tab=alerts-config",
      },
      {
        label: "Alerts History",
        to: "/admin/identity?group=alerts&tab=alerts-history",
      },
      {
        label: "IAM Graph Explorer",
        to: "/admin/identity?group=iam-graph&tab=graph-explorer",
      },
    ],
  },
  {
    name: "Workspace Management",
    to: "/admin/workspaces",
    blurb: "Workspaces, templates, lifecycle",
    tabs: [
      { label: "Directory", id: "directory" },
      { label: "Templates", id: "templates" },
      { label: "Lifecycle", id: "lifecycle" },
      { label: "Deletion", id: "deletion" },
    ],
  },
  {
    name: "Runtime Governance",
    to: "/admin/runtime-governance",
    blurb: "Agent autonomy, gates, enforcement",
    tabs: [
      { label: "Policy", id: "policy" },
      { label: "Execution Boundaries", id: "boundaries" },
      { label: "Approval Rules", id: "approvals" },
      { label: "Risk & Blast-Radius", id: "risk" },
      { label: "Change Control", id: "change" },
      { label: "Exceptions", id: "exceptions" },
      { label: "Simulation", id: "simulation" },
      { label: "Enforcement", id: "enforcement" },
      { label: "Emergency", id: "emergency" },
    ],
  },
  {
    name: "Security & Data",
    to: "/admin/security",
    blurb: "Guardrails, isolation, posture",
    tabs: [
      { label: "Posture", id: "posture" },
      { label: "Agent Guardrails", id: "guardrails" },
      { label: "Isolation & Containment", id: "isolation" },
      { label: "Encryption & Keys", id: "encryption" },
      { label: "Data Residency", id: "residency" },
      { label: "DLP & Data Protection", id: "dlp" },
      { label: "Network & Firewall", id: "network" },
      { label: "Secrets", id: "secrets" },
      { label: "Threat Detection", id: "threats" },
      { label: "Vulnerabilities", id: "vuln" },
      { label: "Hardening & Benchmarks", id: "hardening" },
      { label: "Security Exceptions", id: "exceptions" },
    ],
  },
  {
    name: "Compliance Center",
    to: "/admin/compliance",
    blurb: "Frameworks & evidence",
  },
  {
    name: "Shared Connections",
    to: "/admin/connections",
    blurb: "Cloud & tool connectors",
  },
  {
    name: "Enterprise Operations",
    to: "/admin/operations",
    blurb: "Platform health & operations",
  },
  {
    name: "Global Audit & Evidence",
    to: "/admin/audit",
    blurb: "Tamper-evident audit log",
    tabs: [
      { label: "Administrative stream" },
      { label: "Member stream" },
      { label: "Agent stream" },
      { label: "Workflow stream" },
      { label: "Sandbox stream" },
      { label: "Tool & MCP stream" },
      { label: "Model stream" },
      { label: "Secret stream" },
      { label: "API & Webhook stream" },
      { label: "Resource stream" },
    ],
  },
  {
    name: "Capacity & Billing",
    to: "/admin/capacity",
    blurb: "Usage, seats & invoices",
  },
  { name: "Support", to: "/admin/support", blurb: "Help, tickets & status" },
];

const tabHref = (s: Section, t: Tab) =>
  t.to ?? (t.id ? `${s.to}?tab=${t.id}` : s.to);

// Product "Inference Defense" explore nav — every domain → sub-tab, deep-linked
// by name slug (lands on the sub-tab's first capability). Folder = "Explore · <domain>".
const EXPLORE: NavHit[] = NAVIGATION.flatMap((d) =>
  d.subtabs.map((s) => ({
    group: `Explore · ${d.label}`,
    label: s.label,
    sub: d.label,
    to: `/explore/${slugify(d.label)}/${slugify(s.label)}`,
  })),
);

// every section landing page + every sub-tab (grouped under its section) + explore
export const NAV_CATALOG: NavHit[] = [
  ...SECTIONS.map((s) => ({
    group: "Console sections",
    label: s.name,
    sub: s.blurb,
    to: s.to,
  })),
  ...SECTIONS.flatMap((s) =>
    (s.tabs ?? []).map((t) => ({
      group: s.name,
      label: t.label,
      sub: s.name,
      to: tabHref(s, t),
    })),
  ),
  ...EXPLORE,
];

// folder order: sections, then section folders, then explore-domain folders
export const NAV_GROUP_ORDER: string[] = [
  "Console sections",
  ...SECTIONS.filter((s) => s.tabs?.length).map((s) => s.name),
  ...NAVIGATION.map((d) => `Explore · ${d.label}`),
];
