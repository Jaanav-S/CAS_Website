import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { User, type UserDoc } from "@/models/User";
import { teacherSectionIds } from "@/lib/scope";
import { studentExperiences, studentProgress } from "@/lib/queries";
import { ProgressPanel } from "@/components/ProgressPanel";
import { ExperienceCard } from "@/components/ExperienceCard";

export const metadata = { title: "Student record" };

export default async function StudentRecordPage(
  props: PageProps<"/teacher/students/[id]">,
) {
  const user = await requireRole("teacher", "supervisor", "admin");
  const { id } = await props.params;

  await dbConnect();
  const student = await User.findById(id).lean<UserDoc>();
  if (!student || student.role !== "student") notFound();

  if (user.role === "teacher") {
    const sections = (await teacherSectionIds(user.id)).map(String);
    if (!student.section || !sections.includes(String(student.section))) {
      notFound();
    }
  }

  const [progress, experiences] = await Promise.all([
    studentProgress(id),
    studentExperiences(id),
  ]);

  const pending = experiences.filter((e) => e.status === "pending").length;

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/teacher"
          className="text-sm font-semibold text-brand hover:underline"
        >
          ← Class overview
        </Link>
        <h1 className="mt-2 text-2xl font-bold">{student.name}</h1>
        <p className="text-sm text-muted">{student.email}</p>
      </div>

      <ProgressPanel progress={progress} pendingCount={pending} />

      <section>
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">
          All experiences ({experiences.length})
        </h3>

        {experiences.length === 0 ? (
          <div className="card p-8 text-center text-sm text-muted">
            This student has not added any experiences yet.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {experiences.map((exp) => (
              <ExperienceCard
                key={String(exp._id)}
                experience={exp}
                // Drafts are not visible to teachers until they are submitted.
                href={
                  exp.status === "draft"
                    ? undefined
                    : `/teacher/review/${exp._id}`
                }
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
