"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { DP_YEARS } from "@/lib/constants";

export type FilterOption = { value: string; label: string };

/**
 * Section / student / DP year, all combinable. Each change rewrites the query
 * string, so a filtered view can be linked to and shared.
 */
export function DiscoveryFilters({
  sections,
  students,
}: {
  sections: FilterOption[];
  students: FilterOption[];
}) {
  const router = useRouter();
  const params = useSearchParams();

  function apply(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    const query = next.toString();
    router.push(query ? `/discovery?${query}` : "/discovery");
  }

  const active = ["section", "student", "dpYear"].filter((k) => params.get(k));

  return (
    <div className="card flex flex-wrap items-end gap-4 p-4">
      <Field label="Section" htmlFor="filter-section">
        <select
          id="filter-section"
          className="select"
          value={params.get("section") ?? ""}
          onChange={(e) => apply("section", e.target.value)}
        >
          <option value="">All sections</option>
          {sections.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Student" htmlFor="filter-student">
        <select
          id="filter-student"
          className="select"
          value={params.get("student") ?? ""}
          onChange={(e) => apply("student", e.target.value)}
        >
          <option value="">All students</option>
          {students.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </Field>

      <Field label="DP year" htmlFor="filter-dp">
        <select
          id="filter-dp"
          className="select"
          value={params.get("dpYear") ?? ""}
          onChange={(e) => apply("dpYear", e.target.value)}
        >
          <option value="">DP1 and DP2</option>
          {DP_YEARS.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </Field>

      {active.length > 0 && (
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => router.push("/discovery")}
        >
          Clear filters
        </button>
      )}
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-44 flex-1">
      <label className="label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
    </div>
  );
}
