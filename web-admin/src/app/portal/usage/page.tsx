import { hermesFetch } from "@/lib/hermes";
import type { UsageResponse } from "@/lib/types";

export default async function UsagePage() {
  let usage: UsageResponse | null = null;
  let error: string | null = null;

  try {
    usage = await hermesFetch<UsageResponse>("/api/analytics/usage?days=30");
  } catch (err) {
    error = err instanceof Error ? err.message : "Couldn't reach Hermes.";
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        API Usage
      </h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Last 30 days, from Hermes&apos;s own usage tracking.
      </p>

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
