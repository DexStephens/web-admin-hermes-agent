import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth";

export async function POST(request: Request) {
  (await cookies()).delete(SESSION_COOKIE_NAME);

  // Don't build the redirect from request.url -- behind nginx it resolves to
  // the Node server's own bind address (http://0.0.0.0:3000/) rather than the
  // public host, since this is the raw Request passed to the route handler,
  // not NextRequest.nextUrl (which middleware gets and resolves correctly).
  const proto = request.headers.get("x-forwarded-proto") ?? "http";
  const host = request.headers.get("host");
  const redirectUrl = host ? `${proto}://${host}/` : new URL("/", request.url);

  return NextResponse.redirect(redirectUrl, 303);
}
