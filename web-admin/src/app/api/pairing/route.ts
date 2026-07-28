import { hermesFetch } from "@/lib/hermes";
import type { PairingList } from "@/lib/types";

export async function GET() {
  try {
    const pairing = await hermesFetch<PairingList>("/api/pairing");
    return Response.json(pairing);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 502 }
    );
  }
}

export async function POST(request: Request) {
  const body = await request.json();

  try {
    const result = await hermesFetch("/api/pairing/approve", {
      method: "POST",
      body: JSON.stringify(body),
    });
    return Response.json(result);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 502 }
    );
  }
}
