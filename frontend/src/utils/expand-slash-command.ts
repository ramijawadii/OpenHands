import { SKILLS } from "#/data/skill-registry";

export const COMMAND_PROMPTS: Record<string, string> = {
  "health-check":
    "Call kg_system_health and report the full output",
  resources:
    "What cloud resources are currently connected? Run kg_system_health and list all available services and their connection status.",
  audit:
    "Run a comprehensive compliance audit across all connected cloud resources. Check CIS benchmarks, NIST controls, and SOC 2 requirements. Generate a prioritised remediation report with severity ratings.",
  incident:
    "Initiate an incident response investigation. Analyse recent security findings, identify affected resources, assess blast radius, and provide a step-by-step containment and remediation plan.",
  vuln:
    "Run a full vulnerability assessment across all cloud infrastructure. Identify exposed services, misconfigurations, and critical CVEs. Prioritise by exploitability and business impact.",
  threat:
    "Generate a threat model for my cloud architecture. Identify attack surfaces, data flow risks, privilege escalation paths, and lateral movement opportunities.",
};

export function expandSlashCommand(raw: string): string {
  const text = raw.trim();
  if (!text.startsWith("/")) return raw;

  const spaceIdx = text.indexOf(" ");
  const cmd = spaceIdx === -1 ? text.slice(1) : text.slice(1, spaceIdx);
  const rest = spaceIdx === -1 ? "" : text.slice(spaceIdx); // keeps leading space

  const skill = SKILLS.find((s) => s.name === cmd);
  if (skill) return skill.prompt + rest;

  if (COMMAND_PROMPTS[cmd]) return COMMAND_PROMPTS[cmd] + rest;

  return raw;
}
