/* eslint-disable i18next/no-literal-string, jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events -- CloudGuard admin workspace context */
import React from "react";
import { useNavigate, useParams } from "react-router";
import { ChevronsUpDown, Check, Building2, LayoutGrid } from "lucide-react";
import { useCloudGuardSession } from "#/hooks/query/use-cloudguard";
import { T } from "./admin-kit";

/**
 * Workspace selection for the workspace console (`/workspace/:wsId/*`).
 *
 * Until the backend Workspace object (admin/org_model.py, Batch 2 F1) ships, the workspace list is
 * bootstrapped from the **real** authenticated session (`/me` → tenant_id == the current workspace),
 * so the active workspace is never faked. Additional workspaces a user has demoed are remembered in
 * localStorage. When `org_model` lands, swap `useWorkspaces` to read the live directory — the
 * component API stays identical.
 */

export interface WorkspaceRef {
  id: string;
  name: string;
  classification?: string;
  region?: string;
}

const LS_KEY = "cg_admin_workspaces";

function readStored(): WorkspaceRef[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as WorkspaceRef[]) : [];
  } catch {
    return [];
  }
}

/** List locally-registered workspaces (the client-side bridge until admin/org_model.py ships). */
export function listLocalWorkspaces(): WorkspaceRef[] {
  return readStored();
}

/** Persist a newly-created workspace locally. Returns the stored list. */
export function addLocalWorkspace(ws: WorkspaceRef): WorkspaceRef[] {
  const list = readStored().filter((w) => w.id !== ws.id);
  list.push(ws);
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(list));
  } catch {
    /* ignore quota / unavailable storage */
  }
  return list;
}

export function useWorkspaces(): {
  workspaces: WorkspaceRef[];
  isLoading: boolean;
} {
  const { tenantId, isLoading } = useCloudGuardSession();
  const stored = readStored();
  const list: WorkspaceRef[] = [];
  if (tenantId) {
    list.push({
      id: tenantId,
      name: stored.find((w) => w.id === tenantId)?.name ?? tenantId,
      classification: "Current",
      region: undefined,
    });
  }
  stored.forEach((w) => {
    if (!list.some((x) => x.id === w.id)) list.push(w);
  });
  return { workspaces: list, isLoading };
}

export function useActiveWorkspace(): WorkspaceRef | null {
  const { wsId } = useParams();
  const { workspaces } = useWorkspaces();
  if (!wsId) return workspaces[0] ?? null;
  return workspaces.find((w) => w.id === wsId) ?? { id: wsId, name: wsId };
}

// ── WorkspaceSelector — the workspace console context bar ─────────────────────────────────────────
export function WorkspaceSelector({
  subPath = "overview",
}: {
  subPath?: string;
}) {
  const navigate = useNavigate();
  const active = useActiveWorkspace();
  const { workspaces } = useWorkspaces();
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 9,
          padding: "8px 10px",
          borderRadius: 8,
          border: "none",
          cursor: "pointer",
          textAlign: "left",
          background: "var(--cg-workspace-bg)",
          color: T.textPrimary,
        }}
      >
        <LayoutGrid size={16} strokeWidth={1.7} color={T.textNav} />
        <span style={{ flex: 1, minWidth: 0 }}>
          <span
            style={{
              display: "block",
              fontSize: 13,
              fontWeight: 600,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {active?.name ?? "Select workspace"}
          </span>
          {(active?.classification || active?.region) && (
            <span
              style={{ display: "block", fontSize: 11, color: T.textMuted }}
            >
              {[active?.classification, active?.region]
                .filter(Boolean)
                .join(" · ")}
            </span>
          )}
        </span>
        <ChevronsUpDown size={14} color={T.textMuted} />
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            background: "var(--cg-workspace-dropdown-bg)",
            border: `1px solid ${T.borderStrong}`,
            borderRadius: 8,
            boxShadow: "var(--cg-shadow-dropdown)",
            padding: 4,
            zIndex: 50,
            maxHeight: 280,
            overflowY: "auto",
          }}
        >
          {workspaces.length === 0 && (
            <div style={{ padding: 10, fontSize: 12, color: T.textMuted }}>
              No workspaces available.
            </div>
          )}
          {workspaces.map((w) => {
            const isActive = w.id === active?.id;
            return (
              <button
                key={w.id}
                type="button"
                onClick={() => {
                  setOpen(false);
                  navigate(`/workspace/${w.id}/${subPath}`);
                }}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 8px",
                  borderRadius: 6,
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                  fontSize: 12.5,
                  color: T.textNav,
                  background: isActive
                    ? "var(--cg-workspace-bg)"
                    : "transparent",
                }}
              >
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span
                    style={{
                      display: "block",
                      color: T.textPrimary,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {w.name}
                  </span>
                </span>
                {isActive && <Check size={14} color={T.accent} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── ConsoleSwitcher — Enterprise ⇄ Workspace ─────────────────────────────────────────────────────
export function ConsoleSwitcher({
  current,
}: {
  current: "enterprise" | "workspace";
}) {
  const navigate = useNavigate();
  const { workspaces } = useWorkspaces();
  const go = () => {
    if (current === "enterprise") {
      const first = workspaces[0];
      navigate(first ? `/workspace/${first.id}/overview` : "/admin");
    } else {
      navigate("/admin");
    }
  };
  return (
    <button
      type="button"
      onClick={go}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 11.5,
        color: T.textMuted,
        background: "transparent",
        border: "none",
        cursor: "pointer",
        padding: 0,
      }}
    >
      <Building2 size={13} />
      {current === "enterprise" ? "Switch to a workspace" : "Enterprise admin"}
    </button>
  );
}
