import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth";

export async function POST(request: Request) {
  (await cookies()).delete(SESSION_COOKIE_NAME);
  return NextResponse.redirect(new URL("/", request.url), 303);
}
