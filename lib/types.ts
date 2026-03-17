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

export interface DashboardData {
  usage: ModelCost[];
  totalCost: number;
  teams: TeamStatus[];
  commits: CommitEntry[];
  updatedAt: string;
}

export interface PanelConfig {
  id: string;
  label: string;
  component: string;
}
