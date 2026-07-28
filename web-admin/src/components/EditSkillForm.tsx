"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function EditSkillForm({
  name,
  initialContent,
}: {
  name: string;
  initialContent: string;
}) {
  const router = useRouter();
  const [content, setContent] = useState(initialContent);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const res = await fetch("/api/skills/content", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, content }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Couldn't save the skill. Try again.");
      setSubmitting(false);
      return;
    }

    router.push("/portal/skills");
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="content"
          className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          SKILL.md content
        </label>
        <textarea
          id="content"
          name="content"
          required
          rows={20}
          value={content}
          onChange={(event) => setContent(event.target.value)}
          className="rounded-md border border-zinc-300 bg-transparent px-3 py-2 font-mono text-sm text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:text-zinc-50"
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="self-start rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
      >
        {submitting ? "Saving…" : "Save Changes"}
      </button>
    </form>
  );
}
