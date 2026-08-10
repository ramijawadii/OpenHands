/* eslint-disable i18next/no-literal-string -- node panels */
import React from "react";
import {
  Activity,
  ArrowUpRight,
  Building2,
  Check,
  Clock,
  Copy,
  FileLock2,
  Globe,
  KeyRound,
  Lock,
  LockOpen,
  Network,
  User,
  Users,
  FileText,
  Gavel,
  GitBranch,
  Layers,
  Radar,
  ScrollText,
  ShieldAlert,
  Wrench,
} from "lucide-react";
import { APP_FONT } from "#/components/features/explore/cloudguard-grid/theme";
import { SeverityGauge } from "#/components/features/explore/cloudguard-grid/SeverityGauge";
import { CountryFlag } from "#/components/features/explore/cloudguard-grid/flags";
import { REGION_COUNTRY } from "#/components/features/explore/cloudguard-grid/data";
import {
  ENV_COLOR,
  ResourceIcon,
} from "#/components/features/explore/cloudguard-grid/icons";
import { SvgIcon } from "#/components/features/explore/cloudguard-grid/SvgIcon";
import { IconRow, NestedNav, Row, Section } from "./RemediationPanes";
import type { ActionSeverity, RemediationAction } from "./remediation-data";
import type { LinkedAsset, LinkedFinding } from "./remediation-detail-data";
import {
  buildAssetNode,
  buildFindingNode,
  type NodeSection,
} from "./remediation-node-data";

/**
 * Two panels, not one.
 *
 * A finding is an OBSERVATION — detector, rule, first seen, occurrences, and it
 * closes. An asset is a THING — kind, owner, criticality, exposure, and it is
 * reconfigured or destroyed but never closed. One panel over both produced an
 * asset page showing "Detection" and a finding page showing "Posture", and both
 * derived their location from the parent action so every node rendered
 * identically.
 *
 * They share chrome — the back control, the identity block, `Section`, `Row`,
 * `IconRow` — so a node still looks like part of one product. What differs is
 * which sections exist, which is the honest difference.
 *
 * Each panel renders the OTHER side of the join as a navigable list, so a
 * reader can walk finding → asset → its other findings without going back to
 * the table.
 */

const MONO = "var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace)";

const PROVIDER_SLUG: Record<string, string> = {
  AWS: "aws",
  Azure: "microsoft_azure",
  GCP: "google_cloud",
};

const SEV_TONE: Record<string, string> = {
  Critical: "var(--cgx-critical)",
  High: "var(--cgx-high)",
  Medium: "var(--cgx-medium)",
  Low: "var(--cgx-low)",
};

/* ------------------------------------------------------------------ *
 * Shared chrome
 * ------------------------------------------------------------------ */

/**
 * Title, identifier with copy, a qualifying line, and an optional action.
 *
 * The action sits on the title row rather than at the foot of the panel: on an
 * asset the one thing a reader reaches for is "show me this in the Inventory",
 * and burying it under six sections means scrolling past everything to reach
 * the thing they wanted first.
 */
function Identity({
  mark,
  title,
  reference,
  summary,
  meta,
  action,
}: {
  mark: React.ReactNode;
  title: string;
  reference: string;
  summary: string;
  /** Icon row under the summary — provider, region, environment. */
  meta?: React.ReactNode;
  action?: React.ReactNode;
}) {
  const [copied, setCopied] = React.useState(false);
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
      <span style={{ display: "inline-flex", paddingTop: 3, flexShrink: 0 }}>
        {mark}
      </span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          <span style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.2 }}>
            {title}
          </span>
          {action && <span style={{ marginLeft: "auto" }}>{action}</span>}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginTop: 3,
            fontSize: 11.5,
            color: "var(--cg-text-muted)",
          }}
        >
          <span style={{ fontFamily: MONO, overflowWrap: "anywhere" }}>
            {reference}
          </span>
          <button
            type="button"
            aria-label="Copy identifier"
            title="Copy identifier"
            onClick={() => {
              navigator.clipboard?.writeText(reference);
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1400);
            }}
            style={{
              display: "inline-flex",
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
              flexShrink: 0,
              color: copied ? "var(--cgx-low)" : "var(--cg-text-muted)",
            }}
          >
            {copied ? <Check size={11} /> : <Copy size={11} />}
          </button>
        </div>

        <div
          style={{ marginTop: 2, fontSize: 12, color: "var(--cg-text-muted)" }}
        >
          {summary}
        </div>

        {meta && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 10,
              marginTop: 6,
              fontSize: 11.5,
              color: "var(--cg-text-primary)",
            }}
          >
            {meta}
          </div>
        )}
      </div>
    </div>
  );
}

/** Provider logo · region flag · environment, as one inline location line. */
function LocationMeta({ action }: { action: RemediationAction }) {
  return (
    <>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
        {PROVIDER_SLUG[action.provider] && (
          <SvgIcon
            slug={PROVIDER_SLUG[action.provider]}
            size={14}
            useBrandColor
          />
        )}
        {action.provider}
      </span>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
        <Building2 size={12} style={{ color: "var(--cg-text-muted)" }} />
        {action.account}
      </span>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
        <CountryFlag code={REGION_COUNTRY[action.region]} width={14} />
        {action.region}
      </span>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
        <GitBranch size={12} color={ENV_COLOR[action.environment]} />
        {action.environment}
      </span>
    </>
  );
}

function Callout({
  severity,
  text,
}: {
  severity: ActionSeverity;
  text: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        margin: "12px 0 2px",
        padding: "8px 12px",
        borderRadius: 6,
        // Outline only. The filled panel read as an alert banner competing with
        // the severity pill inside it — two things saying "critical" at two
        // weights. The pill carries the severity; the box only groups it.
        border: `1px solid ${SEV_TONE[severity]}`,
        background: "transparent",
      }}
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          padding: "1px 8px",
          borderRadius: 10,
          fontSize: 10.5,
          lineHeight: "17px",
          border: `1px solid ${SEV_TONE[severity]}`,
          color: SEV_TONE[severity],
          whiteSpace: "nowrap",
          flexShrink: 0,
        }}
      >
        <SeverityGauge severity={severity} size={11} />
        {severity}
      </span>
      <span style={{ fontSize: 12.5 }}>{text}</span>
    </div>
  );
}

function rowsOf(section: NodeSection) {
  return section.rows.map((r) => (
    <Row
      key={r.label}
      label={r.label}
      value={
        r.mono ? (
          <span
            style={{
              fontFamily: MONO,
              fontSize: 11.5,
              overflowWrap: "anywhere",
            }}
          >
            {r.value}
          </span>
        ) : (
          r.value
        )
      }
    />
  ));
}

/**
 * The mark for one detail row.
 *
 * Rows in Cloud & location, Identity and Posture carry the SAME glyphs the
 * inventory and the Summary use — provider logo, country flag, environment
 * branch — so a reader recognises "which cloud, which region, is it encrypted"
 * without reading the label. Some marks are value-dependent: an open padlock
 * for disabled encryption says more than a padlock beside the word "Disabled".
 *
 * Returns `undefined` where no glyph carries real meaning; `IconRow` then omits
 * the slot rather than reserving empty space, so the value column stays flush.
 */
function rowMark(
  label: string,
  value: string,
  action: RemediationAction,
): React.ReactNode | undefined {
  const off = value === "Disabled" || value === "Blocked";

  switch (label) {
    /* Cloud & location */
    case "Cloud":
      return PROVIDER_SLUG[action.provider] ? (
        <SvgIcon
          slug={PROVIDER_SLUG[action.provider]}
          size={14}
          useBrandColor
        />
      ) : undefined;
    case "Account / Subscription":
      return <Building2 size={13} />;
    case "Region / AZ":
      return <CountryFlag code={REGION_COUNTRY[action.region]} width={15} />;
    case "VPC / Subnet":
      return <Network size={13} />;
    case "Environment":
      return <GitBranch size={13} color={ENV_COLOR[action.environment]} />;

    /* Identity & access */
    case "Owner":
      return <User size={13} />;
    case "Team":
      return <Users size={13} />;
    case "Attached roles":
      return <KeyRound size={13} />;
    case "Public access":
      return off ? (
        <Lock size={13} color="var(--cgx-low)" />
      ) : (
        <Globe size={13} color="var(--cgx-critical)" />
      );
    case "Last access":
      return <Clock size={13} />;

    /* Posture */
    case "Criticality":
      return <ShieldAlert size={13} />;
    case "Data classification":
      return <FileLock2 size={13} />;
    case "Exposure":
      return value === "Internet-facing" ? (
        <Globe size={13} color="var(--cgx-critical)" />
      ) : (
        <Globe size={13} />
      );
    case "Encryption at rest":
      return off ? (
        <LockOpen size={13} color="var(--cgx-critical)" />
      ) : (
        <Lock size={13} color="var(--cgx-low)" />
      );
    case "Logging":
      return off ? (
        <ScrollText size={13} color="var(--cgx-critical)" />
      ) : (
        <ScrollText size={13} color="var(--cgx-low)" />
      );
    case "Last scanned":
      return <Radar size={13} />;

    default:
      return undefined;
  }
}

/** Detail rows WITH their marks — used by the asset panel's three sections. */
function markedRows(section: NodeSection, action: RemediationAction) {
  return section.rows.map((r) => (
    <IconRow
      key={r.label}
      label={r.label}
      icon={rowMark(r.label, r.value, action)}
    >
      {r.mono ? (
        <span
          style={{ fontFamily: MONO, fontSize: 11.5, overflowWrap: "anywhere" }}
        >
          {r.value}
        </span>
      ) : (
        r.value
      )}
    </IconRow>
  ));
}

/** A navigable row in a cross-reference list — the join, made walkable. */
function LinkRow({
  mark,
  title,
  meta,
  onOpen,
}: {
  mark: React.ReactNode;
  title: string;
  meta: string;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      className="cg-asset"
      onClick={onOpen}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        width: "100%",
        padding: "8px 2px",
        background: "none",
        border: "none",
        borderBottom: "1px solid var(--cg-border-subtle)",
        color: "var(--cg-text-primary)",
        fontFamily: APP_FONT,
        fontSize: 12.5,
        textAlign: "left",
        cursor: "pointer",
      }}
    >
      <span style={{ display: "inline-flex", flexShrink: 0 }}>{mark}</span>
      <span
        style={{
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {title}
      </span>
      <span
        style={{
          marginLeft: "auto",
          fontSize: 11,
          color: "var(--cg-text-muted)",
          whiteSpace: "nowrap",
        }}
      >
        {meta}
      </span>
      <ArrowUpRight
        size={13}
        className="cg-asset-open"
        style={{ color: "var(--cg-accent)", flexShrink: 0 }}
      />
    </button>
  );
}

/** Control chips. Stated as a breach, which is what justifies the action. */
function ViolationChips({
  items,
}: {
  items: { framework: string; ref: string; title: string }[];
}) {
  return (
    <div
      style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 10 }}
    >
      {items.map((c) => (
        <span
          key={`${c.framework}${c.ref}`}
          title={c.title}
          style={{
            display: "inline-flex",
            alignItems: "baseline",
            gap: 4,
            padding: "0 6px",
            fontSize: 10,
            lineHeight: "16px",
            borderRadius: 3,
            border: "1px solid var(--cgx-critical)",
            color: "var(--cg-text-primary)",
            whiteSpace: "nowrap",
          }}
        >
          <span style={{ color: "var(--cg-text-muted)" }}>{c.framework}</span>
          <span style={{ fontFamily: MONO }}>{c.ref}</span>
        </span>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Finding
 * ------------------------------------------------------------------ */

export function FindingPanel({
  action,
  finding,
  trail,
  onOpenAsset,
}: {
  action: RemediationAction;
  finding: LinkedFinding;
  /** Ancestors, outermost first — the parent owns the navigation state. */
  trail: { label: string; onClick?: () => void }[];
  onOpenAsset: (asset: LinkedAsset) => void;
}) {
  const node = React.useMemo(
    () => buildFindingNode(action, finding),
    [action, finding],
  );

  return (
    <div className="cg-nested" style={{ color: "var(--cg-text-primary)" }}>
      <NestedNav trail={trail} current={finding.id} />
      <Identity
        mark={<SeverityGauge severity={finding.severity} size={16} />}
        title={finding.title}
        reference={node.ref}
        summary={node.summary}
        meta={<LocationMeta action={action} />}
      />
      <Callout severity={finding.severity} text={finding.title} />

      <Section title="Summary" count={5} icon={<FileText size={13} />} open>
        <IconRow label="Finding">{finding.title}</IconRow>
        <IconRow label="Description">
          {`Raised by ${finding.detector} on ${node.assets.length} asset${node.assets.length === 1 ? "" : "s"} in ${action.account}. `}
          {finding.closes === "Full"
            ? "This action closes it outright."
            : "This action closes it partially — a follow-up will be required."}
        </IconRow>
        <IconRow
          label="Provider"
          icon={
            PROVIDER_SLUG[action.provider] ? (
              <SvgIcon
                slug={PROVIDER_SLUG[action.provider]}
                size={14}
                useBrandColor
              />
            ) : undefined
          }
        >
          {action.provider}
        </IconRow>
        <IconRow label="Account" icon={<Building2 size={13} />}>
          {action.account}
        </IconRow>
        <IconRow
          label="Region"
          icon={<CountryFlag code={REGION_COUNTRY[action.region]} width={15} />}
        >
          {action.region}
        </IconRow>
      </Section>

      <Section
        title="Controls violated"
        hint="what this finding breaches"
        count={node.violates.length}
        icon={<Gavel size={13} />}
        open
      >
        <ViolationChips items={node.violates} />
        {node.violates.map((c) => (
          <Row
            key={`${c.framework}${c.ref}`}
            label={`${c.framework} ${c.ref}`}
            value={
              <span
                style={{ display: "inline-flex", alignItems: "center", gap: 7 }}
              >
                {c.title}
                <span style={{ color: "var(--cgx-critical)", fontSize: 11 }}>
                  violated
                </span>
              </span>
            }
          />
        ))}
      </Section>

      {/* The join, from the finding's side. */}
      <Section
        title="Affected assets"
        hint="click through to the asset"
        count={node.assets.length}
        icon={<Layers size={13} />}
        open
      >
        {node.assets.map((a) => (
          <LinkRow
            key={a.id}
            mark={<ResourceIcon kind={a.kind} size={12} />}
            title={a.name}
            meta={`${a.kind} · ${a.criticality} · ${a.exposure}`}
            onOpen={() => onOpenAsset(a)}
          />
        ))}
      </Section>

      <Section
        title="Detection"
        count={node.detection.rows.length}
        icon={<Radar size={13} />}
      >
        {rowsOf(node.detection)}
      </Section>

      <Section
        title="Impact"
        count={node.impact.rows.length}
        icon={<ShieldAlert size={13} />}
      >
        {rowsOf(node.impact)}
      </Section>

      <Section
        title="Linked remediation"
        count={node.remediation.rows.length}
        icon={<Wrench size={13} />}
      >
        {rowsOf(node.remediation)}
      </Section>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Asset
 * ------------------------------------------------------------------ */

export function AssetPanel({
  action,
  asset,
  trail,
  onOpenFinding,
  onOpenInventory,
}: {
  action: RemediationAction;
  asset: LinkedAsset;
  /** Ancestors, outermost first — the parent owns the navigation state. */
  trail: { label: string; onClick?: () => void }[];
  onOpenFinding: (finding: LinkedFinding) => void;
  onOpenInventory?: (name: string) => void;
}) {
  const node = React.useMemo(
    () => buildAssetNode(action, asset),
    [action, asset],
  );

  return (
    <div className="cg-nested" style={{ color: "var(--cg-text-primary)" }}>
      <NestedNav trail={trail} current={asset.id} />
      <Identity
        mark={<ResourceIcon kind={asset.kind} size={16} />}
        title={asset.name}
        reference={node.ref}
        summary={node.summary}
        meta={<LocationMeta action={action} />}
        action={
          onOpenInventory && (
            <button
              type="button"
              className="cg-report-action"
              onClick={() => onOpenInventory(asset.name)}
              title={`Open ${asset.name} in Inventory`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                height: 26,
                padding: "0 9px",
                fontSize: 12,
                fontFamily: APP_FONT,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              Inventory <ArrowUpRight size={12} />
            </button>
          )
        }
      />

      {/* An asset only earns a callout when something on it is actually
          serious. A permanent grey banner on every asset teaches the eye to
          skip the place the real ones appear. */}
      {node.worst && (node.worst === "Critical" || node.worst === "High") && (
        <Callout
          severity={node.worst}
          text={`${node.findings.length} finding${node.findings.length === 1 ? "" : "s"} on this asset — worst is ${node.worst}`}
        />
      )}

      <Section title="Summary" count={6} icon={<FileText size={13} />} open>
        <IconRow
          label="Asset"
          icon={<ResourceIcon kind={asset.kind} size={13} />}
        >
          <span style={{ fontFamily: MONO, fontSize: 11.5 }}>{asset.name}</span>
        </IconRow>
        <IconRow label="Kind">{asset.kind}</IconRow>
        <IconRow
          label="Provider"
          icon={
            PROVIDER_SLUG[action.provider] ? (
              <SvgIcon
                slug={PROVIDER_SLUG[action.provider]}
                size={14}
                useBrandColor
              />
            ) : undefined
          }
        >
          {action.provider}
        </IconRow>
        <IconRow label="Account" icon={<Building2 size={13} />}>
          {action.account}
        </IconRow>
        <IconRow
          label="Region"
          icon={<CountryFlag code={REGION_COUNTRY[action.region]} width={15} />}
        >
          {action.region}
        </IconRow>
        <IconRow
          label="Environment"
          icon={<GitBranch size={13} color={ENV_COLOR[action.environment]} />}
        >
          {action.environment}
        </IconRow>
      </Section>

      {/* The join, from the asset's side. */}
      <Section
        title="Findings on this asset"
        hint="click through to the finding"
        count={node.findings.length}
        icon={<Radar size={13} />}
        open
      >
        {node.findings.map((f) => (
          <LinkRow
            key={f.id}
            mark={<SeverityGauge severity={f.severity} size={13} />}
            title={f.title}
            meta={`${f.severity} · ${f.detector} · closes ${f.closes}`}
            onOpen={() => onOpenFinding(f)}
          />
        ))}
      </Section>

      <Section
        title="Cloud & location"
        count={node.placement.rows.length}
        icon={<Building2 size={13} />}
      >
        {markedRows(node.placement, action)}
      </Section>

      <Section
        title="Identity & access"
        count={node.identity.rows.length}
        icon={<Layers size={13} />}
      >
        {markedRows(node.identity, action)}
      </Section>

      <Section
        title="Posture"
        count={node.posture.rows.length}
        icon={<Activity size={13} />}
      >
        {markedRows(node.posture, action)}
      </Section>
    </div>
  );
}
