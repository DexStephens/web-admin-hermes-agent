import Link from "next/link";
import { hermesFetch } from "@/lib/hermes";
import type { SessionMessagesResponse } from "@/lib/types";
import { groupMessagesIntoTrace, type TraceNode } from "@/lib/traceGrouping";
import ChatTrace from "@/components/ChatTrace";

export default async function SessionTranscriptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let trace: TraceNode[] = [];
  let error: string | null = null;

  try {
    const data = await hermesFetch<SessionMessagesResponse>(
      `/api/sessions/${id}/messages`
    );
    trace = groupMessagesIntoTrace(data.messages);
  } catch (err) {
    error = err instanceof Error ? err.message : "Couldn't reach Hermes.";
  }

  return (
    <div>
      <Link
        href="/portal/chat-history"
        className="text-sm text-zinc-500 hover:underline dark:text-zinc-400"
      >
        &larr; Back to Chat History
      </Link>

      <h1 className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Session {id}
      </h1>

      {error && (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {!error && trace.length === 0 && (
        <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
          No messages yet.
        </p>
      )}

      {!error && trace.length > 0 && <ChatTrace trace={trace} />}
    </div>
  );
}
