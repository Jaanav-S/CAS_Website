"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Pulls a published reflection off Discovery and hands it back to the student
 * as "needs changes". A reason is required — the student sees it and works
 * from it, exactly like a normal rejection.
 */
export function TakedownButton({
  id,
  redirectTo,
  className = "btn btn-ghost btn-sm",
}: {
  id: string;
  /** Where to send the moderator afterwards. */
  redirectTo: string;
  className?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function takeDown() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/experiences/${id}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "takedown", comment: reason }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(data.error ?? "Could not take this post down.");
      setBusy(false);
      return;
    }
    router.push(redirectTo);
    router.refresh();
  }

  if (!open) {
    return (
      <button type="button" className={className} onClick={() => setOpen(true)}>
        Remove from Discovery
      </button>
    );
  }

  return (
    <div className="card w-full max-w-md space-y-3 p-4">
      <p className="text-sm font-semibold">Remove this from Discovery</p>
      <p className="hint">
        It comes off the feed and goes back to the student as “needs changes”,
        so it stops counting towards their progress until they fix and resubmit
        it.
      </p>

      <label className="label" htmlFor={`takedown-${id}`}>
        Why are you removing it?
      </label>
      <textarea
        id={`takedown-${id}`}
        className="textarea"
        placeholder="The student sees this, so say what needs to change."
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          className="btn btn-danger flex-1"
          onClick={takeDown}
          disabled={busy || reason.trim().length < 5}
        >
          {busy ? "Removing…" : "Remove post"}
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          disabled={busy}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
