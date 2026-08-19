"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteProjectButton({ id }: { id: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

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
      <span className="hint">Delete this project?</span>
      <button
        type="button"
        className="btn btn-danger btn-sm"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
          if (res.ok) {
            router.push("/my-cas?tab=projects");
            router.refresh();
          } else {
            setBusy(false);
            setConfirming(false);
          }
        }}
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
