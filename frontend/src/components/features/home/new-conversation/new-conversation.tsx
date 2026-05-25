import { useNavigate } from "react-router";
import {
  Plus,
  SlidersHorizontal,
  ClipboardCheck,
  UserCheck,
  AlertTriangle,
} from "lucide-react";
import { useCreateConversation } from "#/hooks/mutation/use-create-conversation";
import { Card } from "#/ui/card";

const USE_CASES = [
  {
    icon: SlidersHorizontal,
    name: "Cloud Misconfiguration Scan",
    description:
      "Detect exposed resources, open ports, and config drift across AWS, Azure, GCP",
    query: "Scan cloud resources for misconfiguration",
  },
  {
    icon: ClipboardCheck,
    name: "Compliance Audit",
    description:
      "Full audit against CIS, NIST, PCI-DSS, HIPAA, SOC2 benchmarks",
    query: "Write a full compliance audit of cloud infrastructure",
  },
  {
    icon: UserCheck,
    name: "IAM & Permissions Review",
    description:
      "Identify over-privileged roles, stale credentials, and MFA gaps",
    query: "Check IAM permissions and roles for security issues",
  },
  {
    icon: AlertTriangle,
    name: "Incident Response",
    description:
      "Investigate alerts, trace lateral movement, and contain threats",
    query: "Initiate incident response investigation",
  },
];

const badgeBg = "var(--cg-bg-badge)";
const textNav = "var(--cg-text-nav)";
const textPrimary = "var(--cg-text-primary)";
const textMuted = "var(--cg-text-muted)";
const bgHover = "var(--cg-bg-hover)";

export function NewConversation() {
  const navigate = useNavigate();
  const { mutate: createConversation, isPending } = useCreateConversation();

  const startWith = (query: string) => {
    createConversation(
      { query },
      { onSuccess: (data) => navigate(`/conversations/${data.conversation_id}`) },
    );
  };

  return (
    <Card gap="large">
      {/* ── Use cases ── */}
      <div>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: textMuted,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          Use Cases
        </span>

        <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 8 }}>
          {USE_CASES.map((uc) => {
            const Icon = uc.icon;
            return (
              <button
                key={uc.name}
                type="button"
                disabled={isPending}
                onClick={() => startWith(uc.query)}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  width: "100%",
                  padding: "8px 10px",
                  background: "transparent",
                  border: "none",
                  borderRadius: 6,
                  cursor: isPending ? "not-allowed" : "pointer",
                  textAlign: "left",
                  transition: "background 0.12s",
                  opacity: isPending ? 0.5 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!isPending)
                    (e.currentTarget as HTMLButtonElement).style.background =
                      bgHover;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "transparent";
                }}
              >
                {/* Icon badge — same style as sidebar sub-items */}
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 6,
                    background: badgeBg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    marginTop: 2,
                  }}
                >
                  <Icon size={12} style={{ color: textNav }} />
                </div>

                {/* Text */}
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: textPrimary,
                      lineHeight: 1.3,
                    }}
                  >
                    {uc.name}
                  </div>
                  <p
                    style={{
                      fontSize: 10.5,
                      color: "#969696b8",
                      lineHeight: 1.4,
                      margin: "2px 0 0",
                    }}
                  >
                    {uc.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Start New Conversation button — bottom, white ── */}
      <button
        type="button"
        disabled={isPending}
        onClick={() => startWith("")}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          width: "100%",
          padding: "8px 16px",
          background: "var(--cg-btn-cta-bg)",
          border: "none",
          borderRadius: 8,
          cursor: isPending ? "not-allowed" : "pointer",
          transition: "background 0.12s",
          opacity: isPending ? 0.7 : 1,
        }}
        onMouseEnter={(e) => {
          if (!isPending)
            (e.currentTarget as HTMLButtonElement).style.background = "var(--cg-btn-cta-hover)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = "var(--cg-btn-cta-bg)";
        }}
      >
        <Plus size={15} style={{ color: "var(--cg-btn-cta-text)" }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--cg-btn-cta-text)" }}>
          Start New Conversation
        </span>
      </button>
    </Card>
  );
}
