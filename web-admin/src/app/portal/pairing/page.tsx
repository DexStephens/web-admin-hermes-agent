import { hermesFetch } from "@/lib/hermes";
import type { PairingList } from "@/lib/types";
import PairingPanel from "@/components/PairingPanel";

// See the comment in ../skills/page.tsx -- without this, next build bakes a
// build-time (env-var-less) hermesFetch error into a static shell forever.
export const dynamic = "force-dynamic";

export default async function PairingPage() {
  let pairing: PairingList = { pending: [], approved: [] };
  let error: string | null = null;

  try {
    pairing = await hermesFetch<PairingList>("/api/pairing");
  } catch (err) {
    error = err instanceof Error ? err.message : "Couldn't reach Hermes.";
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Pairing
      </h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Approve new users who DM the bot for the first time, and manage who
        already has access.
      </p>

      {error && (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {!error && <PairingPanel initialPairing={pairing} />}
    </div>
  );
}
