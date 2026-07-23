// Shapes verified against a live `hermes-agent` API server instance
// (gateway/platforms/api_server.py's _session_response/_message_response),
// not the separate dashboard web_server.py — the two return different
// envelopes for what look like the same paths. (2026-07-21)

export interface Session {
  id: string;
  source?: string | null;
  user_id?: string | null;
  model?: string | null;
  title?: string | null;
  started_at?: number;
  ended_at?: number | null;
  end_reason?: string | null;
  message_count?: number;
  preview?: string | null;
}

export interface SessionsResponse {
  object: string;
  data: Session[];
}

export interface HermesToolCall {
  id: string;
  call_id: string;
  response_item_id: string | null;
  type: "function";
  function: { name: string; arguments: string };
}

export type HermesContentPart = {
  type: string;
  text?: string;
  [k: string]: unknown;
};

export interface HermesMessage {
  id: number;
  session_id: string;
  role: "system" | "user" | "assistant" | "tool" | string;
  content: string | HermesContentPart[] | null;
  tool_call_id: string | null;
  tool_calls: HermesToolCall[] | null;
  tool_name: string | null;
  // Not present on the API server's message shape (dashboard-only concepts).
  effect_disposition?: "none" | "unknown" | null;
  observed?: 0 | 1;
  timestamp: number;
  token_count?: number | null;
  finish_reason: string | null;
  reasoning_content: string | null;
}

export interface SessionMessagesResponse {
  object: string;
  session_id: string;
  data: HermesMessage[];
}

export interface UsageDay {
  day: string;
  input_tokens: number;
  output_tokens: number;
}

export interface UsageModelBreakdown {
  model: string;
  sessions: number;
  input_tokens: number;
  output_tokens: number;
  estimated_cost: number;
}

export interface UsageResponse {
  daily: UsageDay[];
  by_model: UsageModelBreakdown[];
}

export interface Skill {
  name: string;
  description?: string;
  enabled: boolean;
}
