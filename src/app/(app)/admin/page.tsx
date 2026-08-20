import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { User } from "@/models/User";
import { Section } from "@/models/Section";
import { Invite } from "@/models/Invite";
import { Experience } from "@/models/Experience";
import { statusCounts } from "@/lib/queries";
import { plain } from "@/lib/serialize";
import { formatDateTime } from "@/lib/format";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import type { ReviewStatus } from "@/lib/constants";

export const metadata = { title: "Admin overview" };

type Decision = {
  _id: string;
  title: string;
  blogTitle?: string;
  status: ReviewStatus;
  reviewedAt?: string;
  student: { name: string };
  reviewedBy?: { name: string } | null;
};

export default async function AdminPage() {
  await requireRole("admin");
  await dbConnect();

  const [counts, pendingUsers, totals, sections, recentDocs, openInvites] = await Promise.all([
    statusCounts(),
    User.countDocuments({ status: "pending" }),
    User.aggregate<{ _id: string; count: number }>([
      { $match: { status: "approved" } },
      { $group: { _id: "$role", count: { $sum: 1 } } },
    ]),
    Section.countDocuments(),
    Experience.find({ reviewedAt: { $ne: null } })
      .select("title blogTitle status reviewedAt student reviewedBy")
      .populate("student", "name")
      .populate("reviewedBy", "name")
      .sort({ reviewedAt: -1 })
      .limit(12)
      .lean(),
    Invite.find({ revoked: false })
      .select("capacity usedBy")
      .lean<{ capacity: number; usedBy: unknown[] }[]>(),
  ]);

  // How many invited people have still not signed up.
  const seatsLeft = openInvites.reduce(
    (n, i) => n + Math.max(0, i.capacity - i.usedBy.length),
    0,
  );

  const byRole = Object.fromEntries(totals.map((r) => [r._id, r.count]));
  const recent = plain(recentDocs as unknown as Decision[]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Admin overview</h1>
        <p className="mt-1 text-sm text-muted">
          Everything happening across the CAS programme.
        </p>
      </div>

      {pendingUsers > 0 && (
        <Link
          href="/admin/users?status=pending"
          className="flex items-center gap-3 rounded-xl border border-accent/30 bg-accent-soft p-4 transition hover:shadow-md"
        >
          <span className="badge badge-pending">{pendingUsers}</span>
          <span className="text-sm font-semibold text-accent">
            new account{pendingUsers === 1 ? "" : "s"} waiting for approval →
          </span>
        </Link>
      )}

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">
          Reflections
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Pending review"
            value={counts.pending}
            tone={counts.pending > 0 ? "accent" : "neutral"}
            href="/teacher/review?status=pending"
          />
          <StatCard
            label="Approved"
            value={counts.approved}
            tone="brand"
            href="/teacher/review?status=approved"
          />
          <StatCard
            label="Sent back"
            value={counts.rejected}
            tone={counts.rejected > 0 ? "danger" : "neutral"}
            href="/teacher/review?status=rejected"
          />
          <StatCard label="Still drafts" value={counts.draft} hint="Not submitted yet" />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">
          People
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Students" value={byRole.student ?? 0} href="/admin/users?role=student" />
          <StatCard label="Teachers" value={byRole.teacher ?? 0} href="/admin/users?role=teacher" />
          <StatCard label="Admins" value={byRole.admin ?? 0} href="/admin/users?role=admin" />
          <StatCard label="Sections" value={sections} href="/admin/sections" />
          <StatCard
            label="Still to sign up"
            value={seatsLeft}
            tone={seatsLeft > 0 ? "info" : "neutral"}
            hint="Places left on active links"
            href="/admin/invites"
          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">
          Recent decisions
        </h2>

        {recent.length === 0 ? (
          <div className="card p-8 text-center text-sm text-muted">
            No reflections have been reviewed yet.
          </div>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[44rem] text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-5 py-3 font-semibold">Reflection</th>
                  <th className="px-5 py-3 font-semibold">Student</th>
                  <th className="px-5 py-3 font-semibold">Decision</th>
                  <th className="px-5 py-3 font-semibold">Reviewed by</th>
                  <th className="px-5 py-3 font-semibold">When</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {recent.map((item) => (
                  <tr key={item._id} className="hover:bg-surface-2">
                    <td className="px-5 py-3">
                      <Link
                        href={`/teacher/review/${item._id}`}
                        className="font-semibold hover:text-brand"
                      >
                        {item.blogTitle || item.title}
                      </Link>
                    </td>
                    <td className="px-5 py-3">{item.student?.name ?? "—"}</td>
                    <td className="px-5 py-3">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="px-5 py-3">{item.reviewedBy?.name ?? "—"}</td>
                    <td className="px-5 py-3 text-muted">
                      {formatDateTime(item.reviewedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
