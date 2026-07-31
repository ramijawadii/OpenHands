import React from "react";
import * as awsIcon from "thesvg/aws";
import * as azureIcon from "thesvg/microsoft-azure";
import * as gcpIcon from "thesvg/google-cloud";
import * as oracleIcon from "thesvg/oracle";
import * as alibabaIcon from "thesvg/alibaba-cloud";
import * as orgIcon from "thesvg/azure-management-groups";
import * as vmIcon from "thesvg/azure-virtual-machine";
import * as storageIcon from "thesvg/azure-storage-accounts";
import * as sqlIcon from "thesvg/azure-sql-database";
import * as fnIcon from "thesvg/azure-function-apps";
import * as lbIcon from "thesvg/azure-load-balancers";
import * as publicIpIcon from "thesvg/azure-public-ip-addresses";
import * as vnetIcon from "thesvg/azure-virtual-networks";
import * as privateLinkIcon from "thesvg/azure-private-link";

/**
 * Renders an icon from the `thesvg` library.
 *
 * **Imported per icon, not as a namespace.** Two reasons:
 *
 *  1. `import * as thesvg from "thesvg"` pulls the package barrel, and that
 *     barrel is broken — `@thesvg/icons/dist/index.js` contains
 *     `export type { … }`, TypeScript syntax inside a `.js` file, which
 *     Rollup cannot parse (`Expected '{', got 'type'`). The build fails
 *     outright.
 *  2. Even if it parsed, the barrel re-exports all ~6,100 icons. Naming the
 *     14 we use keeps the bundle to those 14.
 *
 * Note the subpath files are **hyphenated** (`thesvg/microsoft-azure`) even
 * though the library's runtime export names are underscored — mixing the two
 * up yields a module-not-found at build time.
 *
 * Entries are data, not components: `{ slug, title, hex, svg }` where `svg` is
 * markup. Vendor logos can render in their own brand `hex`; architecture marks
 * take a colour we set.
 */

interface Entry {
  slug: string;
  title: string;
  hex?: string;
  svg: string;
}

const REGISTRY: Record<string, Entry> = {
  aws: awsIcon as Entry,
  microsoft_azure: azureIcon as Entry,
  google_cloud: gcpIcon as Entry,
  oracle: oracleIcon as Entry,
  alibaba_cloud: alibabaIcon as Entry,
  azure_management_groups: orgIcon as Entry,
  azure_virtual_machine: vmIcon as Entry,
  azure_storage_accounts: storageIcon as Entry,
  azure_sql_database: sqlIcon as Entry,
  azure_function_apps: fnIcon as Entry,
  azure_load_balancers: lbIcon as Entry,
  azure_public_ip_addresses: publicIpIcon as Entry,
  azure_virtual_networks: vnetIcon as Entry,
  azure_private_link: privateLinkIcon as Entry,
};

export function hasIcon(slug: string): boolean {
  return Boolean(REGISTRY[slug]?.svg);
}

export function SvgIcon({
  slug,
  size = 14,
  color,
  useBrandColor = false,
}: {
  slug: string;
  size?: number;
  /** Explicit colour; the markup uses `currentColor`. */
  color?: string;
  /** Use the entry's own brand hex instead of `color`. */
  useBrandColor?: boolean;
}) {
  const entry = REGISTRY[slug];
  const raw = entry?.svg;

  // Memo must run before any early return — hooks cannot be conditional.
  const markup = React.useMemo(
    () =>
      raw
        ? raw
            .replace(/<title>[\s\S]*?<\/title>/, "")
            .replace(/\swidth="[^"]*"/, "")
            .replace(/\sheight="[^"]*"/, "")
            .replace("<svg", `<svg width="${size}" height="${size}"`)
        : "",
    [raw, size],
  );

  if (!entry?.svg) return null;

  const brand = entry.hex ? `#${entry.hex.replace(/^#/, "")}` : undefined;
  const resolved = useBrandColor ? (brand ?? color) : color;

  return (
    <span
      aria-hidden="true"
      title={entry.title}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        flexShrink: 0,
        color: resolved,
        lineHeight: 0,
      }}
      // eslint-disable-next-line react/no-danger -- build-time package asset, never user input
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}
