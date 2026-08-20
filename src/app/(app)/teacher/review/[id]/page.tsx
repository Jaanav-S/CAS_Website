import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { experienceDetail, studentProgress } from "@/lib/queries";
import { teacherSectionIds } from "@/lib/scope";
import { BlogView } from "@/components/BlogView";
import { ProposalFacts } from "@/components/ProposalFacts";
import { ReviewTimeline } from "@/components/ReviewTimeline";
import { StatusBadge } from "@/components/StatusBadge";
import { ReviewActions } from "./ReviewActions";
import { TakedownButton } from "@/components/TakedownButton";
import { REQUIREMENTS } from "@/lib/constants";

export const metadata = { title: "Review submission" };

export default async function ReviewPage(
  props: PageProps<"/teacher/review/[id]">,
) {
  const user = await requireRole("teacher", "supervisor", "admin");
  const { id } = await props.params;
  const experience = await experienceDetail(id);

  if (!experience) notFound();

  if (user.role === "teacher") {
    const sections = (await teacherSectionIds(user.id)).map(String);
    if (!experience.section || !sections.includes(experience.section._id)) {
      notFound();
    }
  }

  const progress = await studentProgress(experience.student._id);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/teacher/review"
          className="text-sm font-semibold text-brand hover:underline"
        >
          ← Review queue
        </Link>
        <StatusBadge status={experience.status} />
        <Link
          href={`/teacher/students/${experience.student._id}`}
          className="ml-auto text-sm font-semibold text-brand hover:underline"
        >
          {experience.student.name}&apos;s full record →
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="min-w-0 space-y-6">
          <BlogView
            headerImage={experience.headerImage}
            headerWidth={experience.headerWidth}
            headerHeight={experience.headerHeight}
            blogTitle={experience.blogTitle}
            blogBody={experience.blogBody}
            images={experience.images}
            strands={experience.strands}
            authorName={experience.student.name}
            authorImage={experience.student.image}
            publishedAt={experience.submittedAt}
          />

          <ProposalFacts
            year={experience.year}
            term={experience.term}
            location={experience.location}
            stage={experience.stage}
            fromDate={experience.fromDate}
            toDate={experience.toDate}
            strands={experience.strands}
            learningOutcomes={experience.learningOutcomes}
            sdgs={experience.sdgs}
            description={experience.description}
            investigation={experience.investigation}
            learnerProfileAttributes={experience.learnerProfileAttributes}
            learnerProfileNote={experience.learnerProfileNote}
            supervisor={experience.supervisor}
            advisorName={experience.casAdvisor?.name}
          />

          <ReviewTimeline notes={experience.reviewNotes as never} />
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          {experience.status === "pending" ? (
            <ReviewActions id={id} />
          ) : (
            <div className="card space-y-3 p-5">
              <div>
                <p className="text-sm font-semibold">
                  Already{" "}
                  {experience.status === "approved" ? "approved" : "sent back"}
                </p>
                <p className="hint mt-1">
                  {experience.status === "approved"
                    ? "This reflection is published on Discovery and counts towards the student's progress."
                    : "The student can edit and resubmit it."}
                </p>
              </div>
              {experience.status === "approved" && (
                <TakedownButton
                  id={id}
                  redirectTo="/teacher/review?status=approved"
                  className="btn btn-ghost btn-sm w-full"
                />
              )}
            </div>
          )}

          <div className="card p-5">
            <p className="hint font-semibold uppercase tracking-wide">
              {experience.student.name}&apos;s progress
            </p>
            <p className="mt-1 text-3xl font-bold text-brand">{progress.percent}%</p>
            <p className="hint">
              {progress.approvedCount}/{REQUIREMENTS.totalExperiences} approved
              experiences
            </p>
            <dl className="mt-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">Creativity</dt>
                <dd className="tabular-nums">{progress.strandCounts.Creativity}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Activity</dt>
                <dd className="tabular-nums">{progress.strandCounts.Activity}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Service</dt>
                <dd className="tabular-nums">{progress.strandCounts.Service}</dd>
              </div>
            </dl>
          </div>
        </aside>
      </div>
    </div>
  );
}
