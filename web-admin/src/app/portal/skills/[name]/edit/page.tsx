import { hermesFetch } from "@/lib/hermes";
import type { SkillContent } from "@/lib/types";
import Link from "next/link";
import EditSkillForm from "@/components/EditSkillForm";

export default async function EditSkillPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  const decodedName = decodeURIComponent(name);

  let skill: SkillContent | null = null;
  let error: string | null = null;

  try {
    skill = await hermesFetch<SkillContent>(
      `/api/skills/content?name=${encodeURIComponent(decodedName)}`
    );
  } catch (err) {
    error = err instanceof Error ? err.message : "Couldn't reach Hermes.";
  }

  return (
    <div>
      <Link
        href="/portal/skills"
        className="text-sm text-zinc-500 hover:underline dark:text-zinc-400"
      >
        ← Back to Skills
      </Link>

      <h1 className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Edit Skill: {decodedName}
      </h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Editing replaces the entire SKILL.md file, frontmatter included.
      </p>

      {error && <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

      {skill && <EditSkillForm name={decodedName} initialContent={skill.content} />}
    </div>
  );
}
