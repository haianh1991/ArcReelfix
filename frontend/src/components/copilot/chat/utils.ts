
import { t } from "@/utils/i18n";
// ---------------------------------------------------------------------------
// cn – lightweight className concatenation utility.
// Filters out falsy values and joins the rest with spaces.
// ---------------------------------------------------------------------------

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

// ---------------------------------------------------------------------------
// getRoleLabel – maps a turn role to a Chinese display label.
// ---------------------------------------------------------------------------

export function getRoleLabel(role: string): string {
  switch (role) {
    case "assistant":
      return t("auto.assistant");
    case "user":
      return t("auto.you");
    case "tool":
      return t("auto.tool");
    case "tool_result":
      return t("auto.tool_results");
    case "skill_content":
      return "Skill";
    case "result":
      return t("auto.finish");
    case "system":
      return t("auto.system");
    case "stream_event":
      return t("auto.streaming_updates");
    case "unknown":
      return t("auto.information");
    default:
      return role || t("auto.information");
  }
}
