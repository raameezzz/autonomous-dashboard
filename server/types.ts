export interface IntercomConversationSummary {
  id: string;
  created_at: number;
  updated_at: number;
  closed_at: number | null;
  first_response_time: number | null;
  resolution_time: number | null;
  assignee_id: string | null;
  assignee_name: string | null;
  csat_rating: number | null;
  csat_remark: string | null;
  tags: string[];
  state: string;
  ai_resolved: boolean;
  repliers_in_window: string[];
}

export interface CSATResult {
  csat_pct: number;
  dsat_pct: number;
  neutral_pct: number;
  totalResponses: number;
  avg: number;
  distribution: { 1: number; 2: number; 3: number; 4: number; 5: number };
}

export interface AgentStat {
  assignee_id: string;
  name: string;
  chat_count: number;
  closed_count: number;
  snoozed_count: number;
  csat_pct: number | null;
  dsat_pct: number | null;
  avg_first_response_time: number | null;
  resolution_rate: number;
  rated_count: number;
}

export interface ChatVolumePoint {
  date: string;
  total: number;
  ai_resolved: number;
}

export interface ClosedConversation {
  id: string;
  created_at: number;
  closed_at: number | null;
  assignee_id: string | null;
  assignee_name: string | null;
  rating: number | null;
  remark: string | null;
  summary: string | null;
  category: 'csat' | 'dsat' | 'neutral' | 'unrated';
}

export interface DashboardMetrics {
  total_chats: number;
  total_chats_delta: number;
  csat_pct: number;
  csat_pct_delta: number;
  dsat_pct: number;
  dsat_pct_delta: number;
  avg_response_time_seconds: number;
  avg_response_time_delta: number;
  resolution_rate: number;
  resolution_rate_delta: number;
}

export interface DashboardResponse {
  metrics: DashboardMetrics;
  chatVolume: ChatVolumePoint[];
  csatTrend: { week: string; csat_pct: number; dsat_pct: number; target: number }[];
  agentStats: AgentStat[];
}
