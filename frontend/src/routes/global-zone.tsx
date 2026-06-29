/* eslint-disable i18next/no-literal-string -- CloudGuard global-zone placeholder (body empty for now) */
import { useLocation } from "react-router";
import { Page } from "#/components/admin/admin-kit";

const TITLES: Record<string, { title: string; subtitle: string }> = {
  "security-graph": {
    title: "Security graph",
    subtitle: "Global attack-path canvas — every “view in graph” lands here.",
  },
  issues: {
    title: "Issues",
    subtitle: "Cross-domain issue queue — correlated, prioritized risk.",
  },
  findings: {
    title: "Findings",
    subtitle:
      "Global findings table — raw atomic detections across all domains.",
  },
};

export default function GlobalZone() {
  const { pathname } = useLocation();
  const seg = pathname.replace(/^\//, "").split("/")[0];
  const meta = TITLES[seg] ?? { title: seg, subtitle: "" };
  return (
    <Page>
      <div style={{ marginBottom: 18 }}>
        <h1
          style={{
            fontSize: 19,
            fontWeight: 600,
            color: "var(--cg-text-primary)",
            letterSpacing: "-0.01em",
            margin: 0,
          }}
        >
          {meta.title}
        </h1>
        <div
          style={{
            fontSize: 13,
            color: "var(--cg-text-muted)",
            marginTop: 4,
          }}
        >
          {meta.subtitle}
        </div>
      </div>
      <div
        aria-busy="true"
        role="status"
        aria-label={`${meta.title} — loading`}
        style={{ display: "flex", flexDirection: "column", gap: 12 }}
      >
        {[0, 1, 2, 3].map((r) => (
          <div
            key={r}
            style={{
              height: 12,
              width: ["58%", "42%", "66%", "48%"][r],
              borderRadius: 6,
              background: "var(--cg-border-card)",
              opacity: 0.5,
            }}
          />
        ))}
      </div>
    </Page>
  );
}
