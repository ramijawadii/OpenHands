/* eslint-disable i18next/no-literal-string */
import { motion, AnimatePresence } from "framer-motion";
import {
  Globe,
  FileSearch,
  ShieldCheck,
  CodeXml,
  Sparkles,
  Play,
} from "lucide-react";
import { useConversationStore } from "#/state/conversation-store";

// NOTE: hardcoded from the design. Wire this to the real skill-catalog count
// when an endpoint is available so it can't go stale.
const SKILL_COUNT = 223;

const CLOUD_SUGGESTIONS = [
  {
    Icon: Globe,
    label: "AWS Topology Map",
    description: "Identity, storage, compute & network — full visual hierarchy",
    value:
      "Map my AWS topology. Start with kg_health to confirm tools are live, then enumerate identity, storage, compute and network resources and render the full hierarchy as a diagram.",
  },
  {
    Icon: FileSearch,
    label: "CloudTrail Anomaly Hunt",
    description: "90-day API log analysis — spikes, odd hours, top callers",
    value:
      "Hunt for anomalies in CloudTrail. Use kg_ingest_cloudtrail to load the last 90 days of events, then analyse for call spikes, out-of-hours activity and top callers. Summarise the timeline and affected resources.",
  },
  {
    Icon: ShieldCheck,
    label: "CIS Benchmark Audit",
    description: "58-control audit on prod → export as PDF for leadership",
    value:
      "Run a CIS benchmark audit against production. Assess each control, report findings by severity, and export the result as a PDF suitable for leadership.",
  },
  {
    Icon: CodeXml,
    label: "Code-to-Cloud Fix",
    description: "Scan Terraform for security bugs and auto-generate a diff",
    value:
      "Scan my Terraform for security issues, explain each finding, and auto-generate a diff that fixes them.",
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
          className="absolute top-0 left-0 right-0 bottom-[151px] flex flex-col items-center justify-center pointer-events-auto px-4 sm:px-6"
        >
          <div className="flex w-full max-w-3xl flex-col items-center">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--cg-accent-purple-bg)] text-[var(--cg-accent-purple)]">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="mt-3 text-[14px] font-medium text-[var(--cg-text-primary)]">
              CloudGuard is ready
            </div>
            <div className="mt-1 text-[12.5px] text-[var(--cg-text-muted)]">
              Ask anything about your cloud posture — the agent has{" "}
              {SKILL_COUNT} skills wired in.
            </div>

            <div className="mt-6 grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
              {CLOUD_SUGGESTIONS.map(({ Icon, label, description, value }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => onSuggestionsClick(value)}
                  className="group flex items-start gap-3 rounded-xl border border-[var(--cg-border-subtle)] bg-[var(--cg-bg-card)] px-4 py-3.5 text-left transition hover:border-[var(--cg-accent-purple)] hover:bg-[var(--cg-accent-purple-bg)] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                >
                  <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[var(--cg-accent-purple-bg)] text-[var(--cg-accent-purple)] group-hover:bg-[var(--cg-bg-page)]">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-[13px] font-medium text-[var(--cg-text-primary)]">
                        {label}
                      </span>
                      <Play className="h-3 w-3 shrink-0 text-[var(--cg-accent-purple)] opacity-0 transition group-hover:opacity-100" />
                    </span>
                    <span className="mt-0.5 block text-[11.5px] leading-snug text-[var(--cg-text-muted)]">
                      {description}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
