"use client";

import { useState, type FormEvent } from "react";
import type { PairingList } from "@/lib/types";

const PLATFORMS = ["telegram", "discord", "slack", "whatsapp"];

export default function PairingPanel({
  initialPairing,
}: {
  initialPairing: PairingList;
}) {
  const [pairing, setPairing] = useState(initialPairing);
  const [platform, setPlatform] = useState(PLATFORMS[0]);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function refresh() {
    const res = await fetch("/api/pairing");
    if (res.ok) {
      setPairing(await res.json());
    }
  }

  async function handleApprove(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const res = await fetch("/api/pairing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform, code }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Couldn't approve that code. Try again.");
      setSubmitting(false);
      return;
    }

    setCode("");
    setSubmitting(false);
    await refresh();
  }

  async function handleRevoke(revokePlatform: string, userId: string) {
    setError(null);
    const res = await fetch("/api/pairing/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform: revokePlatform, user_id: userId }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? `Couldn't revoke ${userId}. Try again.`);
      return;
    }

    await refresh();
  }

  async function handleClearPending() {
    setError(null);
    const res = await fetch("/api/pairing/clear-pending", { method: "POST" });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Couldn't clear pending codes. Try again.");
      return;
    }

    await refresh();
  }

  return (
    <div className="mt-6 flex flex-col gap-8">
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <form
        onSubmit={handleApprove}
        className="flex flex-col gap-4 rounded-md border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
      >
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Approve a pairing code
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          The user gets this code from the bot when they first DM it, and sends it to
          you out-of-band. Enter it exactly as they gave it to you — the codes shown in
          the pending list below are just truncated hashes for reference, not the real
          value.
        </p>

        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="platform"
              className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Platform
            </label>
            <select
              id="platform"
              value={platform}
              onChange={(event) => setPlatform(event.target.value)}
              className="rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:text-zinc-50"
            >
              {PLATFORMS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="code"
              className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Pairing code
            </label>
            <input
              id="code"
              type="text"
              required
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="e.g. 7K3P9Q"
              className="rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:text-zinc-50"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
          >
            {submitting ? "Approving…" : "Approve"}
          </button>
        </div>
      </form>

      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Pending ({pairing.pending.length})
          </h2>
          {pairing.pending.length > 0 && (
            <button
              onClick={handleClearPending}
              className="text-sm text-zinc-500 hover:underline dark:text-zinc-400"
            >
              Clear all pending
            </button>
          )}
        </div>

        {pairing.pending.length === 0 && (
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            No pending pairing requests.
          </p>
        )}

        <div className="mt-2 flex flex-col gap-2">
          {pairing.pending.map((p) => (
            <div
              key={`${p.platform}-${p.user_id}-${p.code}`}
              className="flex items-center justify-between rounded-md border border-zinc-200 bg-white px-4 py-3 text-sm dark:border-zinc-800 dark:bg-zinc-900"
            >
              <span>
                <span className="font-medium text-zinc-900 dark:text-zinc-50">
                  {p.user_name || p.user_id}
                </span>
                <span className="ml-2 text-zinc-500 dark:text-zinc-400">
                  {p.platform} · code ref {p.code} · {p.age_minutes}m ago
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Approved ({pairing.approved.length})
        </h2>

        {pairing.approved.length === 0 && (
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            No approved users yet.
          </p>
        )}

        <div className="mt-2 flex flex-col gap-2">
          {pairing.approved.map((a) => (
            <div
              key={`${a.platform}-${a.user_id}`}
              className="flex items-center justify-between rounded-md border border-zinc-200 bg-white px-4 py-3 text-sm dark:border-zinc-800 dark:bg-zinc-900"
            >
              <span>
                <span className="font-medium text-zinc-900 dark:text-zinc-50">
                  {a.user_name || a.user_id}
                </span>
                <span className="ml-2 text-zinc-500 dark:text-zinc-400">
                  {a.platform} · approved{" "}
                  {new Date(a.approved_at * 1000).toLocaleDateString()}
                </span>
              </span>
              <button
                onClick={() => handleRevoke(a.platform, a.user_id)}
                className="text-sm text-red-600 hover:underline dark:text-red-400"
              >
                Revoke
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
