import { Outlet } from "react-router";
import { WorkspaceShell } from "#/components/admin/workspace-shell";

export default function WorkspaceAdminScreen() {
  return (
    <main
      data-testid="workspace-screen"
      style={{ height: "100%", display: "flex" }}
    >
      <WorkspaceShell>
        <Outlet />
      </WorkspaceShell>
    </main>
  );
}
