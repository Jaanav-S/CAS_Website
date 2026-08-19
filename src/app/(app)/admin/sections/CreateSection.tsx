"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { DP_YEARS } from "@/lib/constants";

export function CreateSection({ years }: { years: string[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [year, setYear] = useState(years[1] ?? years[0] ?? "");
  const [dpYear, setDpYear] = useState<string>(DP_YEARS[0]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const res = await fetch("/api/admin/sections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, year, dpYear }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);

    if (!res.ok) {
      setError(data.error ?? "Could not create the section.");
      return;
    }
    setName("");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="card flex flex-wrap items-end gap-3 p-5">
      <div className="min-w-48 flex-1">
        <label className="label" htmlFor="section-name">
          Section name
        </label>
        <input
          id="section-name"
          className="input"
          placeholder="DP1-A"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div className="w-40">
        <label className="label" htmlFor="section-year">
          Year
        </label>
        <select
          id="section-year"
          className="select"
          value={year}
          onChange={(e) => setYear(e.target.value)}
        >
          {years.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      </div>

      <div className="w-32">
        <label className="label" htmlFor="section-dp">
          DP year
        </label>
        <select
          id="section-dp"
          className="select"
          value={dpYear}
          onChange={(e) => setDpYear(e.target.value)}
        >
          {DP_YEARS.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      </div>

      <button type="submit" className="btn btn-primary" disabled={busy}>
        {busy ? "Creating…" : "Create section"}
      </button>

      {error && <p className="w-full text-sm text-danger">{error}</p>}
    </form>
  );
}
