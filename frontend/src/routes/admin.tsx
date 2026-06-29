import { Outlet } from "react-router";
import { AdminShell } from "#/components/admin/admin-shell";

export default function EnterpriseAdminScreen() {
  return (
    <main
      data-testid="admin-screen"
      style={{ height: "100%", display: "flex" }}
    >
      <AdminShell>
        <Outlet />
      </AdminShell>
    </main>
  );
}
