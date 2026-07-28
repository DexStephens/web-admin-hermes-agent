const HERMES_DASHBOARD_URL =
  process.env.HERMES_DASHBOARD_URL ?? "http://localhost:9119";

/**
 * Server-only proxy to Hermes's built-in dashboard REST API.
 * Never import this from a Client Component — credentials would leak.
 *
 * The dashboard (hermes_cli/web_server.py) gates non-loopback access behind
 * a real login (username/password provider), not a static bearer token —
 * see https://hermes-agent.nousresearch.com/docs/user-guide/features/web-dashboard.
 * POST /auth/password-login sets a session cookie (hermes_session_at); we
 * cache it in-process and replay it on every request, re-logging in on
 * first use and whenever a request comes back 401 (expired/invalid session).
 */

// In-flight login promise, deduped so concurrent requests during a cold
// start don't all hit the rate-limited /auth/password-login endpoint at once.
let sessionCookiePromise: Promise<string> | null = null;

function extractSessionCookie(res: Response): string {
  // getSetCookie() is the correct API for multiple Set-Cookie headers
  // (Headers.get('set-cookie') merges them into one comma-joined string,
  // which is ambiguous since cookie Expires values also contain commas).
  const rawCookies =
    typeof res.headers.getSetCookie === "function"
      ? res.headers.getSetCookie()
      : (res.headers.get("set-cookie")?.split(/,(?=\s*\w+=)/) ?? []);

  const pairs = rawCookies
    .map((cookie) => cookie.split(";")[0]?.trim())
    .filter((pair): pair is string => Boolean(pair));

  if (pairs.length === 0) {
    throw new Error(
      "Hermes dashboard login succeeded but returned no session cookie."
    );
  }

  return pairs.join("; ");
}

async function login(): Promise<string> {
  const username = process.env.HERMES_DASHBOARD_USERNAME;
  const password = process.env.HERMES_DASHBOARD_PASSWORD;

  if (!username || !password) {
    throw new Error(
      "HERMES_DASHBOARD_USERNAME / HERMES_DASHBOARD_PASSWORD are not set."
    );
  }

  const res = await fetch(`${HERMES_DASHBOARD_URL}/auth/password-login`, {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    // `provider` is required despite not being documented — confirmed
    // against a live dashboard instance (2026-07-25): omitting it 422s
    // with "Field required" for body.provider. "basic" matches
    // HERMES_DASHBOARD_BASIC_AUTH_* in hermes_home/.env.
    body: JSON.stringify({ provider: "basic", username, password }),
  });

  if (!res.ok) {
    throw new Error(
      `Hermes dashboard login failed: ${res.status} ${res.statusText}`
    );
  }

  return extractSessionCookie(res);
}

function getSessionCookie(): Promise<string> {
  if (!sessionCookiePromise) {
    sessionCookiePromise = login().catch((error) => {
      // Don't cache a failed login attempt — the next call should retry.
      sessionCookiePromise = null;
      throw error;
    });
  }
  return sessionCookiePromise;
}

export async function hermesFetch<T = unknown>(
  path: string,
  init?: RequestInit
): Promise<T> {
  let cookie = await getSessionCookie();

  let res = await fetch(`${HERMES_DASHBOARD_URL}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
      ...init?.headers,
    },
  });

  if (res.status === 401) {
    // Session expired or was invalidated — log in again once and retry.
    sessionCookiePromise = null;
    cookie = await getSessionCookie();
    res = await fetch(`${HERMES_DASHBOARD_URL}${path}`, {
      ...init,
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        ...init?.headers,
      },
    });
  }

  if (!res.ok) {
    // FastAPI's HTTPException(detail=...) is the actual validation/not-found
    // reason (e.g. bad skill frontmatter) — surface it instead of just the
    // generic HTTP status, if the body parses as JSON with a `detail` field.
    let detail: string | undefined;
    try {
      const body = await res.json();
      if (body && typeof body.detail === "string") {
        detail = body.detail;
      }
    } catch {
      // body wasn't JSON (or was empty) — fall back to the status line below
    }

    throw new Error(
      detail ??
        `Hermes dashboard request failed: ${res.status} ${res.statusText} (${path})`
    );
  }

  return res.json() as Promise<T>;
}
