-- ============================================================================
-- CloudGuard Identity & Access — IAM Data Model
-- Rendered as an ERD by Liam (liam erd build). This is the schema/data-model
-- view of the Identity Graph (graph-visulaize.md → "Graph Data Model" /
-- "Extended Enterprise Graph"). The live instance graph is React-Flow.
-- ============================================================================

CREATE TABLE organizations (
  id           uuid PRIMARY KEY,
  name         text NOT NULL,
  created_at   timestamptz NOT NULL
);

CREATE TABLE workspaces (
  id           uuid PRIMARY KEY,
  org_id       uuid NOT NULL REFERENCES organizations(id),
  name         text NOT NULL,
  environment  text NOT NULL  -- Production | Staging | SOC | Lab
);

CREATE TABLE identity_providers (
  id           uuid PRIMARY KEY,
  org_id       uuid NOT NULL REFERENCES organizations(id),
  name         text NOT NULL,
  type         text NOT NULL,  -- OIDC | SAML | LDAP | SCIM
  protocol     text NOT NULL,
  status       text NOT NULL
);

CREATE TABLE users (
  id            uuid PRIMARY KEY,
  org_id        uuid NOT NULL REFERENCES organizations(id),
  provider_id   uuid REFERENCES identity_providers(id),
  email         text NOT NULL UNIQUE,
  display_name  text NOT NULL,
  department    text,
  status        text NOT NULL,  -- Active | Suspended | Deleted
  risk_score    int
);

CREATE TABLE service_identities (
  id            uuid PRIMARY KEY,
  org_id        uuid NOT NULL REFERENCES organizations(id),
  workspace_id  uuid REFERENCES workspaces(id),
  name          text NOT NULL,
  type          text NOT NULL,  -- Service Account | API Client | Workload Identity | Bot
  owner_user_id uuid REFERENCES users(id),
  status        text NOT NULL
);

CREATE TABLE groups (
  id            uuid PRIMARY KEY,
  org_id        uuid NOT NULL REFERENCES organizations(id),
  workspace_id  uuid REFERENCES workspaces(id),
  name          text NOT NULL,
  type          text NOT NULL,  -- Security | Collaboration | Dynamic | Nested
  parent_group_id uuid REFERENCES groups(id),
  source        text NOT NULL,
  owner_user_id uuid REFERENCES users(id)
);

CREATE TABLE group_members (
  group_id      uuid NOT NULL REFERENCES groups(id),
  user_id       uuid REFERENCES users(id),
  service_id    uuid REFERENCES service_identities(id),
  joined_at     timestamptz NOT NULL,
  PRIMARY KEY (group_id, user_id)
);

CREATE TABLE roles (
  id            uuid PRIMARY KEY,
  org_id        uuid NOT NULL REFERENCES organizations(id),
  name          text NOT NULL,
  type          text NOT NULL,  -- System | Custom
  tier          text NOT NULL,  -- T1..T4
  privileged    boolean NOT NULL,
  requires_approval boolean NOT NULL
);

CREATE TABLE permissions (
  id            uuid PRIMARY KEY,
  name          text NOT NULL UNIQUE,  -- e.g. role.assign
  category      text NOT NULL,         -- Identity | Authorization | Resource | Agent ...
  scope         text NOT NULL,
  risk          text NOT NULL
);

CREATE TABLE role_permissions (
  role_id       uuid NOT NULL REFERENCES roles(id),
  permission_id uuid NOT NULL REFERENCES permissions(id),
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE cloud_resources (
  id            uuid PRIMARY KEY,
  workspace_id  uuid REFERENCES workspaces(id),
  name          text NOT NULL,
  provider      text NOT NULL,  -- AWS | Azure | GCP | Kubernetes
  type          text NOT NULL,  -- Account | Subscription | Project | Cluster | Database | Bucket | Vault
  environment   text NOT NULL
);

CREATE TABLE resource_access (
  id            uuid PRIMARY KEY,
  role_id       uuid NOT NULL REFERENCES roles(id),
  resource_id   uuid NOT NULL REFERENCES cloud_resources(id),
  permission    text NOT NULL,  -- Read | Write | Admin
  inherited     boolean NOT NULL
);

CREATE TABLE agents (
  id            uuid PRIMARY KEY,
  name          text NOT NULL,  -- Cloud Remediation Agent | Investigation Agent ...
  kind          text NOT NULL
);

CREATE TABLE agent_permissions (
  id            uuid PRIMARY KEY,
  role_id       uuid NOT NULL REFERENCES roles(id),
  agent_id      uuid NOT NULL REFERENCES agents(id),
  capability    text NOT NULL,  -- Observe | Investigate | Recommend | Approve | Execute | Administer
  resource_id   uuid REFERENCES cloud_resources(id),
  risk          text NOT NULL,
  approval_required boolean NOT NULL
);

CREATE TABLE role_assignments (
  id            uuid PRIMARY KEY,
  role_id       uuid NOT NULL REFERENCES roles(id),
  user_id       uuid REFERENCES users(id),
  group_id      uuid REFERENCES groups(id),
  service_id    uuid REFERENCES service_identities(id),
  workspace_id  uuid REFERENCES workspaces(id),
  scope         text NOT NULL,
  assignment_type text NOT NULL,  -- Direct | Temporary | Delegated | Privileged
  expires_at    timestamptz,
  assigned_by   uuid REFERENCES users(id)
);

CREATE TABLE approval_workflows (
  id            uuid PRIMARY KEY,
  org_id        uuid NOT NULL REFERENCES organizations(id),
  name          text NOT NULL,
  stages        int NOT NULL
);

CREATE TABLE approval_requirements (
  id            uuid PRIMARY KEY,
  role_id       uuid REFERENCES roles(id),
  assignment_id uuid REFERENCES role_assignments(id),
  workflow_id   uuid NOT NULL REFERENCES approval_workflows(id),
  status        text NOT NULL
);

CREATE TABLE privileged_access (
  id            uuid PRIMARY KEY,
  user_id       uuid NOT NULL REFERENCES users(id),
  role_id       uuid NOT NULL REFERENCES roles(id),
  workspace_id  uuid REFERENCES workspaces(id),
  state         text NOT NULL,  -- Eligible | Active | Expired
  elevation_source text NOT NULL,
  activated_at  timestamptz,
  expires_at    timestamptz
);

CREATE TABLE authentication_methods (
  id            uuid PRIMARY KEY,
  user_id       uuid NOT NULL REFERENCES users(id),
  method        text NOT NULL,  -- Password | Passkey | Security Key | TAP | Authenticator
  strength      text NOT NULL,
  enrolled_at   timestamptz
);

CREATE TABLE sessions (
  id            uuid PRIMARY KEY,
  user_id       uuid REFERENCES users(id),
  service_id    uuid REFERENCES service_identities(id),
  provider_id   uuid REFERENCES identity_providers(id),
  workspace_id  uuid REFERENCES workspaces(id),
  privileged    boolean NOT NULL,
  risk          text NOT NULL,
  started_at    timestamptz NOT NULL,
  status        text NOT NULL
);

CREATE TABLE access_reviews (
  id            uuid PRIMARY KEY,
  org_id        uuid NOT NULL REFERENCES organizations(id),
  target_user_id uuid REFERENCES users(id),
  target_role_id uuid REFERENCES roles(id),
  target_group_id uuid REFERENCES groups(id),
  reviewer_id   uuid REFERENCES users(id),
  status        text NOT NULL,
  due_date      date
);

CREATE TABLE identity_alerts (
  id            uuid PRIMARY KEY,
  org_id        uuid NOT NULL REFERENCES organizations(id),
  category      text NOT NULL,  -- Identity Threat | Privilege Risk | Authentication Risk | Governance | Approval
  severity      text NOT NULL,
  principal_user_id uuid REFERENCES users(id),
  workspace_id  uuid REFERENCES workspaces(id),
  status        text NOT NULL,
  created_at    timestamptz NOT NULL
);
