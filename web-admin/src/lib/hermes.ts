const HERMES_DASHBOARD_URL =
  process.env.HERMES_DASHBOARD_URL ?? "http://localhost:9119";

/**
 * Server-only proxy to Hermes's built-in dashboard REST API.
 * Never import this from a Client Component — HERMES_DASHBOARD_TOKEN would leak.
 */
export async function hermesFetch<T = unknown>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const token = process.env.HERMES_DASHBOARD_TOKEN;

  const res = await fetch(`${HERMES_DASHBOARD_URL}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });

  if (!res.ok) {
    throw new Error(
      `Hermes dashboard request failed: ${res.status} ${res.statusText} (${path})`
    );
  }

  return res.json() as Promise<T>;
}
