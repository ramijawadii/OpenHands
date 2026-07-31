import React from "react";
import {
  Boxes,
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

export function ServiceTypeBadge({ service }: { service: string }) {
  const sv = SERVICE_SLUG[service];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
      {sv && <SvgIcon slug={sv.slug} size={14} color={sv.color} />}
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
        color: e.color,
      }}
    >
      <SvgIcon slug={e.slug} size={14} color={e.color} />
      {exposure}
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
  "provider",
  "exposure",
  "serviceType",
  "country",
  "kind",
]);
