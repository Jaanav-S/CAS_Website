import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { experienceDetail } from "@/lib/queries";
import { BlogView } from "@/components/BlogView";
import { ProposalFacts } from "@/components/ProposalFacts";
import { ReviewTimeline } from "@/components/ReviewTimeline";
import { StatusBadge } from "@/components/StatusBadge";
import { DeleteExperienceButton } from "./DeleteExperienceButton";

export const metadata = { title: "CAS experience" };

export default async function ExperiencePage(
  props: PageProps<"/experiences/[id]">,
) {
  const user = await requireUser();
  const { id } = await props.params;
  const experience = await experienceDetail(id);

  if (!experience) notFound();

  // Students only ever see their own; staff reach other students through the
  // teacher and admin sections instead.
  if (user.role === "student" && experience.student._id !== user.id) {
    redirect("/my-cas");
  }

  const editable =
    experience.status === "draft" || experience.status === "rejected";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/my-cas" className="text-sm font-semibold text-brand hover:underline">
          ← My CAS
        </Link>
        <StatusBadge status={experience.status} />
        <span className="ml-auto flex gap-2">
          {editable && (
            <>
              <Link href={`/experiences/${id}/edit`} className="btn btn-ghost btn-sm">
                Edit
              </Link>
              <DeleteExperienceButton id={id} />
            </>
          )}
        </span>
      </div>

      <h1 className="text-2xl font-bold">{experience.title}</h1>

      {experience.status === "rejected" && (
        <p className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
          {experience.reviewNotes.at(-1)?.action === "takedown"
            ? "This reflection was taken off Discovery. Update it and submit it again to republish."
            : "Your teacher asked for changes. Update your reflection and submit it again."}
        </p>
      )}

      <ReviewTimeline notes={experience.reviewNotes as never} />

      {experience.headerImage || experience.blogBody ? (
        <BlogView
          headerImage={experience.headerImage}
          blogTitle={experience.blogTitle}
          blogBody={experience.blogBody}
          images={experience.images}
          strands={experience.strands}
          authorName={experience.student.name}
          authorImage={experience.student.image}
          publishedAt={experience.submittedAt}
        />
      ) : (
        <div className="card p-8 text-center">
          <p className="font-semibold">The reflection is not written yet</p>
          <p className="mt-1 text-sm text-muted">
            Add a header image and write your blog to submit this experience.
          </p>
          <Link href={`/experiences/${id}/edit`} className="btn btn-primary mt-4">
            Write the reflection
          </Link>
        </div>
      )}

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
    </div>
  );
}
