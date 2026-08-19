import { requireRole } from "@/lib/auth";
import { ProjectQueue } from "@/components/ProjectQueue";

export const metadata = { title: "CAS projects" };

export default async function ProjectsPage(props: PageProps<"/admin/projects">) {
  const user = await requireRole("teacher", "supervisor", "admin");
  const params = await props.searchParams;
  const status = typeof params.status === "string" ? params.status : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">CAS projects</h1>
        <p className="mt-1 text-sm text-muted">Every CAS project across the school.</p>
      </div>

      <ProjectQueue user={user} basePath="/admin/projects" status={status} />
    </div>
  );
}
