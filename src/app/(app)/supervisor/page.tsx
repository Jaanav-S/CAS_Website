import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { User } from "@/models/User";
import { Section } from "@/models/Section";
import { Experience } from "@/models/Experience";
import { CasProject } from "@/models/CasProject";
import { statusCounts } from "@/lib/queries";
import { plain } from "@/lib/serialize";
import { formatDateTime } from "@/lib/format";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import type { ReviewStatus } from "@/lib/constants";

export const metadata = { title: "CAS supervisor overview" };

type RecentProject = {
  _id: string;
  title: string;
  status: ReviewStatus;
  submittedAt?: string;
  owner: { name: string };
  section?: { name: string } | null;
};

export default async function SupervisorPage() {
  await requireRole("supervisor", "admin");
  await dbConnect();

  const [reflections, projectRows, students, teachers, sections, recentDocs, awaitingMe] =
    await Promise.all([
      statusCounts(),
      CasProject.aggregate<{ _id: string; count: number }>([
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      User.countDocuments({ role: "student", status: "approved", graduated: { $ne: true } }),
      User.countDocuments({ role: "teacher", status: "approved" }),
      Section.countDocuments(),
      CasProject.find({ status: { $ne: "draft" } })
        .select("title status submittedAt owner section")
        .populate("owner", "name")
        .populate("section", "name")
        .sort({ submittedAt: -1 })
        .limit(10)
        .lean(),
      CasProject.countDocuments({
        $or: [
          { status: "pending", "supervisorApproval.status": "pending" },
          {
            "completion.status": "pending",
            "completion.supervisor.status": "pending",
          },
        ],
      }),
    ]);

  const projects = Object.fromEntries(projectRows.map((r) => [r._id, r.count]));
  const [awaitingFinish, published] = await Promise.all([
    CasProject.countDocuments({ "completion.status": "pending" }),
    CasProject.countDocuments({ "completion.status": "approved" }),
  ]);
  const recent = plain(recentDocs as unknown as RecentProject[]);
  const approvedExperiences = await Experience.countDocuments({ status: "approved" });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">CAS supervisor overview</h1>
        <p className="mt-1 text-sm text-muted">
          Everything happening across the CAS programme, and the projects waiting
          on your sign-off.
        </p>
      </div>

      {awaitingMe > 0 && (
        <Link
          href="/supervisor/projects?status=pending"
          className="flex items-center gap-3 rounded-xl border border-accent/30 bg-accent-soft p-4 transition hover:shadow-md"
        >
          <span className="badge badge-pending">{awaitingMe}</span>
          <span className="text-sm font-semibold text-accent">
            CAS project{awaitingMe === 1 ? "" : "s"} waiting for your sign-off →
          </span>
        </Link>
      )}

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">
          CAS projects
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            label="Awaiting approval"
            value={projects.pending ?? 0}
            tone={(projects.pending ?? 0) > 0 ? "accent" : "neutral"}
            href="/supervisor/projects?status=pending"
          />
          <StatCard
            label="Approved"
            value={projects.approved ?? 0}
            tone="brand"
            href="/supervisor/projects?status=approved"
          />
          <StatCard
            label="Sent back"
            value={projects.rejected ?? 0}
            tone={(projects.rejected ?? 0) > 0 ? "danger" : "neutral"}
            href="/supervisor/projects?status=rejected"
          />
          <StatCard
            label="Still drafts"
            value={projects.draft ?? 0}
            hint="Not submitted yet"
          />
          <StatCard
            label="Finished, to sign off"
            value={awaitingFinish}
            tone={awaitingFinish > 0 ? "accent" : "neutral"}
            href="/supervisor/projects?status=finished"
          />
          <StatCard
            label="Published on Discovery"
            value={published}
            tone="brand"
            href="/supervisor/projects?status=published"
          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">
          Reflections
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Pending review" value={reflections.pending} tone="accent" />
          <StatCard label="Approved" value={approvedExperiences} tone="brand" />
          <StatCard label="Sent back" value={reflections.rejected} />
          <StatCard label="Drafts" value={reflections.draft} />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">
          People
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Active students" value={students} />
          <StatCard label="Teachers" value={teachers} />
          <StatCard label="Sections" value={sections} />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">
          Latest project submissions
        </h2>

        {recent.length === 0 ? (
          <div className="card p-8 text-center text-sm text-muted">
            No CAS projects have been submitted yet.
          </div>
        ) : (
          <ul className="space-y-2">
            {recent.map((p) => (
              <li key={p._id}>
                <Link
                  href={`/projects/${p._id}`}
                  className="card flex flex-wrap items-center gap-3 p-4 transition hover:shadow-md"
                >
                  <span className="min-w-48 flex-1 font-semibold">{p.title}</span>
                  <span className="hint">
                    {p.owner?.name}
                    {p.section && ` · ${p.section.name}`}
                    {p.submittedAt && ` · ${formatDateTime(p.submittedAt)}`}
                  </span>
                  <StatusBadge status={p.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
