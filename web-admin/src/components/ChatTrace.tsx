"use client";

import { useState } from "react";
import type { HermesContentPart, HermesMessage } from "@/lib/types";
import type { TraceNode, TraceToolCall } from "@/lib/traceGrouping";

function renderContent(content: HermesMessage["content"]): string {
  if (content == null) return "";
  if (typeof content === "string") return content;
  return (content as HermesContentPart[])
    .map((part) => (typeof part.text === "string" ? part.text : `[${part.type}]`))
    .filter(Boolean)
    .join("\n");
}

function tryPrettyJson(raw: string): { text: string; parsed: boolean } {
  try {
    return { text: JSON.stringify(JSON.parse(raw), null, 2), parsed: true };
  } catch {
    return { text: raw, parsed: false };
  }
}

function formatTimestamp(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString();
}

function Chevron({ expanded }: { expanded: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width="12"
      height="12"
      className={`shrink-0 fill-none stroke-current transition-transform ${
        expanded ? "rotate-90" : ""
      }`}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 3l6 5-6 5" />
    </svg>
  );
}

function toolCallStatus(tc: TraceToolCall): string | null {
  if (!tc.result) return "pending";
  if (tc.result.effect_disposition === "none") return "blocked";
  if (tc.result.effect_disposition === "unknown") return "timed out";
  return null;
}

function ToolCallNode({
  toolCall,
  expanded,
  onToggle,
}: {
  toolCall: TraceToolCall;
  expanded: boolean;
  onToggle: () => void;
}) {
  const status = toolCallStatus(toolCall);
  const args = tryPrettyJson(toolCall.rawArguments);
  const resultText = toolCall.result ? renderContent(toolCall.result.content) : null;
  const resultJson = resultText ? tryPrettyJson(resultText) : null;

  return (
    <div className="rounded-md bg-zinc-50 text-sm dark:bg-zinc-900/60">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
      >
        <Chevron expanded={expanded} />
        <span className="font-mono text-zinc-900 dark:text-zinc-50">
          {toolCall.name}
        </span>
        {status && (
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            {status}
          </span>
        )}
      </button>

      {expanded && (
        <div className="flex flex-col gap-3 px-3 pb-3">
          <div>
            <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Arguments
            </div>
            <pre className="mt-1 overflow-x-auto rounded bg-white p-2 text-xs text-zinc-900 dark:bg-black dark:text-zinc-50">
              {args.text || "{}"}
              {!args.parsed && (
                <span className="mt-1 block text-zinc-500 dark:text-zinc-400">
                  (unparsed)
                </span>
              )}
            </pre>
          </div>

          <div>
            <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Result
            </div>
            {resultJson ? (
              <pre className="mt-1 overflow-x-auto whitespace-pre-wrap rounded bg-white p-2 text-xs text-zinc-900 dark:bg-black dark:text-zinc-50">
                {resultJson.text}
              </pre>
            ) : (
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                No result recorded.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function MessageNode({
  node,
}: {
  node: Extract<TraceNode, { kind: "message" }>;
}) {
  const text = renderContent(node.content);
  if (text.trim().length === 0) return null;

  return (
    <div className="rounded-md border border-zinc-200 bg-white p-3 text-sm dark:border-zinc-800 dark:bg-zinc-900">
      <span className="font-medium text-zinc-500 dark:text-zinc-400">
        {node.role}
      </span>
      <p className="mt-1 whitespace-pre-wrap text-zinc-900 dark:text-zinc-50">
        {text}
      </p>
    </div>
  );
}

function TurnNode({
  node,
  expandedToolCalls,
  onToggleToolCall,
  reasoningExpanded,
  onToggleReasoning,
}: {
  node: Extract<TraceNode, { kind: "turn" }>;
  expandedToolCalls: Set<string>;
  onToggleToolCall: (callId: string) => void;
  reasoningExpanded: boolean;
  onToggleReasoning: () => void;
}) {
  const text = renderContent(node.content);
  const hasText = text.trim().length > 0;

  return (
    <div className="rounded-md border border-zinc-200 bg-white p-3 text-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between">
        <span className="font-medium text-zinc-500 dark:text-zinc-400">
          assistant
        </span>
        <span className="text-xs text-zinc-400 dark:text-zinc-500">
          {formatTimestamp(node.timestamp)}
        </span>
      </div>

      {hasText && (
        <p className="mt-1 whitespace-pre-wrap text-zinc-900 dark:text-zinc-50">
          {text}
        </p>
      )}

      {node.reasoningContent && (
        <div className="mt-2">
          <button
            type="button"
            onClick={onToggleReasoning}
            className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            <Chevron expanded={reasoningExpanded} />
            Thinking
          </button>
          {reasoningExpanded && (
            <p className="mt-1 whitespace-pre-wrap text-xs italic text-zinc-500 dark:text-zinc-400">
              {node.reasoningContent}
            </p>
          )}
        </div>
      )}

      {node.toolCalls.length > 0 && (
        <div className="mt-2 ml-4 flex flex-col gap-2 border-l border-zinc-200 pl-4 dark:border-zinc-800">
          {node.toolCalls.map((tc) => (
            <ToolCallNode
              key={tc.callId}
              toolCall={tc}
              expanded={expandedToolCalls.has(tc.callId)}
              onToggle={() => onToggleToolCall(tc.callId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TraceNodeView({
  node,
  expandedToolCalls,
  onToggleToolCall,
  expandedReasoning,
  onToggleReasoning,
}: {
  node: TraceNode;
  expandedToolCalls: Set<string>;
  onToggleToolCall: (callId: string) => void;
  expandedReasoning: Set<number>;
  onToggleReasoning: (turnId: number) => void;
}) {
  if (node.kind === "message") {
    return <MessageNode node={node} />;
  }
  if (node.kind === "turn") {
    return (
      <TurnNode
        node={node}
        expandedToolCalls={expandedToolCalls}
        onToggleToolCall={onToggleToolCall}
        reasoningExpanded={expandedReasoning.has(node.id)}
        onToggleReasoning={() => onToggleReasoning(node.id)}
      />
    );
  }
  return null;
}

function ObservedGroupNode({
  node,
  expanded,
  onToggle,
  expandedToolCalls,
  onToggleToolCall,
  expandedReasoning,
  onToggleReasoning,
}: {
  node: Extract<TraceNode, { kind: "observedGroup" }>;
  expanded: boolean;
  onToggle: () => void;
  expandedToolCalls: Set<string>;
  onToggleToolCall: (callId: string) => void;
  expandedReasoning: Set<number>;
  onToggleReasoning: (turnId: number) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center gap-1 self-start text-xs text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
      >
        <Chevron expanded={expanded} />
        {node.ids.length} passive message{node.ids.length === 1 ? "" : "s"}
      </button>
      {expanded && (
        <div className="flex flex-col gap-2 opacity-70">
          {node.nodes.map((inner) => (
            <TraceNodeView
              key={
                inner.kind === "observedGroup"
                  ? `og-${inner.ids[0]}`
                  : `${inner.kind}-${inner.id}`
              }
              node={inner}
              expandedToolCalls={expandedToolCalls}
              onToggleToolCall={onToggleToolCall}
              expandedReasoning={expandedReasoning}
              onToggleReasoning={onToggleReasoning}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ChatTrace({ trace }: { trace: TraceNode[] }) {
  const [expandedToolCalls, setExpandedToolCalls] = useState<Set<string>>(
    new Set()
  );
  const [expandedReasoning, setExpandedReasoning] = useState<Set<number>>(
    new Set()
  );
  const [expandedObservedGroups, setExpandedObservedGroups] = useState<
    Set<number>
  >(new Set());

  function toggleToolCall(callId: string) {
    setExpandedToolCalls((prev) => {
      const next = new Set(prev);
      if (next.has(callId)) next.delete(callId);
      else next.add(callId);
      return next;
    });
  }

  function toggleReasoning(turnId: number) {
    setExpandedReasoning((prev) => {
      const next = new Set(prev);
      if (next.has(turnId)) next.delete(turnId);
      else next.add(turnId);
      return next;
    });
  }

  function toggleObservedGroup(groupId: number) {
    setExpandedObservedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }

  return (
    <div className="mt-6 flex flex-col gap-3">
      {trace.map((node) => {
        if (node.kind === "observedGroup") {
          return (
            <ObservedGroupNode
              key={`og-${node.ids[0]}`}
              node={node}
              expanded={expandedObservedGroups.has(node.ids[0])}
              onToggle={() => toggleObservedGroup(node.ids[0])}
              expandedToolCalls={expandedToolCalls}
              onToggleToolCall={toggleToolCall}
              expandedReasoning={expandedReasoning}
              onToggleReasoning={toggleReasoning}
            />
          );
        }
        return (
          <TraceNodeView
            key={`${node.kind}-${node.id}`}
            node={node}
            expandedToolCalls={expandedToolCalls}
            onToggleToolCall={toggleToolCall}
            expandedReasoning={expandedReasoning}
            onToggleReasoning={toggleReasoning}
          />
        );
      })}
    </div>
  );
}
