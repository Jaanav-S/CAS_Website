"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { InviteSummary } from "@/lib/invites";
import { ROLE_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/format";

const STATE_BADGE: Record<string, string> = {
  active: "badge-approved",
  full: "badge-neutral",
  revoked: "badge-rejected",
};

/**
 * The list of sign-up links. Admins get the copy and revoke controls;
 * teachers get the same progress figures read-only.
 */
export function InviteList({
  invites,
  canManage,
}: {
  invites: InviteSummary[];
  canManage: boolean;
}) {
  if (invites.length === 0) {
    return (
      <div className="card p-10 text-center">
        <p className="font-semibold">No sign-up links yet</p>
        <p className="mt-1 text-sm text-muted">
          {canManage
            ? "Create one above and send it to the people who should join."
            : "Your admin has not created a link for your section yet."}
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {invites.map((invite) => (
        <InviteRow key={invite.id} invite={invite} canManage={canManage} />
      ))}
    </ul>
  );
}

function InviteRow({
  invite,
  canManage,
}: {
  invite: InviteSummary;
  canManage: boolean;
}) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showPeople, setShowPeople] = useState(false);

  const percent = Math.round((invite.used / invite.capacity) * 100);

  async function copy() {
    try {
      await navigator.clipboard.writeText(invite.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked — the link is on screen to copy by hand.
    }
  }

  async function revoke() {
    setBusy(true);
    await fetch(`/api/admin/invites/${invite.id}`, { method: "DELETE" });
    setBusy(false);
    router.refresh();
  }

  return (
    <li className="card space-y-3 p-5">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-48 flex-1">
          <p className="font-semibold">
            {invite.label || `${ROLE_LABELS[invite.role]} sign-up`}
          </p>
          <p className="hint mt-0.5">
            {ROLE_LABELS[invite.role]}
            {invite.sectionName && ` · ${invite.sectionName}`} · created{" "}
            {formatDate(invite.createdAt)}
          </p>
        </div>
        <span className={`badge ${STATE_BADGE[invite.state]}`}>
          {invite.state === "active"
            ? `${invite.left} left`
            : invite.state === "full"
              ? "All signed up"
              : "Turned off"}
        </span>
      </div>

      <div>
        <div className="flex items-center gap-3">
          <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
            <span
              className="block h-full rounded-full"
              style={{
                width: `${percent}%`,
                background:
                  invite.state === "revoked" ? "var(--muted)" : "var(--brand)",
              }}
            />
          </span>
          <span className="hint tabular-nums">
            {invite.used} of {invite.capacity} signed up
          </span>
        </div>
      </div>

      {canManage && invite.state === "active" && (
        <div className="flex flex-wrap items-center gap-2">
          <code className="min-w-48 flex-1 truncate rounded-lg border bg-surface-2 px-3 py-2 text-xs">
            {invite.url}
          </code>
          <button type="button" className="btn btn-primary btn-sm" onClick={copy}>
            {copied ? "Copied" : "Copy link"}
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={revoke}
            disabled={busy}
          >
            {busy ? "Turning off…" : "Turn off"}
          </button>
        </div>
      )}

      {invite.used > 0 && (
        <div>
          <button
            type="button"
            className="hint font-semibold text-brand hover:underline"
            onClick={() => setShowPeople((v) => !v)}
          >
            {showPeople ? "Hide" : "Show"} who has signed up ({invite.used})
          </button>
          {showPeople && (
            <ul className="mt-2 space-y-1">
              {invite.usedBy.map((person) => (
                <li key={person.email} className="text-sm">
                  <span className="font-semibold">{person.name}</span>{" "}
                  <span className="hint">
                    {person.email} · {formatDate(person.at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </li>
  );
}
