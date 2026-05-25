import React from "react";
import { filterSkills, getSkillsByDomain, SKILL_DOMAINS, type Skill } from "#/data/skill-registry";

const T = {
  bg: "var(--cg-bg-primary-sidebar)",
  bgHover: "var(--cg-bg-hover)",
  bgActive: "var(--cg-bg-active)",
  textPrimary: "var(--cg-text-primary)",
  textNav: "var(--cg-text-nav)",
  textMuted: "var(--cg-text-muted)",
  border: "var(--cg-border)",
  borderSubtle: "var(--cg-border-subtle)",
  accent: "var(--cg-accent)",
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

const DOMAIN_DOT: Record<string, string> = {
  IDENTITY: "#569cd6",
  POSTURE: "#4ec9b0",
  WORKLOAD: "#ce9178",
  NETWORK: "#dcdcaa",
  DATA: "#c586c0",
  CHAIN: "#f48771",
  DIAGRAMS: "#9cdcfe",
};

interface ChatSkillMenuProps {
  query: string;
  activeIndex: number;
  onSelect: (skill: Skill) => void;
  onClose: () => void;
  onIndexChange: (index: number) => void;
}

export function ChatSkillMenu({
  query,
  activeIndex,
  onSelect,
  onClose,
  onIndexChange,
}: ChatSkillMenuProps) {
  const skills = filterSkills(query);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!containerRef.current) return;
    const active = containerRef.current.querySelector<HTMLElement>(
      "[data-skill-active='true']",
    );
    active?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const showGrouped = query.trim() === "";
  const byDomain = showGrouped ? getSkillsByDomain() : null;

  let globalIdx = 0;

  const renderItem = (skill: Skill, idx: number) => {
    const isActive = idx === activeIndex % Math.max(skills.length, 1);
    return (
      <button
        key={skill.name}
        type="button"
        data-skill-active={isActive ? "true" : undefined}
        onClick={() => onSelect(skill)}
        onMouseEnter={() => onIndexChange(idx)}
        style={{
          display: "flex",
          alignItems: "flex-start",
          width: "calc(100% - 16px)",
          margin: "2px 8px",
          padding: "9px 12px",
          background: isActive ? T.bgActive : "transparent",
          border: `1px solid ${isActive ? "rgba(222,220,206,0.15)" : T.borderSubtle}`,
          borderRadius: 7,
          cursor: "pointer",
          textAlign: "left",
          gap: 10,
          transition: "background 0.10s, border-color 0.10s",
          borderLeft: isActive ? `2px solid ${T.accent}` : `1px solid ${T.borderSubtle}`,
        }}
      >
        <code
          style={{
            fontSize: 10,
            color: DOMAIN_DOT[skill.domain] ?? T.textMuted,
            background: "rgba(43,43,41,0.7)",
            padding: "2px 6px",
            borderRadius: 4,
            flexShrink: 0,
            marginTop: 1,
            fontFamily: "monospace",
            letterSpacing: "0.01em",
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
              lineHeight: 1.3,
            }}
          >
            {skill.label}
          </div>
          <div
            style={{
              fontSize: 11.5,
              color: "#969696b8",
              marginTop: 2,
              lineHeight: 1.4,
            }}
          >
            {skill.description}
          </div>
        </div>
      </button>
    );
  };

  return (
    <div
      className="absolute bottom-full left-0 right-0 mb-2 z-50"
      style={{
        background: T.bg,
        border: `1px solid ${T.border}`,
        borderRadius: 12,
        boxShadow: "0 -8px 32px rgba(0,0,0,0.65)",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "10px 14px 8px",
          borderBottom: `1px solid ${T.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 600, color: T.textPrimary, letterSpacing: "0.02em" }}>
          Skills
          {query && (
            <span style={{ color: T.accent, fontWeight: 400 }}> — /{query}</span>
          )}
        </span>
        <span style={{ fontSize: 10.5, color: T.textMuted }}>
          ↑↓ navigate · Enter select · Esc close
        </span>
      </div>

      {/* List */}
      <div
        ref={containerRef}
        className="custom-scrollbar"
        style={{ maxHeight: 340, overflowY: "auto", padding: "6px 0" }}
      >
        {skills.length === 0 ? (
          <div style={{ padding: "16px 20px", fontSize: 13, color: T.textMuted }}>
            No skills match &ldquo;/{query}&rdquo;
          </div>
        ) : showGrouped && byDomain ? (
          SKILL_DOMAINS.map((domain) => {
            const domainSkills = byDomain[domain];
            if (!domainSkills?.length) return null;
            return (
              <div key={domain}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 18px 4px",
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: DOMAIN_DOT[domain] ?? T.textMuted,
                      flexShrink: 0,
                      display: "inline-block",
                    }}
                  />
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: T.textMuted,
                      letterSpacing: "0.07em",
                      textTransform: "uppercase",
                    }}
                  >
                    {DOMAIN_LABELS[domain] ?? domain}
                  </span>
                </div>
                {domainSkills.map((skill) => {
                  const idx = globalIdx++;
                  return renderItem(skill, idx);
                })}
              </div>
            );
          })
        ) : (
          skills.map((skill, idx) => renderItem(skill, idx))
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          padding: "6px 14px",
          borderTop: `1px solid ${T.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span style={{ fontSize: 10.5, color: T.textMuted }}>
          {skills.length} skill{skills.length !== 1 ? "s" : ""}
        </span>
        <span style={{ fontSize: 10.5, color: T.textMuted, opacity: 0.6 }}>
          type to filter
        </span>
      </div>
    </div>
  );
}
