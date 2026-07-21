import { hermesFetch } from "@/lib/hermes";
import type { Skill } from "@/lib/types";

export async function GET() {
  try {
    const skills = await hermesFetch<Skill[]>("/api/skills");
    return Response.json(skills);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 502 }
    );
  }
}

export async function PUT(request: Request) {
  const body = await request.json();

  try {
    const result = await hermesFetch("/api/skills/toggle", {
      method: "PUT",
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
