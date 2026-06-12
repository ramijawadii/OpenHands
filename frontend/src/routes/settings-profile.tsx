/* eslint-disable i18next/no-literal-string, no-nested-ternary, react/no-unused-prop-types, jsx-a11y/control-has-associated-label, @typescript-eslint/no-use-before-define, react/no-unescaped-entities, react/jsx-props-no-spreading, @typescript-eslint/naming-convention, prefer-template, no-void, jsx-a11y/label-has-associated-control -- CloudGuard mock settings UI (local-state only) */
import React from "react";
import {
  ScopeBadge,
  SaveBar,
  useDirty,
} from "#/components/features/settings/settings-kit";
import {
  useSettingsDoc,
  useSaveSettingsDoc,
} from "#/hooks/query/use-cloudguard";

const S = {
  pageBg: "var(--cg-bg-page)",
  cardBg: "var(--cg-bg-card)",
  inputBg: "var(--cg-input-bg)",
  inputBgFocus: "var(--cg-input-bg)",
  textPrimary: "var(--cg-text-primary)",
  textSecondary: "var(--cg-text-nav)",
  textMuted: "var(--cg-text-muted)",
  border: "var(--cg-border)",
  borderStrong: "var(--cg-border-strong)",
  borderFocus: "rgba(45,134,212,0.55)",
  accent: "var(--cg-accent)",
  success: "#4caf7d",
  purple: "var(--cg-accent-purple)",
} as const;

const LS_KEY = "cg_profile";

interface ProfileData {
  fullName: string;
  displayName: string;
  role: string;
  instructions: string;
  avatar?: string; // base64 data URL so it persists to the backend doc + survives refresh
}

function load(): ProfileData {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw) as ProfileData;
  } catch {
    /* ignore */
  }
  return {
    fullName: "Rami Sentinel",
    displayName: "Rami",
    role: "",
    instructions: "",
  };
}

const ROLES = [
  "Security Engineer",
  "SecOps Analyst",
  "Cloud Architect",
  "CISO / Security Lead",
  "DevSecOps Engineer",
  "Compliance Officer",
  "Platform Engineer",
  "Other",
];

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 36 }}>
      <h2
        style={{
          fontSize: 14,
          fontWeight: 500,
          color: S.textPrimary,
          paddingBottom: 12,
          borderBottom: `1px solid ${S.border}`,
          marginBottom: 20,
          marginTop: 0,
        }}
      >
        {title}
      </h2>
      {children}
    </div>
  );
}

function Row({
  label,
  sublabel,
  children,
}: {
  label: string;
  sublabel?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        minHeight: 44,
        padding: "10px 0",
        borderBottom: `1px solid var(--cg-border-subtle)`,
        gap: 24,
      }}
    >
      <div style={{ flexShrink: 0, maxWidth: 280 }}>
        <div style={{ fontSize: 14, color: S.textSecondary }}>{label}</div>
        {sublabel && (
          <div style={{ fontSize: 12, color: S.textMuted, marginTop: 2 }}>
            {sublabel}
          </div>
        )}
      </div>
      <div style={{ flex: 1, maxWidth: 360 }}>{children}</div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 36,
  padding: "0 10px",
  background: S.inputBg,
  border: `1px solid ${S.border}`,
  borderRadius: 6,
  color: S.textPrimary,
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "inherit",
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  appearance: "none" as const,
  cursor: "pointer",
};

export default function ProfileSettings() {
  const [data, setData] = React.useState<ProfileData>(load);
  const [savedAt, setSavedAt] = React.useState(0);
  const { dirty, baseline, reset } = useDirty(data);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const avatarUrl = data.avatar || "";

  const update = (patch: Partial<ProfileData>) =>
    setData((prev) => ({ ...prev, ...patch }));

  const onAvatarPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 1_500_000) {
      // keep the doc small; base64 inflates ~33%
      // eslint-disable-next-line no-alert
      alert("Please choose an image under 1.5 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => update({ avatar: String(reader.result) });
    reader.readAsDataURL(f);
  };

  const docQ = useSettingsDoc("profile");
  const saveMut = useSaveSettingsDoc("profile");
  const hydrated = React.useRef(false);
  React.useEffect(() => {
    const d = docQ.data;
    if (!hydrated.current && d && Object.keys(d).length) {
      hydrated.current = true;
      setData((p) => {
        const merged = { ...p, ...(d as Partial<typeof p>) };
        reset(merged);
        return merged;
      });
    }
  }, [docQ.data, reset]);

  const handleSave = () => {
    saveMut.mutate(data as unknown as Record<string, unknown>, {
      onSuccess: () => {
        reset(data);
        setSavedAt(Date.now());
      },
    });
  };

  return (
    <div style={{ padding: "40px 48px", maxWidth: 700 }}>
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
          Profile
        </h1>
        <ScopeBadge scope="You" />
      </div>
      <p
        style={{
          fontSize: 13,
          color: S.textMuted,
          marginBottom: 32,
          marginTop: 0,
        }}
      >
        Manage your personal information and preferences.
      </p>

      <Section title="Profile">
        <Row label="Avatar">
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                background: S.purple,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 16,
                fontWeight: 500,
                color: "#fff",
                flexShrink: 0,
                overflow: "hidden",
              }}
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="avatar"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                "RS"
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={onAvatarPick}
              style={{ display: "none" }}
            />
            <div style={{ display: "flex", gap: 12 }}>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                style={{
                  background: "none",
                  border: "none",
                  color: S.accent,
                  fontSize: 13,
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                Change avatar
              </button>
              <button
                type="button"
                onClick={() => update({ avatar: "" })}
                style={{
                  background: "none",
                  border: "none",
                  color: S.textMuted,
                  fontSize: 13,
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                Remove
              </button>
            </div>
          </div>
        </Row>

        <Row label="Full name">
          <input
            type="text"
            value={data.fullName}
            onChange={(e) => update({ fullName: e.target.value })}
            style={inputStyle}
          />
        </Row>

        <Row
          label="Display name"
          sublabel="Used in the console, notifications and reports."
        >
          <input
            type="text"
            value={data.displayName}
            onChange={(e) => update({ displayName: e.target.value })}
            style={inputStyle}
          />
        </Row>

        <Row
          label="Job title (for display)"
          sublabel="Shown in the console — separate from your access role (managed under Organization)."
        >
          <select
            value={data.role}
            onChange={(e) => update({ role: e.target.value })}
            style={selectStyle}
          >
            <option value="">Select title…</option>
            {ROLES.map((r) => (
              <option
                key={r}
                value={r}
                style={{ background: "var(--cg-bg-card)" }}
              >
                {r}
              </option>
            ))}
          </select>
        </Row>

        <Row
          label="Email address"
          sublabel="Managed by your identity provider (SSO)."
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <input
              type="text"
              value="rami@sentinel-org.io"
              readOnly
              style={{ ...inputStyle, color: S.textMuted, cursor: "default" }}
            />
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                height: 20,
                padding: "0 8px",
                borderRadius: 99,
                fontSize: 11,
                fontWeight: 500,
                background: "rgba(76,175,125,0.15)",
                color: S.success,
                flexShrink: 0,
              }}
            >
              Verified ✓
            </span>
          </div>
        </Row>

        <Row
          label="Instructions for CloudGuard"
          sublabel="CloudGuard will keep these in mind across scans, reports, and coverage analysis."
        >
          <textarea
            value={data.instructions}
            onChange={(e) => update({ instructions: e.target.value })}
            placeholder="e.g. always prioritize critical findings first"
            style={{
              ...inputStyle,
              height: 96,
              padding: "8px 10px",
              resize: "vertical",
              lineHeight: 1.5,
            }}
          />
        </Row>
      </Section>

      <SaveBar
        dirty={dirty}
        savedAt={savedAt}
        onSave={handleSave}
        onDiscard={() => setData(baseline)}
      />
    </div>
  );
}
