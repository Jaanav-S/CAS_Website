"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ROLE_LABELS } from "@/lib/constants";

export type SectionOption = { id: string; label: string };

const ROLES = ["student", "teacher", "supervisor"] as const;

/**
 * Makes a sign-up link. The capacity is the whole point: the link stops
 * working the moment that many people have joined.
 */
export function CreateInvite({ sections }: { sections: SectionOption[] }) {
  const router = useRouter();
  const [role, setRole] = useState<string>("student");
  const [section, setSection] = useState("");
  const [capacity, setCapacity] = useState("20");
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const needsSection = role === "student";
  const showsSection = role !== "supervisor";

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setCreated(null);

    const res = await fetch("/api/admin/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role,
        section: showsSection ? section : "",
        capacity: Number(capacity),
        label,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);

    if (!res.ok) {
      setError(data.error ?? "Could not create the link.");
      return;
    }
    setCreated(data.url as string);
    setLabel("");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-4 p-5">
      <div>
        <h2 className="font-bold">Create a sign-up link</h2>
        <p className="hint mt-0.5">
          Send it to the people who should join. It stops working once the
          number below have signed up.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="w-44">
          <label className="label" htmlFor="invite-role">
            Who is joining
          </label>
          <select
            id="invite-role"
            className="select"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </div>

        {showsSection && (
          <div className="min-w-52 flex-1">
            <label className="label" htmlFor="invite-section">
              Section{needsSection && <span className="text-danger"> *</span>}
            </label>
            <select
              id="invite-section"
              className="select"
              value={section}
              onChange={(e) => setSection(e.target.value)}
            >
              <option value="">
                {needsSection ? "Choose a section" : "No section"}
              </option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="w-40">
          <label className="label" htmlFor="invite-capacity">
            How many people <span className="text-danger">*</span>
          </label>
          <input
            id="invite-capacity"
            type="number"
            min={1}
            max={500}
            className="input"
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="invite-label">
          Label (optional)
        </label>
        <input
          id="invite-label"
          className="input"
          placeholder="DP1-A students, 2026-27"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      {created && (
        <div className="rounded-lg border border-brand/30 bg-brand-soft p-3">
          <p className="text-sm font-semibold text-brand-strong">
            Link created — send this to them:
          </p>
          <code className="mt-1 block break-all text-xs">{created}</code>
        </div>
      )}

      <div className="flex justify-end">
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? "Creating…" : "Create link"}
        </button>
      </div>
    </form>
  );
}
