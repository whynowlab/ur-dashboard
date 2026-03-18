export interface UsageRecord {
  ts: string;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface TripoRecord {
  ts: string;
  task_id: string;
  image: string;
  output: string;
  size: number;
}

export interface ModelCost {
  model: string;
  provider: "openai" | "gemini" | "tripo";
  prompt_tokens: number;
  completion_tokens: number;
  cost: number;
}

export interface TeamAgent {
  name: string;
  prompt_file: string;
  engine: string;
  model: string;
  phase: string;
}

export interface TeamDefinition {
  description: string;
  mode: string;
  agents: TeamAgent[];
}

export interface PipelineEntry {
  team: string;
  mode: string;
  agents: string[];
  total: number;
  step: number;
  current: string;
  status: "running" | "interrupted" | "complete";
  ts: string;
}

export interface TeamStatus {
  name: string;
  description: string;
  mode: string;
  agentCount: number;
  status: "active" | "standby" | "interrupted";
  currentStep?: number;
  totalSteps?: number;
  currentAgent?: string;
  lastUpdate?: string;
}

export interface CommitEntry {
  ts: string;
  message: string;
  project: string;
}

export interface SkillUsageEntry {
  skill: string;
  count: number;
  lastUsed: string;
}

export interface EnvironmentSummary {
  setupLevel: "full" | "minimal" | "none";
  hasOrchestrator: boolean;
  hasSkillRouter: boolean;
  activePanels: number;
}

export interface ComponentStat {
  name: string;
  category: string;
  count: number;
  lastModified: string | null;
}

export interface RecentFile {
  name: string;
  path: string;
  category: string;
  mtime: string;
  size: number;
}

export interface DashboardData {
  usage: ModelCost[];
  totalCost: number;
  teams: TeamStatus[];
  commits: CommitEntry[];
  skills: SkillUsageEntry[];
  environment: EnvironmentSummary;
  // Scan-based data for non-orchestrator environments
  components: ComponentStat[];
  recentFiles: RecentFile[];
  updatedAt: string;
  capabilities?: Capabilities;
}

export interface PanelConfig {
  id: string;
  label: string;
  component: string;
}

export interface DispatchJob {
  jobId: string;
  agent: string;
  prompt: string;
  status: "running" | "completed" | "failed" | "cancelled" | "timeout";
  startedAt: string;
  endedAt?: string;
  exitCode?: number;
  logs: Array<{ type: "stdout" | "stderr" | "system"; data: string; timestamp: string }>;
}

export interface TeamConfig {
  teams: Record<string, {
    description: string;
    agents: string[];
  }>;
}

export interface Capabilities {
  canDispatch: boolean;
  cliVersion: string | null;
}
