import { hermesFetch } from "@/lib/hermes";
import type { SkillContent } from "@/lib/types";

export async function GET(request: Request) {
  const name = new URL(request.url).searchParams.get("name");

  if (!name) {
    return Response.json({ error: "Missing required 'name' query param." }, { status: 400 });
  }

  try {
    const content = await hermesFetch<SkillContent>(
      `/api/skills/content?name=${encodeURIComponent(name)}`
    );
    return Response.json(content);
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
    const result = await hermesFetch("/api/skills/content", {
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
