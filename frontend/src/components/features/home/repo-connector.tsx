import { ConnectToProviderMessage } from "./connect-to-provider-message";
import { GitRepository } from "#/types/git";

interface RepoConnectorProps {
  onRepoSelection: (repo: GitRepository | null) => void;
}

export function RepoConnector({ onRepoSelection: _onRepoSelection }: RepoConnectorProps) {
  return (
    <section
      data-testid="repo-connector"
      className="w-full flex flex-col gap-6 rounded-[12px] p-[20px] border border-[var(--cg-border-strong)] bg-[var(--cg-bg-card)] min-h-[263.5px] relative"
    >
      <ConnectToProviderMessage />
    </section>
  );
}
