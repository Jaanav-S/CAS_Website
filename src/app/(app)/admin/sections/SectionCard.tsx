"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { MultiSelect } from "@/components/MultiSelect";
import { DP_YEARS } from "@/lib/constants";

export type TeacherOption = { _id: string; name: string; email: string };

export type SectionView = {
  _id: string;
  name: string;
  year: string;
  dpYear: string;
  teachers: TeacherOption[];
};

export function SectionCard({
  section,
  teachers,
  studentCount,
  years,
}: {
  section: SectionView;
  teachers: TeacherOption[];
  studentCount: number;
  years: string[];
}) {
  const router = useRouter();
  const [assigned, setAssigned] = useState(section.teachers.map((t) => t._id));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const dirty =
    assigned.length !== section.teachers.length ||
    assigned.some((id) => !section.teachers.some((t) => t._id === id));

  async function saveTeachers() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/sections/${section._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teachers: assigned }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Could not save.");
      return;
    }
    router.refresh();
  }

  async function saveField(body: unknown, fail: string) {
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
      return;
    }
    router.refresh();
  }

  const saveDpYear = (value: string) =>
    saveField({ dpYear: value }, "Could not change the DP year.");
  const saveYear = (value: string) =>
    saveField({ year: value }, "Could not change the year.");

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
            <span className="badge badge-approved">{section.dpYear}</span>
          </h2>
          <p className="hint">{section.year}</p>
        </div>
        <Link
          href={`/teacher?section=${section._id}`}
          className="badge badge-info px-3 py-1.5"
        >
          {studentCount} student{studentCount === 1 ? "" : "s"}
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor={`dp-${section._id}`}>
            DP year
          </label>
          <select
            id={`dp-${section._id}`}
            className="select"
            value={section.dpYear}
            disabled={busy}
            onChange={(e) => void saveDpYear(e.target.value)}
          >
            {DP_YEARS.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label" htmlFor={`year-${section._id}`}>
            Academic year
          </label>
          <select
            id={`year-${section._id}`}
            className="select"
            value={section.year}
            disabled={busy}
            onChange={(e) => void saveYear(e.target.value)}
          >
            {(years.includes(section.year) ? years : [section.year, ...years]).map(
              (option) => (
                <option key={option}>{option}</option>
              ),
            )}
          </select>
        </div>
      </div>
      <p className="hint">
        Moving a student into this section labels their new work {section.dpYear}.
        Promotion rolls the receiving DP2 section forward a year automatically;
        change a DP1 section&apos;s year here when the new class arrives.
      </p>

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
          onClick={saveTeachers}
          disabled={busy || !dirty}
        >
          {busy ? "Saving…" : "Save teachers"}
        </button>
      </div>
    </div>
  );
}
