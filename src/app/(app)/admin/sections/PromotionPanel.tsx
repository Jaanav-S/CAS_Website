"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { MultiSelect } from "@/components/MultiSelect";
import type { PromotionOverview } from "@/lib/promotion";

/**
 * End-of-year housekeeping in one place: graduate the leaving DP2 cohort, then
 * spread the DP1 cohort across next year's DP2 sections.
 */
export function PromotionPanel({ data }: { data: PromotionOverview }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [confirmingGraduate, setConfirmingGraduate] = useState(false);
  /** Set once students have been promoted, because they then show up in the
   *  graduating list too and must not be swept up by a second click. */
  const [justPromoted, setJustPromoted] = useState(0);

  // sectionId -> student ids chosen for it
  const [picks, setPicks] = useState<Record<string, string[]>>({});

  const chosen = useMemo(
    () => new Set(Object.values(picks).flat()),
    [picks],
  );
  const totalPicked = chosen.size;

  async function post(body: unknown, success: (r: Record<string, number>) => string) {
    setBusy(true);
    setError(null);
    setDone(null);
    const res = await fetch("/api/admin/promote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(json.error ?? "That did not work.");
      return false;
    }
    setDone(success(json));
    router.refresh();
    return true;
  }

  async function graduate() {
    const ok = await post(
      { action: "graduate", studentIds: data.graduating.map((s) => s.id) },
      (r) => `${r.graduated} student${r.graduated === 1 ? "" : "s"} graduated.`,
    );
    if (ok) setConfirmingGraduate(false);
  }

  async function assign() {
    const assignments = Object.entries(picks)
      .filter(([, ids]) => ids.length > 0)
      .map(([sectionId, studentIds]) => ({ sectionId, studentIds }));
    if (assignments.length === 0) return;

    const ok = await post(
      { action: "assign", assignments },
      (r) => `${r.moved} student${r.moved === 1 ? "" : "s"} moved up to DP2.`,
    );
    if (ok) {
      setPicks({});
      setJustPromoted(assignments.reduce((n, a) => n + a.studentIds.length, 0));
    }
  }

  if (!open) {
    return (
      <div className="card flex flex-wrap items-center gap-3 p-5">
        <div className="min-w-56 flex-1">
          <p className="font-bold">End of year</p>
          <p className="hint mt-0.5">
            Graduate the leaving DP2 cohort and move this year&apos;s DP1
            students into their new sections.
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
          <h2 className="text-lg font-bold">End-of-year promotion</h2>
          <p className="hint mt-0.5">
            Graduate first, then move DP1 up — otherwise the students you just
            promoted would be graduated along with the leavers.
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

      {/* ---------------- step 1 ---------------- */}
      <section className="rounded-xl border p-5">
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="badge badge-neutral">Step 1</span>
          <h3 className="font-bold">Graduate the DP2 batch</h3>
        </div>

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

            {justPromoted > 0 && (
              <p className="mt-3 rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
                You have just moved {justPromoted} student
                {justPromoted === 1 ? "" : "s"} into DP2, so they now appear in
                this list. Read the names above before graduating anyone.
              </p>
            )}

            <div className="mt-4">
              {confirmingGraduate ? (
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
                    onClick={() => setConfirmingGraduate(false)}
                    disabled={busy}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setConfirmingGraduate(true)}
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

      {/* ---------------- step 2 ---------------- */}
      <section className="rounded-xl border p-5">
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="badge badge-neutral">Step 2</span>
          <h3 className="font-bold">Move DP1 into their DP2 sections</h3>
        </div>

        {data.dp2Sections.length === 0 ? (
          <p className="mt-3 text-sm text-muted">
            Create a DP2 section first — there is nowhere to move anybody to.
          </p>
        ) : data.dp1Students.length === 0 ? (
          <p className="mt-3 text-sm text-muted">
            Every DP1 student has already been moved up.
          </p>
        ) : (
          <>
            <p className="mt-3 text-sm">
              <strong>{data.dp1Students.length}</strong> DP1 student
              {data.dp1Students.length === 1 ? "" : "s"} still to place. Each
              name disappears from the other lists once you pick it.
            </p>

            <div className="mt-4 space-y-4">
              {data.dp2Sections.map((section) => {
                const mine = picks[section.id] ?? [];
                // Only DP1 students nobody else has claimed yet.
                const available = data.dp1Students.filter(
                  (s) => !chosen.has(s.id) || mine.includes(s.id),
                );

                return (
                  <div key={section.id} className="grid gap-2 sm:grid-cols-[14rem_1fr] sm:gap-4">
                    <div className="sm:pt-2">
                      <p className="font-semibold">{section.name}</p>
                      <p className="hint">
                        {section.year}
                        {section.teachers.length > 0
                          ? ` · ${section.teachers.join(", ")}`
                          : " · no teacher assigned"}
                      </p>
                    </div>
                    <div>
                      <MultiSelect
                        placeholder="Select students"
                        ariaLabel={`Students moving into ${section.name}`}
                        allowCheckAll={false}
                        options={available.map((s) => ({
                          value: s.id,
                          label: `${s.name} (${s.section})`,
                        }))}
                        value={mine}
                        onChange={(ids) =>
                          setPicks((p) => ({ ...p, [section.id]: ids }))
                        }
                      />
                      {mine.length > 0 && (
                        <p className="hint mt-1">
                          {mine.length} student{mine.length === 1 ? "" : "s"} selected
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3 border-t pt-4">
              <button
                type="button"
                className="btn btn-primary"
                onClick={assign}
                disabled={busy || totalPicked === 0}
              >
                {busy
                  ? "Moving…"
                  : `Move ${totalPicked} student${totalPicked === 1 ? "" : "s"} up`}
              </button>
              {totalPicked > 0 && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setPicks({})}
                  disabled={busy}
                >
                  Clear selection
                </button>
              )}
              <p className="hint">
                The DP2 section they move into rolls forward a year (e.g.
                2026-27 → 2027-28). Approved DP1 experiences stay with the DP1
                class; unfinished work follows the student.
              </p>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
