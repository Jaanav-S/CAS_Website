import Link from "next/link";
import { plain } from "@/lib/serialize";
import { projectQueue } from "@/lib/projects";
import { ProjectRow } from "@/components/ProjectRow";
import type { SessionUser } from "@/lib/auth";

const TABS = [
  { key: "pending", label: "Awaiting approval" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Sent back" },
];

/**
 * The shared CAS project list used by teachers, the CAS supervisor and admins.
 * Who sees which projects is decided inside projectQueue.
 */
export async function ProjectQueue({
  user,
  basePath,
  status,
}: {
  user: SessionUser;
  basePath: string;
  status: string | null;
}) {
  const active = TABS.some((t) => t.key === status) ? status! : "pending";
  const projects = plain(await projectQueue(user, active));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-1 border-b pb-px">
        {TABS.map((tab) => (
          <Link
            key={tab.key}
            href={`${basePath}?status=${tab.key}`}
            className={`-mb-px rounded-t-md border-b-2 px-3 py-2 text-sm font-medium transition ${
              active === tab.key
                ? "border-brand text-brand-strong"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {projects.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="font-semibold">
            {active === "pending" ? "Nothing waiting on you" : "Nothing here"}
          </p>
          <p className="mt-1 text-sm text-muted">
            {active === "pending"
              ? "New CAS project submissions will appear here."
              : "Try another tab."}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {projects.map((project) => (
            <ProjectRow key={project._id} project={project} />
          ))}
        </ul>
      )}
    </div>
  );
}
