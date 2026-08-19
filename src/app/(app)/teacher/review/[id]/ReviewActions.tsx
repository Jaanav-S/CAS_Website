"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Approving is one click. Rejecting deliberately requires a comment — the
 * student needs to know what to change.
 */
export function ReviewActions({ id }: { id: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "rejecting">("idle");
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function send(action: "approve" | "reject") {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/experiences/${id}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, comment }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(data.error ?? "Could not save your review.");
      setBusy(false);
      return;
    }
    router.push("/teacher/review");
    router.refresh();
  }

  return (
    <div className="card p-5">
      <p className="text-sm font-semibold">Your decision</p>

      {mode === "idle" ? (
        <div className="mt-3 space-y-2">
          <button
            type="button"
            className="btn btn-primary w-full"
            onClick={() => send("approve")}
            disabled={busy}
          >
            {busy ? "Saving…" : "Approve reflection"}
          </button>
          <button
            type="button"
            className="btn btn-ghost w-full"
            onClick={() => setMode("rejecting")}
            disabled={busy}
          >
            Ask for changes
          </button>
          <p className="hint">
            Approving publishes this reflection to Discovery and counts it
            towards the student&apos;s progress.
          </p>
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          <label className="label" htmlFor="comment">
            What needs to change?
          </label>
          <textarea
            id="comment"
            className="textarea"
            placeholder="Be specific — the student sees this comment and edits their reflection from it."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <div className="flex gap-2">
            <button
              type="button"
              className="btn btn-danger flex-1"
              onClick={() => send("reject")}
              disabled={busy || comment.trim().length < 5}
            >
              {busy ? "Sending…" : "Send back"}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setMode("idle")}
              disabled={busy}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}
    </div>
  );
}
