/* eslint-disable i18next/no-literal-string, no-nested-ternary, react/no-unused-prop-types, jsx-a11y/control-has-associated-label, @typescript-eslint/no-use-before-define, react/no-unescaped-entities, react/jsx-props-no-spreading, @typescript-eslint/naming-convention, prefer-template, no-void, jsx-a11y/label-has-associated-control, @typescript-eslint/no-unused-vars, radix -- CloudGuard mock settings UI (local-state only) */
import React from "react";
import { useSettingsDoc, useAutosaveDoc } from "#/hooks/query/use-cloudguard";
import {
  ConfirmButton,
  ScopeBadge,
  useUndoToast,
} from "#/components/features/settings/settings-kit";

const S = {
  textPrimary: "var(--cg-text-primary)",
  textSecondary: "var(--cg-text-nav)",
  textMuted: "var(--cg-text-muted)",
  border: "var(--cg-border)",
  borderStrong: "var(--cg-border-strong)",
  accent: "var(--cg-accent)",
  success: "#4caf7d",
  badgeBg: "var(--cg-bg-badge)",
  cardBg: "var(--cg-bg-card)",
} as const;

interface Integ {
  id: string;
  name: string;
  category: string;
  color: string;
  connected: boolean;
  config?: string;
}

const INITIAL: Integ[] = [
  {
    id: "slack",
    name: "Slack",
    category: "ChatOps",
    color: "#611f69",
    connected: true,
    config: "Posting to #soc-alerts, #cloud-sec",
  },
  {
    id: "teams",
    name: "Microsoft Teams",
    category: "ChatOps",
    color: "#4b53bc",
    connected: false,
  },
  {
    id: "jira",
    name: "Jira",
    category: "Ticketing",
    color: "#0052cc",
    connected: true,
    config: "Project SECOPS · auto-create on Critical",
  },
  {
    id: "servicenow",
    name: "ServiceNow",
    category: "Ticketing",
    color: "#62d84e",
    connected: false,
  },
  {
    id: "pagerduty",
    name: "PagerDuty",
    category: "SIEM / SOAR",
    color: "#06ac38",
    connected: true,
    config: "Service: Cloud Security On-call",
  },
  {
    id: "splunk",
    name: "Splunk",
    category: "SIEM / SOAR",
    color: "#ed0080",
    connected: false,
  },
  {
    id: "sentinel",
    name: "Microsoft Sentinel",
    category: "SIEM / SOAR",
    color: "#0078d4",
    connected: false,
  },
  {
    id: "okta",
    name: "Okta",
    category: "Identity",
    color: "#007dc1",
    connected: true,
    config: "SAML SSO + SCIM provisioning",
  },
  {
    id: "entra",
    name: "Entra ID",
    category: "Identity",
    color: "#0078d4",
    connected: false,
  },
  {
    id: "github",
    name: "GitHub",
    category: "Source control",
    color: "#6e40c9",
    connected: true,
    config: "IaC scanning on sentinel-org/*",
  },
  {
    id: "gitlab",
    name: "GitLab",
    category: "Source control",
    color: "#fc6d26",
    connected: false,
  },
];

const CATEGORIES = [
  "ChatOps",
  "Ticketing",
  "SIEM / SOAR",
  "Identity",
  "Source control",
];

export default function IntegrationsSettings() {
  const [items, setItems] = React.useState<Integ[]>(INITIAL);
  const _docQ = useSettingsDoc("integrations");
  const [_ready, _setReady] = React.useState(false);
  React.useEffect(() => {
    if (_ready) return;
    if (_docQ.isError) {
      _setReady(true);
      return;
    }
    const d = _docQ.data;
    if (d) {
      if (Array.isArray(d.items)) setItems(d.items as Integ[]);
      _setReady(true);
    }
  }, [_docQ.data, _docQ.isError, _ready]);
  useAutosaveDoc("integrations", { items }, _ready);
  const toast = useUndoToast();
  const connect = (id: string) => {
    setItems((p) =>
      p.map((it) =>
        it.id === id
          ? {
              ...it,
              connected: true,
              config: it.config ?? "Configure to finish setup",
            }
          : it,
      ),
    );
    toast.show("Connected — finish configuration");
  };
  const disconnect = (id: string) =>
    setItems((p) =>
      p.map((it) =>
        it.id === id ? { ...it, connected: false, config: undefined } : it,
      ),
    );

  const connectedCount = items.filter((i) => i.connected).length;

  return (
    <div style={{ padding: "40px 48px", maxWidth: 940 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 4,
        }}
      >
        <h1
          style={{
            fontSize: 20,
            fontWeight: 400,
            color: S.textPrimary,
            margin: 0,
          }}
        >
          Integrations
        </h1>
        <ScopeBadge scope="Organization" />
      </div>
      <p
        style={{
          fontSize: 13,
          color: S.textMuted,
          marginBottom: 28,
          marginTop: 0,
        }}
      >
        Connect CloudGuard to your ChatOps, ticketing, SIEM/SOAR, identity and
        source-control tools. {connectedCount} connected. For raw event delivery
        see{" "}
        <a
          href="/settings/webhooks"
          style={{ color: S.accent, textDecoration: "none" }}
        >
          Webhooks
        </a>
        ; for cloud accounts see{" "}
        <a
          href="/settings/connectors"
          style={{ color: S.accent, textDecoration: "none" }}
        >
          Connectors
        </a>
        .
      </p>

      {CATEGORIES.map((cat) => (
        <div key={cat} style={{ marginBottom: 26 }}>
          <h2
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: S.textMuted,
              textTransform: "uppercase",
              letterSpacing: "0.07em",
              margin: "0 0 12px",
            }}
          >
            {cat}
          </h2>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
          >
            {items
              .filter((i) => i.category === cat)
              .map((it) => (
                <div
                  key={it.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    background: S.cardBg,
                    border: `1px solid ${S.border}`,
                    borderRadius: 10,
                    padding: "14px 16px",
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      background: it.color,
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 15,
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {it.name[0]}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <span
                        style={{
                          fontSize: 13.5,
                          color: S.textSecondary,
                          fontWeight: 500,
                        }}
                      >
                        {it.name}
                      </span>
                      {it.connected && (
                        <span
                          style={{
                            height: 17,
                            padding: "0 6px",
                            borderRadius: 99,
                            fontSize: 10,
                            fontWeight: 600,
                            color: S.success,
                            background: "rgba(76,175,125,0.15)",
                            display: "inline-flex",
                            alignItems: "center",
                          }}
                        >
                          Connected
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: 11.5,
                        color: S.textMuted,
                        marginTop: 2,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {it.connected ? it.config : "Not connected"}
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      flexShrink: 0,
                    }}
                  >
                    {it.connected ? (
                      <>
                        <button
                          type="button"
                          onClick={() => toast.show(`${it.name} configuration`)}
                          style={{
                            height: 28,
                            padding: "0 10px",
                            borderRadius: 6,
                            background: "transparent",
                            border: `1px solid ${S.borderStrong}`,
                            color: S.textSecondary,
                            fontSize: 12,
                            cursor: "pointer",
                          }}
                        >
                          Configure
                        </button>
                        <ConfirmButton
                          variant="link"
                          label="Disconnect"
                          title={`Disconnect ${it.name}?`}
                          body="Events and provisioning to this tool will stop."
                          confirmLabel="Disconnect"
                          onConfirm={() => disconnect(it.id)}
                        />
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => connect(it.id)}
                        style={{
                          height: 28,
                          padding: "0 12px",
                          borderRadius: 6,
                          background: "var(--cg-text-primary)",
                          color: "var(--cg-bg-card)",
                          fontSize: 12,
                          fontWeight: 500,
                          border: "none",
                          cursor: "pointer",
                        }}
                      >
                        Connect
                      </button>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      ))}
      {toast.node}
    </div>
  );
}
