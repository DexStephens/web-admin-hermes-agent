import { hermesFetch } from "@/lib/hermes";

export async function POST() {
  try {
    const result = await hermesFetch("/api/pairing/clear-pending", {
      method: "POST",
    });
    return Response.json(result);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 502 }
    );
  }
}
