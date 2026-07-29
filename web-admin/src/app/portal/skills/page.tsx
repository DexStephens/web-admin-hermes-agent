import { hermesFetch } from "@/lib/hermes";
import type { Skill } from "@/lib/types";
import SkillsList from "@/components/SkillsList";

// No searchParams/dynamic route params to force per-request rendering, so
// without this, `next build` prerenders the page once (with no runtime env
// vars available at build time) and freezes whatever hermesFetch's error
// was at that moment into the static output forever, regardless of the
// container's actual env vars at request time.
export const dynamic = "force-dynamic";

export default async function SkillsPage() {
  let skills: Skill[] = [];
  let error: string | null = null;

  try {
    skills = await hermesFetch<Skill[]>("/api/skills");
  } catch (err) {
    error = err instanceof Error ? err.message : "Couldn't reach Hermes.";
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Skills
      </h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Toggle which skills the agent can use. Changes take effect on the
        next session.
      </p>

      {error && (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {!error && <SkillsList initialSkills={skills} />}
    </div>
  );
}
