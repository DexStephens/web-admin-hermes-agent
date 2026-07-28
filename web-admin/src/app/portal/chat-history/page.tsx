import Link from "next/link";
import { hermesFetch } from "@/lib/hermes";
import type { Session, SessionsResponse } from "@/lib/types";

const PAGE_SIZE = 20;
// The dashboard API has no "exclude source" filter (only exact-match
// `source=`), so cron sessions have to be filtered out client-side. To
// avoid re-scanning an ever-growing pile of cron noise on every request,
// we fetch just enough of the most-recent sessions to fill the requested
// page, doubling the window only if that wasn't enough — capped so a very
// deep page can't trigger an unbounded fetch.
const FETCH_HARD_CAP = 2000;

async function fetchNonCronPage(
  offset: number
): Promise<{ sessions: Session[]; total: number; incomplete: boolean }> {
  const [allTotalResp, cronTotalResp] = await Promise.all([
    hermesFetch<SessionsResponse>("/api/sessions?limit=1"),
    hermesFetch<SessionsResponse>("/api/sessions?source=cron&limit=1"),
  ]);
  const total = allTotalResp.total - cronTotalResp.total;

  const needed = offset + PAGE_SIZE;
  let limit = Math.min(Math.max(needed * 2, 50), FETCH_HARD_CAP);

  while (true) {
    const data = await hermesFetch<SessionsResponse>(
      `/api/sessions?limit=${limit}`
    );
    const filtered = data.sessions.filter((s) => s.source !== "cron");
    const exhausted = data.sessions.length >= data.total;

    if (filtered.length >= needed || exhausted || limit >= FETCH_HARD_CAP) {
      return {
        sessions: filtered.slice(offset, offset + PAGE_SIZE),
        total,
        incomplete: !exhausted && filtered.length < needed,
      };
    }

    limit = Math.min(limit * 4, FETCH_HARD_CAP, data.total);
  }
}

export default async function ChatHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  let sessions: Session[] = [];
  let total = 0;
  let incomplete = false;
  let error: string | null = null;

  try {
    const result = await fetchNonCronPage(offset);
    sessions = result.sessions;
    total = result.total;
    incomplete = result.incomplete;
  } catch (err) {
    error = err instanceof Error ? err.message : "Couldn't reach Hermes.";
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const buildHref = (targetPage: number) =>
    targetPage > 1
      ? `/portal/chat-history?page=${targetPage}`
      : "/portal/chat-history";

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Chat History
      </h1>

      {error && (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {!error && incomplete && (
        <p className="mt-4 text-sm text-amber-600 dark:text-amber-400">
          Hit the search cap while skipping automated runs — this page may be
          missing older sessions.
        </p>
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

      {total > PAGE_SIZE && (
        <div className="mt-6 flex items-center justify-between text-sm text-zinc-500 dark:text-zinc-400">
          <span>
            {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total}
          </span>
          <div className="flex gap-4">
            {page > 1 && (
              <Link href={buildHref(page - 1)} className="hover:underline">
                &larr; Newer
              </Link>
            )}
            {page < totalPages && (
              <Link href={buildHref(page + 1)} className="hover:underline">
                Older &rarr;
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
