"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MAX_PROJECT_MEMBERS } from "@/lib/constants";

export type MemberCheck = {
  email: string;
  ok: boolean;
  id?: string;
  name?: string;
  reason?: string;
};

/**
 * Collects up to six collaborators by email and checks each one against the
 * user list as it is typed. The server re-runs exactly the same check on save,
 * so this is here to catch typos early rather than to enforce anything.
 */
export function MemberPicker({
  emails,
  onChange,
  disabled,
}: {
  emails: string[];
  onChange: (emails: string[]) => void;
  disabled?: boolean;
}) {
  const [checks, setChecks] = useState<Record<string, MemberCheck>>({});
  const [checking, setChecking] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const verify = useCallback(async (list: string[]) => {
    const wanted = list.map((e) => e.trim()).filter((e) => e.includes("@"));
    if (wanted.length === 0) {
      setChecks({});
      return;
    }
    setChecking(true);
    try {
      const res = await fetch("/api/projects/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails: wanted }),
      });
      const data = await res.json();
      if (Array.isArray(data.results)) {
        setChecks(
          Object.fromEntries(
            (data.results as MemberCheck[]).map((r) => [r.email, r]),
          ),
        );
      }
    } catch {
      // Offline — the save will report the real answer.
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void verify(emails), 500);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [emails, verify]);

  function set(index: number, value: string) {
    // The blank starter row is not in state until something is typed into it.
    const next = emails.length === 0 ? [""] : [...emails];
    next[index] = value;
    onChange(next);
  }

  const rows = emails.length === 0 ? [""] : emails;

  return (
    <div className="space-y-2">
      {rows.map((email, i) => {
        const check = checks[email.trim().toLowerCase()];
        return (
          <div key={i}>
            <div className="flex items-center gap-2">
              <input
                type="email"
                className="input"
                placeholder="student@school.edu"
                value={email}
                disabled={disabled}
                aria-label={`Project member ${i + 1} email`}
                onChange={(e) => set(i, e.target.value)}
              />
              {emails.length > 0 && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={disabled}
                  onClick={() => onChange(emails.filter((_, j) => j !== i))}
                  aria-label={`Remove member ${i + 1}`}
                >
                  Remove
                </button>
              )}
            </div>
            {email.trim() && check && (
              <p
                className={`hint mt-1 ${check.ok ? "text-brand" : "text-danger"}`}
              >
                {check.ok ? `✓ ${check.name}` : `✗ ${check.reason}`}
              </p>
            )}
          </div>
        );
      })}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          disabled={disabled || emails.length >= MAX_PROJECT_MEMBERS}
          onClick={() => onChange([...emails, ""])}
        >
          + Add another
        </button>
        <p className="hint">
          {emails.filter((e) => e.trim()).length} of {MAX_PROJECT_MEMBERS} added
          {checking && " · checking…"}
        </p>
      </div>
    </div>
  );
}
