import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { studentExperiences, studentProgress } from "@/lib/queries";
import { ProgressPanel } from "@/components/ProgressPanel";
import { ExperienceCard } from "@/components/ExperienceCard";
import { Avatar } from "@/components/Avatar";

export const metadata = { title: "Home" };

export default async function DashboardPage() {
  const user = await requireUser();
  if (user.role !== "student") redirect("/");

  const [progress, experiences] = await Promise.all([
    studentProgress(user.id),
    studentExperiences(user.id),
  ]);

  const pending = experiences.filter((e) => e.status === "pending").length;
  const needsWork = experiences.filter((e) => e.status === "rejected");
  const recent = experiences.slice(0, 3);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar name={user.name} image={user.image} size={52} />
          <div>
            <h1 className="text-2xl font-bold">
              Hello, {user.name.split(" ")[0]}
            </h1>
            <p className="mt-1 text-sm text-muted">
              Here is how your Creativity, Activity and Service programme is going.
            </p>
          </div>
        </div>
        {!user.graduated && (
          <Link href="/experiences/new" className="btn btn-primary">
            + New CAS experience
          </Link>
        )}
      </div>

      {user.graduated && (
        <p className="rounded-lg border border-info/30 bg-info-soft px-3 py-2 text-sm text-info">
          You have completed the CAS programme. Your record stays here for good
          — you can still read everything, but new experiences can no longer be
          added.
        </p>
      )}

      {needsWork.length > 0 && (
        <div className="rounded-xl border border-danger/30 bg-danger-soft p-4">
          <p className="text-sm font-semibold text-danger">
            {needsWork.length} reflection{needsWork.length === 1 ? "" : "s"} need
            changes before {needsWork.length === 1 ? "it" : "they"} can be
            approved.
          </p>
          <ul className="mt-2 space-y-1">
            {needsWork.map((exp) => (
              <li key={String(exp._id)} className="text-sm">
                <Link
                  href={`/experiences/${exp._id}`}
                  className="font-medium underline decoration-danger/40 underline-offset-2"
                >
                  {exp.title}
                </Link>
                {exp.reviewNotes.length > 0 && (
                  <span className="text-muted">
                    {" "}
                    — {exp.reviewNotes[exp.reviewNotes.length - 1].comment}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <ProgressPanel progress={progress} pendingCount={pending} />

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wide text-muted">
            Recent experiences
          </h3>
          <Link href="/my-cas" className="text-sm font-semibold text-brand hover:underline">
            View all
          </Link>
        </div>

        {recent.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="font-semibold">No experiences yet</p>
            <p className="mt-1 text-sm text-muted">
              Start by proposing an experience, then write your reflection.
            </p>
            {!user.graduated && (
              <Link href="/experiences/new" className="btn btn-primary mt-4">
                Add your first experience
              </Link>
            )}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recent.map((exp) => (
              <ExperienceCard key={String(exp._id)} experience={exp} href={`/experiences/${exp._id}`} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
