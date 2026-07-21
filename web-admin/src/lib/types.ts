// Shapes inferred from the Hermes dashboard API docs — not yet verified
// against a live instance. Adjust once hermes_home is actually running.

export interface Session {
  id: string;
  title?: string;
  updated_at?: string;
  message_count?: number;
}

export interface SessionMessage {
  role: string;
  content: string;
  created_at?: string;
}

export interface UsageDay {
  date: string;
  input_tokens: number;
  output_tokens: number;
}

export interface UsageModelBreakdown {
  model: string;
  sessions: number;
  tokens: number;
  cost: number;
}

export interface UsageResponse {
  daily: UsageDay[];
  models: UsageModelBreakdown[];
}

export interface Skill {
  name: string;
  description?: string;
  enabled: boolean;
}
