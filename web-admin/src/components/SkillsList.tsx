"use client";

import { useState } from "react";
import Link from "next/link";
import type { Skill } from "@/lib/types";

export default function SkillsList({
  initialSkills,
}: {
  initialSkills: Skill[];
}) {
  const [skills, setSkills] = useState(initialSkills);
  const [error, setError] = useState<string | null>(null);

  async function toggle(name: string, enabled: boolean) {
    setError(null);
    setSkills((prev) =>
      prev.map((skill) =>
        skill.name === name ? { ...skill, enabled } : skill
      )
    );

    const res = await fetch("/api/skills", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, enabled }),
    });

    if (!res.ok) {
      // revert on failure
      setSkills((prev) =>
        prev.map((skill) =>
          skill.name === name ? { ...skill, enabled: !enabled } : skill
        )
      );
      setError(`Couldn't update "${name}". Try again.`);
    }
  }

  return (
    <div className="mt-6 flex flex-col gap-4">
      <Link
        href="/portal/skills/new"
        className="self-start rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-50 dark:text-zinc-900"
      >
        + New Skill
      </Link>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {skills.length === 0 && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          No skills installed.
        </p>
      )}

      <div className="flex flex-col gap-2">
        {skills.map((skill) => (
          <div
            key={skill.name}
            className="flex items-center justify-between rounded-md border border-zinc-200 bg-white px-4 py-3 text-sm dark:border-zinc-800 dark:bg-zinc-900"
          >
            <span>
              <span className="font-medium text-zinc-900 dark:text-zinc-50">
                {skill.name}
              </span>
              {skill.provenance && skill.provenance !== "agent" && (
                <span
                  title="Edits to bundled/hub skills may be overwritten by the next skill sync."
                  className="ml-2 rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                >
                  {skill.provenance}
                </span>
              )}
              {skill.description && (
                <span className="ml-2 text-zinc-500 dark:text-zinc-400">
                  {skill.description}
                </span>
              )}
            </span>

            <span className="flex items-center gap-4">
              <Link
                href={`/portal/skills/${encodeURIComponent(skill.name)}/edit`}
                className="text-sm text-zinc-500 hover:underline dark:text-zinc-400"
              >
                Edit
              </Link>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={skill.enabled}
                  onChange={(event) => toggle(skill.name, event.target.checked)}
                  className="h-4 w-4"
                />
              </label>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
