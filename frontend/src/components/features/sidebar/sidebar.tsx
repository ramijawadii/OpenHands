/* eslint-disable i18next/no-literal-string, no-param-reassign, react/jsx-props-no-spreading */
import React from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router";
import {
  Plus,
  MessageSquare,
  Settings,
  ChevronRight,
  ChevronDown,
  Users,
  UserCheck,
  Bot,
  ShieldCheck,
  SlidersHorizontal,
  ClipboardCheck,
  Server,
  Layers,
  Network,
  AlertTriangle,
  GitBranch,
  Code2,
  Package,
  Key,
  Globe,
  Database,
  Cloud,
  Sparkles,
  Shield,
  ChevronsUpDown,
  LayoutDashboard,
  Check,
  Search,
  X,
  Activity,
  Zap,
  Plug,
  Target,
  Eye,
  Lock,
  FileCode,
  Cpu,
  Radio,
  Sun,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useGitUser } from "#/hooks/query/use-git-user";
import { UserActions } from "./user-actions";
import { SettingsModal } from "#/components/shared/modals/settings/settings-modal";
import { useSettings } from "#/hooks/query/use-settings";
import { ConversationPanel } from "../conversation-panel/conversation-panel";
import { ConversationPanelWrapper } from "../conversation-panel/conversation-panel-wrapper";
import { useLogout } from "#/hooks/mutation/use-logout";
import { useConfig } from "#/hooks/query/use-config";
import { displayErrorToast } from "#/utils/custom-toast-handlers";
import { useTheme } from "#/context/theme-context";

// ── Design tokens — CSS variables for light/dark theme support ────────────────
const T = {
  bg: "var(--cg-bg-primary-sidebar)",
  bgHover: "var(--cg-bg-hover)",
  bgActive: "var(--cg-bg-active)",
  badgeBg: "var(--cg-bg-badge)",
  textPrimary: "var(--cg-text-primary)",
  textNav: "var(--cg-text-nav)",
  textMuted: "var(--cg-text-muted)",
  border: "var(--cg-border)",
  accent: "var(--cg-accent)",
  accentPurple: "var(--cg-accent-purple)",
} as const;

// ── Navigation data ────────────────────────────────────────────────────────────

interface SubSubItem {
  label: string;
}
interface SubTab {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  items: SubSubItem[];
}
interface Domain {
  id: number;
  label: string;
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  subtabs: SubTab[];
}

const NAVIGATION: Domain[] = [
  {
    id: 1,
    label: "Discovery & Inventory",
    icon: Search,
    subtabs: [
      {
        id: "1.1",
        label: "Cloud Asset Inventory",
        icon: Layers,
        items: [
          {
            label: "Multi-cloud resource graph (AWS, Azure, GCP, OCI, Alibaba)",
          },
          { label: "Shadow asset detection" },
          { label: "Tagging & ownership policy" },
          { label: "Asset change timeline" },
          { label: "Unmanaged & orphaned resource detection" },
        ],
      },
      {
        id: "1.2",
        label: "External Attack Surface",
        icon: Globe,
        items: [
          { label: "Internet-facing asset discovery" },
          { label: "Exposed ports, services & certificates" },
          { label: "Subdomain & DNS enumeration" },
          { label: "Unknown / unmanaged asset alerts" },
          { label: "Attacker-view exposure scoring" },
        ],
      },
      {
        id: "1.3",
        label: "Risk & Attack Graph",
        icon: GitBranch,
        items: [
          { label: "Attack path visualization" },
          { label: "Toxic combination detection" },
          { label: "Blast radius analysis" },
          {
            label:
              "Business context scoring (criticality, revenue, data sensitivity)",
          },
          { label: "Exploitability-weighted risk prioritization" },
        ],
      },
    ],
  },
  {
    id: 2,
    label: "Identity",
    icon: Users,
    subtabs: [
      {
        id: "2.1",
        label: "Human IAM (CIEM)",
        icon: UserCheck,
        items: [
          { label: "Role sprawl & over-privilege detection" },
          { label: "MFA enforcement & gap analysis" },
          { label: "PAM & privileged session management" },
          { label: "JIT access & standing access removal" },
          { label: "Cross-account trust chain analysis" },
          { label: "Admin account hardening" },
        ],
      },
      {
        id: "2.2",
        label: "Non-Human Identity (NHI)",
        icon: Bot,
        items: [
          { label: "Service account inventory & permissions audit" },
          { label: "API token & key lifecycle management" },
          { label: "Workload identities (OIDC, federated, SPIFFE/SPIRE)" },
          { label: "AI agent identities & permission scoping" },
          { label: "Credential rotation enforcement" },
        ],
      },
      {
        id: "2.3",
        label: "Identity Risk Graph",
        icon: Network,
        items: [
          { label: "Effective permissions graph" },
          { label: "Dormant & orphaned identity detection" },
          { label: "Identity–resource toxic combinations" },
          { label: "Lateral movement paths from identity" },
          { label: "Privilege escalation path analysis" },
        ],
      },
    ],
  },
  {
    id: 3,
    label: "Posture & Governance",
    icon: ShieldCheck,
    subtabs: [
      {
        id: "3.1",
        label: "Cloud Posture (CSPM)",
        icon: SlidersHorizontal,
        items: [
          { label: "Misconfiguration detection across all cloud services" },
          { label: "Drift detection vs IaC baseline" },
          { label: "Secure score (per account, per service, per region)" },
          { label: "Auto-remediation & suggested fixes" },
          { label: "Multi-cloud policy enforcement" },
        ],
      },
      {
        id: "3.2",
        label: "Vulnerability Management",
        icon: AlertTriangle,
        items: [
          { label: "CVE scanning across workloads, images & OSes" },
          {
            label:
              "Risk-based prioritization (CVSS + exploitability + runtime context)",
          },
          { label: "Patch tracking & SLA management" },
          { label: "Remediation validation & re-scan" },
          { label: "Zero-day exposure tracking" },
        ],
      },
      {
        id: "3.3",
        label: "Compliance & Governance",
        icon: ClipboardCheck,
        items: [
          { label: "CIS benchmarks (AWS / GCP / Azure)" },
          { label: "NIST 800-53 & CSF" },
          { label: "PCI-DSS v4" },
          { label: "HIPAA" },
          { label: "SOC 2 Type II" },
          { label: "ISO 27001" },
          { label: "GDPR & regional frameworks" },
          { label: "Continuous evidence collection" },
          { label: "Audit-ready reporting & export" },
        ],
      },
    ],
  },
  {
    id: 4,
    label: "Code-to-Cloud",
    icon: Code2,
    subtabs: [
      {
        id: "4.1",
        label: "IaC & DevSecOps",
        icon: FileCode,
        items: [
          { label: "Terraform scanning (pre-deploy, OPA / Sentinel gates)" },
          { label: "CloudFormation / ARM / Bicep analysis" },
          { label: "Helm & Kubernetes manifest scanning" },
          { label: "CI/CD pipeline gates & break-the-build" },
          { label: "Policy-as-code enforcement" },
          { label: "IaC-to-runtime drift detection" },
        ],
      },
      {
        id: "4.2",
        label: "App Security Posture (ASPM)",
        icon: Eye,
        items: [
          { label: "Application inventory & ownership mapping" },
          { label: "Code-level vulnerability context" },
          { label: "SCA — open source risk in application layer" },
          { label: "Developer-facing findings & IDE integration" },
          { label: "App risk score correlated to infrastructure context" },
          {
            label:
              "Reachability analysis (is the vulnerability actually exploitable)",
          },
        ],
      },
      {
        id: "4.3",
        label: "Supply Chain & SBOM",
        icon: Package,
        items: [
          { label: "Dependency scanning (direct + transitive)" },
          { label: "SBOM generation (CycloneDX / SPDX)" },
          { label: "VEX statements & vulnerability exceptions" },
          { label: "Artifact signing — SLSA L1 / L2 / L3" },
          { label: "Provenance & Sigstore transparency log" },
          { label: "Malicious package detection" },
        ],
      },
      {
        id: "4.4",
        label: "Secrets Detection",
        icon: Key,
        items: [
          { label: "Git history & PR diff scanning" },
          { label: "Pre-commit hooks & branch scanning" },
          { label: "CI/CD variable & pipeline secret exposure" },
          { label: "Config maps & env file scanning" },
          { label: "Cloud-native secret store adoption tracking" },
          { label: "Verified vs unverified secret triage" },
        ],
      },
    ],
  },
  {
    id: 5,
    label: "API Security",
    icon: Globe,
    subtabs: [
      {
        id: "5.1",
        label: "API Discovery & Inventory",
        icon: Search,
        items: [
          {
            label:
              "Automatic API endpoint discovery (agentless + traffic-based)",
          },
          {
            label:
              "Shadow API detection (undocumented, unregistered endpoints)",
          },
          { label: "Zombie API detection (deprecated but still active)" },
          { label: "Internal vs external API classification" },
          { label: "API ownership & team mapping" },
          { label: "OpenAPI / GraphQL / gRPC schema registry" },
        ],
      },
      {
        id: "5.2",
        label: "API Posture & Design Risk",
        icon: Lock,
        items: [
          { label: "OpenAPI spec drift (schema vs actual traffic)" },
          { label: "Authentication & authorization schema review" },
          {
            label:
              "Insecure defaults (verbose errors, no rate limits, open CORS)",
          },
          { label: "mTLS & transport security enforcement" },
          { label: "API versioning risk (old versions still reachable)" },
          { label: "GraphQL introspection & depth limit exposure" },
        ],
      },
      {
        id: "5.3",
        label: "OWASP API Top 10",
        icon: Shield,
        items: [
          { label: "API1 — Broken object level authorization (BOLA)" },
          { label: "API2 — Broken authentication" },
          { label: "API3 — Broken object property level authorization" },
          { label: "API4 — Unrestricted resource consumption" },
          { label: "API5 — Broken function level authorization (BFLA)" },
          { label: "API6 — Unrestricted access to sensitive business flows" },
          { label: "API7 — Server-side request forgery (SSRF)" },
          { label: "API8 — Security misconfiguration" },
          { label: "API9 — Improper inventory management" },
          { label: "API10 — Unsafe consumption of APIs" },
        ],
      },
      {
        id: "5.4",
        label: "API Runtime & Traffic Analysis",
        icon: Activity,
        items: [
          { label: "L7 real-time traffic inspection" },
          { label: "Anomalous request pattern detection" },
          { label: "Rate limit enforcement & abuse detection" },
          { label: "Bot vs human traffic classification" },
          { label: "Credential stuffing & brute force on API endpoints" },
          { label: "Data exfiltration via API response analysis" },
        ],
      },
      {
        id: "5.5",
        label: "API Threat Detection",
        icon: AlertTriangle,
        items: [
          {
            label:
              "API-specific attack signatures (injection, fuzzing, scraping)",
          },
          { label: "Behavioral baseline per endpoint" },
          { label: "Sequence anomaly (abnormal call chains)" },
          { label: "Privilege escalation via API" },
          { label: "Lateral movement through internal APIs" },
          { label: "Alert correlation with CDR & identity layer" },
        ],
      },
      {
        id: "5.6",
        label: "API Governance & Compliance",
        icon: ClipboardCheck,
        items: [
          { label: "API catalog & lifecycle management" },
          { label: "Deprecation & sunset policy enforcement" },
          { label: "Sensitive data in API responses (PII, tokens, secrets)" },
          { label: "Regulatory mapping (GDPR, PCI-DSS, HIPAA)" },
          { label: "Consumer access audit (who calls what, how often)" },
          { label: "API SLA & uptime risk scoring" },
        ],
      },
    ],
  },
  {
    id: 6,
    label: "Workload & Runtime",
    icon: Server,
    subtabs: [
      {
        id: "6.1",
        label: "Workload Protection (CWPP)",
        icon: Shield,
        items: [
          { label: "VM vulnerability scanning & patching" },
          { label: "Serverless function security (Lambda, Cloud Functions)" },
          { label: "Runtime anomaly detection (process, file, syscall)" },
          { label: "Malware detection & quarantine" },
          { label: "File integrity monitoring (FIM)" },
          { label: "eBPF-based kernel-level visibility" },
        ],
      },
      {
        id: "6.2",
        label: "Containers & Kubernetes (KSPM)",
        icon: Layers,
        items: [
          { label: "Cluster posture (kube-bench, CIS K8s benchmarks)" },
          { label: "RBAC analysis & violations" },
          {
            label: "Container image scanning (CVE, malware, embedded secrets)",
          },
          { label: "Registry security & image signing (Cosign)" },
          { label: "Runtime container defense & drift detection" },
          { label: "Admission controller policy enforcement" },
        ],
      },
      {
        id: "6.3",
        label: "Network Security",
        icon: Network,
        items: [
          { label: "VPC & security group analysis" },
          { label: "NACL & firewall rule audit" },
          { label: "Flow log ingestion & anomaly detection" },
          { label: "DDoS & WAF coverage assessment" },
          { label: "East-west micro-segmentation enforcement" },
          { label: "Zero trust network policy gaps" },
        ],
      },
      {
        id: "6.4",
        label: "Serverless & PaaS",
        icon: Server,
        items: [
          {
            label:
              "Managed service misconfiguration (RDS, managed K8s, queues)",
          },
          { label: "Event-driven attack surface (triggers, event buses)" },
          { label: "Privilege escalation via serverless triggers" },
          { label: "Cold-start & ephemeral workload blind spots" },
          { label: "Function-to-function permission sprawl" },
        ],
      },
    ],
  },
  {
    id: 7,
    label: "Data & SaaS",
    icon: Database,
    subtabs: [
      {
        id: "7.1",
        label: "Data Security (DSPM)",
        icon: Database,
        items: [
          {
            label:
              "Data store discovery & classification (S3, RDS, BigQuery, Blob, Snowflake)",
          },
          { label: "PII / PCI / PHI / PHD sensitive data detection" },
          { label: "Encryption coverage (at-rest & in-transit)" },
          { label: "Excess data access (who can reach what data)" },
          { label: "Data flow mapping (how data moves between services)" },
          { label: "DLP policy enforcement & violation alerting" },
          { label: "Data residency & sovereignty compliance" },
        ],
      },
      {
        id: "7.2",
        label: "SaaS Security (SSPM)",
        icon: Cloud,
        items: [
          { label: "M365 tenant config, sharing & guest access" },
          { label: "Google Workspace DLP & guest policies" },
          { label: "Salesforce org permissions & IP restrictions" },
          { label: "GitHub org security & branch protection" },
          { label: "Slack & collaboration tool posture" },
          { label: "OAuth app inventory, scope audit & risk scoring" },
          { label: "Shadow SaaS detection & unmanaged app access" },
        ],
      },
    ],
  },
  {
    id: 8,
    label: "Detection & Response",
    icon: AlertTriangle,
    subtabs: [
      {
        id: "8.1",
        label: "Cloud Detection (CDR)",
        icon: Activity,
        items: [
          {
            label:
              "Real-time log ingestion & normalization (CloudTrail, Azure Monitor, GCP)",
          },
          { label: "SIEM-style correlation across cloud telemetry" },
          { label: "Behavioral anomaly detection (UEBA)" },
          { label: "Lateral movement & pivot detection" },
          { label: "Privilege escalation detection" },
          { label: "API abuse & credential stuffing signals" },
          { label: "Multi-cloud alert deduplication & normalization" },
        ],
      },
      {
        id: "8.2",
        label: "Threat Intelligence",
        icon: Radio,
        items: [
          { label: "IOC & IOA feed ingestion (commercial + open source)" },
          { label: "MITRE ATT&CK cloud matrix coverage mapping" },
          { label: "Adversary campaign & TTP tracking" },
          { label: "Threat actor attribution & profiling" },
          { label: "Intelligence-enriched alert context" },
          { label: "Cloud provider CVE & advisory watch" },
        ],
      },
      {
        id: "8.3",
        label: "Incident Response",
        icon: Zap,
        items: [
          { label: "Alert triage & case management" },
          { label: "SOAR playbook automation" },
          {
            label:
              "Automated containment (isolate, credential revoke, quarantine)",
          },
          { label: "Forensic timeline & evidence collection" },
          { label: "Post-incident blast radius assessment" },
          { label: "MTTR tracking & SLA reporting" },
          { label: "Runbook library & response templates" },
        ],
      },
      {
        id: "8.4",
        label: "SOC Integrations",
        icon: Plug,
        items: [
          {
            label:
              "SIEM forwarding (Splunk, Microsoft Sentinel, Chronicle, QRadar)",
          },
          { label: "Ticketing (Jira, ServiceNow, PagerDuty, Linear)" },
          {
            label:
              "EDR / XDR bidirectional telemetry (CrowdStrike, SentinelOne, Defender)",
          },
          { label: "Chat ops (Slack, Teams)" },
          { label: "Webhook & REST API automation" },
          { label: "SOAR connectors (Palo Alto XSOAR, Swimlane, Tines)" },
        ],
      },
    ],
  },
  {
    id: 9,
    label: "AI & Emerging Threats",
    icon: Sparkles,
    subtabs: [
      {
        id: "9.1",
        label: "AI Security Posture (AI-SPM)",
        icon: Sparkles,
        items: [
          { label: "AI workload & model inventory" },
          { label: "Training infrastructure misconfiguration" },
          { label: "Model access controls & least privilege" },
          { label: "AI BOM (model cards, weights, training data lineage)" },
          { label: "Shadow AI & unregistered model detection" },
        ],
      },
      {
        id: "9.2",
        label: "LLM / GenAI Attack Surface",
        icon: Bot,
        items: [
          { label: "Prompt injection detection & input filtering" },
          { label: "Sensitive data leakage from LLM outputs" },
          { label: "Model theft & extraction risk" },
          { label: "Insecure plugin / tool / MCP integrations" },
          { label: "LLM endpoint inventory & public exposure" },
          { label: "Jailbreak & policy bypass detection" },
        ],
      },
      {
        id: "9.3",
        label: "AI Agent Identity & Governance",
        icon: Cpu,
        items: [
          { label: "Agent permission scoping & least privilege" },
          { label: "Agent action audit logs & observability" },
          { label: "Agentic workflow blast radius mapping" },
          { label: "Multi-agent trust chain analysis" },
          { label: "Runtime agent behavioral monitoring & anomaly detection" },
          { label: "Human-in-the-loop enforcement policy" },
        ],
      },
      {
        id: "9.4",
        label: "Emerging Threat Simulation (CTEM)",
        icon: Target,
        items: [
          { label: "Zero-day cloud service vulnerability watch" },
          { label: "Continuous threat exposure management cycles" },
          { label: "Adversarial ML & model poisoning tracking" },
          { label: "New attack technique simulation & purple teaming" },
          {
            label:
              "Exposure validation (confirm if attack paths are exploitable)",
          },
        ],
      },
    ],
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function hoverOn(el: HTMLElement) {
  el.style.background = T.bgHover;
}
function hoverOff(el: HTMLElement, active: boolean) {
  el.style.background = active ? T.bgActive : "transparent";
}

// ── Secondary panel ────────────────────────────────────────────────────────────

interface SecondaryPanelProps {
  domain: Domain;
  subtab: SubTab;
  onClose: () => void;
}

function SecondaryPanel({ domain, subtab, onClose }: SecondaryPanelProps) {
  const [hovered, setHovered] = React.useState<number | null>(null);
  return (
    <aside
      style={{
        width: 256,
        minWidth: 256,
        background: "var(--cg-bg-sidebar)",
        borderRight: `1px solid ${T.border}`,
        height: "100%",
        overflow: "hidden",
        fontFamily: "system-ui, -apple-system, sans-serif",
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header — matches settings "Settings" title block */}
      <div style={{ padding: "28px 20px 16px", position: "relative" }}>
        <div
          style={{
            fontSize: 11,
            color: T.textMuted,
            marginBottom: 4,
            letterSpacing: "0.01em",
          }}
        >
          {domain.label}
        </div>
        <span
          style={{
            fontSize: 20,
            color: T.textPrimary,
            fontWeight: 500,
            letterSpacing: "-0.01em",
          }}
        >
          {subtab.label}
        </span>
        <button
          type="button"
          onClick={onClose}
          style={{
            position: "absolute",
            top: 20,
            right: 14,
            background: "transparent",
            border: "none",
            cursor: "pointer",
            padding: 4,
            borderRadius: 4,
            display: "flex",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = T.bgHover;
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background =
              "transparent";
          }}
        >
          <X size={13} style={{ color: T.textMuted }} />
        </button>
      </div>

      {/* Items — pixel-match settings nav: height 34, padding "0 10px", single-line ellipsis */}
      <div
        style={{ flex: 1, overflowY: "auto", padding: "4px 8px 12px" }}
        className="cg-sidebar-nav"
      >
        {subtab.items.map((item, idx) => {
          const lit = hovered === idx;
          return (
            <div
              key={item.label}
              style={{
                display: "flex",
                alignItems: "flex-start",
                minHeight: 34,
                padding: "7px 10px",
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 400,
                color: lit ? "var(--cg-text-primary)" : "var(--cg-text-nav)",
                background: lit ? "var(--cg-bg-active)" : "transparent",
                marginBottom: 1,
                transition: "background 100ms ease, color 100ms ease",
                boxSizing: "border-box" as const,
                cursor: "default",
                lineHeight: 1.45,
                wordBreak: "break-word" as const,
              }}
              onMouseEnter={() => setHovered(idx)}
              onMouseLeave={() => setHovered(null)}
            >
              {item.label}
            </div>
          );
        })}
      </div>
    </aside>
  );
}

// ── Main sidebar ───────────────────────────────────────────────────────────────
export function Sidebar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const user = useGitUser();
  const { data: config } = useConfig();
  const {
    data: settings,
    error: settingsError,
    isError: settingsIsError,
    isFetching: isFetchingSettings,
  } = useSettings();
  const { mutate: logout } = useLogout();

  const { theme, toggle: toggleTheme } = useTheme();
  const [settingsModalIsOpen, setSettingsModalIsOpen] = React.useState(false);
  const [conversationPanelIsOpen, setConversationPanelIsOpen] =
    React.useState(false);
  const [expandedDomain, setExpandedDomain] = React.useState<number | null>(
    null,
  );
  const [activeSubPanel, setActiveSubPanel] = React.useState<{
    domainId: number;
    subtabId: string;
  } | null>(null);
  const [workspaceOpen, setWorkspaceOpen] = React.useState(false);
  const workspaceRef = React.useRef<HTMLDivElement>(null);

  // ── Collapse state ───────────────────────────────────────────────────────────
  const [collapsed, setCollapsed] = React.useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("cg.sidebar.collapsed") === "1";
  });
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        "cg.sidebar.collapsed",
        collapsed ? "1" : "0",
      );
    }
  }, [collapsed]);
  const toggleCollapsed = () => setCollapsed((c) => !c);
  // Collapsed → narrow icon-rail (not zero) so icons + tooltips remain reachable.
  const RAIL_WIDTH = "3.5rem"; // 56px
  const FULL_WIDTH = "18rem"; // 288px
  // Label/chevron fade: on collapse fade ahead of width; on re-open delay 50ms
  // so labels only appear after the panel has space.
  const labelOpacityTransition = collapsed
    ? "opacity 100ms ease-out"
    : "opacity 150ms ease-out 50ms";

  // ── Custom rail tooltip (fixed-positioned so it escapes the wrapper's
  //    overflow-x:clip and renders without browser title-attribute delay) ──
  const [tooltip, setTooltip] = React.useState<{
    label: string;
    top: number;
    left: number;
  } | null>(null);
  const railHover = (label: string, isActive: boolean = false) => ({
    onMouseEnter: (e: React.MouseEvent<HTMLElement>) => {
      if (collapsed) {
        const r = e.currentTarget.getBoundingClientRect();
        setTooltip({ label, top: r.top + r.height / 2, left: r.right + 8 });
      }
      if (!isActive) hoverOn(e.currentTarget as HTMLElement);
    },
    onMouseLeave: (e: React.MouseEvent<HTMLElement>) => {
      setTooltip(null);
      hoverOff(e.currentTarget as HTMLElement, isActive);
    },
  });
  // Hide tooltip whenever we collapse/expand to avoid stale floating chip
  React.useEffect(() => {
    setTooltip(null);
  }, [collapsed]);
  // Click handler for domain icons in collapsed mode: expand the rail and
  // open that domain, rather than trying to render subtabs in 56px of space.
  const handleDomainClick = (id: number) => {
    if (collapsed) {
      setCollapsed(false);
      setExpandedDomain(id);
      setActiveSubPanel((prev) => (prev && prev.domainId !== id ? null : prev));
      return;
    }
    setExpandedDomain((prev) => (prev === id ? null : id));
    setActiveSubPanel((prev) => (prev && prev.domainId !== id ? null : prev));
  };

  const shouldHideLlmSettings =
    config?.FEATURE_FLAGS.HIDE_LLM_SETTINGS && config?.APP_MODE === "saas";

  React.useEffect(() => {
    if (shouldHideLlmSettings) return;
    if (pathname === "/settings") {
      setSettingsModalIsOpen(false);
    } else if (
      !isFetchingSettings &&
      settingsIsError &&
      settingsError?.status !== 404
    ) {
      displayErrorToast(
        "Something went wrong while fetching settings. Please reload the page.",
      );
    } else if (config?.APP_MODE === "oss" && settingsError?.status === 404) {
      setSettingsModalIsOpen(true);
    }
  }, [settingsError?.status, settingsError, isFetchingSettings, pathname]);

  React.useEffect(() => {
    if (!workspaceOpen) return undefined;
    const handler = (e: MouseEvent) => {
      if (
        workspaceRef.current &&
        !workspaceRef.current.contains(e.target as Node)
      ) {
        setWorkspaceOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [workspaceOpen]);

  const openSubPanel = (domainId: number, subtabId: string) => {
    setActiveSubPanel((prev) =>
      prev?.domainId === domainId && prev?.subtabId === subtabId
        ? null
        : { domainId, subtabId },
    );
  };

  // Resolve active secondary panel data
  const activeDomain = activeSubPanel
    ? (NAVIGATION.find((d) => d.id === activeSubPanel.domainId) ?? null)
    : null;
  const activeSubtab = activeDomain
    ? (activeDomain.subtabs.find((s) => s.id === activeSubPanel!.subtabId) ??
      null)
    : null;

  return (
    <>
      {/* ── Primary sidebar — collapsible wrapper ────────────────────────── */}
      <div
        data-cg-sidebar-wrapper
        data-collapsed={collapsed ? "true" : "false"}
        style={{
          width: collapsed ? RAIL_WIDTH : FULL_WIDTH,
          overflowX: "clip",
          overflowY: "visible",
          height: "100%",
          flexShrink: 0,
          position: "relative",
          zIndex: 30,
          transition: "width 150ms ease-out",
        }}
        className="lg:sticky lg:top-0"
      >
        <aside
          style={{
            width: collapsed ? RAIL_WIDTH : FULL_WIDTH,
            minWidth: collapsed ? RAIL_WIDTH : FULL_WIDTH,
            background: T.bg,
            borderRight: `1px solid ${T.border}`,
            height: "100%",
            overflow: "visible",
            fontFamily: "system-ui, -apple-system, sans-serif",
            flexShrink: 0,
            position: "relative",
            transition:
              "width 150ms ease-out, min-width 150ms ease-out, background-color 35ms ease-out, border-color 35ms ease-out, box-shadow 35ms ease-out",
          }}
          className="flex flex-col"
        >
          {/* Brand — when expanded: logo + title + toggle on the RIGHT.
                     when collapsed: only the open-toggle, sitting at top. */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-start",
              gap: 10,
              padding: "14px 12px 12px",
              borderBottom: `1px solid ${T.border}`,
              flexShrink: 0,
            }}
          >
            {!collapsed && (
              <>
                <img
                  src="/logo.png"
                  alt="CloudGuard"
                  style={{
                    width: 26,
                    height: 26,
                    objectFit: "contain",
                    flexShrink: 0,
                    borderRadius: 6,
                  }}
                />
                <div
                  style={{
                    minWidth: 0,
                    flex: 1,
                    opacity: 1,
                    transition: labelOpacityTransition,
                  }}
                >
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 500,
                      color: T.textPrimary,
                      lineHeight: 1.25,
                      whiteSpace: "nowrap",
                    }}
                  >
                    CloudGuard
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: T.textMuted,
                      lineHeight: 1.2,
                      whiteSpace: "nowrap",
                    }}
                  >
                    Inference Defense
                  </div>
                </div>
              </>
            )}
            <button
              type="button"
              aria-pressed={collapsed}
              aria-label={collapsed ? "Open sidebar" : "Close sidebar"}
              onClick={toggleCollapsed}
              style={{
                marginLeft: collapsed ? 0 : "auto",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: 6,
                borderRadius: 6,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: T.textMuted,
                transition:
                  "background-color 35ms ease-out, color 35ms ease-out",
                flexShrink: 0,
              }}
              {...railHover(collapsed ? "Open sidebar" : "Close sidebar")}
            >
              {collapsed ? (
                <PanelLeftOpen size={16} />
              ) : (
                <PanelLeftClose size={16} />
              )}
            </button>
          </div>

          {/* Workspace selector — collapsed: reserve the same vertical space so
            nav icons below do not shift upward. */}
          {collapsed ? (
            <div aria-hidden="true" style={{ height: 50, flexShrink: 0 }} />
          ) : (
            <div
              style={{ padding: "10px 10px 6px", position: "relative" }}
              ref={workspaceRef}
            >
              <button
                type="button"
                onClick={() => setWorkspaceOpen((p) => !p)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  width: "100%",
                  padding: "7px 10px",
                  background: workspaceOpen
                    ? "var(--cg-workspace-bg-hover)"
                    : "var(--cg-workspace-bg)",
                  border: `1px solid ${T.border}`,
                  borderRadius: 8,
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "background 0.12s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "var(--cg-workspace-bg-hover)";
                }}
                onMouseLeave={(e) => {
                  if (!workspaceOpen)
                    (e.currentTarget as HTMLButtonElement).style.background =
                      "var(--cg-workspace-bg)";
                }}
              >
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 5,
                    background: "var(--cg-accent-purple-bg)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <ShieldCheck size={11} style={{ color: T.accentPurple }} />
                </div>
                <span
                  style={{
                    flex: 1,
                    fontSize: 13,
                    fontWeight: 500,
                    color: T.textPrimary,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  Default
                </span>
                <ChevronsUpDown
                  size={13}
                  style={{ color: T.textMuted, flexShrink: 0 }}
                />
              </button>

              {workspaceOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% - 2px)",
                    left: 10,
                    right: 10,
                    background: "var(--cg-workspace-dropdown-bg)",
                    border: `1px solid ${T.border}`,
                    borderRadius: 10,
                    zIndex: 9999,
                    overflow: "hidden",
                    boxShadow: "var(--cg-shadow-dropdown)",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setWorkspaceOpen(false)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      width: "100%",
                      padding: "9px 12px",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "background 0.12s",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background =
                        T.bgHover;
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background =
                        "transparent";
                    }}
                  >
                    <div
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 5,
                        background: "var(--cg-accent-purple-bg)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <ShieldCheck
                        size={11}
                        style={{ color: T.accentPurple }}
                      />
                    </div>
                    <span
                      style={{
                        flex: 1,
                        fontSize: 13,
                        fontWeight: 500,
                        color: T.textPrimary,
                      }}
                    >
                      Default
                    </span>
                    <Check
                      size={13}
                      style={{ color: T.accentPurple, flexShrink: 0 }}
                    />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Scrollable nav */}
          <nav
            style={{
              flex: 1,
              overflowY: "auto",
              overflowX: "hidden",
              transition:
                "background-color 35ms ease-out, border-color 35ms ease-out, box-shadow 35ms ease-out",
            }}
            className="cg-sidebar-nav"
          >
            {/* Top actions */}
            <div style={{ padding: "4px 0" }}>
              {/* New Conversation */}
              <button
                type="button"
                aria-label="New Conversation"
                onClick={() => navigate("/")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-start",
                  gap: 10,
                  width: "calc(100% - 12px)",
                  margin: "1px 6px",
                  padding: "10px 12px",
                  background: pathname === "/" ? T.bgActive : "transparent",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                  borderRadius: 6,
                  transition: "background 0.12s",
                }}
                {...railHover("New Conversation", pathname === "/")}
              >
                <span
                  style={{
                    color: T.textPrimary,
                    display: "flex",
                    flexShrink: 0,
                  }}
                >
                  <Plus size={15} />
                </span>
                {!collapsed && (
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 400,
                      color: T.textPrimary,
                      opacity: 1,
                      transition: labelOpacityTransition,
                      whiteSpace: "nowrap",
                    }}
                  >
                    New Conversation
                  </span>
                )}
              </button>

              {/* Conversations */}
              <button
                type="button"
                aria-label="Conversations"
                onClick={() =>
                  settings?.EMAIL_VERIFIED === false
                    ? undefined
                    : setConversationPanelIsOpen((p) => !p)
                }
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-start",
                  gap: 10,
                  width: "calc(100% - 12px)",
                  margin: "1px 6px",
                  padding: "10px 12px",
                  background: conversationPanelIsOpen
                    ? T.bgActive
                    : "transparent",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                  borderRadius: 6,
                  transition: "background 0.12s",
                }}
                {...railHover("Conversations", conversationPanelIsOpen)}
              >
                <span
                  style={{
                    color: T.textPrimary,
                    display: "flex",
                    flexShrink: 0,
                  }}
                >
                  <MessageSquare size={15} />
                </span>
                {!collapsed && (
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 400,
                      color: T.textPrimary,
                      opacity: 1,
                      transition: labelOpacityTransition,
                      whiteSpace: "nowrap",
                    }}
                  >
                    Conversations
                  </span>
                )}
              </button>
            </div>

            {/* Divider */}
            <div
              style={{ height: 1, background: T.border, margin: "4px 0 6px" }}
            />

            {/* Dashboard */}
            <button
              type="button"
              aria-label="Dashboard"
              onClick={() => navigate("/")}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-start",
                gap: 10,
                width: "calc(100% - 12px)",
                margin: "1px 6px",
                padding: "10px 12px",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                textAlign: "left",
                borderRadius: 6,
                transition: "background 0.12s",
              }}
              {...railHover("Dashboard")}
            >
              <LayoutDashboard
                size={15}
                style={{ color: T.textPrimary, flexShrink: 0 }}
              />
              {!collapsed && (
                <>
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 500,
                      color: T.textPrimary,
                      flex: 1,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      opacity: 1,
                      transition: labelOpacityTransition,
                    }}
                  >
                    Dashboard
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      color: T.textMuted,
                      fontWeight: 600,
                      letterSpacing: "0.02em",
                      marginLeft: 2,
                    }}
                  >
                    0
                  </span>
                </>
              )}
            </button>

            {/* Domain list */}
            {NAVIGATION.map((domain) => {
              const isExpanded = expandedDomain === domain.id;
              const DomainIcon = domain.icon;

              return (
                <div key={domain.id}>
                  {/* Domain header */}
                  <button
                    type="button"
                    aria-label={domain.label}
                    onClick={() => handleDomainClick(domain.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "flex-start",
                      gap: 10,
                      width: "calc(100% - 12px)",
                      margin: "1px 6px",
                      padding: "10px 12px",
                      background: isExpanded ? T.bgActive : "transparent",
                      border: "none",
                      cursor: "pointer",
                      textAlign: "left",
                      borderRadius: 6,
                      transition: "background 0.12s",
                    }}
                    {...railHover(domain.label, isExpanded)}
                  >
                    <DomainIcon
                      size={15}
                      style={{
                        color: isExpanded ? T.textPrimary : T.textNav,
                        flexShrink: 0,
                      }}
                    />
                    {!collapsed && (
                      <>
                        <span
                          style={{
                            fontSize: 14,
                            fontWeight: isExpanded ? 500 : 400,
                            color: T.textPrimary,
                            flex: 1,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            opacity: 1,
                            transition: labelOpacityTransition,
                          }}
                        >
                          {domain.label}
                        </span>
                        {isExpanded ? (
                          <ChevronDown
                            size={13}
                            style={{ color: T.textMuted, flexShrink: 0 }}
                          />
                        ) : (
                          <ChevronRight
                            size={13}
                            style={{ color: T.textMuted, flexShrink: 0 }}
                          />
                        )}
                      </>
                    )}
                  </button>

                  {/* Sub-tabs */}
                  {!collapsed && isExpanded && (
                    <div style={{ paddingBottom: 2 }}>
                      {domain.subtabs.map((subtab) => {
                        const SubIcon = subtab.icon;
                        const isActive =
                          activeSubPanel?.domainId === domain.id &&
                          activeSubPanel?.subtabId === subtab.id;

                        return (
                          <button
                            key={subtab.id}
                            type="button"
                            onClick={() => openSubPanel(domain.id, subtab.id)}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              width: "calc(100% - 12px)",
                              margin: "1px 6px",
                              padding: "7px 10px 7px 28px",
                              background: isActive
                                ? "var(--cg-accent-bg)"
                                : "transparent",
                              border: "none",
                              cursor: "pointer",
                              textAlign: "left",
                              borderRadius: 6,
                              transition: "background 0.12s",
                            }}
                            onMouseEnter={(e) => {
                              if (!isActive)
                                hoverOn(e.currentTarget as HTMLElement);
                            }}
                            onMouseLeave={(e) => {
                              (
                                e.currentTarget as HTMLElement
                              ).style.background = isActive
                                ? "var(--cg-accent-bg)"
                                : "transparent";
                            }}
                          >
                            {/* Icon badge */}
                            <div
                              style={{
                                width: 20,
                                height: 20,
                                borderRadius: 5,
                                background: isActive
                                  ? "var(--cg-accent-bg-strong)"
                                  : "var(--cg-bg-badge)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                              }}
                            >
                              <SubIcon
                                size={10}
                                style={{
                                  color: isActive ? T.accent : T.textNav,
                                }}
                              />
                            </div>
                            <span
                              style={{
                                fontSize: 12,
                                color: isActive ? T.textPrimary : T.textNav,
                                fontWeight: isActive ? 500 : 400,
                                flex: 1,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {subtab.label}
                            </span>
                            <ChevronRight
                              size={10}
                              style={{
                                color: isActive ? T.accent : T.textMuted,
                                flexShrink: 0,
                              }}
                            />
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Divider before Settings */}
            <div style={{ height: 1, background: T.border, margin: "6px 0" }} />

            {/* Settings — last tab */}
            <button
              type="button"
              aria-label="Settings"
              onClick={() => {
                navigate("/settings");
                setActiveSubPanel(null);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-start",
                gap: 10,
                width: "calc(100% - 12px)",
                margin: "1px 6px",
                padding: "10px 12px",
                background: pathname.startsWith("/settings")
                  ? T.bgActive
                  : "transparent",
                border: "none",
                cursor: "pointer",
                textAlign: "left",
                borderRadius: 6,
                transition: "background 0.12s",
              }}
              {...railHover("Settings", pathname.startsWith("/settings"))}
            >
              <span
                style={{ color: T.textPrimary, display: "flex", flexShrink: 0 }}
              >
                <Settings size={15} />
              </span>
              {!collapsed && (
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 400,
                    color: T.textPrimary,
                    opacity: 1,
                    transition: labelOpacityTransition,
                    whiteSpace: "nowrap",
                  }}
                >
                  Settings
                </span>
              )}
            </button>

            <div style={{ height: 12 }} />
          </nav>

          {/* User strip */}
          <div
            style={{
              borderTop: `1px solid ${T.border}`,
              padding: collapsed ? "10px 12px" : "10px 16px",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              gap: collapsed ? 0 : 10,
              transition: "padding 150ms ease-out",
            }}
          >
            <div
              onMouseEnter={(e) => {
                if (collapsed) {
                  const r = (
                    e.currentTarget as HTMLElement
                  ).getBoundingClientRect();
                  setTooltip({
                    label: user.data?.login ?? "CloudGuard",
                    top: r.top + r.height / 2,
                    left: r.right + 8,
                  });
                }
              }}
              onMouseLeave={() => setTooltip(null)}
              style={{ display: "flex", flexShrink: 0 }}
            >
              <UserActions
                user={
                  user.data ? { avatar_url: user.data.avatar_url } : undefined
                }
                onLogout={logout}
                isLoading={user.isFetching}
              />
            </div>
            {!collapsed && (
              <>
                <div
                  style={{
                    minWidth: 0,
                    flex: 1,
                    opacity: 1,
                    transition: labelOpacityTransition,
                  }}
                >
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: T.textPrimary,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {user.data?.login ?? "CloudGuard"}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: T.textNav,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    Inference Defense
                  </div>
                </div>
                <button
                  type="button"
                  aria-label={
                    theme === "dark"
                      ? "Switch to light mode"
                      : "Switch to dark mode"
                  }
                  onClick={toggleTheme}
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    padding: 6,
                    borderRadius: 6,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    transition: "background 0.12s",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      T.bgHover;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      "transparent";
                  }}
                >
                  {theme === "dark" ? (
                    <Sun size={14} style={{ color: T.textMuted }} />
                  ) : (
                    <Moon size={14} style={{ color: T.textMuted }} />
                  )}
                </button>
              </>
            )}
          </div>
        </aside>
      </div>

      {/* ── Rail tooltip (only while collapsed) — portaled to <body> so it
              cannot be clipped by any ancestor stacking context. ─────────── */}
      {collapsed &&
        tooltip &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            role="tooltip"
            style={{
              position: "fixed",
              top: tooltip.top,
              left: tooltip.left,
              transform: "translateY(-50%)",
              background: "var(--cg-bg-primary-sidebar, #1c1c1c)",
              border: `1px solid ${T.border}`,
              color: T.textPrimary,
              padding: "6px 10px",
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 500,
              whiteSpace: "nowrap",
              pointerEvents: "none",
              boxShadow: "0 4px 16px rgba(0,0,0,0.35)",
              zIndex: 2147483647,
            }}
          >
            {tooltip.label}
          </div>,
          document.body,
        )}

      {/* ── Secondary sidebar panel ────────────────────────────────────────── */}
      {activeDomain && activeSubtab && (
        <SecondaryPanel
          domain={activeDomain}
          subtab={activeSubtab}
          onClose={() => setActiveSubPanel(null)}
        />
      )}

      {/* ── Conversation panel flyout ──────────────────────────────────────── */}
      {conversationPanelIsOpen && (
        <ConversationPanelWrapper isOpen={conversationPanelIsOpen}>
          <ConversationPanel
            onClose={() => setConversationPanelIsOpen(false)}
          />
        </ConversationPanelWrapper>
      )}

      {/* ── Settings modal ─────────────────────────────────────────────────── */}
      {settingsModalIsOpen && (
        <SettingsModal
          settings={settings}
          onClose={() => setSettingsModalIsOpen(false)}
        />
      )}
    </>
  );
}
