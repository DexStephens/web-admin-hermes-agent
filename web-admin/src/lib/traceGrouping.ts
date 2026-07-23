import type { HermesMessage } from "./types";

export interface TraceToolCall {
  callId: string;
  name: string;
  rawArguments: string;
  result: HermesMessage | null;
}

export type TraceNode =
  | {
      kind: "message";
      id: number;
      role: "system" | "user";
      content: HermesMessage["content"];
      timestamp: number;
      observed: boolean;
    }
  | {
      kind: "turn";
      id: number;
      timestamp: number;
      observed: boolean;
      content: HermesMessage["content"];
      reasoningContent: string | null;
      toolCalls: TraceToolCall[];
    }
  | {
      kind: "observedGroup";
      ids: number[];
      nodes: TraceNode[];
    };

export function groupMessagesIntoTrace(messages: HermesMessage[]): TraceNode[] {
  const toolRowsById = new Map<string, HermesMessage>();
  const toolRowsInOrder: HermesMessage[] = [];

  for (const message of messages) {
    if (message.role !== "tool") continue;
    toolRowsInOrder.push(message);
    if (message.tool_call_id) {
      toolRowsById.set(message.tool_call_id, message);
    }
  }

  const usedToolRowIds = new Set<number>();

  function resolveToolCall(tc: NonNullable<HermesMessage["tool_calls"]>[number]): TraceToolCall {
    let result = toolRowsById.get(tc.id) ?? null;
    if (result && !usedToolRowIds.has(result.id)) {
      usedToolRowIds.add(result.id);
    } else {
      // Fallback: tool_call_id missing/stale on older rows — take the next
      // unused tool row, preferring one whose tool_name matches this call.
      result =
        toolRowsInOrder.find(
          (row) => !usedToolRowIds.has(row.id) && row.tool_name === tc.function.name
        ) ??
        toolRowsInOrder.find((row) => !usedToolRowIds.has(row.id)) ??
        null;
      if (result) usedToolRowIds.add(result.id);
    }

    return {
      callId: tc.id,
      name: tc.function.name,
      rawArguments: tc.function.arguments,
      result,
    };
  }

  const flat: TraceNode[] = [];

  for (const message of messages) {
    if (message.role === "tool") continue;

    if (message.role === "system" || message.role === "user") {
      flat.push({
        kind: "message",
        id: message.id,
        role: message.role,
        content: message.content,
        timestamp: message.timestamp,
        observed: message.observed === 1,
      });
      continue;
    }

    if (message.role === "assistant") {
      flat.push({
        kind: "turn",
        id: message.id,
        timestamp: message.timestamp,
        observed: message.observed === 1,
        content: message.content,
        reasoningContent: message.reasoning_content,
        toolCalls: (message.tool_calls ?? []).map(resolveToolCall),
      });
    }
  }

  // Any tool rows that never got claimed (malformed/orphaned data) get
  // attached to the nearest preceding turn so nothing silently vanishes.
  const orphans = toolRowsInOrder.filter((row) => !usedToolRowIds.has(row.id));
  if (orphans.length > 0) {
    for (const orphan of orphans) {
      let target: Extract<TraceNode, { kind: "turn" }> | null = null;
      for (let i = flat.length - 1; i >= 0; i--) {
        const node = flat[i];
        if (node.kind === "turn") {
          target = node;
          break;
        }
      }
      const synthetic: TraceToolCall = {
        callId: orphan.tool_call_id ?? `orphan-${orphan.id}`,
        name: orphan.tool_name ?? "unknown",
        rawArguments: "{}",
        result: orphan,
      };
      if (target) {
        target.toolCalls.push(synthetic);
      } else {
        // No preceding turn at all — surface it as its own single-call turn.
        flat.push({
          kind: "turn",
          id: orphan.id,
          timestamp: orphan.timestamp,
          observed: false,
          content: null,
          reasoningContent: null,
          toolCalls: [synthetic],
        });
      }
    }
  }

  return groupObservedRuns(flat);
}

function isObserved(node: TraceNode): boolean {
  return (node.kind === "message" || node.kind === "turn") && node.observed;
}

function groupObservedRuns(nodes: TraceNode[]): TraceNode[] {
  const result: TraceNode[] = [];
  let run: TraceNode[] = [];

  function flushRun() {
    if (run.length === 0) return;
    if (run.length === 1) {
      result.push(run[0]);
    } else {
      const ids = run.flatMap((n) =>
        n.kind === "observedGroup" ? n.ids : [n.id]
      );
      result.push({ kind: "observedGroup", ids, nodes: run });
    }
    run = [];
  }

  for (const node of nodes) {
    if (isObserved(node)) {
      run.push(node);
    } else {
      flushRun();
      result.push(node);
    }
  }
  flushRun();

  return result;
}
