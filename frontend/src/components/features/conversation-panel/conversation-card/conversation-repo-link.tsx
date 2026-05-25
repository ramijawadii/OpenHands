import { FaBitbucket, FaGithub, FaGitlab } from "react-icons/fa6";
import { ShieldCheck, GitBranch, LucideIcon } from "lucide-react";
import { RepositorySelection } from "#/api/open-hands.types";
import { Provider } from "#/types/settings";

interface ConversationRepoLinkProps {
  selectedRepository: RepositorySelection;
}

const providerIcon: Record<Provider, LucideIcon | React.ComponentType<{ size?: number; className?: string }>> = {
  bitbucket: FaBitbucket,
  github: FaGithub,
  gitlab: FaGitlab,
  enterprise_sso: ShieldCheck,
};

export function ConversationRepoLink({
  selectedRepository,
}: ConversationRepoLinkProps) {
  const Icon = selectedRepository.git_provider
    ? providerIcon[selectedRepository.git_provider]
    : null;

  return (
    <div className="flex items-center gap-3 flex-1">
      <div className="flex items-center gap-1">
        {Icon && <Icon size={14} className="text-[#A3A3A3]" />}
        <span
          data-testid="conversation-card-selected-repository"
          className="text-xs text-[#A3A3A3] whitespace-nowrap overflow-hidden text-ellipsis max-w-44"
        >
          {selectedRepository.selected_repository}
        </span>
      </div>
      <div className="flex items-center gap-1">
        <GitBranch size={12} className="text-[#A3A3A3]" />

        <span
          data-testid="conversation-card-selected-branch"
          className="text-xs text-[#A3A3A3] whitespace-nowrap overflow-hidden text-ellipsis max-w-24"
        >
          {selectedRepository.selected_branch}
        </span>
      </div>
    </div>
  );
}
