import { cookies } from "next/headers";
import {
  DEMO_USERNAME,
  DEMO_PASSWORD,
  SESSION_COOKIE_NAME,
  sessionCookieOptions,
  createSessionToken,
} from "@/lib/auth";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (body?.username !== DEMO_USERNAME || body?.password !== DEMO_PASSWORD) {
    return Response.json(
      { error: "Invalid username or password." },
      { status: 401 }
    );
  }

  const secure = request.headers.get("x-forwarded-proto") === "https";
  (await cookies()).set(
    SESSION_COOKIE_NAME,
    createSessionToken(),
    sessionCookieOptions(secure)
  );

  return Response.json({ success: true });
}
