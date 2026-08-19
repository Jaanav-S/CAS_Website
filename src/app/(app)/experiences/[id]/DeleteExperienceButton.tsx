"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteExperienceButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function remove() {
    setBusy(true);
    const res = await fetch(`/api/experiences/${id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/my-cas");
      router.refresh();
    } else {
      setBusy(false);
      setConfirming(false);
    }
  }

  if (!confirming) {
    return (
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        onClick={() => setConfirming(true)}
      >
        Delete
      </button>
    );
  }

  return (
    <span className="flex items-center gap-2">
      <span className="hint">Delete for good?</span>
      <button
        type="button"
        className="btn btn-danger btn-sm"
        onClick={remove}
        disabled={busy}
      >
        {busy ? "Deleting…" : "Yes, delete"}
      </button>
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        onClick={() => setConfirming(false)}
        disabled={busy}
      >
        Cancel
      </button>
    </span>
  );
}
