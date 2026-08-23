"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { MultiSelect } from "@/components/MultiSelect";

export type TeacherOption = { _id: string; name: string; email: string };

export type SectionView = {
  _id: string;
  name: string;
  gradYear: number;
  /** Derived on the server so the card matches the rest of the app. */
  dpYear: string | null;
  academicYear: string;
  stage: "upcoming" | "DP1" | "DP2" | "graduated";
  teachers: TeacherOption[];
};

const STAGE_BADGE: Record<SectionView["stage"], string> = {
  upcoming: "badge-neutral",
  DP1: "badge-approved",
  DP2: "badge-approved",
  graduated: "badge-neutral",
};

const STAGE_LABEL: Record<SectionView["stage"], string> = {
  upcoming: "Upcoming",
  DP1: "DP1",
  DP2: "DP2",
  graduated: "Graduated",
};

export function SectionCard({
  section,
  teachers,
  studentCount,
}: {
  section: SectionView;
  teachers: TeacherOption[];
  studentCount: number;
}) {
  const router = useRouter();
  const [assigned, setAssigned] = useState(section.teachers.map((t) => t._id));
  const [gradYear, setGradYear] = useState(String(section.gradYear));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const teachersDirty =
    assigned.length !== section.teachers.length ||
    assigned.some((id) => !section.teachers.some((t) => t._id === id));
  const gradYearDirty = gradYear !== String(section.gradYear);

  async function patch(body: unknown, fail: string) {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/sections/${section._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? fail);
      return false;
    }
    router.refresh();
    return true;
  }

  async function remove() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/sections/${section._id}`, {
      method: "DELETE",
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    setConfirmingDelete(false);
    if (!res.ok) {
      setError(data.error ?? "Could not delete.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="card space-y-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-bold">
            {section.name}
            <span className={`badge ${STAGE_BADGE[section.stage]}`}>
              {STAGE_LABEL[section.stage]}
            </span>
          </h2>
          <p className="hint">{section.academicYear}</p>
        </div>
        <Link
          href={`/teacher?section=${section._id}`}
          className="badge badge-info px-3 py-1.5"
        >
          {studentCount} student{studentCount === 1 ? "" : "s"}
        </Link>
      </div>

      <div>
        <label className="label" htmlFor={`grad-${section._id}`}>
          Graduating year
        </label>
        <div className="flex items-center gap-2">
          <input
            id={`grad-${section._id}`}
            type="number"
            className="input w-32"
            value={gradYear}
            disabled={busy}
            onChange={(e) => setGradYear(e.target.value)}
          />
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            disabled={busy || !gradYearDirty || !gradYear}
            onClick={() =>
              void patch(
                { gradYear: Number(gradYear) },
                "Could not change the graduating year.",
              )
            }
          >
            Save year
          </button>
        </div>
        <p className="hint mt-1">
          The class finishes DP2 in {gradYear || "—"}. DP1/DP2 and the academic
          year follow from this automatically.
        </p>
      </div>

      <div>
        <span className="label">Teachers who review this section</span>
        <MultiSelect
          placeholder="Assign teachers"
          ariaLabel={`Teachers reviewing ${section.name}`}
          options={teachers.map((t) => ({ value: t._id, label: t.name }))}
          value={assigned}
          onChange={setAssigned}
          allowCheckAll={false}
        />
        {teachers.length === 0 && (
          <p className="hint mt-1">
            No approved teachers yet — change someone&apos;s role on the Users
            page first.
          </p>
        )}
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex flex-wrap justify-between gap-2 border-t pt-4">
        {confirmingDelete ? (
          <span className="flex flex-wrap items-center gap-2">
            <span className="hint">Delete this section?</span>
            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={remove}
              disabled={busy}
            >
              Yes, delete
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setConfirmingDelete(false)}
              disabled={busy}
            >
              Cancel
            </button>
          </span>
        ) : (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setConfirmingDelete(true)}
            disabled={busy}
          >
            Delete
          </button>
        )}

        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={() =>
            void patch({ teachers: assigned }, "Could not save.")
          }
          disabled={busy || !teachersDirty}
        >
          {busy ? "Saving…" : "Save teachers"}
        </button>
      </div>
    </div>
  );
}
