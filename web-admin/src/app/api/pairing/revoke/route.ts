import { hermesFetch } from "@/lib/hermes";

export async function POST(request: Request) {
  const body = await request.json();

  try {
    const result = await hermesFetch("/api/pairing/revoke", {
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
