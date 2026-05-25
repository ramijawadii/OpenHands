import { motion, AnimatePresence } from "framer-motion";
import { Suggestions } from "#/components/features/suggestions/suggestions";
import { useConversationStore } from "#/state/conversation-store";

const CLOUD_SUGGESTIONS = [
  {
    label: "Scan for misconfigurations",
    value:
      "Scan my cloud environment for security misconfigurations. Start with kg_health to confirm tools are live, then enumerate IAM policies, S3 buckets, and compute resources to identify misconfigurations against CIS benchmarks. Report findings by severity.",
  },
  {
    label: "Audit a cloud resource",
    value:
      "Audit a specific cloud resource for security issues. Use kg_search_commands to discover relevant audit commands, then kg_get_command_schema and kg_execute_command to collect resource data. Assess the security posture and report any policy violations or exposure.",
  },
  {
    label: "Analyse attack chain",
    value:
      "Analyse the attack chain and blast radius for a potential compromise. Use kg_blast_radius and kg_cypher_query to trace lateral movement paths, privilege escalation routes, and potential data exposure. Visualise the findings as a diagram.",
  },
  {
    label: "Incident response",
    value:
      "Help me with cloud incident response. Use kg_ingest_cloudtrail to load recent CloudTrail events, then analyse for anomalous API calls, unauthorised access, and indicators of compromise. Summarise the timeline and affected resources.",
  },
];

interface ChatSuggestionsProps {
  onSuggestionsClick: (value: string) => void;
}

export function ChatSuggestions({ onSuggestionsClick }: ChatSuggestionsProps) {
  const { shouldHideSuggestions } = useConversationStore();

  return (
    <AnimatePresence>
      {!shouldHideSuggestions && (
        <motion.div
          data-testid="chat-suggestions"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="absolute top-0 left-0 right-0 bottom-[151px] flex flex-col items-center justify-center pointer-events-auto"
        >
          <div className="flex flex-col items-center p-4 rounded-xl w-full mb-2">
            <img
              src="/logo.png"
              alt="CloudGuard"
              width={120}
              height={120}
              style={{ objectFit: "contain" }}
              className="mb-4"
            />
            <span className="text-[28px] font-bold text-[var(--cg-text-primary)] leading-tight">
              CloudGuard
            </span>
            <span className="text-[13px] text-gray-400 mt-1 mb-5 tracking-wide uppercase">
              Cloud Security Reasoning Engine
            </span>
          </div>
          <Suggestions
            suggestions={CLOUD_SUGGESTIONS}
            onSuggestionClick={onSuggestionsClick}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
