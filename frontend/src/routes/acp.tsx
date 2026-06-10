import { Outlet } from "react-router";
import { AcpLayout } from "#/components/features/acp/acp-layout";

export default function AgentControlPlaneScreen() {
  return (
    <main data-testid="acp-screen" style={{ height: "100%", display: "flex" }}>
      <AcpLayout>
        <Outlet />
      </AcpLayout>
    </main>
  );
}
