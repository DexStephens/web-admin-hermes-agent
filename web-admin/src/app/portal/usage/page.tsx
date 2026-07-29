import Link from "next/link";
import { hermesFetch } from "@/lib/hermes";
import type { UsageResponse } from "@/lib/types";

// See the comment in ../skills/page.tsx -- without this, next build bakes a
// build-time (env-var-less) hermesFetch error into a static shell forever.
export const dynamic = "force-dynamic";

// The backend has no dedicated "all time" mode -- /api/analytics/usage just
// takes `days` and filters `started_at > now - days*86400`. A large-enough
// day count (no max is enforced server-side) covers any real deployment's
// history, so it doubles as "all time" without needing a backend change.
const ALL_TIME_DAYS = 36500;

export default async function UsagePage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range } = await searchParams;
  const isAllTime = range === "all";
  const days = isAllTime ? ALL_TIME_DAYS : 30;

  let usage: UsageResponse | null = null;
  let error: string | null = null;

  try {
    usage = await hermesFetch<UsageResponse>(
      `/api/analytics/usage?days=${days}`
    );
  } catch (err) {
    error = err instanceof Error ? err.message : "Couldn't reach Hermes.";
  }

  const tabClass = (active: boolean) =>
    `rounded-md px-3 py-1.5 text-sm font-medium ${
      active
        ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
        : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
    }`;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        API Usage
      </h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        {isAllTime ? "All time" : "Last 30 days"}, from Hermes&apos;s own
        usage tracking.
      </p>

      <div className="mt-4 flex gap-1">
        <Link href="/portal/usage" className={tabClass(!isAllTime)}>
          Last 30 days
        </Link>
        <Link href="/portal/usage?range=all" className={tabClass(isAllTime)}>
          All time
        </Link>
      </div>

      {error && (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {usage && (
        <div className="mt-6 flex flex-col gap-8">
          <section>
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Daily tokens
            </h2>
            <table className="mt-2 w-full text-left text-sm">
              <thead>
                <tr className="text-zinc-500 dark:text-zinc-400">
                  <th className="py-1 font-medium">Date</th>
                  <th className="py-1 font-medium">Input</th>
                  <th className="py-1 font-medium">Output</th>
                </tr>
              </thead>
              <tbody>
                {usage.daily.map((day) => (
                  <tr
                    key={day.day}
                    className="border-t border-zinc-200 text-zinc-900 dark:border-zinc-800 dark:text-zinc-50"
                  >
                    <td className="py-1.5">{day.day}</td>
                    <td className="py-1.5">{day.input_tokens}</td>
                    <td className="py-1.5">{day.output_tokens}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Per-model breakdown
            </h2>
            <table className="mt-2 w-full text-left text-sm">
              <thead>
                <tr className="text-zinc-500 dark:text-zinc-400">
                  <th className="py-1 font-medium">Model</th>
                  <th className="py-1 font-medium">Sessions</th>
                  <th className="py-1 font-medium">Tokens</th>
                  <th className="py-1 font-medium">Est. cost</th>
                </tr>
              </thead>
              <tbody>
                {usage.by_model.map((model) => (
                  <tr
                    key={model.model}
                    className="border-t border-zinc-200 text-zinc-900 dark:border-zinc-800 dark:text-zinc-50"
                  >
                    <td className="py-1.5">{model.model}</td>
                    <td className="py-1.5">{model.sessions}</td>
                    <td className="py-1.5">
                      {model.input_tokens + model.output_tokens}
                    </td>
                    <td className="py-1.5">
                      ${model.estimated_cost.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      )}
    </div>
  );
}
