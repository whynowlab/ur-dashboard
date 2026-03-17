import type { PanelConfig } from "@/lib/types";

export const PANEL_REGISTRY: Record<string, PanelConfig> = {
  "api-usage": {
    id: "api-usage",
    label: "API Usage",
    component: "ApiUsagePanel",
  },
  "team-status": {
    id: "team-status",
    label: "Team Status",
    component: "TeamStatusPanel",
  },
  "commit-log": {
    id: "commit-log",
    label: "Recent Commits",
    component: "CommitLogPanel",
  },
};
