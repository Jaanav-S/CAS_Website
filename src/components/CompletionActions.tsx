"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * The students' side of the completion round: mark the project finished, and
 * after changes, send it back to whoever asked for them.
 */
export function MarkDoneButton({
  projectId,
  resubmitting,
  awaiting,
}: {
  projectId: string;
  /** True when coming back from a completion rejection. */
  resubmitting: boolean;
  /** Who still has to look at it, for the resubmission wording. */
  awaiting: string[];
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function send() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/projects/${projectId}/complete`, {
      method: "POST",
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Could not do that.");
      setConfirming(false);
      return;
    }
    router.refresh();
  }

  return (
    <div className="card p-5">
      <p className="text-sm font-semibold">
        {resubmitting ? "Send your changes back" : "Finished the project?"}
      </p>

      <p className="hint mt-1">
        {resubmitting
          ? awaiting.length === 1
            ? `Only your ${awaiting[0] === "teacher" ? "teacher" : "CAS supervisor"} needs to look again — the other approval still stands.`
            : "Both approvers will look at it again."
          : "Marking it done sends it to your teacher and CAS supervisor. Once both agree, it is published on Discovery for the whole school."}
      </p>

      {error && <p className="mt-2 text-sm text-danger">{error}</p>}

      <div className="mt-3">
        {confirming ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={send}
              disabled={busy}
            >
              {busy ? "Sending…" : "Yes, send it"}
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setConfirming(false)}
              disabled={busy}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="btn btn-primary w-full"
            onClick={() => setConfirming(true)}
            disabled={busy}
          >
            {resubmitting ? "Resubmit for sign-off" : "Mark project as done"}
          </button>
        )}
      </div>

      {!resubmitting && (
        <p className="hint mt-2">
          The timeline locks while they review it.
        </p>
      )}
    </div>
  );
}
