import Link from "next/link";
import { hermesFetch } from "@/lib/hermes";
import type { SessionMessage } from "@/lib/types";

export default async function SessionTranscriptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let messages: SessionMessage[] = [];
  let error: string | null = null;

  try {
    messages = await hermesFetch<SessionMessage[]>(
      `/api/sessions/${id}/messages`
    );
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

      <div className="mt-6 flex flex-col gap-3">
        {messages.map((message, index) => (
          <div
            key={index}
            className="rounded-md border border-zinc-200 bg-white p-3 text-sm dark:border-zinc-800 dark:bg-zinc-900"
          >
            <span className="font-medium text-zinc-500 dark:text-zinc-400">
              {message.role}
            </span>
            <p className="mt-1 whitespace-pre-wrap text-zinc-900 dark:text-zinc-50">
              {message.content}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
