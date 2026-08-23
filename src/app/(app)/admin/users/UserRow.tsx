"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ROLES, ROLE_LABELS, type AccountStatus, type Role } from "@/lib/constants";
import { formatDate } from "@/lib/format";

export type AdminUser = {
  _id: string;
  name: string;
  email: string;
  image?: string;
  role: Role;
  status: AccountStatus;
  section?: string | null;
  graduated?: boolean;
  graduationYear?: number | null;
  createdAt: string;
};

export type SectionOption = {
  _id: string;
  name: string;
  year: string;
  dpYear: string;
};

export function UserRow({
  user,
  sections,
  isSelf,
  viewerIsAdmin,
}: {
  user: AdminUser;
  sections: SectionOption[];
  isSelf: boolean;
  /** A coordinator (viewerIsAdmin=false) may not touch admin/coordinator accounts. */
  viewerIsAdmin: boolean;
}) {
  const senior = user.role === "admin" || user.role === "coordinator";
  // A coordinator can only manage students, teachers and supervisors.
  const locked = !viewerIsAdmin && senior;
  const assignableRoles = viewerIsAdmin
    ? ROLES
    : (["student", "teacher", "supervisor"] as const);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/users/${user._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Update failed.");
      return;
    }
    router.refresh();
  }

  async function remove() {
    setBusy(true);
    const res = await fetch(`/api/admin/users/${user._id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    setConfirmingDelete(false);
    if (!res.ok) {
      setError(data.error ?? "Delete failed.");
      return;
    }
    router.refresh();
  }

  return (
    <tr className="hover:bg-surface-2">
      <td className="px-5 py-3">
        <div className="flex items-center gap-3">
          {user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.image} alt="" className="h-8 w-8 rounded-full object-cover" />
          ) : (
            <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-soft text-xs font-bold text-brand-strong">
              {user.name.charAt(0).toUpperCase()}
            </span>
          )}
          <div className="min-w-0">
            <p className="font-semibold">
              {user.name}
              {isSelf && <span className="hint"> (you)</span>}
            </p>
            <p className="hint truncate">{user.email}</p>
          </div>
        </div>
        {error && <p className="mt-1 text-xs text-danger">{error}</p>}
      </td>

      <td className="px-5 py-3">
        <select
          className="select"
          value={user.role}
          disabled={busy || isSelf || locked}
          onChange={(e) => patch({ role: e.target.value })}
        >
          {assignableRoles.map((role) => (
            <option key={role} value={role}>
              {ROLE_LABELS[role]}
            </option>
          ))}
          {!assignableRoles.includes(user.role as never) && (
            <option value={user.role}>{ROLE_LABELS[user.role]}</option>
          )}
        </select>
      </td>

      <td className="px-5 py-3">
        {user.graduated ? (
          <span className="badge badge-info">
            Graduated{user.graduationYear ? ` ${user.graduationYear}` : ""}
          </span>
        ) : (
          <select
            className="select"
            value={user.section ?? ""}
            disabled={busy || locked || user.role === "admin" || user.role === "supervisor" || user.role === "coordinator"}
            onChange={(e) => patch({ section: e.target.value })}
          >
            <option value="">No section</option>
            {sections.map((section) => (
              <option key={section._id} value={section._id}>
                {section.name} · {section.year} ({section.dpYear})
              </option>
            ))}
          </select>
        )}
      </td>

      <td className="px-5 py-3">
        <span className={`badge badge-${user.status === "approved" ? "approved" : user.status}`}>
          {user.status}
        </span>
        {user.graduated && (
          <span className="badge badge-info ml-1">graduated</span>
        )}
        <p className="hint mt-1">joined {formatDate(user.createdAt)}</p>
      </td>

      <td className="px-5 py-3">
        <div className="flex flex-wrap justify-end gap-2">
          {user.status !== "approved" && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={busy}
              onClick={() => patch({ status: "approved" })}
            >
              Approve
            </button>
          )}
          {user.status === "pending" && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={busy}
              onClick={() => patch({ status: "rejected" })}
            >
              Reject
            </button>
          )}
          {user.status === "approved" && user.role === "student" && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={busy}
              title={
                user.graduated
                  ? "Let them add new CAS experiences again"
                  : "They keep their account and can still read everything, but cannot add new work"
              }
              onClick={() => patch({ graduated: !user.graduated })}
            >
              {user.graduated ? "Un-graduate" : "Mark graduated"}
            </button>
          )}
          {user.status === "approved" && !isSelf && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={busy}
              onClick={() => patch({ status: "pending" })}
            >
              Suspend
            </button>
          )}
          {!isSelf &&
            (confirmingDelete ? (
              <>
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  disabled={busy}
                  onClick={remove}
                >
                  Delete for good
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={busy}
                  onClick={() => setConfirmingDelete(false)}
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={busy}
                onClick={() => setConfirmingDelete(true)}
              >
                Delete
              </button>
            ))}
        </div>
      </td>
    </tr>
  );
}
