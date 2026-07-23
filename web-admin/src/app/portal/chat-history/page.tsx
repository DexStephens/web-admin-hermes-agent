import Link from "next/link";
import { hermesFetch } from "@/lib/hermes";
import type { Session, SessionsResponse } from "@/lib/types";

export default async function ChatHistoryPage() {
  let sessions: Session[] = [];
  let error: string | null = null;

  try {
    const data = await hermesFetch<SessionsResponse>("/api/sessions");
    sessions = data.data;
  } catch (err) {
    error = err instanceof Error ? err.message : "Couldn't reach Hermes.";
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Chat History
      </h1>

      {error && (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {!error && sessions.length === 0 && (
        <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
          No sessions yet.
        </p>
      )}

      <ul className="mt-6 flex flex-col gap-2">
        {sessions.map((session) => (
          <li key={session.id}>
            <Link
              href={`/portal/chat-history/${session.id}`}
              className="flex items-center justify-between rounded-md border border-zinc-200 bg-white px-4 py-3 text-sm hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
            >
              <span className="font-medium text-zinc-900 dark:text-zinc-50">
                {session.title ?? session.id}
              </span>
              <span className="text-zinc-500 dark:text-zinc-400">
                {session.message_count != null
                  ? `${session.message_count} messages`
                  : ""}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
