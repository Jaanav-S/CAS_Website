"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { PromotionOverview } from "@/lib/promotion";

/**
 * End-of-year housekeeping. DP1 → DP2 happens on its own when the academic year
 * rolls over, so the only deliberate step left is graduating the leaving DP2
 * cohort.
 */
export function PromotionPanel({ data }: { data: PromotionOverview }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  async function graduate() {
    setBusy(true);
    setError(null);
    setDone(null);
    const res = await fetch("/api/admin/promote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "graduate",
        studentIds: data.graduating.map((s) => s.id),
      }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(json.error ?? "That did not work.");
      return;
    }
    setDone(
      `${json.graduated} student${json.graduated === 1 ? "" : "s"} graduated.`,
    );
    setConfirming(false);
    router.refresh();
  }

  if (!open) {
    return (
      <div className="card flex flex-wrap items-center gap-3 p-5">
        <div className="min-w-56 flex-1">
          <p className="font-bold">End of year</p>
          <p className="hint mt-0.5">
            Graduate the leaving DP2 cohort. This year&apos;s DP1 students move
            up to DP2 automatically when the new year begins.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setOpen(true)}
        >
          Open promotion panel
        </button>
      </div>
    );
  }

  return (
    <div className="card space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">End-of-year graduation</h2>
          <p className="hint mt-0.5">
            DP1 → DP2 is automatic — a section carries its students forward and
            becomes DP2 on its own. All that is left is to graduate the cohort
            that has finished DP2.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => setOpen(false)}
        >
          Close
        </button>
      </div>

      {error && (
        <p className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}
      {done && (
        <p className="rounded-lg border border-brand/30 bg-brand-soft px-3 py-2 text-sm text-brand-strong">
          {done}
        </p>
      )}

      <section className="rounded-xl border p-5">
        <h3 className="font-bold">Graduate the DP2 batch</h3>

        {data.graduating.length === 0 ? (
          <p className="mt-3 text-sm text-muted">
            No DP2 students are waiting to graduate.
          </p>
        ) : (
          <>
            <p className="mt-3 text-sm">
              <strong>{data.graduating.length}</strong> student
              {data.graduating.length === 1 ? "" : "s"} currently in a DP2
              section. They keep their accounts and can still sign in and read
              everything — they just cannot add new experiences.
            </p>

            <ul className="mt-3 flex flex-wrap gap-1.5">
              {data.graduating.map((s) => (
                <li key={s.id} className="badge badge-neutral">
                  {s.name}
                  <span className="text-muted">· {s.section}</span>
                </li>
              ))}
            </ul>

            <div className="mt-4">
              {confirming ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-danger">
                    Graduate all {data.graduating.length}?
                  </span>
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={graduate}
                    disabled={busy}
                  >
                    {busy ? "Graduating…" : "Yes, graduate the batch"}
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
                  className="btn btn-primary"
                  onClick={() => setConfirming(true)}
                  disabled={busy}
                >
                  Graduate {data.graduating.length} student
                  {data.graduating.length === 1 ? "" : "s"}
                </button>
              )}
              <p className="hint mt-2">
                Reversible one at a time from Users → Un-graduate.
              </p>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
