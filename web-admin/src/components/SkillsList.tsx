"use client";

import { useState } from "react";
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

  if (skills.length === 0) {
    return (
      <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
        No skills installed.
      </p>
    );
  }

  return (
    <div className="mt-6 flex flex-col gap-2">
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {skills.map((skill) => (
        <label
          key={skill.name}
          className="flex items-center justify-between rounded-md border border-zinc-200 bg-white px-4 py-3 text-sm dark:border-zinc-800 dark:bg-zinc-900"
        >
          <span>
            <span className="font-medium text-zinc-900 dark:text-zinc-50">
              {skill.name}
            </span>
            {skill.description && (
              <span className="ml-2 text-zinc-500 dark:text-zinc-400">
                {skill.description}
              </span>
            )}
          </span>
          <input
            type="checkbox"
            checked={skill.enabled}
            onChange={(event) => toggle(skill.name, event.target.checked)}
            className="h-4 w-4"
          />
        </label>
      ))}
    </div>
  );
}
