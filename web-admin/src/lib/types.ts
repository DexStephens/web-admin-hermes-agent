// Shapes verified against the dashboard (hermes_cli/web_server.py)
// GET /api/sessions and GET /api/sessions/{id}/messages handlers, which
// hermesFetch actually talks to. gateway/platforms/api_server.py returns a
// different {object, data} envelope for what look like the same paths —
// don't cross-reference it here. (2026-07-26)

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
  sessions: Session[];
  total: number;
  limit: number;
  offset: number;
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
  session_id: string;
  messages: HermesMessage[];
  pagination: {
    limit: number | null;
    offset: number;
    returned: number;
  };
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
  category?: string;
  enabled: boolean;
  provenance?: "hub" | "bundled" | "agent";
}

export interface SkillContent {
  name: string;
  content: string;
  path: string;
}

// Pending entries only show a truncated hash of the real pairing code
// (gateway/pairing.py keeps codes hashed at rest) — it's a reference for
// matching against what the user tells you out-of-band, not the value to
// submit. Approving requires the real code, typed in separately.
export interface PendingPairing {
  platform: string;
  code: string;
  user_id: string;
  user_name: string;
  age_minutes: number;
}

export interface ApprovedPairing {
  platform: string;
  user_id: string;
  user_name?: string;
  approved_at: number;
}

export interface PairingList {
  pending: PendingPairing[];
  approved: ApprovedPairing[];
}
