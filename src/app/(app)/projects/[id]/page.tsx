import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { plain } from "@/lib/serialize";
import {
  GOOGLE_CHAT_URL,
  approverRole,
  canViewProject,
  gmailComposeUrl,
  googleCalendarUrl,
  isProjectMember,
  projectDetail,
} from "@/lib/projects";
import {
  ApprovalPips,
  ProjectDetail,
  type ProjectView,
} from "@/components/ProjectDetail";
import { ProjectTimeline, type TimelineEntryView } from "@/components/ProjectTimeline";
import { ProjectApproval, ContactActions } from "@/components/ProjectApproval";
import { StatusBadge } from "@/components/StatusBadge";
import { DeleteProjectButton } from "./DeleteProjectButton";
import type { ReviewStatus } from "@/lib/constants";

export const metadata = { title: "CAS project" };

export default async function ProjectPage(props: PageProps<"/projects/[id]">) {
  const user = await requireUser();
  const { id } = await props.params;
  const doc = await projectDetail(id);
  if (!doc) notFound();

  if (!(await canViewProject(doc, user))) notFound();

  const project = plain(doc as unknown as ProjectView & {
    status: ReviewStatus;
    timeline: TimelineEntryView[];
  });

  const member = isProjectMember(doc, user.id);
  const role = await approverRole(doc, user);
  const editable =
    member && !user.graduated &&
    (project.status === "draft" || project.status === "rejected");

  const emails = [project.owner, ...project.members].map((p) => p.email);
  const backHref =
    user.role === "student"
      ? "/my-cas?tab=projects"
      : user.role === "supervisor"
        ? "/supervisor/projects"
        : user.role === "admin"
          ? "/admin/projects"
          : "/teacher/projects";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href={backHref} className="text-sm font-semibold text-brand hover:underline">
          ← Back
        </Link>
        <StatusBadge status={project.status} />
        <span className="ml-auto flex gap-2">
          {editable && (
            <>
              <Link href={`/projects/${id}/edit`} className="btn btn-ghost btn-sm">
                Edit
              </Link>
              {project.owner._id === user.id && <DeleteProjectButton id={id} />}
            </>
          )}
        </span>
      </div>

      <div>
        <h1 className="text-2xl font-bold">{project.title || "Untitled project"}</h1>
        <p className="mt-1 text-sm text-muted">
          {[project.owner, ...project.members].map((p) => p.name).join(", ")}
        </p>
      </div>

      <ApprovalPips project={project} />

      {project.status === "rejected" && member && (
        <p className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
          An approver asked for changes. Update the project and submit it again —
          both approvals start over.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="min-w-0 space-y-6">
          <ProjectDetail project={project} />

          <ProjectTimeline
            projectId={id}
            entries={project.timeline ?? []}
            canAdd={member && !user.graduated}
            viewerId={user.id}
            locked={project.status !== "approved"}
          />
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          {role && project.status === "pending" && (
            <ProjectApproval
              projectId={id}
              as={role}
              alreadyDecided={
                role === "teacher"
                  ? project.teacherApproval.status
                  : project.supervisorApproval.status
              }
            />
          )}

          {(user.role === "supervisor" || user.role === "admin" || user.role === "teacher") && (
            <ContactActions
              calendarUrl={googleCalendarUrl(emails, project.title)}
              chatUrl={GOOGLE_CHAT_URL}
              mailUrl={gmailComposeUrl(emails, project.title)}
            />
          )}

          <div className="card p-5">
            <p className="hint font-semibold uppercase tracking-wide">
              Project members
            </p>
            <ul className="mt-2 space-y-2">
              {[project.owner, ...project.members].map((p, i) => (
                <li key={p._id} className="text-sm">
                  <span className="font-semibold">{p.name}</span>
                  {i === 0 && <span className="hint"> · created it</span>}
                  <p className="hint truncate">{p.email}</p>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
