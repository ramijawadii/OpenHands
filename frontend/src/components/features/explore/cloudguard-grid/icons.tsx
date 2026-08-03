import React from "react";
import {
  Activity,
  CircleAlert,
  CircleCheck,
  CirclePause,
  CirclePlay,
  CircleSlash,
  CircleX,
  Clock,
  Ghost,
  GitBranch,
  GitCompare,
  GitPullRequestClosed,
  Globe,
  Hand,
  LockOpen,
  Unlink,
  Boxes,
  GitCompareArrows,
  ServerCrash,
  ShieldCheck,
  ShieldX,
  Tags,
  TriangleAlert,
  Building2,
  Database,
  FileQuestion,
  HardDrive,
  Network,
  Server,
  Zap,
} from "lucide-react";
import { SvgIcon } from "./SvgIcon";
import { CountryFlag, COUNTRY_NAME } from "./flags";
import { SeverityGauge } from "./SeverityGauge";

/**
 * Reusable icon library for indexed resource kinds.
 *
 * One place that maps a resource `kind` to its glyph and tint, so every
 * surface that lists resources — the grid tree, and anything added later —
 * renders the same icon for the same kind. Adding a kind means adding one
 * entry here, not touching each call site.
 *
 * Icons come from `lucide-react`, already the app's icon set, so these match
 * the sidebar and explore nav rather than introducing a second visual language.
 * SVG rather than Unicode glyphs on purpose: glyphs render differently per OS
 * and font and can fall back to a tofu box.
 */

type IconComponent = React.ComponentType<{
  size?: number;
  strokeWidth?: number;
}>;

interface IconSpec {
  Icon: IconComponent;
  /** Tint, so depth and kind are readable without reading the label. */
  color: string;
}

const REGISTRY: Record<string, IconSpec> = {
  // Container / grouping levels
  Account: { Icon: Building2, color: "var(--cgx-account)" },
  Cluster: { Icon: Boxes, color: "var(--cgx-cluster)" },

  // Leaf resource kinds
  Database: { Icon: Database, color: "var(--cgx-database)" },
  Bucket: { Icon: HardDrive, color: "var(--cgx-storage)" },
  Function: { Icon: Zap, color: "var(--cgx-function)" },
  Instance: { Icon: Server, color: "var(--cgx-compute)" },
  LoadBalancer: { Icon: Network, color: "var(--cgx-network)" },
};

const FALLBACK: IconSpec = {
  Icon: FileQuestion,
  color: "var(--cg-text-muted)",
};

export function iconSpecFor(kind: string): IconSpec {
  return REGISTRY[kind] ?? FALLBACK;
}

/** Every kind the registry knows, for anything that needs a legend. */
export function knownKinds(): string[] {
  return Object.keys(REGISTRY);
}

/**
 * Renders the icon for a resource kind inside a fixed-size span, so rows stay
 * aligned regardless of which glyph is used.
 */
export function ResourceIcon({
  kind,
  size = 14,
  strokeWidth = 1.9,
}: {
  kind: string;
  size?: number;
  strokeWidth?: number;
}) {
  const { Icon, color } = iconSpecFor(kind);
  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        flexShrink: 0,
        color,
      }}
    >
      <Icon size={size} strokeWidth={strokeWidth} />
    </span>
  );
}

/* ------------------------------------------------------------------ *
 * Cloud providers
 * ------------------------------------------------------------------ */

/**
 * Provider, service-type and exposure marks all come from `thesvg`, the
 * project's SVG logo library (MIT, 6k+ entries). Vendor logos are the real
 * marks rather than approximations, and the cloud-architecture entries give
 * proper cloud iconography for service class and exposure instead of generic
 * UI glyphs.
 *
 * Providers render in their own brand colour (`thesvg` carries a `hex` per
 * entry); the architecture marks inherit a semantic colour we set.
 */
const PROVIDER_SLUG: Record<string, string> = {
  AWS: "aws",
  Azure: "microsoft_azure",
  GCP: "google_cloud",
  OCI: "oracle",
  Alibaba: "alibaba_cloud",
};

export function ProviderBadge({ provider }: { provider: string }) {
  const slug = PROVIDER_SLUG[provider];
  if (!slug) return <span>{provider}</span>;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
      <SvgIcon slug={slug} size={14} useBrandColor />
      {provider}
    </span>
  );
}

/* ------------------------------------------------------------------ *
 * Service type
 * ------------------------------------------------------------------ */

const SERVICE_SLUG: Record<string, { slug: string; color: string }> = {
  Organisation: {
    slug: "azure_management_groups",
    color: "var(--cgx-account)",
  },
  Compute: { slug: "azure_virtual_machine", color: "var(--cgx-compute)" },
  Storage: { slug: "azure_storage_accounts", color: "var(--cgx-storage)" },
  Database: { slug: "azure_sql_database", color: "var(--cgx-database)" },
  Serverless: { slug: "azure_function_apps", color: "var(--cgx-function)" },
  Networking: { slug: "azure_load_balancers", color: "var(--cgx-network)" },
};

export function ServiceTypeBadge({
  service,
  /** Mark only — for filter triggers, where the label is shown separately. */
  iconOnly = false,
}: {
  service: string;
  iconOnly?: boolean;
}) {
  const sv = SERVICE_SLUG[service];
  const mark = sv ? (
    <SvgIcon slug={sv.slug} size={iconOnly ? 12 : 14} color={sv.color} />
  ) : null;
  if (iconOnly) return mark;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
      {mark}
      <span>{service}</span>
    </span>
  );
}

/* ------------------------------------------------------------------ *
 * Exposure
 * ------------------------------------------------------------------ */

const EXPOSURE_SLUG: Record<string, { slug: string; color: string }> = {
  Public: { slug: "azure_public_ip_addresses", color: "var(--cgx-critical)" },
  Internal: { slug: "azure_virtual_networks", color: "var(--cgx-medium)" },
  Private: { slug: "azure_private_link", color: "var(--cgx-low)" },
};

export function ExposureBadge({ exposure }: { exposure: string }) {
  const e = EXPOSURE_SLUG[exposure];
  if (!e) return <span>{exposure}</span>;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        color: "var(--cg-text-primary)",
      }}
    >
      <SvgIcon slug={e.slug} size={14} color={e.color} />
      {exposure}
    </span>
  );
}

/* ------------------------------------------------------------------ *
 * Environment
 * ------------------------------------------------------------------ */

/**
 * Deployment stage. Tinted by blast radius rather than by name — prod reads
 * hottest — so the stage is legible before the label is read. `sandbox` is
 * deliberately neutral: it carries no production risk.
 */
export const ENV_COLOR: Record<string, string> = {
  prod: "var(--cgx-critical)",
  staging: "var(--cgx-medium)",
  dev: "var(--cgx-low)",
  sandbox: "var(--cgx-neutral)",
};

export function EnvBadge({
  value,
  size = 13,
}: {
  value: string;
  size?: number;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        color: "var(--cg-text-primary)",
      }}
    >
      <span style={{ display: "inline-flex", flexShrink: 0 }}>
        <GitBranch
          size={size}
          strokeWidth={1.9}
          color={ENV_COLOR[value] ?? "var(--cgx-neutral)"}
        />
      </span>
      {value}
    </span>
  );
}

/* ------------------------------------------------------------------ *
 * Health
 * ------------------------------------------------------------------ */

/**
 * Operational health — whether the resource is up and serving. Nothing to do
 * with network exposure: `exposure` already covers how it is reachable from
 * outside. Here green is the good state, unlike the exposure column where
 * green means "not exposed".
 */
const HEALTH_SPEC: Record<string, { Icon: IconComponent; color: string }> = {
  Healthy: { Icon: Activity, color: "var(--cgx-low)" },
  Degraded: { Icon: TriangleAlert, color: "var(--cgx-medium)" },
  Outage: { Icon: ServerCrash, color: "var(--cgx-critical)" },
};

export function HealthBadge({ value }: { value: string }) {
  const spec = HEALTH_SPEC[value];
  if (!spec) return <span>{value}</span>;
  const { Icon, color } = spec;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        color: "var(--cg-text-primary)",
      }}
    >
      <span style={{ display: "inline-flex", color, flexShrink: 0 }}>
        <Icon size={14} strokeWidth={1.9} />
      </span>
      {value}
    </span>
  );
}

/* ------------------------------------------------------------------ *
 * Compliance
 * ------------------------------------------------------------------ */

const COMPLIANCE_SPEC: Record<string, { Icon: IconComponent; color: string }> =
  {
    Compliant: { Icon: ShieldCheck, color: "var(--cgx-low)" },
    Drift: { Icon: GitCompareArrows, color: "var(--cgx-medium)" },
    Untagged: { Icon: Tags, color: "var(--cgx-neutral)" },
    "Non-compliant": { Icon: ShieldX, color: "var(--cgx-critical)" },
  };

/** Chip rather than plain text: four states need more separation than colour. */
export function ComplianceChip({ value }: { value: string }) {
  const spec = COMPLIANCE_SPEC[value];
  if (!spec) return <span>{value}</span>;
  const { Icon, color } = spec;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "1px 7px 1px 5px",
        borderRadius: 10,
        border: `1px solid ${color}`,
        color: "var(--cg-text-primary)",
        fontSize: 11,
        lineHeight: "17px",
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ display: "inline-flex", color, flexShrink: 0 }}>
        <Icon size={12} strokeWidth={2} />
      </span>
      {value}
    </span>
  );
}

/* ------------------------------------------------------------------ *
 * Shared value renderer
 * ------------------------------------------------------------------ */

/**
 * Renders any column value with its icon, if that column has one.
 *
 * Used by both the grid cells and the set-filter list, so a value looks the
 * same wherever it appears — picking "AWS" in a filter shows the same mark the
 * rows show.
 */
export function ValueWithIcon({
  field,
  value,
}: {
  field: string;
  value: string;
}) {
  if (field === "provider") return <ProviderBadge provider={value} />;
  if (field === "exposure") return <ExposureBadge exposure={value} />;
  if (field === "serviceType") return <ServiceTypeBadge service={value} />;
  if (field === "country")
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
        <CountryFlag code={value} />
        {COUNTRY_NAME[value] ?? value}
      </span>
    );
  if (field === "environment") return <EnvBadge value={value} />;
  if (field === "health") return <HealthBadge value={value} />;
  if (field === "compliance") return <ComplianceChip value={value} />;
  if (field === "severity")
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
        <SeverityGauge severity={value} />
        {value}
      </span>
    );
  if (field === "kind")
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
        <ResourceIcon kind={value} />
        {value}
      </span>
    );
  return <span>{value}</span>;
}

/** Columns whose values carry an icon. */
export const ICON_FIELDS = new Set([
  "severity",
  "environment",
  "health",
  "compliance",
  "provider",
  "exposure",
  "serviceType",
  "country",
  "kind",
]);

/* ------------------------------------------------------------------ *
 * Lifecycle state
 * ------------------------------------------------------------------ */

const STATE_SPEC: Record<string, { Icon: IconComponent; color: string }> = {
  running: { Icon: CirclePlay, color: "var(--cgx-low)" },
  stopped: { Icon: CirclePause, color: "var(--cgx-neutral)" },
  terminated: { Icon: CircleX, color: "var(--cgx-neutral)" },
  error: { Icon: CircleAlert, color: "var(--cgx-critical)" },
};

/* ------------------------------------------------------------------ *
 * Provenance
 * ------------------------------------------------------------------ */

/**
 * Every managed-by value gets its tool's brand mark — except `manual`, which
 * gets a human hand. It should look like the odd one out, because an
 * unmanaged resource is the highest-signal field in the schema.
 */
const MANAGED_SLUG: Record<string, string> = {
  terraform: "terraform",
  cloudformation: "aws",
  pulumi: "pulumi",
};

const DRIFT_SPEC: Record<string, { Icon: IconComponent; color: string }> = {
  "in-sync": { Icon: GitCompare, color: "var(--cgx-low)" },
  drifted: { Icon: GitCompareArrows, color: "var(--cgx-medium)" },
  unmanaged: { Icon: GitPullRequestClosed, color: "var(--cgx-critical)" },
};

/* ------------------------------------------------------------------ *
 * Ownership classification
 * ------------------------------------------------------------------ */

/** Tier 0 is the most critical, so the scale runs red → grey. */
const TIER_COLOR: Record<string, string> = {
  "Tier 0": "var(--cgx-critical)",
  "Tier 1": "var(--cgx-high)",
  "Tier 2": "var(--cgx-medium)",
  "Tier 3": "var(--cgx-neutral)",
};

const SENSITIVE = new Set(["PII", "PCI", "PHI", "Confidential"]);

/* ------------------------------------------------------------------ *
 * Freshness
 * ------------------------------------------------------------------ */

const STALENESS_SPEC: Record<string, { Icon: IconComponent; color: string }> = {
  Fresh: { Icon: CircleCheck, color: "var(--cgx-low)" },
  Ageing: { Icon: Clock, color: "var(--cgx-medium)" },
  Stale: { Icon: Clock, color: "var(--cgx-high)" },
  Untrusted: { Icon: CircleSlash, color: "var(--cgx-critical)" },
};

function IconLabel({
  Icon,
  color,
  children,
}: {
  Icon: IconComponent;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        color: "var(--cg-text-primary)",
      }}
    >
      <span style={{ display: "inline-flex", color, flexShrink: 0 }}>
        <Icon size={14} strokeWidth={1.9} />
      </span>
      {children}
    </span>
  );
}

export function StateBadge({ value }: { value: string }) {
  const spec = STATE_SPEC[value];
  if (!spec) return <span>{value}</span>;
  return (
    <IconLabel Icon={spec.Icon} color={spec.color}>
      {value}
    </IconLabel>
  );
}

export function ManagedByBadge({ value }: { value: string }) {
  const slug = MANAGED_SLUG[value];
  if (slug) {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 7,
          color: "var(--cg-text-primary)",
        }}
      >
        <SvgIcon slug={slug} size={14} useBrandColor />
        {value}
      </span>
    );
  }
  return (
    <IconLabel Icon={Hand} color="var(--cgx-high)">
      {value}
    </IconLabel>
  );
}

export function DriftBadge({ value }: { value: string }) {
  const spec = DRIFT_SPEC[value];
  if (!spec) return <span>{value}</span>;
  return (
    <IconLabel Icon={spec.Icon} color={spec.color}>
      {value}
    </IconLabel>
  );
}

export function TierBadge({ value }: { value: string }) {
  const color = TIER_COLOR[value] ?? "var(--cgx-neutral)";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        color: "var(--cg-text-primary)",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 8,
          height: 8,
          borderRadius: 2,
          background: color,
          flexShrink: 0,
        }}
      />
      {value}
    </span>
  );
}

export function DataClassBadge({ value }: { value: string }) {
  if (SENSITIVE.has(value)) {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 7,
          color: "var(--cg-text-primary)",
        }}
      >
        <SvgIcon
          slug="azure_azure_information_protection"
          size={14}
          color="var(--cgx-critical)"
        />
        {value}
      </span>
    );
  }
  return (
    <IconLabel Icon={Globe} color="var(--cgx-neutral)">
      {value}
    </IconLabel>
  );
}

export function InternetBadge({ value }: { value: boolean }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        color: "var(--cg-text-primary)",
      }}
    >
      <SvgIcon
        slug={value ? "azure_public_ip_addresses" : "azure_private_link"}
        size={14}
        color={value ? "var(--cgx-critical)" : "var(--cgx-low)"}
      />
      {value ? "Reachable" : "No"}
    </span>
  );
}

export function StalenessBadge({ value }: { value: string }) {
  const spec = STALENESS_SPEC[value];
  if (!spec) return <span>{value}</span>;
  return (
    <IconLabel Icon={spec.Icon} color={spec.color}>
      {value}
    </IconLabel>
  );
}

export function EncryptionBadge({ value }: { value: string }) {
  if (value === "none") {
    return (
      <IconLabel Icon={LockOpen} color="var(--cgx-critical)">
        {value}
      </IconLabel>
    );
  }
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        color: "var(--cg-text-primary)",
      }}
    >
      <SvgIcon slug="azure_keys" size={14} color="var(--cgx-low)" />
      {value}
    </span>
  );
}

/** Yes/No that reads as a state, not as a string. */
export function BoolBadge({
  value,
  goodWhenTrue = true,
}: {
  value: boolean;
  goodWhenTrue?: boolean;
}) {
  const good = goodWhenTrue ? value : !value;
  return (
    <IconLabel
      Icon={value ? CircleCheck : CircleX}
      color={good ? "var(--cgx-low)" : "var(--cgx-critical)"}
    >
      {value ? "Yes" : "No"}
    </IconLabel>
  );
}

export function AnomalyBadge({
  value,
  kind,
}: {
  value: boolean;
  kind: "shadow" | "orphaned";
}) {
  if (!value) return <span style={{ opacity: 0.4 }}>—</span>;
  return (
    <IconLabel
      Icon={kind === "shadow" ? Ghost : Unlink}
      color="var(--cgx-high)"
    >
      {kind === "shadow" ? "Shadow" : "Orphaned"}
    </IconLabel>
  );
}
