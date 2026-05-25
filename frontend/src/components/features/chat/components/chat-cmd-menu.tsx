import React from "react";
import { useNavigate } from "react-router";
import { X, FileText, Activity, Cpu, Cloud, Zap } from "lucide-react";
import useMetricsStore from "#/stores/metrics-store";
import { SKILLS, SKILL_DOMAINS } from "#/data/skill-registry";

const T = {
  bg: "var(--cg-bg-primary-sidebar)",
  bgHover: "var(--cg-bg-hover)",
  bgActive: "var(--cg-bg-active)",
  textPrimary: "var(--cg-text-primary)",
  textNav: "var(--cg-text-nav)",
  textMuted: "var(--cg-text-muted)",
  border: "var(--cg-border)",
  borderSubtle: "var(--cg-border-subtle)",
} as const;

const DOMAIN_LABELS: Record<string, string> = {
  IDENTITY: "Identity",
  POSTURE: "Posture",
  WORKLOAD: "Workload",
  NETWORK: "Network",
  DATA: "Data Security",
  CHAIN: "Supply Chain",
  DIAGRAMS: "Diagrams",
};

const TOP_CATEGORIES = [
  "Context",
  "System Health",
  "Model",
  "Cloud Resources",
  "Skills Registry",
] as const;

type TopCategory = (typeof TOP_CATEGORIES)[number];

const CATEGORY_ICONS: Record<TopCategory, React.ReactNode> = {
  Context: <FileText size={14} />,
  "System Health": <Activity size={14} />,
  Model: <Cpu size={14} />,
  "Cloud Resources": <Cloud size={14} />,
  "Skills Registry": <Zap size={14} />,
};

interface ActionItem {
  label: string;
  description?: string;
  action: () => void;
  disabled?: boolean;
  tag?: string;
  cmd?: string;
}

interface ChatCmdMenuProps {
  chatInputRef: React.RefObject<HTMLDivElement | null>;
  handleFileIconClick: () => void;
  onClose: () => void;
}

export function ChatCmdMenu({
  chatInputRef,
  handleFileIconClick,
  onClose,
}: ChatCmdMenuProps) {
  const navigate = useNavigate();
  const openMetricsModal = useMetricsStore((s) => s.openMetricsModal);
  const [activeCategory, setActiveCategory] =
    React.useState<TopCategory>("Context");
  const [activeSkillDomain, setActiveSkillDomain] = React.useState<string>(
    SKILL_DOMAINS[0] ?? "",
  );

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const insertCmd = (cmd: string) => {
    const el = chatInputRef.current;
    if (!el) return;
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    range.deleteContents();
    el.dispatchEvent(new Event("input", { bubbles: true }));
    document.execCommand("insertText", false, `/${cmd} `);
    onClose();
  };

  const insertText = (text: string) => {
    const el = chatInputRef.current;
    if (!el) return;
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    range.deleteContents();
    el.dispatchEvent(new Event("input", { bubbles: true }));
    document.execCommand("insertText", false, text);
    onClose();
  };

  const categoryItems: Record<TopCategory, ActionItem[]> = {
    Context: [
      {
        label: "Attach file",
        description: "Upload a file for analysis",
        action: () => {
          handleFileIconClick();
          onClose();
        },
      },
      {
        label: "Add context",
        description: "Reference a file or resource with @",
        action: () => insertText("@"),
      },
      {
        label: "Clear conversation",
        description: "Start a new conversation from the home screen",
        action: () => {
          navigate("/");
          onClose();
        },
      },
      {
        label: "Rewind",
        description: "Undo the last agent action",
        action: () => {},
        disabled: true,
        tag: "soon",
      },
    ],
    "System Health": [
      {
        label: "Run health check",
        description: "Check all system components and active connections",
        cmd: "health-check",
        action: () => insertCmd("health-check"),
      },
      {
        label: "Token usage",
        description: "View current session token consumption",
        action: () => {
          openMetricsModal();
          onClose();
        },
      },
    ],
    Model: [
      {
        label: "Switch model",
        description: "Change the active AI model in settings",
        action: () => {
          navigate("/settings");
          onClose();
        },
      },
      {
        label: "Effort — High",
        description: "Increase reasoning depth for complex tasks",
        action: () => {},
        disabled: true,
        tag: "soon",
      },
      {
        label: "Thinking mode",
        description: "Enable extended thinking for multi-step reasoning",
        action: () => {},
        disabled: true,
        tag: "soon",
      },
      {
        label: "Account & usage",
        description: "View billing and usage details",
        action: () => {
          navigate("/settings");
          onClose();
        },
      },
    ],
    "Cloud Resources": [
      {
        label: "Show connected resources",
        description: "List all cloud services and their connection status",
        cmd: "resources",
        action: () => insertCmd("resources"),
      },
      {
        label: "Compliance audit",
        description: "Full CIS / NIST / SOC 2 compliance check",
        cmd: "audit",
        action: () => insertCmd("audit"),
      },
      {
        label: "Incident response",
        description: "Security incident analysis and containment plan",
        cmd: "incident",
        action: () => insertCmd("incident"),
      },
      {
        label: "Vulnerability assessment",
        description: "Full infrastructure vulnerability scan by exploitability",
        cmd: "vuln",
        action: () => insertCmd("vuln"),
      },
      {
        label: "Threat model",
        description: "Generate an architecture threat model with attack paths",
        cmd: "threat",
        action: () => insertCmd("threat"),
      },
    ],
    "Skills Registry": [],
  };

  const skillsForDomain = SKILLS.filter((s) => s.domain === activeSkillDomain);
  const currentItems =
    activeCategory !== "Skills Registry" ? categoryItems[activeCategory] : [];

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="flex overflow-hidden"
        style={{
          width: 880,
          height: 580,
          background: T.bg,
          border: `1px solid ${T.border}`,
          borderRadius: 16,
          boxShadow: "0 24px 64px rgba(0,0,0,0.7)",
        }}
      >
        {/* ── Left sidebar ─────────────────────────────────────────────────── */}
        <div
          style={{
            width: 220,
            borderRight: `1px solid ${T.border}`,
            display: "flex",
            flexDirection: "column",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              padding: "16px 14px 12px",
              borderBottom: `1px solid ${T.border}`,
              flexShrink: 0,
            }}
          >
            <span
              style={{ fontSize: 13, fontWeight: 600, color: T.textPrimary }}
            >
              Command Menu
            </span>
          </div>

          <nav
            style={{ flex: 1, overflowY: "auto", padding: "6px 0" }}
            className="custom-scrollbar"
          >
            {TOP_CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat;
              return (
                <div key={cat}>
                  <button
                    type="button"
                    onClick={() => setActiveCategory(cat)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      width: "calc(100% - 12px)",
                      margin: "1px 6px",
                      padding: "9px 10px",
                      background: isActive ? T.bgActive : "transparent",
                      border: "none",
                      borderRadius: 6,
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "background 0.12s",
                      color: isActive ? T.textPrimary : T.textNav,
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive)
                        (
                          e.currentTarget as HTMLButtonElement
                        ).style.background = T.bgHover;
                    }}
                    onMouseLeave={(e) => {
                      (
                        e.currentTarget as HTMLButtonElement
                      ).style.background = isActive ? T.bgActive : "transparent";
                    }}
                  >
                    <span style={{ flexShrink: 0, opacity: isActive ? 1 : 0.7 }}>
                      {CATEGORY_ICONS[cat]}
                    </span>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: isActive ? 500 : 400,
                        color: isActive ? T.textPrimary : T.textNav,
                        flex: 1,
                      }}
                    >
                      {cat}
                    </span>
                    {cat === "Skills Registry" && (
                      <span
                        style={{
                          fontSize: 10,
                          color: T.textMuted,
                          background: "var(--cg-bg-badge)",
                          padding: "1px 5px",
                          borderRadius: 4,
                          flexShrink: 0,
                        }}
                      >
                        {SKILLS.length}
                      </span>
                    )}
                  </button>

                  {/* Skills sub-domain tabs */}
                  {cat === "Skills Registry" && isActive && (
                    <div style={{ paddingLeft: 8 }}>
                      {SKILL_DOMAINS.map((domain) => {
                        const isActiveDomain = activeSkillDomain === domain;
                        const count = SKILLS.filter(
                          (s) => s.domain === domain,
                        ).length;
                        return (
                          <button
                            key={domain}
                            type="button"
                            onClick={() => setActiveSkillDomain(domain)}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              width: "calc(100% - 12px)",
                              margin: "1px 6px",
                              padding: "6px 10px",
                              background: isActiveDomain
                                ? T.bgActive
                                : "transparent",
                              border: "none",
                              borderRadius: 5,
                              cursor: "pointer",
                              textAlign: "left",
                              transition: "background 0.12s",
                            }}
                            onMouseEnter={(e) => {
                              if (!isActiveDomain)
                                (
                                  e.currentTarget as HTMLButtonElement
                                ).style.background = T.bgHover;
                            }}
                            onMouseLeave={(e) => {
                              (
                                e.currentTarget as HTMLButtonElement
                              ).style.background = isActiveDomain
                                ? T.bgActive
                                : "transparent";
                            }}
                          >
                            <span
                              style={{
                                fontSize: 12,
                                color: isActiveDomain
                                  ? T.textPrimary
                                  : T.textNav,
                              }}
                            >
                              {DOMAIN_LABELS[domain] ?? domain}
                            </span>
                            <span
                              style={{
                                fontSize: 10,
                                color: T.textMuted,
                                flexShrink: 0,
                              }}
                            >
                              {count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        {/* ── Main content ─────────────────────────────────────────────────── */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "14px 18px",
              borderBottom: `1px solid ${T.border}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexShrink: 0,
            }}
          >
            <span
              style={{ fontSize: 13, fontWeight: 600, color: T.textPrimary }}
            >
              {activeCategory === "Skills Registry"
                ? (DOMAIN_LABELS[activeSkillDomain] ?? activeSkillDomain)
                : activeCategory}
            </span>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: T.textMuted,
                display: "flex",
                padding: 4,
                borderRadius: 4,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color =
                  T.textPrimary;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = T.textMuted;
              }}
            >
              <X size={15} />
            </button>
          </div>

          {/* Items */}
          <div
            style={{ flex: 1, overflowY: "auto", padding: "12px 0" }}
            className="custom-scrollbar"
          >
            {/* Non-skills categories */}
            {activeCategory !== "Skills Registry" &&
              currentItems.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  disabled={item.disabled}
                  onClick={item.disabled ? undefined : item.action}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    width: "calc(100% - 28px)",
                    margin: "3px 14px",
                    padding: "12px 16px",
                    background: "transparent",
                    border: `1px solid ${T.borderSubtle}`,
                    borderRadius: 9,
                    cursor: item.disabled ? "not-allowed" : "pointer",
                    textAlign: "left",
                    transition: "background 0.12s, border-color 0.12s",
                    opacity: item.disabled ? 0.38 : 1,
                    gap: 10,
                  }}
                  onMouseEnter={(e) => {
                    if (!item.disabled) {
                      (
                        e.currentTarget as HTMLButtonElement
                      ).style.background = T.bgHover;
                      (
                        e.currentTarget as HTMLButtonElement
                      ).style.borderColor = T.border;
                    }
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      "transparent";
                    (
                      e.currentTarget as HTMLButtonElement
                    ).style.borderColor = T.borderSubtle;
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: T.textPrimary,
                      }}
                    >
                      {item.label}
                    </div>
                    {item.description && (
                      <div
                        style={{
                          fontSize: 11.5,
                          color: T.textMuted,
                          marginTop: 3,
                          lineHeight: 1.4,
                        }}
                      >
                        {item.description}
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                    {item.cmd && (
                      <code
                        style={{
                          fontSize: 11,
                          color: T.textMuted,
                          background: "var(--cg-bg-badge)",
                          padding: "2px 7px",
                          borderRadius: 4,
                          fontFamily: "monospace",
                        }}
                      >
                        /{item.cmd}
                      </code>
                    )}
                    {item.tag && (
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          padding: "2px 6px",
                          borderRadius: 4,
                          background: "var(--cg-bg-badge)",
                          color: T.textMuted,
                          letterSpacing: "0.03em",
                        }}
                      >
                        {item.tag}
                      </span>
                    )}
                  </div>
                </button>
              ))}

            {/* Skills Registry */}
            {activeCategory === "Skills Registry" &&
              skillsForDomain.map((skill) => (
                <button
                  key={skill.name}
                  type="button"
                  onClick={() => insertCmd(skill.name)}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    width: "calc(100% - 28px)",
                    margin: "3px 14px",
                    padding: "12px 16px",
                    background: "transparent",
                    border: `1px solid ${T.borderSubtle}`,
                    borderRadius: 9,
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "background 0.12s, border-color 0.12s",
                    gap: 10,
                  }}
                  onMouseEnter={(e) => {
                    (
                      e.currentTarget as HTMLButtonElement
                    ).style.background = T.bgHover;
                    (
                      e.currentTarget as HTMLButtonElement
                    ).style.borderColor = T.border;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      "transparent";
                    (
                      e.currentTarget as HTMLButtonElement
                    ).style.borderColor = T.borderSubtle;
                  }}
                >
                  <code
                    style={{
                      fontSize: 11,
                      color: T.textMuted,
                      background: "var(--cg-bg-badge)",
                      padding: "2px 7px",
                      borderRadius: 4,
                      flexShrink: 0,
                      marginTop: 2,
                      fontFamily: "monospace",
                    }}
                  >
                    /{skill.name}
                  </code>
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: T.textPrimary,
                      }}
                    >
                      {skill.label}
                    </div>
                    <div
                      style={{
                        fontSize: 11.5,
                        color: T.textMuted,
                        marginTop: 3,
                        lineHeight: 1.4,
                      }}
                    >
                      {skill.description}
                    </div>
                  </div>
                </button>
              ))}

            {activeCategory === "Skills Registry" &&
              skillsForDomain.length === 0 && (
                <div
                  style={{
                    padding: "40px",
                    textAlign: "center",
                    color: T.textMuted,
                    fontSize: 13,
                  }}
                >
                  No skills registered for this domain
                </div>
              )}
          </div>
        </div>
      </div>
    </div>
  );
}
