/**
 * Real service marks for the simulation graph.
 *
 * ECharts symbols take `image://…`, not a React component, so these are data
 * URIs built from `@thesvg/icons` — the same library the explore surfaces use,
 * so a queue looks like a queue everywhere in the product rather than like a
 * coloured circle here and an SQS mark there.
 *
 * **Imported per icon, never as a barrel.** `import * as icons from "thesvg"`
 * pulls a barrel containing TypeScript syntax inside a `.js` file, which
 * Rollup cannot parse — the build fails outright — and even if it parsed it
 * would pull ~6,100 icons. Naming the eleven we use keeps the bundle to those
 * eleven.
 */
import * as ec2 from "thesvg/aws-amazon-ec2";
import * as sqs from "thesvg/aws-amazon-simple-queue-service";
import * as sns from "thesvg/aws-amazon-simple-notification-service";
import * as s3 from "thesvg/aws-amazon-simple-storage-service";
import * as rds from "thesvg/aws-amazon-rds";
import * as lambda from "thesvg/aws-aws-lambda";
import * as iam from "thesvg/aws-aws-identity-and-access-management";
import * as secrets from "thesvg/aws-aws-secrets-manager";
import * as ecs from "thesvg/aws-amazon-elastic-container-service";
import * as alb from "thesvg/aws-res-elastic-load-balancing-application-load-balancer";
import * as nat from "thesvg/aws-res-amazon-vpc-nat-gateway";

interface Entry {
  svg: string;
}

/**
 * Keyed by the service prefix of a resource name (`sqs/fin-settlement`).
 *
 * The prefix is what the graph actually has — a full ARN parse would be more
 * correct and is what the real engine will supply, but the lookup key stays
 * the same either way.
 */
const MARKS: Record<string, Entry> = {
  instance: ec2 as Entry,
  ec2: ec2 as Entry,
  sqs: sqs as Entry,
  sns: sns as Entry,
  s3: s3 as Entry,
  rds: rds as Entry,
  lambda: lambda as Entry,
  role: iam as Entry,
  iam: iam as Entry,
  secretsmanager: secrets as Entry,
  ecs: ecs as Entry,
  alb: alb as Entry,
  nat: nat as Entry,
};

/** The service prefix of a resource name, or the whole name if it has none. */
export function serviceOf(resource: string): string {
  const head = resource.split("/")[0] ?? resource;
  return head.replace(/-.*$/, "").toLowerCase();
}

export function hasMark(resource: string): boolean {
  return Boolean(MARKS[serviceOf(resource)]);
}

/**
 * The mark as an ECharts `image://` symbol.
 *
 * `fill` is written onto the root element because the library's paths carry no
 * fill of their own, and inside a data URI there is no `currentColor` to
 * inherit — an unset fill renders everything black, which on a dark node is
 * invisible.
 */
export function markUri(
  resource: string,
  color: string,
  size = 22,
): string | null {
  const raw = MARKS[serviceOf(resource)]?.svg;
  if (!raw) return null;
  const markup = raw
    .replace(/<title>[\s\S]*?<\/title>/, "")
    .replace(/\swidth="[^"]*"/, "")
    .replace(/\sheight="[^"]*"/, "")
    .replace("<svg", `<svg width="${size}" height="${size}" fill="${color}"`);
  return `image://data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
}
