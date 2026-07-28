"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const CONTENT_SCAFFOLD = `---
name:
description:
---

`;

export default function NewSkillPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [content, setContent] = useState(CONTENT_SCAFFOLD);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const res = await fetch("/api/skills", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        content,
        category: category.trim() || undefined,
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Couldn't create the skill. Try again.");
      setSubmitting(false);
      return;
    }

    router.push("/portal/skills");
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
        New Skill
      </h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Fill in the frontmatter (<code>name</code> and <code>description</code> are
        required) and the skill body below.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="name"
            className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:text-zinc-50"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="category"
            className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Category <span className="text-zinc-400">(optional)</span>
          </label>
          <input
            id="category"
            name="category"
            type="text"
            placeholder="e.g. productivity"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:text-zinc-50"
          />
        </div>

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
            rows={18}
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
          {submitting ? "Creating…" : "Create Skill"}
        </button>
      </form>
    </div>
  );
}
