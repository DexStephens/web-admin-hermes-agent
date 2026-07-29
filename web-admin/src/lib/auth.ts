import { createHmac, timingSafeEqual } from "node:crypto";

export const DEMO_USERNAME = "demo";
export const DEMO_PASSWORD = "demo";

export const SESSION_COOKIE_NAME = "hermes_portal_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12; // 12h admin session

function getSecret(): string {
  const secret = process.env.PORTAL_SESSION_SECRET;
  if (!secret) {
    throw new Error(
      "PORTAL_SESSION_SECRET is not set. Generate one with " +
        "`openssl rand -base64 32` and add it to .env.local."
    );
  }
  return secret;
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

export function createSessionToken(): string {
  const issuedAt = Date.now().toString();
  return `${issuedAt}.${sign(issuedAt)}`;
}

export function verifySessionToken(token: string | undefined | null): boolean {
  if (!token) return false;
  const [issuedAt, signature] = token.split(".");
  if (!issuedAt || !signature) return false;

  const expected = sign(issuedAt);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;

  const age = Date.now() - Number(issuedAt);
  return age >= 0 && age <= SESSION_MAX_AGE_SECONDS * 1000;
}

// `secure` must reflect the scheme the browser actually sees, not just the
// build mode: nginx currently terminates plain HTTP (no domain/TLS yet, see
// nginx.conf), and browsers silently drop `Secure` cookies set over http://,
// so hardcoding `NODE_ENV === "production"` here breaks login in prod. Once
// TLS is added, X-Forwarded-Proto will read "https" and this upgrades itself.
export function sessionCookieOptions(secure: boolean) {
  return {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}
