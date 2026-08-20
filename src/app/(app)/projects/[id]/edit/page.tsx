import { notFound, redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { plain } from "@/lib/serialize";
import { isProjectMember, projectDetail, supervisorOptions } from "@/lib/projects";
import { ProjectForm } from "@/components/ProjectForm";

export const metadata = { title: "Edit CAS project" };

type Populated = {
  _id: string;
  status: string;
  owner: { _id: string };
  members: { email: string }[];
  casSupervisor?: { _id: string } | null;
  [key: string]: unknown;
};

export default async function EditProjectPage(
  props: PageProps<"/projects/[id]/edit">,
) {
  const user = await requireRole("student");
  if (user.graduated) redirect("/my-cas?tab=projects");

  const { id } = await props.params;
  const doc = await projectDetail(id);
  if (!doc) notFound();
  if (!isProjectMember(doc, user.id)) notFound();
  if (doc.status === "pending" || doc.status === "approved") {
    redirect(`/projects/${id}`);
  }

  const project = plain(doc as unknown as Populated);
  const supervisors = await supervisorOptions();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Edit CAS project</h1>
        <p className="mt-1 text-sm text-muted">{String(project.title ?? "")}</p>
      </div>

      <ProjectForm
        supervisors={supervisors}
        projectId={id}
        serverUpdatedAt={project.updatedAt as string}
        isOwner={project.owner._id === user.id}
        initial={{
          title: String(project.title ?? ""),
          focus: String(project.focus ?? ""),
          fromDate: project.fromDate as string,
          toDate: project.toDate as string,
          casSupervisor: project.casSupervisor?._id ?? "",
          strands: (project.strands as string[]) ?? [],
          investigation: String(project.investigation ?? ""),
          planning: String(project.planning ?? ""),
          action: String(project.action ?? ""),
          reflection: String(project.reflection ?? ""),
          budget: String(project.budget ?? ""),
          donationOrg: String(project.donationOrg ?? ""),
          contactPerson: String(project.contactPerson ?? ""),
          contactPhone: String(project.contactPhone ?? ""),
          contactEmail: String(project.contactEmail ?? ""),
          externalSupervisor: String(project.externalSupervisor ?? ""),
          riskAssessmentRequired: Boolean(project.riskAssessmentRequired),
          riskAssessmentCompleted: Boolean(project.riskAssessmentCompleted),
          precautions: String(project.precautions ?? ""),
          planningDocUrl: String(project.planningDocUrl ?? ""),
          enrollmentFormUrl: String(project.enrollmentFormUrl ?? ""),
          memberEmails: (project.members ?? []).map((m) => m.email),
        }}
      />
    </div>
  );
}
