import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { supervisorOptions } from "@/lib/projects";
import { ProjectForm } from "@/components/ProjectForm";

export const metadata = { title: "New CAS project" };

export default async function NewProjectPage() {
  const user = await requireRole("student");
  if (user.graduated) redirect("/my-cas?tab=projects");

  const supervisors = await supervisorOptions();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">New CAS project</h1>
        <p className="mt-1 text-sm text-muted">
          A collaborative project, signed off by your teacher and the CAS
          supervisor before it starts.
        </p>
      </div>

      <ProjectForm supervisors={supervisors} />
    </div>
  );
}
