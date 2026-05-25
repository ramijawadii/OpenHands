import {
  Terminal,
  FilePlus,
  Pencil,
  FileText,
  Globe,
  Zap,
  Brain,
  CheckCircle2,
  AlertCircle,
  Activity,
  type LucideIcon,
} from "lucide-react";
import { isOpenHandsAction, isOpenHandsObservation } from "#/types/core/guards";
import type { OpenHandsAction } from "#/types/core/actions";
import type { OpenHandsObservation } from "#/types/core/observations";

export function getEventIcon(
  event: OpenHandsAction | OpenHandsObservation,
): LucideIcon {
  if (isOpenHandsAction(event)) {
    switch (event.action) {
      case "run":
        return Terminal;
      case "run_ipython":
        return Terminal;
      case "write":
        return FilePlus;
      case "edit":
        return Pencil;
      case "read":
        return FileText;
      case "browse":
      case "browse_interactive":
        return Globe;
      case "call_tool_mcp":
        return Zap;
      case "think":
        return Brain;
      case "finish":
        return CheckCircle2;
      default:
        return Activity;
    }
  }
  if (isOpenHandsObservation(event)) {
    switch (event.observation) {
      case "run":
        return Terminal;
      case "run_ipython":
        return Terminal;
      case "read":
        return FileText;
      case "write":
        return FilePlus;
      case "edit":
        return Pencil;
      case "browse":
        return Globe;
      case "mcp":
        return Zap;
      case "error":
        return AlertCircle;
      default:
        return Activity;
    }
  }
  return Activity;
}
