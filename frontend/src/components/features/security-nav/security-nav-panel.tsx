/* eslint-disable i18next/no-literal-string */
import React from "react";
import {
  X,
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
} from "lucide-react";

interface SubItem {
  name: string;
  acronym?: string;
  badge?: string;
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  color: string;
  description: string;
}

interface Domain {
  title: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  items: SubItem[];
}

const DOMAINS: Domain[] = [
  {
    title: "IDENTITY DOMAIN",
    icon: Users,
    items: [
      {
        name: "Identity & access",
        acronym: "CIEM",
        icon: UserCheck,
        color: "#9b59b6",
        description: "Human IAM, role sprawl, over-privilege, MFA, PAM",
      },
      {
        name: "Non-human identity",
        acronym: "NHI",
        badge: "new v3",
        icon: Bot,
        color: "#9b59b6",
        description:
          "Service accounts, API tokens, workload identities, AI agents (98%+ of all identities)",
      },
    ],
  },
  {
    title: "POSTURE & GOVERNANCE DOMAIN",
    icon: ShieldCheck,
    items: [
      {
        name: "Posture & config",
        acronym: "CSPM",
        icon: SlidersHorizontal,
        color: "#e74c3c",
        description: "Misconfiguration, drift, asset inventory, secure score",
      },
      {
        name: "Compliance & governance",
        icon: ClipboardCheck,
        color: "#95a5a6",
        description: "CIS, NIST, PCI-DSS, HIPAA, SOC2, ISO 27001 benchmarks",
      },
    ],
  },
  {
    title: "WORKLOAD & RUNTIME DOMAIN",
    icon: Server,
    items: [
      {
        name: "Workload protection",
        acronym: "CWPP",
        icon: Shield,
        color: "#27ae60",
        description: "VMs, serverless, vuln scanning, runtime defense, malware",
      },
      {
        name: "Containers & Kubernetes",
        acronym: "KSPM",
        icon: Layers,
        color: "#27ae60",
        description:
          "Cluster posture, image scanning, registry security, runtime",
      },
      {
        name: "Network security",
        icon: Network,
        color: "#2980b9",
        description:
          "VPC, firewall, DDoS, WAF, flow logs, micro-segmentation",
      },
      {
        name: "Threat detection",
        acronym: "CDR",
        icon: AlertTriangle,
        color: "#e74c3c",
        description: "SIEM, anomaly, lateral movement, threat intelligence",
      },
    ],
  },
  {
    title: "CODE-TO-CLOUD DOMAIN",
    icon: GitBranch,
    items: [
      {
        name: "IaC & DevSecOps",
        badge: "v2",
        icon: Code2,
        color: "#27ae60",
        description:
          "Terraform, CloudFormation, ARM/Bicep, Helm scanning pre-deploy; CI/CD gates",
      },
      {
        name: "Supply chain & SBOM",
        badge: "new v3",
        icon: Package,
        color: "#27ae60",
        description:
          "Dependency scanning, SBOM generation, artifact signing (SLSA), provenance",
      },
      {
        name: "Secrets detection",
        badge: "v2",
        icon: Key,
        color: "#9b59b6",
        description:
          "Exposed keys, tokens, credentials in code, configs, repos, env vars",
      },
      {
        name: "API security",
        badge: "v2",
        icon: Globe,
        color: "#e67e22",
        description:
          "API inventory, OWASP Top 10, shadow APIs, L7 traffic, auth enforcement",
      },
    ],
  },
  {
    title: "DATA & SAAS DOMAIN",
    icon: Database,
    items: [
      {
        name: "Data security",
        acronym: "DSPM",
        icon: Database,
        color: "#e67e22",
        description:
          "Storage, databases, encryption, DLP, sensitive data classification",
      },
      {
        name: "SaaS security",
        acronym: "SSPM",
        badge: "new v3",
        icon: Cloud,
        color: "#c0392b",
        description:
          "M365, Google Workspace, Salesforce, GitHub, Slack — tenant config, permissions, OAuth apps",
      },
    ],
  },
  {
    title: "AI & EMERGING THREATS DOMAIN",
    icon: Sparkles,
    items: [
      {
        name: "AI security posture",
        acronym: "AI-SPM",
        badge: "v2",
        icon: Sparkles,
        color: "#2980b9",
        description:
          "AI workloads, models, training data, LLM/GenAI attack surface, AI BOM",
      },
    ],
  },
];

interface SecurityNavPanelProps {
  onClose: () => void;
}

export function SecurityNavPanel({ onClose }: SecurityNavPanelProps) {
  const [collapsed, setCollapsed] = React.useState<Set<string>>(new Set());

  const toggleDomain = (title: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  };

  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{ width: 360, background: "var(--cg-bg-page)", borderRight: "1px solid var(--cg-border)" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 flex-shrink-0"
        style={{ borderBottom: "1px solid var(--cg-border)" }}
      >
        <span className="text-sm font-semibold text-[var(--cg-text-primary)] tracking-wide">
          Security Domains
        </span>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded text-[var(--cg-text-muted)] hover:text-[var(--cg-text-primary)] transition-colors"
          style={{ background: "transparent" }}
          aria-label="Close"
        >
          <X size={15} />
        </button>
      </div>

      {/* Domain list */}
      <div className="flex-1 overflow-y-auto py-2">
        {DOMAINS.map((domain) => {
          const isCollapsed = collapsed.has(domain.title);
          const DomainIcon = domain.icon;
          const ChevronIcon = isCollapsed ? ChevronRight : ChevronDown;

          return (
            <div key={domain.title} className="mb-0.5">
              {/* Domain header — acts as a collapsible tab */}
              <button
                type="button"
                className="w-full flex items-center gap-2 px-3 py-2 text-left transition-colors"
                style={{ background: "transparent" }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "var(--cg-bg-hover)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
                onClick={() => toggleDomain(domain.title)}
              >
                <ChevronIcon size={11} className="text-[#858585] flex-shrink-0" />
                <DomainIcon size={13} className="text-[#569cd6] flex-shrink-0" />
                <span className="text-[10.5px] font-bold text-[#7a7a8a] tracking-widest uppercase flex-1 truncate">
                  {domain.title}
                </span>
              </button>

              {/* Sub-items */}
              {!isCollapsed && (
                <div className="pl-2 pr-1 pb-1">
                  {domain.items.map((item) => {
                    const ItemIcon = item.icon;
                    return (
                      <button
                        type="button"
                        key={item.name}
                        className="w-full flex items-start gap-3 px-3 py-2.5 text-left rounded-lg transition-colors"
                        style={{ background: "transparent" }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background = "var(--cg-bg-hover)")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = "transparent")
                        }
                      >
                        {/* Icon box */}
                        <div
                          className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5"
                          style={{ backgroundColor: `${item.color}22` }}
                        >
                          <ItemIcon size={14} style={{ color: item.color }} />
                        </div>

                        {/* Text */}
                        <div className="flex flex-col min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[13px] font-medium text-[#cccccc] leading-tight">
                              {item.name}
                            </span>
                            {item.acronym && (
                              <span
                                className="text-[11px] font-semibold"
                                style={{ color: item.color }}
                              >
                                ({item.acronym})
                              </span>
                            )}
                            {item.badge && (
                              <span
                                className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                                style={{
                                  backgroundColor: `${item.color}25`,
                                  color: item.color,
                                }}
                              >
                                {item.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[#5a6070] leading-snug mt-0.5">
                            {item.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
