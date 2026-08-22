import Link from "next/link";
import mongoose from "mongoose";
import { requireRole } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { Section } from "@/models/Section";
import { teacherSectionIds } from "@/lib/scope";
import { roster } from "@/lib/roster";
import { statusCounts } from "@/lib/queries";
import { REQUIREMENTS } from "@/lib/constants";
import { StatCard } from "@/components/StatCard";
import { InviteList } from "@/components/InviteList";
import { invitesForSections } from "@/lib/invites";
import { appOrigin } from "@/lib/appUrl";

export const metadata = { title: "Class overview" };

export default async function TeacherPage(props: PageProps<"/teacher">) {
  const user = await requireRole("teacher", "supervisor", "admin");

  await dbConnect();
  const sectionIds =
    user.role !== "teacher"
      ? (
          await Section.find().select("_id").lean<{ _id: mongoose.Types.ObjectId }[]>()
        ).map((s) => s._id)
      : await teacherSectionIds(user.id);

  const sections = await Section.find({ _id: { $in: sectionIds } })
    .select("name year")
    .sort({ year: -1, name: 1 })
    .lean<{ _id: mongoose.Types.ObjectId; name: string; year: string }[]>();

  const params = await props.searchParams;
  const selected =
    typeof params.section === "string" &&
    sections.some((s) => String(s._id) === params.section)
      ? params.section
      : null;

  const scope = selected ? [selected] : sectionIds;

  const origin = await appOrigin();

  const [rows, counts, invites] = await Promise.all([
    roster(scope),
    statusCounts({ section: { $in: scope.map((id) => new mongoose.Types.ObjectId(String(id))) } }),
    invitesForSections(scope, origin),
  ]);

  const stillToJoin = invites.reduce((n, i) => n + (i.state === "active" ? i.left : 0), 0);

  const onTrack = rows.filter((r) => r.progress.complete).length;
  const behind = rows.filter((r) => r.progress.percent < 40).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Class overview</h1>
        <p className="mt-1 text-sm text-muted">
          {sections.length === 0
            ? "You have not been assigned to a section yet — ask an admin."
            : "How your students are tracking against the CAS requirements."}
        </p>
      </div>

      {sections.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <Link
            href="/teacher"
            className={`badge px-3 py-1.5 ${!selected ? "badge-approved" : "badge-neutral"}`}
          >
            All sections
          </Link>
          {sections.map((section) => (
            <Link
              key={String(section._id)}
              href={`/teacher?section=${section._id}`}
              className={`badge px-3 py-1.5 ${
                selected === String(section._id) ? "badge-approved" : "badge-neutral"
              }`}
            >
              {section.name} · {section.year}
            </Link>
          ))}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Students" value={rows.length} />
        <StatCard
          label="Awaiting your review"
          value={counts.pending}
          tone={counts.pending > 0 ? "accent" : "neutral"}
          href="/teacher/review"
        />
        <StatCard label="Requirements met" value={onTrack} tone="brand" />
        <StatCard
          label="Still to sign up"
          value={stillToJoin}
          tone={stillToJoin > 0 ? "info" : "neutral"}
          hint={stillToJoin > 0 ? "Invited but not joined yet" : undefined}
        />
        <StatCard
          label="Under 40% complete"
          value={behind}
          tone={behind > 0 ? "danger" : "neutral"}
        />
      </div>

      {rows.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="font-semibold">No students in this section yet</p>
          <p className="mt-1 text-sm text-muted">
            An admin adds students to sections from the Users page.
          </p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[52rem] text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-5 py-3 font-semibold">Student</th>
                <th className="px-5 py-3 font-semibold">Progress</th>
                <th className="px-5 py-3 font-semibold">Approved</th>
                <th className="px-5 py-3 font-semibold">C / A / S</th>
                <th className="px-5 py-3 font-semibold">Outcomes</th>
                <th className="px-5 py-3 font-semibold">Waiting</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-surface-2">
                  <td className="px-5 py-3">
                    <Link
                      href={`/teacher/students/${row.id}`}
                      className="font-semibold hover:text-brand"
                    >
                      {row.name}
                    </Link>
                    <p className="hint">{row.email}</p>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-24 overflow-hidden rounded-full bg-surface-2">
                        <span
                          className="block h-full rounded-full"
                          style={{
                            width: `${row.progress.percent}%`,
                            background: row.progress.complete
                              ? "var(--brand)"
                              : row.progress.percent < 40
                                ? "var(--accent)"
                                : "var(--info)",
                          }}
                        />
                      </span>
                      <span className="tabular-nums">{row.progress.percent}%</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 tabular-nums">
                    {row.progress.approvedCount}/{REQUIREMENTS.totalExperiences}
                  </td>
                  <td className="px-5 py-3 tabular-nums">
                    {row.progress.strandCounts.Creativity} /{" "}
                    {row.progress.strandCounts.Activity} /{" "}
                    {row.progress.strandCounts.Service}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`badge ${
                        row.progress.outcomesMet ? "badge-approved" : "badge-neutral"
                      }`}
                    >
                      {row.progress.outcomesMet ? "All met" : "In progress"}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    {row.pending > 0 ? (
                      <span className="badge badge-pending">{row.pending} pending</span>
                    ) : row.rejected > 0 ? (
                      <span className="badge badge-rejected">
                        {row.rejected} to fix
                      </span>
                    ) : (
                      <span className="hint">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {invites.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">
            Sign-up links for these sections
          </h2>
          <InviteList invites={invites} canManage={false} />
        </section>
      )}
    </div>
  );
}
