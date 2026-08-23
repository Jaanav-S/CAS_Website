import Link from "next/link";
import type { ProjectListItem } from "@/lib/projects";
import { formatDateTime } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import type { ReviewStatus } from "@/lib/constants";

const PIP: Record<string, string> = {
  approved: "badge-approved",
  rejected: "badge-rejected",
  pending: "badge-pending",
};

export function ProjectRow({ project }: { project: ProjectListItem }) {
  const people = [project.owner, ...(project.members ?? [])].filter((p) => p?.name);

  return (
    <li>
      <Link
        href={`/projects/${project._id}`}
        className="card flex flex-wrap items-center gap-4 p-4 transition hover:-translate-y-0.5 hover:shadow-lg"
      >
        <span className="min-w-56 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{project.title || "Untitled project"}</span>
            <StatusBadge status={project.status as ReviewStatus} />
          </span>
          <span className="hint mt-0.5 block truncate">
            {people.map((p) => p.name).join(", ")}
            {project.section && ` · ${project.section.name}`}
            {project.submittedAt && ` · submitted ${formatDateTime(project.submittedAt)}`}
          </span>
          <span className="mt-1.5 flex flex-wrap gap-1.5">
            {project.strands.map((s) => (
              <span key={s} className="badge badge-info">
                {s}
              </span>
            ))}
            {project.completion && project.completion.status !== "none" ? (
              <>
                <span className={`badge ${PIP[project.completion.teacher.status]}`}>
                  Teacher · finished
                </span>
                <span className={`badge ${PIP[project.completion.supervisor.status]}`}>
                  CAS Coordinator · finished
                </span>
                {project.completion.status === "approved" && (
                  <span className="badge badge-approved">Published</span>
                )}
              </>
            ) : (
              <>
                <span className={`badge ${PIP[project.teacherApproval.status]}`}>
                  Teacher
                </span>
                <span className={`badge ${PIP[project.supervisorApproval.status]}`}>
                  CAS Coordinator
                </span>
              </>
            )}
            {project.timeline.length > 0 && (
              <span className="badge badge-neutral">
                {project.timeline.length} timeline entries
              </span>
            )}
          </span>
        </span>
        <span className="btn btn-ghost btn-sm hidden sm:inline-flex">Open</span>
      </Link>
    </li>
  );
}
